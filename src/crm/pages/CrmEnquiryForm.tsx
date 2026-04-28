import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Trash2, MessageSquare, UserPlus, Plus } from "lucide-react";
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
import { toast } from "sonner";

type Course = { id: string; name: string };
type NoteRow = { id: string; body: string; note_type: string; staff_name: string | null; created_at: string };

const empty = {
  name: "",
  phone: "",
  alt_phone: "",
  email: "",
  course_id: "",
  source: "walk_in",
  status: "new",
  priority: "medium",
  follow_up_date: "",
  notes: "",
  lost_reason: "",
};

export default function CrmEnquiryForm() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const { user, isAdmin } = useCrmAuth();
  const [form, setForm] = useState<typeof empty & { course_name_snapshot?: string | null }>(empty);
  const [courses, setCourses] = useState<Course[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    supabase.from("crm_courses").select("id,name").eq("is_active", true).order("name")
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
        course_id: data.course_id ?? "",
        source: data.source ?? "walk_in",
        status: data.status ?? "new",
        priority: data.priority ?? "medium",
        follow_up_date: data.follow_up_date ?? "",
        notes: data.notes ?? "",
        lost_reason: data.lost_reason ?? "",
        course_name_snapshot: data.course_name_snapshot,
      });
      const { data: nd } = await supabase.from("crm_enquiry_notes")
        .select("id,body,note_type,staff_name,created_at")
        .eq("enquiry_id", id!).order("created_at", { ascending: false });
      setNotes((nd ?? []) as NoteRow[]);
      setLoading(false);
    })();
  }, [id, isNew, navigate]);

  const set = (k: keyof typeof empty, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name || !form.phone) { toast.error("Name and phone are required"); return; }
    setSaving(true);
    const courseRow = courses.find((c) => c.id === form.course_id);
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      alt_phone: form.alt_phone || null,
      email: form.email || null,
      course_id: form.course_id || null,
      course_name_snapshot: courseRow?.name ?? form.course_name_snapshot ?? null,
      source: form.source as never,
      status: form.status as never,
      priority: form.priority as never,
      follow_up_date: form.follow_up_date || null,
      notes: form.notes || null,
      lost_reason: form.status === "lost" ? form.lost_reason || null : null,
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

  const convertToStudent = () => {
    if (isNew) return;
    navigate(`/crm/students/new?from_enquiry=${id}`);
  };

  const remove = async () => {
    if (!confirm("Delete this enquiry? This cannot be undone.")) return;
    const { error } = await supabase.from("crm_enquiries").delete().eq("id", id!);
    if (error) { toast.error(error.message); return; }
    await logAudit("crm_enquiries", "delete", id);
    toast.success("Deleted");
    navigate("/crm/enquiries");
  };

  if (loading) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isNew ? "New Enquiry" : form.name}
        description={isNew ? "Capture a fresh lead." : `Phone: ${form.phone}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/crm/enquiries")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
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
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Lead details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Full name *</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
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
                <Label>Source</Label>
                <Select value={form.source} onValueChange={(v) => set("source", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["walk_in","phone","whatsapp","website","instagram","facebook","referral","other"].map((s) =>
                      <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Activity timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isNew ? (
              <p className="text-sm text-muted-foreground">Save the enquiry first to add notes.</p>
            ) : (
              <>
                <div className="flex gap-2">
                  <Textarea rows={2} placeholder="Add a note (call, message, decision…)" value={newNote} onChange={(e) => setNewNote(e.target.value)} />
                </div>
                <Button size="sm" onClick={addNote} disabled={!newNote.trim()}>
                  <Plus className="w-4 h-4 mr-1" /> Add note
                </Button>
                <div className="space-y-3 pt-2 max-h-[480px] overflow-y-auto">
                  {notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No notes yet.</p>
                  ) : notes.map((n) => (
                    <div key={n.id} className="border-l-2 border-primary/40 pl-3">
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
  );
}
