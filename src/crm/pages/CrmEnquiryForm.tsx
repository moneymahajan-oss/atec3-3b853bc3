import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Trash2, MessageSquare, UserPlus, Plus, Lock, Send } from "lucide-react";
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
import { useCrmAuth } from "../hooks/useCrmAuth";
import { logAudit } from "../lib/audit";
import { SendWhatsAppCard } from "../components/SendWhatsAppCard";
import { EnquiryTimeline } from "../components/EnquiryTimeline";
import { DuplicateAlert } from "../components/DuplicateAlert";
import { sendEnquiryFormViaWhatsApp } from "../lib/sendForm";
import { toast } from "sonner";

type Course = { id: string; name: string };
type NoteRow = { id: string; body: string; note_type: string; staff_name: string | null; created_at: string };

const empty = {
  name: "",
  phone: "",
  alt_phone: "",
  email: "",
  city: "",
  state: "",
  course_id: "",
  source: "walk_in",
  status: "new",
  priority: "medium",
  follow_up_date: "",
  notes: "",
  lost_reason: "",
  // academic / professional
  qualification: "",
  college_name: "",
  class_year: "",
  stream: "",
  current_status: "",
  company_name: "",
  designation: "",
  // preferences
  preferred_mode: "",
  preferred_timing: "",
  budget_range: "",
  // attribution
  hear_about_us: "",
  referred_by: "",
  assigned_to: "",
  assigned_to_name: "",
};

const SOURCES = ["walk_in","phone","whatsapp","website","instagram","facebook","referral","google","youtube","crm_walk_in","other"];
// Values must match Postgres enums exactly (crm_qualification, crm_budget_range)
const QUALIFICATIONS = ["class_10","class_12","graduation","post_graduation","diploma","other"];
const QUAL_LABELS: Record<string, string> = {
  class_10: "Class 10",
  class_12: "Class 12",
  graduation: "Graduation",
  post_graduation: "Post-graduation",
  diploma: "Diploma",
  other: "Other",
};
const CURRENT_STATUSES = ["student","working_professional","job_seeker","business_owner","homemaker","other"];
const TIMINGS = ["morning","afternoon","evening","weekend","flexible"];
const BUDGETS = ["under_5k","5k_10k","10k_20k","20k_plus","flexible"];
const BUDGET_LABELS: Record<string, string> = {
  under_5k: "Below ₹5,000",
  "5k_10k": "₹5,000 – ₹10,000",
  "10k_20k": "₹10,000 – ₹20,000",
  "20k_plus": "Above ₹20,000",
  flexible: "Flexible",
};

export default function CrmEnquiryForm() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const { user, isAdmin } = useCrmAuth();
  const [form, setForm] = useState<typeof empty & { course_name_snapshot?: string | null }>(empty);
  const [courses, setCourses] = useState<Course[]>([]);
  const [staffList, setStaffList] = useState<{ user_id: string; display_name: string | null }[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [createdByName, setCreatedByName] = useState<string | null>(null);
  const [prevStatus, setPrevStatus] = useState<string>("new");
  const [courseDetails, setCourseDetails] = useState<{ id: string; name: string; total_fee: number | null; duration: string | null; mode: string | null; brochure_url: string | null; video_url: string | null; instagram_url: string | null; concise_syllabus: string | null; detailed_syllabus_html: string | null; next_batch_date: string | null } | null>(null);
  const [institute, setInstitute] = useState<{ name: string | null; phone: string | null; whatsapp_number: string | null; website: string | null } | null>(null);

  useEffect(() => {
    supabase.from("courses").select("id,name").eq("is_active", true).order("name")
      .then(({ data }) => setCourses((data ?? []) as Course[]));
  }, []);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const { data, error } = await supabase.from("crm_enquiries").select("*").eq("id", id!).maybeSingle();
      if (error || !data) { toast.error("Enquiry not found"); navigate("/crm/enquiries"); return; }
      setForm({
        name: data.name ?? "",
        phone: data.phone ?? "",
        alt_phone: data.alt_phone ?? "",
        email: data.email ?? "",
        city: data.city ?? "",
        state: data.state ?? "",
        course_id: data.course_id ?? "",
        source: data.source ?? "walk_in",
        status: data.status ?? "new",
        priority: data.priority ?? "medium",
        follow_up_date: data.follow_up_date ?? "",
        notes: data.notes ?? "",
        lost_reason: data.lost_reason ?? "",
        qualification: data.qualification ?? "",
        college_name: data.college_name ?? "",
        class_year: data.class_year ?? "",
        stream: data.stream ?? "",
        current_status: data.current_status ?? "",
        company_name: data.company_name ?? "",
        designation: data.designation ?? "",
        preferred_mode: data.preferred_mode ?? "",
        preferred_timing: data.preferred_timing ?? "",
        budget_range: data.budget_range ?? "",
        hear_about_us: data.hear_about_us ?? "",
        referred_by: data.referred_by ?? "",
        assigned_to: (data as any).assigned_to ?? "",
        assigned_to_name: (data as any).assigned_to_name ?? "",
        course_name_snapshot: data.course_name_snapshot,
      });
      setCreatedAt(data.created_at ?? null);
      setCreatedByName((data as { created_by_name?: string | null }).created_by_name ?? null);
      setPrevStatus(data.status ?? "new");
      const { data: nd } = await supabase.from("crm_enquiry_notes")
        .select("id,body,note_type,staff_name,created_at")
        .eq("enquiry_id", id!).order("created_at", { ascending: false });
      setNotes((nd ?? []) as NoteRow[]);
      setLoading(false);
    })();
    supabase.from("crm_institute_settings").select("name, phone, whatsapp_number, website, address").maybeSingle()
      .then(({ data }) => setInstitute((data as never) ?? null));
  }, [id, isNew, navigate]);

  // Load course details when course_id changes
  useEffect(() => {
    if (!form.course_id) { setCourseDetails(null); return; }
    supabase.from("courses")
      .select("id, name, slug, total_fee, duration, mode, brochure_url, video_url, youtube_url, instagram_url, concise_syllabus, detailed_syllabus_html, next_batch_date")
      .eq("id", form.course_id).maybeSingle()
      .then(({ data }) => setCourseDetails((data as never) ?? null));
  }, [form.course_id]);

  const set = (k: keyof typeof empty, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name || !form.phone) { toast.error("Name and phone are required"); return; }
    if (!/^\d{10}$/.test(form.phone.replace(/\D/g, "").slice(-10))) {
      toast.error("Phone must be 10 digits"); return;
    }
    setSaving(true);
    const courseRow = courses.find((c) => c.id === form.course_id);
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      alt_phone: form.alt_phone || null,
      email: form.email || null,
      city: form.city || null,
      state: form.state || null,
      course_id: form.course_id || null,
      course_name_snapshot: courseRow?.name ?? form.course_name_snapshot ?? null,
      source: form.source as never,
      status: form.status as never,
      priority: form.priority as never,
      follow_up_date: form.follow_up_date || null,
      notes: form.notes || null,
      lost_reason: form.status === "lost" ? form.lost_reason || null : null,
      qualification: (form.qualification || null) as never,
      college_name: form.college_name || null,
      class_year: form.class_year || null,
      stream: form.stream || null,
      current_status: (form.current_status || null) as never,
      company_name: form.company_name || null,
      designation: form.designation || null,
      preferred_mode: form.preferred_mode || null,
      preferred_timing: (form.preferred_timing || null) as never,
      budget_range: (form.budget_range || null) as never,
      hear_about_us: form.hear_about_us || null,
      referred_by: form.referred_by || null,
      assigned_to: form.assigned_to || null,
      assigned_to_name: form.assigned_to_name || null,
    };
    if (isNew) {
      const { data, error } = await supabase.from("crm_enquiries").insert({
        ...payload,
        created_by: user?.id,
        created_by_name: user?.user_metadata?.full_name || user?.email || null,
      }).select("id").maybeSingle();
      if (error) { toast.error(error.message); setSaving(false); return; }
      await logAudit("crm_enquiries", "create", data?.id, payload);
      toast.success("Enquiry created");
      navigate(`/crm/enquiries/${data?.id}`);
    } else {
      const { error } = await supabase.from("crm_enquiries").update(payload).eq("id", id!);
      if (error) { toast.error(error.message); setSaving(false); return; }
      await logAudit("crm_enquiries", "update", id, payload);
      // Stage change: write a system note
      if (prevStatus !== form.status) {
        const { data: nd } = await supabase.from("crm_enquiry_notes").insert({
          enquiry_id: id!,
          body: `Stage changed: ${prevStatus.replace(/_/g, " ")} → ${form.status.replace(/_/g, " ")}${form.status === "lost" && form.lost_reason ? ` (reason: ${form.lost_reason})` : ""}`,
          note_type: "stage_change",
          staff_id: user?.id,
          staff_name: user?.user_metadata?.full_name || user?.email || null,
        }).select("*").maybeSingle();
        if (nd) setNotes((n) => [nd as NoteRow, ...n]);
        setPrevStatus(form.status);
      }
      toast.success("Saved");
    }
    setSaving(false);
  };

  const addNote = async () => {
    if (!newNote.trim() || isNew) return;
    const { data, error } = await supabase.from("crm_enquiry_notes").insert({
      enquiry_id: id!,
      body: newNote.trim(),
      note_type: "note",
      staff_id: user?.id,
      staff_name: user?.user_metadata?.full_name || user?.email || null,
    }).select("*").maybeSingle();
    if (error) { toast.error(error.message); return; }
    setNotes((n) => [data as NoteRow, ...n]);
    setNewNote("");
  };

  const convertToStudent = async () => {
    if (isNew) return;
    // If a student with this phone already exists, skip the new-student form
    // and jump straight to "Add another course" — pre-filled from this enquiry.
    const norm = (form.phone || "").replace(/\D/g, "").slice(-10);
    if (norm.length === 10) {
      const { data: existing } = await supabase
        .from("crm_students")
        .select("id, full_name")
        .eq("phone", norm)
        .maybeSingle();
      if (existing?.id) {
        toast.info(`${existing.full_name} already exists — adding this course to their profile.`);
        navigate(`/crm/students/${existing.id}/add-course?from_enquiry=${id}`);
        return;
      }
    }
    navigate(`/crm/students/new?from_enquiry=${id}`);
  };

  const remove = async () => {
    if (!confirm(
      "Delete this enquiry?\n\nThis will also remove:\n• All notes & timeline\n• All WhatsApp send logs\n• Link from any converted student (the student record itself is kept)\n\nThis cannot be undone."
    )) return;
    const { error } = await supabase.from("crm_enquiries").delete().eq("id", id!);
    if (error) { toast.error(error.message); return; }
    await logAudit("crm_enquiries", "delete", id);
    toast.success("Enquiry and related records deleted");
    navigate("/crm/enquiries");
  };

  const isStudent = form.current_status === "student";
  const isWorking = form.current_status === "working_professional" || form.current_status === "business_owner";

  if (loading) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isNew ? "New Enquiry" : form.name}
        description={
          isNew
            ? "Capture a fresh lead."
            : createdAt
              ? `Phone: ${form.phone} · Enquiry received ${Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000))} day(s) ago${createdByName ? ` · by ${createdByName}` : ""}`
              : `Phone: ${form.phone}`
        }
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => navigate("/crm/enquiries")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                const rawPhone = (form.phone || "").replace(/\D/g, "");
                const phone = rawPhone || window.prompt("Enter the person's WhatsApp number (with country code, digits only):", "91")?.replace(/\D/g, "") || "";
                if (!phone || phone.length < 10) { toast.error("Valid phone number required (10+ digits)"); return; }
                const ok = await sendEnquiryFormViaWhatsApp({
                  phone,
                  name: form.name?.trim() || undefined,
                  formUrl: `${window.location.origin}/enquire`,
                  instituteName: institute?.name || "ATEC Education",
                  entityId: isNew ? undefined : id,
                });
                if (ok) toast.success("Form link sent — logged to WhatsApp history");
              }}
              title="Send the public enquiry form link to this person on WhatsApp"
            >
              <Send className="w-4 h-4 mr-2" /> Send Form Link
            </Button>
            {!isNew && form.status !== "converted" && (
              <Button variant="secondary" onClick={convertToStudent}>
                <UserPlus className="w-4 h-4 mr-2" /> Convert to Student
              </Button>
            )}
            <Button onClick={save} disabled={saving}>
              <Save className="w-4 h-4 mr-2" /> {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Basic info</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <DuplicateAlert phone={form.phone} excludeId={isNew ? undefined : id} />
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Full name *</Label>
                  <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
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
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
                </div>
                <div>
                  <Label>State</Label>
                  <Input value={form.state} onChange={(e) => set("state", e.target.value)} />
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
                      {QUALIFICATIONS.map((q) => <SelectItem key={q} value={q}>{QUAL_LABELS[q] ?? q}</SelectItem>)}
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
                {isStudent && (
                  <>
                    <div>
                      <Label>College / school</Label>
                      <Input value={form.college_name} onChange={(e) => set("college_name", e.target.value)} />
                    </div>
                    <div>
                      <Label>Class / year</Label>
                      <Input value={form.class_year} onChange={(e) => set("class_year", e.target.value)} placeholder="e.g. 2nd year, 12th" />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Stream</Label>
                      <Input value={form.stream} onChange={(e) => set("stream", e.target.value)} placeholder="e.g. Commerce, Science" />
                    </div>
                  </>
                )}
                {isWorking && (
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
            <CardHeader><CardTitle>Course & preferences</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Course of interest</Label>
                  <Select value={form.course_id || "none"} onValueChange={(v) => set("course_id", v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Preferred mode</Label>
                  <Select value={form.preferred_mode || "unset"} onValueChange={(v) => set("preferred_mode", v === "unset" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">—</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Preferred timing</Label>
                  <Select value={form.preferred_timing || "unset"} onValueChange={(v) => set("preferred_timing", v === "unset" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">—</SelectItem>
                      {TIMINGS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Budget range</Label>
                  <Select value={form.budget_range || "unset"} onValueChange={(v) => set("budget_range", v === "unset" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">—</SelectItem>
                      {BUDGETS.map((b) => <SelectItem key={b} value={b}>{BUDGET_LABELS[b] ?? b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Pipeline</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Source</Label>
                  <Select value={form.source} onValueChange={(v) => set("source", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SOURCES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>How did they hear about us?</Label>
                  <Input value={form.hear_about_us} onChange={(e) => set("hear_about_us", e.target.value)} placeholder="Free text" />
                </div>
                <div>
                  <Label>Referred by</Label>
                  <Input value={form.referred_by} onChange={(e) => set("referred_by", e.target.value)} placeholder="Name / student" />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => set("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["new","contacted","follow_up","converted","lost","junk"].map((s) =>
                        <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["low","medium","high"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Follow-up date</Label>
                  <Input type="date" value={form.follow_up_date} onChange={(e) => set("follow_up_date", e.target.value)} />
                </div>
                <div>
                  <Label>Assigned to (counsellor)</Label>
                  <Select value={form.assigned_to || "unset"} onValueChange={(v) => {
                    if (v === "unset") { set("assigned_to", ""); set("assigned_to_name", ""); return; }
                    const staff = staffList.find((s) => s.user_id === v);
                    set("assigned_to", v);
                    set("assigned_to_name", staff?.display_name || v);
                  }}>
                    <SelectTrigger><SelectValue placeholder="— Unassigned —" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">— Unassigned —</SelectItem>
                      {staffList.map((s) => (
                        <SelectItem key={s.user_id} value={s.user_id}>{s.display_name || s.user_id}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {form.status === "lost" && (
                  <div className="sm:col-span-2">
                    <Label>Lost reason</Label>
                    <Input value={form.lost_reason} onChange={(e) => set("lost_reason", e.target.value)} />
                  </div>
                )}
              </div>
              <div>
                <Label>Initial notes</Label>
                <Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
              </div>
              {!isNew && isAdmin && (
                <div className="pt-4 border-t">
                  <Button variant="destructive" size="sm" onClick={remove}>
                    <Trash2 className="w-4 h-4 mr-2" /> Delete enquiry
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 h-fit lg:sticky lg:top-4">
          {!isNew && (
            <SendWhatsAppCard
              enquiry={{
                enquiryId: id!,
                name: form.name,
                phone: form.phone,
                whatsapp: null,
                course_name_snapshot: form.course_name_snapshot ?? null,
              }}
              course={courseDetails as never}
              institute={(institute ?? { name: null, phone: null, whatsapp_number: null, website: null }) as never}
            />
          )}
          {!isNew && (
            <EnquiryTimeline
              enquiryId={id!}
              createdAt={createdAt}
              source={form.source}
              createdByName={createdByName}
            />
          )}
          <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
              <Lock className="w-4 h-4" /> Internal staff notes
            </CardTitle>
            <p className="text-xs text-amber-800/70 dark:text-amber-300/70">
              Private — never shown to students. Visible to CRM staff only.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {isNew ? (
              <p className="text-sm text-amber-900/70 dark:text-amber-200/70">Save the enquiry first to add notes.</p>
            ) : (
              <>
                <Textarea
                  rows={2}
                  placeholder="Add a note (call, message, decision…)"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="bg-white dark:bg-background"
                />
                <Button size="sm" onClick={addNote} disabled={!newNote.trim()}>
                  <Plus className="w-4 h-4 mr-1" /> Add note
                </Button>
                <div className="space-y-3 pt-2 max-h-[480px] overflow-y-auto">
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
