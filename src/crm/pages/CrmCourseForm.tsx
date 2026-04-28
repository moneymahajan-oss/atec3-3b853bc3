import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "../components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCrmAuth } from "../hooks/useCrmAuth";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { logAudit } from "../lib/audit";
import { Trash2, Upload, ArrowLeft } from "lucide-react";

type Mode = "offline" | "online" | "hybrid";
type Cat = "finance" | "computer";

interface CourseDraft {
  id?: string;
  name: string;
  category: Cat;
  duration: string;
  mode: Mode;
  total_fee: number;
  registration_fee: number;
  emi_options: string;
  concise_syllabus: string;
  detailed_syllabus_html: string;
  brochure_url: string;
  instagram_url: string;
  youtube_url: string;
  video_url: string;
  certificate_title: string;
  is_active: boolean;
  display_order: number;
  slug: string;
  meta_title: string;
  meta_description: string;
  og_image_url: string;
  next_batch_date: string;
}

const empty: CourseDraft = {
  name: "", category: "computer", duration: "", mode: "offline",
  total_fee: 0, registration_fee: 0, emi_options: "",
  concise_syllabus: "", detailed_syllabus_html: "",
  brochure_url: "", instagram_url: "", youtube_url: "", video_url: "",
  certificate_title: "", is_active: true, display_order: 0,
  slug: "", meta_title: "", meta_description: "", og_image_url: "", next_batch_date: "",
};

export default function CrmCourseForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, loading } = useCrmAuth();
  const [draft, setDraft] = useState<CourseDraft>(empty);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const brochureRef = useRef<HTMLInputElement>(null);
  const ogRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id || id === "new") return;
    (async () => {
      const { data, error } = await supabase.from("crm_courses").select("*").eq("id", id).maybeSingle();
      if (error) { toast.error(error.message); return; }
      if (data) {
        setDraft({
          ...empty,
          ...data,
          duration: data.duration ?? "",
          emi_options: Array.isArray(data.emi_options) ? (data.emi_options as string[]).join(", ") : "",
          concise_syllabus: data.concise_syllabus ?? "",
          detailed_syllabus_html: data.detailed_syllabus_html ?? "",
          brochure_url: data.brochure_url ?? "",
          instagram_url: data.instagram_url ?? "",
          youtube_url: data.youtube_url ?? "",
          video_url: data.video_url ?? "",
          certificate_title: data.certificate_title ?? "",
          slug: data.slug ?? "",
          meta_title: data.meta_title ?? "",
          meta_description: data.meta_description ?? "",
          og_image_url: data.og_image_url ?? "",
          next_batch_date: data.next_batch_date ?? "",
          id: data.id,
        });
      }
    })();
  }, [id]);

  if (!loading && !isAdmin) return <Navigate to="/crm/courses" replace />;

  const set = <K extends keyof CourseDraft>(k: K, v: CourseDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const upload = async (file: File, kind: "brochure" | "og" | "video") => {
    setUploading(kind);
    const ext = file.name.split(".").pop();
    const path = `courses/${draft.slug || crypto.randomUUID()}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("crm-course-media").upload(path, file, { upsert: true });
    setUploading(null);
    if (error) { toast.error(error.message); return; }
    const { data: pub } = supabase.storage.from("crm-course-media").getPublicUrl(path);
    if (kind === "brochure") set("brochure_url", pub.publicUrl);
    if (kind === "og") set("og_image_url", pub.publicUrl);
    if (kind === "video") set("video_url", pub.publicUrl);
    toast.success("Uploaded");
  };

  const save = async () => {
    if (!draft.name) { toast.error("Course name is required"); return; }
    setSaving(true);
    const payload = {
      name: draft.name,
      category: draft.category,
      duration: draft.duration || null,
      mode: draft.mode,
      total_fee: draft.total_fee || 0,
      registration_fee: draft.registration_fee || 0,
      emi_options: draft.emi_options ? draft.emi_options.split(",").map((s) => s.trim()).filter(Boolean) : [],
      concise_syllabus: draft.concise_syllabus || null,
      detailed_syllabus_html: draft.detailed_syllabus_html || null,
      brochure_url: draft.brochure_url || null,
      instagram_url: draft.instagram_url || null,
      youtube_url: draft.youtube_url || null,
      video_url: draft.video_url || null,
      certificate_title: draft.certificate_title || null,
      is_active: draft.is_active,
      display_order: draft.display_order || 0,
      slug: draft.slug || draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      meta_title: draft.meta_title || null,
      meta_description: draft.meta_description || null,
      og_image_url: draft.og_image_url || null,
      next_batch_date: draft.next_batch_date || null,
    };
    if (draft.id) {
      const { error } = await supabase.from("crm_courses").update(payload).eq("id", draft.id);
      setSaving(false);
      if (error) return toast.error(error.message);
      logAudit("update", "course", draft.id);
      toast.success("Course updated");
    } else {
      const { data, error } = await supabase.from("crm_courses").insert(payload).select("id").single();
      setSaving(false);
      if (error) return toast.error(error.message);
      logAudit("create", "course", data?.id ?? null);
      toast.success("Course created");
    }
    navigate("/crm/courses");
  };

  const remove = async () => {
    if (!draft.id) return;
    if (!confirm("Delete this course? This cannot be undone.")) return;
    const { error } = await supabase.from("crm_courses").delete().eq("id", draft.id);
    if (error) return toast.error(error.message);
    logAudit("delete", "course", draft.id);
    toast.success("Course deleted");
    navigate("/crm/courses");
  };

  return (
    <div>
      <PageHeader
        title={draft.id ? "Edit course" : "New course"}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate("/crm/courses")}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
            {draft.id && <Button variant="destructive" onClick={remove}><Trash2 className="w-4 h-4 mr-1" /> Delete</Button>}
            <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Section title="Basics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Course name *"><Input value={draft.name} onChange={(e) => set("name", e.target.value)} /></Field>
              <Field label="Category *">
                <Select value={draft.category} onValueChange={(v) => set("category", v as Cat)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="computer">Computer</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Duration"><Input value={draft.duration} onChange={(e) => set("duration", e.target.value)} placeholder="3 Months" /></Field>
              <Field label="Mode">
                <Select value={draft.mode} onValueChange={(v) => set("mode", v as Mode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="offline">Offline</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Total fee (₹)"><Input type="number" value={draft.total_fee} onChange={(e) => set("total_fee", Number(e.target.value))} /></Field>
              <Field label="Registration fee (₹)"><Input type="number" value={draft.registration_fee} onChange={(e) => set("registration_fee", Number(e.target.value))} /></Field>
              <Field label="EMI options (comma-separated)"><Input value={draft.emi_options} onChange={(e) => set("emi_options", e.target.value)} placeholder="3 EMIs of ₹3000, 6 EMIs of ₹1500" /></Field>
              <Field label="Next batch date"><Input type="date" value={draft.next_batch_date} onChange={(e) => set("next_batch_date", e.target.value)} /></Field>
              <Field label="Display order"><Input type="number" value={draft.display_order} onChange={(e) => set("display_order", Number(e.target.value))} /></Field>
              <div className="flex items-center gap-3 pt-7">
                <Switch checked={draft.is_active} onCheckedChange={(v) => set("is_active", v)} />
                <Label>Active (visible to public + counsellors)</Label>
              </div>
            </div>
          </Section>

          <Section title="Syllabus">
            <Field label="Concise syllabus (max 200 words — used in WhatsApp messages)">
              <Textarea rows={5} value={draft.concise_syllabus} onChange={(e) => set("concise_syllabus", e.target.value)} />
            </Field>
            <Field label="Detailed syllabus (HTML — used on full course page & brochure)">
              <Textarea rows={10} className="font-mono text-xs" value={draft.detailed_syllabus_html} onChange={(e) => set("detailed_syllabus_html", e.target.value)} placeholder="<h3>Module 1</h3><p>...</p>" />
            </Field>
          </Section>

          <Section title="Promo media">
            <Field label="Instagram URL"><Input value={draft.instagram_url} onChange={(e) => set("instagram_url", e.target.value)} placeholder="https://instagram.com/..." /></Field>
            <Field label="YouTube URL"><Input value={draft.youtube_url} onChange={(e) => set("youtube_url", e.target.value)} placeholder="https://youtube.com/..." /></Field>
            <Field label="Fallback video upload (Cloudinary alt — Supabase Storage)">
              <div className="flex gap-2">
                <Input value={draft.video_url} onChange={(e) => set("video_url", e.target.value)} placeholder="Public URL" />
                <input ref={videoRef} type="file" accept="video/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "video")} />
                <Button type="button" variant="outline" onClick={() => videoRef.current?.click()} disabled={uploading === "video"}>
                  <Upload className="w-4 h-4 mr-1" /> {uploading === "video" ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </Field>
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Brochure (PDF)">
            <Field label="Brochure URL">
              <div className="flex gap-2">
                <Input value={draft.brochure_url} onChange={(e) => set("brochure_url", e.target.value)} />
                <input ref={brochureRef} type="file" accept="application/pdf" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "brochure")} />
                <Button type="button" variant="outline" onClick={() => brochureRef.current?.click()} disabled={uploading === "brochure"}>
                  <Upload className="w-4 h-4 mr-1" /> {uploading === "brochure" ? "..." : "PDF"}
                </Button>
              </div>
            </Field>
            {draft.brochure_url && (
              <a href={draft.brochure_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Open current brochure</a>
            )}
          </Section>

          <Section title="Certificate">
            <Field label="Certificate title (printed on certificate)">
              <Input value={draft.certificate_title} onChange={(e) => set("certificate_title", e.target.value)} />
            </Field>
          </Section>

          <Section title="SEO">
            <Field label="Slug"><Input value={draft.slug} onChange={(e) => set("slug", e.target.value)} placeholder="auto from name" /></Field>
            <Field label="Meta title (≤60)"><Input maxLength={60} value={draft.meta_title} onChange={(e) => set("meta_title", e.target.value)} /></Field>
            <Field label="Meta description (≤160)"><Textarea rows={2} maxLength={160} value={draft.meta_description} onChange={(e) => set("meta_description", e.target.value)} /></Field>
            <Field label="OG image">
              <div className="flex gap-2">
                <Input value={draft.og_image_url} onChange={(e) => set("og_image_url", e.target.value)} />
                <input ref={ogRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "og")} />
                <Button type="button" variant="outline" onClick={() => ogRef.current?.click()} disabled={uploading === "og"}>
                  <Upload className="w-4 h-4" />
                </Button>
              </div>
            </Field>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border rounded-2xl p-5 space-y-4">
      <h2 className="font-heading font-bold text-lg">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
