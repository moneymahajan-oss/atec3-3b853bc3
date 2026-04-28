import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "../components/PageHeader";
import { useCrmAuth } from "../hooks/useCrmAuth";
import { logAudit } from "../lib/audit";
import { toast } from "sonner";

type Course = { id: string; name: string; total_fee: number; registration_fee: number };

const empty = {
  full_name: "",
  phone: "",
  alt_phone: "",
  email: "",
  dob: "",
  gender: "",
  address: "",
  course_id: "",
  batch_id: "",
  enrolment_date: new Date().toISOString().slice(0, 10),
  status: "active",
  total_fee: 0,
  registration_fee_paid: 0,
  notes: "",
  photo_url: "",
  id_proof_url: "",
};

export default function CrmStudentForm() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const fromEnquiry = search.get("from_enquiry");
  const { user, isAdmin } = useCrmAuth();
  const [form, setForm] = useState<typeof empty & { enrolment_no?: string | null; course_name_snapshot?: string | null }>(empty);
  const [courses, setCourses] = useState<Course[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"photo" | "id" | null>(null);
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    supabase.from("crm_courses").select("id,name,total_fee,registration_fee").eq("is_active", true).order("name")
      .then(({ data }) => setCourses((data ?? []) as Course[]));
  }, []);

  useEffect(() => {
    if (isNew) {
      // Prefill from enquiry if provided
      if (fromEnquiry) {
        supabase.from("crm_enquiries").select("*").eq("id", fromEnquiry).maybeSingle().then(({ data }) => {
          if (!data) return;
          setForm((f) => ({
            ...f,
            full_name: data.name ?? "",
            phone: data.phone ?? "",
            alt_phone: data.alt_phone ?? "",
            email: data.email ?? "",
            course_id: data.course_id ?? "",
            course_name_snapshot: data.course_name_snapshot,
          }));
        });
      }
      return;
    }
    (async () => {
      const { data, error } = await supabase.from("crm_students").select("*").eq("id", id!).maybeSingle();
      if (error || !data) { toast.error("Student not found"); navigate("/crm/students"); return; }
      setForm({
        full_name: data.full_name ?? "",
        phone: data.phone ?? "",
        alt_phone: data.alt_phone ?? "",
        email: data.email ?? "",
        dob: data.dob ?? "",
        gender: data.gender ?? "",
        address: data.address ?? "",
        course_id: data.course_id ?? "",
        batch_id: data.batch_id ?? "",
        enrolment_date: data.enrolment_date ?? "",
        status: data.status ?? "active",
        total_fee: data.total_fee ?? 0,
        registration_fee_paid: data.registration_fee_paid ?? 0,
        notes: data.notes ?? "",
        photo_url: data.photo_url ?? "",
        id_proof_url: data.id_proof_url ?? "",
        enrolment_no: data.enrolment_no,
        course_name_snapshot: data.course_name_snapshot,
      });
      setLoading(false);
    })();
  }, [id, isNew, fromEnquiry, navigate]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const onCourse = (cid: string) => {
    const c = courses.find((x) => x.id === cid);
    setForm((f) => ({
      ...f,
      course_id: cid,
      course_name_snapshot: c?.name ?? f.course_name_snapshot,
      total_fee: isNew && c ? c.total_fee : f.total_fee,
    }));
  };

  const upload = async (file: File, kind: "photo" | "id") => {
    setUploading(kind);
    const bucket = kind === "photo" ? "crm-course-media" : "crm-student-docs";
    const path = `students/${user?.id ?? "anon"}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) { toast.error(error.message); setUploading(null); return; }
    if (kind === "photo") {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      set("photo_url", data.publicUrl);
    } else {
      // private bucket: store path
      set("id_proof_url", path);
    }
    setUploading(null);
    toast.success("Uploaded");
  };

  const save = async () => {
    if (!form.full_name || !form.phone) { toast.error("Name and phone required"); return; }
    setSaving(true);
    const courseRow = courses.find((c) => c.id === form.course_id);
    const payload = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      alt_phone: form.alt_phone || null,
      email: form.email || null,
      dob: form.dob || null,
      gender: (form.gender || null) as never,
      address: form.address || null,
      course_id: form.course_id || null,
      course_name_snapshot: courseRow?.name ?? form.course_name_snapshot ?? null,
      enrolment_date: form.enrolment_date,
      status: form.status as never,
      total_fee: Number(form.total_fee) || 0,
      registration_fee_paid: Number(form.registration_fee_paid) || 0,
      notes: form.notes || null,
      photo_url: form.photo_url || null,
      id_proof_url: form.id_proof_url || null,
    };
    if (isNew) {
      const { data, error } = await supabase.from("crm_students").insert({
        ...payload,
        source_enquiry_id: fromEnquiry || null,
        created_by: user?.id,
      }).select("id").maybeSingle();
      if (error) { toast.error(error.message); setSaving(false); return; }
      // Mark enquiry as converted
      if (fromEnquiry && data?.id) {
        await supabase.from("crm_enquiries")
          .update({ status: "converted" as never, converted_student_id: data.id })
          .eq("id", fromEnquiry);
      }
      await logAudit("crm_students", "create", data?.id, payload);
      toast.success("Student enrolled");
      navigate(`/crm/students/${data?.id}`);
    } else {
      const { error } = await supabase.from("crm_students").update(payload).eq("id", id!);
      if (error) { toast.error(error.message); setSaving(false); return; }
      await logAudit("crm_students", "update", id, payload);
      toast.success("Saved");
    }
    setSaving(false);
  };

  const remove = async () => {
    if (!confirm("Delete this student record? This cannot be undone.")) return;
    const { error } = await supabase.from("crm_students").delete().eq("id", id!);
    if (error) { toast.error(error.message); return; }
    await logAudit("crm_students", "delete", id);
    toast.success("Deleted");
    navigate("/crm/students");
  };

  if (loading) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isNew ? "New Student" : form.full_name}
        description={form.enrolment_no ? `Enrolment № ${form.enrolment_no}` : "Enrolment number will be generated on save."}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/crm/students")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button onClick={save} disabled={saving}>
              <Save className="w-4 h-4 mr-2" /> {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Personal & enrolment details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Full name *</Label>
                <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>
              <div>
                <Label>Alt phone</Label>
                <Input value={form.alt_phone} onChange={(e) => set("alt_phone", e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div>
                <Label>Date of birth</Label>
                <Input type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)} />
              </div>
              <div>
                <Label>Gender</Label>
                <Select value={form.gender || "unset"} onValueChange={(v) => set("gender", v === "unset" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">—</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Address</Label>
                <Textarea rows={2} value={form.address} onChange={(e) => set("address", e.target.value)} />
              </div>
            </div>

            <div className="border-t pt-4 grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Course *</Label>
                <Select value={form.course_id || "none"} onValueChange={(v) => onCourse(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Enrolment date</Label>
                <Input type="date" value={form.enrolment_date} onChange={(e) => set("enrolment_date", e.target.value)} />
              </div>
              <div>
                <Label>Total fee (₹)</Label>
                <Input type="number" value={form.total_fee} onChange={(e) => set("total_fee", Number(e.target.value))} />
              </div>
              <div>
                <Label>Registration paid (₹)</Label>
                <Input type="number" value={form.registration_fee_paid} onChange={(e) => set("registration_fee_paid", Number(e.target.value))} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["active","completed","on_hold","dropped"].map((s) => <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>

            {!isNew && isAdmin && (
              <div className="pt-4 border-t">
                <Button variant="destructive" size="sm" onClick={remove}>
                  <Trash2 className="w-4 h-4 mr-2" /> Delete student
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label>Photo</Label>
              {form.photo_url && (
                <img src={form.photo_url} alt="" className="w-32 h-32 object-cover rounded-md border my-2" />
              )}
              <Input type="file" accept="image/*" disabled={uploading === "photo"}
                onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "photo")} />
              {uploading === "photo" && <p className="text-xs text-muted-foreground mt-1"><Upload className="inline w-3 h-3 mr-1 animate-pulse" />Uploading…</p>}
            </div>
            <div>
              <Label>ID proof (private)</Label>
              {form.id_proof_url && (
                <p className="text-xs text-muted-foreground my-2 truncate">📎 {form.id_proof_url.split("/").pop()}</p>
              )}
              <Input type="file" accept="image/*,application/pdf" disabled={uploading === "id"}
                onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "id")} />
              {uploading === "id" && <p className="text-xs text-muted-foreground mt-1"><Upload className="inline w-3 h-3 mr-1 animate-pulse" />Uploading…</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
