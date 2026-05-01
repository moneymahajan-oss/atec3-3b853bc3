import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "../components/PageHeader";
import { useCrmAuth } from "../hooks/useCrmAuth";
import { addEnrolment, getStudentEnrolments, type Enrolment } from "../lib/enrolments";
import { logAudit } from "../lib/audit";
import { toast } from "sonner";

type Course = { id: string; name: string; total_fee: number; registration_fee: number };
type Student = { id: string; full_name: string; phone: string; email: string | null };
type Batch = { id: string; name: string; course_id: string | null };

export default function CrmAddEnrolment() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const fromEnquiry = search.get("from_enquiry");
  const { user } = useCrmAuth();

  const [student, setStudent] = useState<Student | null>(null);
  const [existing, setExisting] = useState<Enrolment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    course_id: "",
    batch_id: "",
    total_fee: 0,
    discount_amount: 0,
    discount_reason: "",
    registration_fee_paid: 0,
    notes: "",
  });

  useEffect(() => {
    if (!studentId) return;
    (async () => {
      const [stu, enr, crs, bts] = await Promise.all([
        supabase.from("crm_students").select("id,full_name,phone,email").eq("id", studentId).maybeSingle(),
        getStudentEnrolments(studentId),
        supabase.from("crm_courses").select("id,name,total_fee,registration_fee").eq("is_active", true).order("name"),
        supabase.from("crm_batches").select("id,name,course_id").order("created_at", { ascending: false }),
      ]);
      setStudent((stu.data ?? null) as Student | null);
      setExisting(enr);
      setCourses((crs.data ?? []) as Course[]);
      setBatches((bts.data ?? []) as Batch[]);
      setLoading(false);
    })();
  }, [studentId]);

  const onCourse = (cid: string) => {
    const c = courses.find((c) => c.id === cid);
    setForm((f) => ({
      ...f,
      course_id: cid,
      batch_id: "",
      total_fee: c?.total_fee ?? 0,
      registration_fee_paid: c?.registration_fee ?? 0,
    }));
  };

  const filteredBatches = useMemo(
    () => batches.filter((b) => !form.course_id || !b.course_id || b.course_id === form.course_id),
    [batches, form.course_id]
  );

  const netPayable = (Number(form.total_fee) || 0) - (Number(form.discount_amount) || 0);

  const save = async () => {
    if (!studentId) return;
    if (!form.course_id) {
      toast.error("Please select a course");
      return;
    }
    // Block exact-duplicate active enrolment for the same course
    const dupActive = existing.find(
      (e) => e.course_id === form.course_id && e.status === "active"
    );
    if (dupActive) {
      toast.error("This student already has an active enrolment for this course.");
      return;
    }
    setSaving(true);
    const courseRow = courses.find((c) => c.id === form.course_id);
    const { data, error } = await addEnrolment({
      student_id: studentId,
      course_id: form.course_id,
      course_name_snapshot: courseRow?.name ?? null,
      batch_id: form.batch_id || null,
      total_fee: Number(form.total_fee) || 0,
      discount_amount: Number(form.discount_amount) || 0,
      discount_reason: form.discount_reason || null,
      registration_fee_paid: Number(form.registration_fee_paid) || 0,
      notes: form.notes || null,
      created_by: user?.id ?? null,
    });
    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }
    await logAudit("crm_student_enrolments", "create", data?.id, {
      student_id: studentId,
      course_id: form.course_id,
    });

    // Auto-create a default "full fee" pending plan so the enrolment shows up
    // in the Fees module immediately. Staff can split into installments later.
    const balance = (Number(form.total_fee) || 0)
      - (Number(form.discount_amount) || 0)
      - (Number(form.registration_fee_paid) || 0);
    if (data?.id && balance > 0) {
      const { error: planErr } = await supabase.from("crm_fee_plans").insert({
        student_id: studentId,
        enrolment_id: data.id,
        installment_no: 1,
        label: "Full fee",
        amount: balance,
        plan_type: "custom",
        status: "pending",
        notes: `Auto-created on enrolment in ${courseRow?.name ?? "course"}`,
      });
      if (planErr) {
        // Non-blocking: tell user but still treat enrolment as saved
        toast.warning(`Enrolment saved, but fee plan was not auto-created: ${planErr.message}`);
      }
    }

    // If a registration fee was already collected, log it as a payment too.
    if (data?.id && (Number(form.registration_fee_paid) || 0) > 0) {
      await supabase.from("crm_payments").insert({
        student_id: studentId,
        enrolment_id: data.id,
        amount: Number(form.registration_fee_paid) || 0,
        mode: "cash",
        notes: "Registration fee at enrolment",
        collected_by: user?.id ?? null,
      });
    }

    toast.success(`Enrolled in ${courseRow?.name}. Enrolment #${data?.enrolment_no}`);
    // If we came from an enquiry, mark it converted and link the student
    const fromEnq = new URLSearchParams(window.location.search).get("from_enquiry");
    if (fromEnq) {
      await supabase.from("crm_enquiries")
        .update({ status: "converted", converted_student_id: studentId })
        .eq("id", fromEnq);
    }
    navigate(`/crm/students/${studentId}`);
  };

  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading…</div>
    );
  }

  if (!student) {
    return (
      <div className="p-6">
        <p>Student not found.</p>
        <Button variant="link" onClick={() => navigate("/crm/students")}>Back to students</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <PageHeader
        title="Add another course"
        description={`for ${student.full_name} · ${student.phone}`}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate(`/crm/students/${studentId}`)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to profile
          </Button>
        }
      />

      {existing.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Existing enrolments ({existing.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {existing.map((e) => (
              <div key={e.id} className="flex items-center gap-3 text-sm">
                <Badge variant={e.status === "active" ? "default" : "secondary"} className="capitalize">
                  {e.status.replace("_", " ")}
                </Badge>
                <span className="font-medium">{e.course_name_snapshot || "—"}</span>
                <span className="text-muted-foreground text-xs">{e.enrolment_no}</span>
                <span className="text-muted-foreground text-xs ml-auto">
                  {new Date(e.enrolment_date).toLocaleDateString()}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>New enrolment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Course *</Label>
            <Select value={form.course_id || "none"} onValueChange={(v) => onCourse(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— select —</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Batch</Label>
            <Select value={form.batch_id || "none"} onValueChange={(v) => setForm((f) => ({ ...f, batch_id: v === "none" ? "" : v }))}>
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— none —</SelectItem>
                {filteredBatches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Total fee (₹)</Label>
              <Input type="number" value={form.total_fee}
                onChange={(e) => setForm((f) => ({ ...f, total_fee: Number(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Registration paid (₹)</Label>
              <Input type="number" value={form.registration_fee_paid}
                onChange={(e) => setForm((f) => ({ ...f, registration_fee_paid: Number(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Discount (₹)</Label>
              <Input type="number" value={form.discount_amount}
                onChange={(e) => setForm((f) => ({ ...f, discount_amount: Number(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Discount reason</Label>
              <Input value={form.discount_reason}
                onChange={(e) => setForm((f) => ({ ...f, discount_reason: e.target.value }))} />
            </div>
          </div>

          <div className="rounded-md bg-muted px-3 py-2 text-sm flex justify-between">
            <span className="text-muted-foreground">Net payable</span>
            <span className="font-semibold">₹ {netPayable.toLocaleString()}</span>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea rows={3} value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => navigate(`/crm/students/${studentId}`)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              <Save className="w-4 h-4 mr-1" /> {saving ? "Saving…" : "Add enrolment"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
