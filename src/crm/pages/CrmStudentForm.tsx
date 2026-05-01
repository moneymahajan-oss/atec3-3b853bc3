import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, Trash2, Upload, Lock, Plus, MessageSquare, Camera, X, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "../components/PageHeader";
import { StudentAttendanceCard } from "../components/StudentAttendanceCard";
import { useCrmAuth } from "../hooks/useCrmAuth";
import { logAudit } from "../lib/audit";
import { DuplicateAlert } from "../components/DuplicateAlert";
import { normalisePhone } from "../lib/dedupe";
import { toast } from "sonner";

type Course = { id: string; name: string; total_fee: number; registration_fee: number };
type NoteRow = { id: string; body: string; note_type: string; staff_name: string | null; created_at: string };

const empty = {
  full_name: "",
  phone: "",
  alt_phone: "",
  email: "",
  dob: "",
  gender: "",
  // address
  address: "",
  city: "",
  state: "",
  pin: "",
  // family
  father_name: "",
  father_occupation: "",
  father_phone: "",
  mother_name: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  // academic / professional
  qualification: "",
  college_name: "",
  class_year: "",
  stream: "",
  current_status: "",
  company_name: "",
  designation: "",
  // course
  course_id: "",
  batch_id: "",
  enrolment_date: new Date().toISOString().slice(0, 10),
  status: "active",
  // fees
  total_fee: 0,
  discount_amount: 0,
  discount_reason: "",
  registration_fee_paid: 0,
  // attribution
  hear_about_us: "",
  referred_by: "",
  // misc
  notes: "",
  photo_url: "",
  id_proof_url: "",
  address_proof_url: "",
};

const QUALIFICATIONS = ["below_10th","10th","12th","diploma","graduate","post_graduate","other"];
const CURRENT_STATUSES = ["student","working_professional","job_seeker","business_owner","homemaker","other"];

export default function CrmStudentForm() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const fromEnquiry = search.get("from_enquiry");
  const { user, isAdmin } = useCrmAuth();
  const [form, setForm] = useState<typeof empty & { enrolment_no?: string | null; course_name_snapshot?: string | null }>(empty);
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<{ id: string; name: string; course_id: string | null }[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"photo" | "id" | "addr" | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [newNote, setNewNote] = useState("");

  useEffect(() => {
    supabase.from("crm_courses").select("id,name,total_fee,registration_fee").eq("is_active", true).order("name")
      .then(({ data }) => setCourses((data ?? []) as Course[]));
    supabase.from("crm_batches").select("id,name,course_id").order("created_at", { ascending: false })
      .then(({ data }) => setBatches((data ?? []) as never));
  }, []);

  useEffect(() => {
    if (isNew) {
      if (fromEnquiry) {
        supabase.from("crm_enquiries").select("*").eq("id", fromEnquiry).maybeSingle().then(({ data }) => {
          if (!data) return;
          setForm((f) => ({
            ...f,
            full_name: data.name ?? "",
            phone: data.phone ?? "",
            alt_phone: data.alt_phone ?? "",
            email: data.email ?? "",
            city: data.city ?? "",
            state: data.state ?? "",
            course_id: data.course_id ?? "",
            course_name_snapshot: data.course_name_snapshot,
            qualification: data.qualification ?? "",
            college_name: data.college_name ?? "",
            class_year: data.class_year ?? "",
            stream: data.stream ?? "",
            current_status: data.current_status ?? "",
            company_name: data.company_name ?? "",
            designation: data.designation ?? "",
            hear_about_us: data.hear_about_us ?? "",
            referred_by: data.referred_by ?? "",
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
        city: data.city ?? "",
        state: data.state ?? "",
        pin: data.pin ?? "",
        father_name: data.father_name ?? "",
        father_occupation: data.father_occupation ?? "",
        father_phone: data.father_phone ?? "",
        mother_name: data.mother_name ?? "",
        emergency_contact_name: data.emergency_contact_name ?? "",
        emergency_contact_phone: data.emergency_contact_phone ?? "",
        qualification: data.qualification ?? "",
        college_name: data.college_name ?? "",
        class_year: data.class_year ?? "",
        stream: data.stream ?? "",
        current_status: data.current_status ?? "",
        company_name: data.company_name ?? "",
        designation: data.designation ?? "",
        course_id: data.course_id ?? "",
        batch_id: data.batch_id ?? "",
        enrolment_date: data.enrolment_date ?? "",
        status: data.status ?? "active",
        total_fee: data.total_fee ?? 0,
        discount_amount: data.discount_amount ?? 0,
        discount_reason: data.discount_reason ?? "",
        registration_fee_paid: data.registration_fee_paid ?? 0,
        hear_about_us: data.hear_about_us ?? "",
        referred_by: data.referred_by ?? "",
        notes: data.notes ?? "",
        photo_url: data.photo_url ?? "",
        id_proof_url: data.id_proof_url ?? "",
        address_proof_url: data.address_proof_url ?? "",
        enrolment_no: data.enrolment_no,
        course_name_snapshot: data.course_name_snapshot,
      });
      const { data: nd } = await supabase.from("crm_admission_notes")
        .select("id,body,note_type,staff_name,created_at")
        .eq("student_id", id!).order("created_at", { ascending: false });
      setNotes((nd ?? []) as NoteRow[]);
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

  const upload = async (file: File, kind: "photo" | "id" | "addr") => {
    if (kind === "photo") {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        toast.error("Photo must be JPG, PNG or WebP");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Photo must be under 5 MB");
        return;
      }
    }
    setUploading(kind);
    const bucket = kind === "photo" ? "crm-course-media" : "crm-student-docs";
    const folder = kind === "photo" ? `students/photos/${id ?? "new"}` : `students/${user?.id ?? "anon"}`;
    const path = `${folder}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) { toast.error(error.message); setUploading(null); return; }
    if (kind === "photo") {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      set("photo_url", data.publicUrl);
    } else if (kind === "id") {
      set("id_proof_url", path);
    } else {
      set("address_proof_url", path);
    }
    setUploading(null);
    toast.success("Uploaded");
  };

  const removePhoto = () => {
    set("photo_url", "");
    toast.success("Photo removed. Don't forget to Save.");
  };

  const netPayable = Math.max(0, (Number(form.total_fee) || 0) - (Number(form.discount_amount) || 0));

  const save = async () => {
    if (!form.full_name || !form.phone) { toast.error("Name and phone required"); return; }
    if (!/^\d{10}$/.test(form.phone.replace(/\D/g, "").slice(-10))) {
      toast.error("Phone must be 10 digits"); return;
    }
    if (form.pin && !/^\d{6}$/.test(form.pin)) { toast.error("PIN must be 6 digits"); return; }
    if (Number(form.discount_amount) > 0 && !form.discount_reason.trim()) {
      toast.error("Discount reason is required when discount > 0"); return;
    }
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
      city: form.city || null,
      state: form.state || null,
      pin: form.pin || null,
      father_name: form.father_name || null,
      father_occupation: form.father_occupation || null,
      father_phone: form.father_phone || null,
      mother_name: form.mother_name || null,
      emergency_contact_name: form.emergency_contact_name || null,
      emergency_contact_phone: form.emergency_contact_phone || null,
      qualification: (form.qualification || null) as never,
      college_name: form.college_name || null,
      class_year: form.class_year || null,
      stream: form.stream || null,
      current_status: (form.current_status || null) as never,
      company_name: form.company_name || null,
      designation: form.designation || null,
      course_id: form.course_id || null,
      batch_id: form.batch_id || null,
      course_name_snapshot: courseRow?.name ?? form.course_name_snapshot ?? null,
      enrolment_date: form.enrolment_date,
      status: form.status as never,
      total_fee: Number(form.total_fee) || 0,
      discount_amount: Number(form.discount_amount) || 0,
      discount_reason: form.discount_reason || null,
      registration_fee_paid: Number(form.registration_fee_paid) || 0,
      hear_about_us: form.hear_about_us || null,
      referred_by: form.referred_by || null,
      notes: form.notes || null,
      photo_url: form.photo_url || null,
      id_proof_url: form.id_proof_url || null,
      address_proof_url: form.address_proof_url || null,
    };
    if (isNew) {
      // Auto-link to existing enquiry if no explicit fromEnquiry, by matching phone
      let linkedEnquiry: string | null = fromEnquiry;
      if (!linkedEnquiry) {
        const norm = normalisePhone(form.phone);
        if (norm) {
          const { data: existingEnq } = await supabase
            .from("crm_enquiries")
            .select("id")
            .eq("phone", norm)
            .neq("status", "converted" as never)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (existingEnq?.id) linkedEnquiry = existingEnq.id;
        }
      }
      const { data, error } = await supabase.from("crm_students").insert({
        ...payload,
        source_enquiry_id: linkedEnquiry || null,
        created_by: user?.id,
      }).select("id, course_name_snapshot").maybeSingle();
      if (error) { toast.error(error.message); setSaving(false); return; }
      if (linkedEnquiry && data?.id) {
        await supabase.from("crm_enquiries")
          .update({ status: "converted" as never, converted_student_id: data.id })
          .eq("id", linkedEnquiry);
      }
      // Also create the matching enrolment row so this student has a course on the new enrolments table
      if (data?.id && form.course_id) {
        await supabase.from("crm_student_enrolments" as never).insert({
          student_id: data.id,
          course_id: form.course_id,
          course_name_snapshot: payload.course_name_snapshot,
          batch_id: form.batch_id || null,
          enrolment_no: payload.enrolment_no ?? null,
          enrolment_date: payload.enrolment_date,
          status: "active",
          total_fee: payload.total_fee,
          discount_amount: payload.discount_amount,
          discount_reason: payload.discount_reason,
          registration_fee_paid: payload.registration_fee_paid,
          source_enquiry_id: linkedEnquiry || null,
          notes: payload.notes,
          created_by: user?.id ?? null,
        } as never);
      }
      await logAudit("crm_students", "create", data?.id, payload);
      toast.success(linkedEnquiry && !fromEnquiry ? "Student enrolled & linked to existing enquiry" : "Student enrolled");
      navigate(`/crm/students/${data?.id}`);
    } else {
      const { error } = await supabase.from("crm_students").update(payload).eq("id", id!);
      if (error) { toast.error(error.message); setSaving(false); return; }
      await logAudit("crm_students", "update", id, payload);
      toast.success("Saved");
    }
    setSaving(false);
  };

  const addNote = async () => {
    if (!newNote.trim() || isNew) return;
    const { data, error } = await supabase.from("crm_admission_notes").insert({
      student_id: id!,
      body: newNote.trim(),
      note_type: "note",
      staff_id: user?.id,
      staff_name: user?.user_metadata?.full_name || user?.email || null,
    }).select("*").maybeSingle();
    if (error) { toast.error(error.message); return; }
    setNotes((n) => [data as NoteRow, ...n]);
    setNewNote("");
  };

  const remove = async () => {
    if (!confirm("Delete this student record? This cannot be undone.")) return;
    const { error } = await supabase.from("crm_students").delete().eq("id", id!);
    if (error) { toast.error(error.message); return; }
    await logAudit("crm_students", "delete", id);
    toast.success("Deleted");
    navigate("/crm/students");
  };

  const isStudentBg = form.current_status === "student";
  const isWorkingBg = form.current_status === "working_professional" || form.current_status === "business_owner";

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
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Personal details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <DuplicateAlert phone={form.phone} excludeId={isNew ? undefined : id} />
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Full name *</Label>
                  <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
                </div>
                <div>
                  <Label>Phone (10 digits) *</Label>
                  <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={15} />
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
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Address</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Address line</Label>
                <Textarea rows={2} value={form.address} onChange={(e) => set("address", e.target.value)} />
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
                </div>
                <div>
                  <Label>State</Label>
                  <Input value={form.state} onChange={(e) => set("state", e.target.value)} />
                </div>
                <div>
                  <Label>PIN (6 digits)</Label>
                  <Input value={form.pin} onChange={(e) => set("pin", e.target.value)} maxLength={6} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Family & emergency</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Father's name</Label>
                  <Input value={form.father_name} onChange={(e) => set("father_name", e.target.value)} />
                </div>
                <div>
                  <Label>Father's occupation</Label>
                  <Input value={form.father_occupation} onChange={(e) => set("father_occupation", e.target.value)} />
                </div>
                <div>
                  <Label>Father's phone</Label>
                  <Input value={form.father_phone} onChange={(e) => set("father_phone", e.target.value)} />
                </div>
                <div>
                  <Label>Mother's name</Label>
                  <Input value={form.mother_name} onChange={(e) => set("mother_name", e.target.value)} />
                </div>
                <div>
                  <Label>Emergency contact name</Label>
                  <Input value={form.emergency_contact_name} onChange={(e) => set("emergency_contact_name", e.target.value)} />
                </div>
                <div>
                  <Label>Emergency contact phone</Label>
                  <Input value={form.emergency_contact_phone} onChange={(e) => set("emergency_contact_phone", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Background</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Qualification</Label>
                  <Select value={form.qualification || "unset"} onValueChange={(v) => set("qualification", v === "unset" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">—</SelectItem>
                      {QUALIFICATIONS.map((q) => <SelectItem key={q} value={q}>{q.replace(/_/g, " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Current status</Label>
                  <Select value={form.current_status || "unset"} onValueChange={(v) => set("current_status", v === "unset" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">—</SelectItem>
                      {CURRENT_STATUSES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {isStudentBg && (
                  <>
                    <div>
                      <Label>College / school</Label>
                      <Input value={form.college_name} onChange={(e) => set("college_name", e.target.value)} />
                    </div>
                    <div>
                      <Label>Class / year</Label>
                      <Input value={form.class_year} onChange={(e) => set("class_year", e.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Stream</Label>
                      <Input value={form.stream} onChange={(e) => set("stream", e.target.value)} />
                    </div>
                  </>
                )}
                {isWorkingBg && (
                  <>
                    <div>
                      <Label>Company</Label>
                      <Input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} />
                    </div>
                    <div>
                      <Label>Designation</Label>
                      <Input value={form.designation} onChange={(e) => set("designation", e.target.value)} />
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Course & enrolment</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
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
                  <Label>Batch</Label>
                  <Select value={form.batch_id || "none"} onValueChange={(v) => set("batch_id", v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Unassigned —</SelectItem>
                      {batches
                        .filter((b) => !form.course_id || !b.course_id || b.course_id === form.course_id)
                        .map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Enrolment date</Label>
                  <Input type="date" value={form.enrolment_date} onChange={(e) => set("enrolment_date", e.target.value)} />
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Fees</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Total fee (₹)</Label>
                  <Input type="number" value={form.total_fee} onChange={(e) => set("total_fee", Number(e.target.value))} />
                </div>
                <div>
                  <Label>Discount (₹)</Label>
                  <Input type="number" value={form.discount_amount} onChange={(e) => set("discount_amount", Number(e.target.value))} />
                </div>
                {Number(form.discount_amount) > 0 && (
                  <div className="sm:col-span-2">
                    <Label>Discount reason *</Label>
                    <Input value={form.discount_reason} onChange={(e) => set("discount_reason", e.target.value)} placeholder="Required when discount > 0" />
                  </div>
                )}
                <div>
                  <Label>Registration paid (₹)</Label>
                  <Input type="number" value={form.registration_fee_paid} onChange={(e) => set("registration_fee_paid", Number(e.target.value))} />
                </div>
                <div className="flex items-end">
                  <div className="bg-primary/10 border border-primary/20 rounded-md px-4 py-2 w-full">
                    <p className="text-xs text-muted-foreground">Net payable</p>
                    <p className="text-2xl font-bold text-primary">₹ {netPayable.toLocaleString("en-IN")}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Attribution & notes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>How did they hear about us?</Label>
                  <Input value={form.hear_about_us} onChange={(e) => set("hear_about_us", e.target.value)} />
                </div>
                <div>
                  <Label>Referred by</Label>
                  <Input value={form.referred_by} onChange={(e) => set("referred_by", e.target.value)} />
                </div>
              </div>
              <div>
                <Label>General notes</Label>
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

          {!isNew && id && <StudentAttendanceCard studentId={id} />}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Camera className="w-4 h-4" /> Student Photo</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-3">
                <Avatar className="h-32 w-32 border-2 border-dashed">
                  {form.photo_url ? <AvatarImage src={form.photo_url} alt={form.full_name || "Student photo"} /> : null}
                  <AvatarFallback className="text-2xl">
                    {form.full_name
                      ? form.full_name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()
                      : <User className="w-10 h-10 text-muted-foreground" />}
                  </AvatarFallback>
                </Avatar>
                <div className="w-full grid grid-cols-2 gap-2">
                  <Button asChild variant="outline" size="sm" disabled={uploading === "photo"}>
                    <label className="cursor-pointer">
                      <Upload className="w-3.5 h-3.5 mr-1" />
                      {uploading === "photo" ? "Uploading…" : form.photo_url ? "Replace" : "Upload"}
                      <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "photo")} />
                    </label>
                  </Button>
                  <Button asChild variant="outline" size="sm" disabled={uploading === "photo"}>
                    <label className="cursor-pointer">
                      <Camera className="w-3.5 h-3.5 mr-1" /> Camera
                      <input type="file" className="hidden" accept="image/*" capture="user"
                        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "photo")} />
                    </label>
                  </Button>
                </div>
                {form.photo_url && (
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={removePhoto}>
                    <X className="w-3.5 h-3.5 mr-1" /> Remove photo
                  </Button>
                )}
                <p className="text-[11px] text-muted-foreground text-center">JPG / PNG / WebP, max 5 MB</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
            <CardContent className="space-y-5">

              <div>
                <Label>ID proof (private)</Label>
                {form.id_proof_url && (
                  <p className="text-xs text-muted-foreground my-2 truncate">📎 {form.id_proof_url.split("/").pop()}</p>
                )}
                <Input type="file" accept="image/*,application/pdf" disabled={uploading === "id"}
                  onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "id")} />
              </div>
              <div>
                <Label>Address proof (private)</Label>
                {form.address_proof_url && (
                  <p className="text-xs text-muted-foreground my-2 truncate">📎 {form.address_proof_url.split("/").pop()}</p>
                )}
                <Input type="file" accept="image/*,application/pdf" disabled={uploading === "addr"}
                  onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "addr")} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                <Lock className="w-4 h-4" /> Internal admission notes
              </CardTitle>
              <p className="text-xs text-amber-800/70 dark:text-amber-300/70">
                Private — never shown to students. Visible to CRM staff only.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {isNew ? (
                <p className="text-sm text-amber-900/70 dark:text-amber-200/70">Save the student first to add notes.</p>
              ) : (
                <>
                  <Textarea
                    rows={2}
                    placeholder="Add an internal note…"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="bg-white dark:bg-background"
                  />
                  <Button size="sm" onClick={addNote} disabled={!newNote.trim()}>
                    <Plus className="w-4 h-4 mr-1" /> Add note
                  </Button>
                  <div className="space-y-3 pt-2 max-h-[400px] overflow-y-auto">
                    {notes.length === 0 ? (
                      <p className="text-sm text-amber-900/70 dark:text-amber-200/70 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> No notes yet.
                      </p>
                    ) : notes.map((n) => (
                      <div key={n.id} className="border-l-2 border-amber-500/60 pl-3 bg-white/60 dark:bg-background/40 rounded-r p-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[10px]">{n.note_type}</Badge>
                          <span>{new Date(n.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{n.body}</p>
                        {n.staff_name && <p className="text-[11px] text-muted-foreground mt-1">— {n.staff_name}</p>}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
