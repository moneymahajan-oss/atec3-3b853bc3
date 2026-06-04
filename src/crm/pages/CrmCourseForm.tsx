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
import { Trash2, Upload, ArrowLeft, Plus, X, GripVertical, AlertCircle, CheckCircle2 } from "lucide-react";

type Mode = "offline" | "online" | "hybrid";
type Cat = "finance" | "computer" | "AI Programs" | "Digital Marketing Stack" | "Tally Certifications" | "Commerce Courses" | "Office & Productivity" | "AI Kids Programs" | "Programming";

// ── Unified draft — every field from both Admin panel AND CRM panel ──────────
interface CourseDraft {
  id?: string;

  // ── Core identity (both panels) ──────────────────────────────────────────
  name: string;
  category: Cat;
  duration: string;
  mode: Mode;
  badge_label: string;         // Admin: Badge
  display_order: number;
  is_active: boolean;
  is_featured: boolean;        // Admin: Featured

  // ── Fees (CRM uses numbers, Admin used text — unified as numbers) ─────────
  total_fee: number;           // Admin called this "fee" (text) — now a number
  registration_fee: number;
  emi_options: string;         // stored as array, edited as comma-separated

  // ── Syllabus — ALL THREE formats in one place ─────────────────────────────
  // 1. JSON modules array (from Admin) — edited as structured list in CRM
  syllabus_modules: SyllabusModule[];  // maps to `syllabus` DB column
  // 2. Short description for WhatsApp & cards
  concise_syllabus: string;    // Admin: short_description — unified
  // 3. Full HTML for course page
  detailed_syllabus_html: string; // Admin: full_description — unified

  // ── Media ────────────────────────────────────────────────────────────────
  thumbnail_url: string;       // Admin: Thumbnail URL — card image
  og_image_url: string;        // CRM: OG image for SEO
  syllabus_image_url: string;  // NEW: photo of syllabus page (sent as WA thumbnail)
  youtube_url: string;         // unified video
  video_url: string;           // fallback uploaded video
  instagram_url: string;
  brochure_url: string;        // Admin: brochure_pdf_url / syllabus_pdf_url — unified
  syllabus_pdf_url: string;    // kept in sync with brochure_url

  // ── Batch & certificate (CRM) ─────────────────────────────────────────────
  next_batch_date: string;
  certificate_title: string;

  // ── WhatsApp (Admin) ──────────────────────────────────────────────────────
  whatsapp_template_key: string; // Admin: WhatsApp Template Key

  // ── SEO (CRM) ─────────────────────────────────────────────────────────────
  slug: string;
  meta_title: string;
  meta_description: string;
}

interface SyllabusModule {
  title: string;
  topics?: string[];  // optional sub-topics
}

const empty: CourseDraft = {
  name: "", category: "computer", duration: "", mode: "offline",
  badge_label: "", display_order: 0, is_active: true, is_featured: false,
  total_fee: 0, registration_fee: 0, emi_options: "",
  syllabus_modules: [],
  concise_syllabus: "", detailed_syllabus_html: "",
  thumbnail_url: "", og_image_url: "", syllabus_image_url: "",
  youtube_url: "", video_url: "", instagram_url: "",
  brochure_url: "", syllabus_pdf_url: "",
  next_batch_date: "", certificate_title: "",
  whatsapp_template_key: "",
  slug: "", meta_title: "", meta_description: "",
};

// ── Convert JSON syllabus array (from DB) → SyllabusModule[] ────────────────
function parseSyllabusJson(raw: unknown): SyllabusModule[] {
  if (!raw) return [];
  try {
    const arr: unknown[] = Array.isArray(raw) ? raw : JSON.parse(String(raw));
    return arr.map((item) => {
      if (typeof item === "string") return { title: item };
      if (typeof item === "object" && item !== null) {
        const obj = item as Record<string, unknown>;
        return {
          title: String(obj.title || obj.name || obj.module || ""),
          topics: Array.isArray(obj.topics)
            ? obj.topics.map((t: unknown) => (typeof t === "string" ? t : String(t)))
            : undefined,
        };
      }
      return { title: String(item) };
    }).filter((m) => m.title.trim());
  } catch {
    return [];
  }
}

// ── Convert SyllabusModule[] → plain bullet text for WhatsApp ───────────────
export function syllabusToWhatsApp(modules: SyllabusModule[]): string {
  if (!modules.length) return "";
  return modules
    .map((m, i) => {
      const num = `${i + 1}. *${m.title}*`;
      if (m.topics?.length) {
        return num + "\n" + m.topics.map((t) => `   • ${t}`).join("\n");
      }
      return num;
    })
    .join("\n");
}

// ── Convert SyllabusModule[] → HTML numbered list ────────────────────────────
function syllabusToHtml(modules: SyllabusModule[]): string {
  if (!modules.length) return "";
  const items = modules.map((m) => {
    if (m.topics?.length) {
      return `  <li><strong>${m.title}</strong><ul>\n${m.topics.map((t) => `    <li>${t}</li>`).join("\n")}\n  </ul></li>`;
    }
    return `  <li>${m.title}</li>`;
  });
  return "<ol>\n" + items.join("\n") + "\n</ol>";
}

// ── Auto-generate concise_syllabus from modules ──────────────────────────────
function syllabusToConcisc(modules: SyllabusModule[]): string {
  if (!modules.length) return "";
  const titles = modules.map((m) => m.title);
  const shown = titles.slice(0, 4).join(", ");
  const extra = titles.length > 4 ? ` and ${titles.length - 4} more topics` : "";
  return `Modules covered: ${shown}${extra}.`;
}

export default function CrmCourseForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, loading } = useCrmAuth();
  const [draft, setDraft] = useState<CourseDraft>(empty);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  // File input refs
  const brochureRef    = useRef<HTMLInputElement>(null);
  const ogRef          = useRef<HTMLInputElement>(null);
  const videoRef       = useRef<HTMLInputElement>(null);
  const thumbnailRef   = useRef<HTMLInputElement>(null);
  const syllabusImgRef = useRef<HTMLInputElement>(null);

  // ── Load course ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id || id === "new") return;
    (async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", id).maybeSingle();
      if (error) { toast.error(error.message); return; }
      if (!data) return;

      const d = data as Record<string, unknown>;

      // Parse JSON syllabus → structured modules
      const modules = parseSyllabusJson(d.syllabus);

      // Migrate old fields → new fields (read-time migration, safe/idempotent)
      const concise =
        String(d.concise_syllabus || "").trim() ||
        String(d.short_description || "").trim() ||
        (modules.length ? syllabusToConcisc(modules) : "");

      const detailedHtml =
        String(d.detailed_syllabus_html || "").trim() ||
        String(d.full_description || "").trim() ||
        (modules.length ? syllabusToHtml(modules) : "");

      const ogImage =
        String(d.og_image_url || "").trim() ||
        String(d.thumbnail_url || "").trim();

      const brochure =
        String(d.brochure_url || "").trim() ||
        String(d.brochure_pdf_url || "").trim() ||
        String(d.syllabus_pdf_url || "").trim();

      const youtubeUrl =
        String(d.youtube_url || "").trim() ||
        (String(d.video_url || "").includes("youtu") ? String(d.video_url || "").trim() : "");

      // fee text → number
      let totalFee = Number(d.total_fee) || 0;
      if (!totalFee && d.fee) {
        const cleaned = String(d.fee).replace(/[^0-9]/g, "");
        totalFee = cleaned ? parseInt(cleaned, 10) : 0;
      }

      setDraft({
        ...empty,
        id: String(d.id || ""),
        name: String(d.name || ""),
        category: (d.category as Cat) || "computer",
        duration: String(d.duration || ""),
        mode: (d.mode as Mode) || "offline",
        badge_label: String(d.badge_label || ""),
        display_order: Number(d.display_order) || 0,
        is_active: d.is_active !== false,
        is_featured: Boolean(d.is_featured),
        total_fee: totalFee,
        registration_fee: Number(d.registration_fee) || 0,
        emi_options: Array.isArray(d.emi_options)
          ? (d.emi_options as string[]).join(", ")
          : String(d.emi_options || ""),
        syllabus_modules: modules,
        concise_syllabus: concise,
        detailed_syllabus_html: detailedHtml,
        thumbnail_url: String(d.thumbnail_url || "").trim(),
        og_image_url: ogImage,
        syllabus_image_url: String(d.syllabus_image_url || "").trim(),
        youtube_url: youtubeUrl,
        video_url: String(d.video_url || "").trim(),
        instagram_url: String(d.instagram_url || "").trim(),
        brochure_url: brochure,
        syllabus_pdf_url: brochure,
        next_batch_date: String(d.next_batch_date || ""),
        certificate_title: String(d.certificate_title || ""),
        whatsapp_template_key: String(d.whatsapp_template_key || ""),
        slug: String(d.slug || ""),
        meta_title: String(d.meta_title || ""),
        meta_description: String(d.meta_description || ""),
      });
    })();
  }, [id]);

  if (!loading && !isAdmin) return <Navigate to="/crm/courses" replace />;

  const set = <K extends keyof CourseDraft>(k: K, v: CourseDraft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  // ── File upload ────────────────────────────────────────────────────────────
  const upload = async (file: File, kind: "brochure" | "og" | "video" | "thumbnail" | "syllabus_image") => {
    setUploading(kind);
    const ext = file.name.split(".").pop();
    const slug = draft.slug || draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "course";
    const path = `courses/${slug}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("crm-course-media").upload(path, file, { upsert: true });
    setUploading(null);
    if (error) { toast.error(error.message); return; }
    const { data: pub } = supabase.storage.from("crm-course-media").getPublicUrl(path);
    const url = pub.publicUrl;
    if (kind === "brochure")       { set("brochure_url", url); set("syllabus_pdf_url", url); }
    if (kind === "og")             set("og_image_url", url);
    if (kind === "thumbnail")      { set("thumbnail_url", url); if (!draft.og_image_url) set("og_image_url", url); }
    if (kind === "video")          set("video_url", url);
    if (kind === "syllabus_image") set("syllabus_image_url", url);
    toast.success("Uploaded ✓");
  };

  // ── Syllabus module helpers ────────────────────────────────────────────────
  const addModule = () =>
    set("syllabus_modules", [...draft.syllabus_modules, { title: "" }]);

  const updateModule = (i: number, title: string) => {
    const mods = [...draft.syllabus_modules];
    mods[i] = { ...mods[i], title };
    set("syllabus_modules", mods);
  };

  const removeModule = (i: number) =>
    set("syllabus_modules", draft.syllabus_modules.filter((_, idx) => idx !== i));

  // When modules change, auto-sync concise_syllabus if it was auto-generated
  const syncFromModules = (modules: SyllabusModule[]) => {
    set("syllabus_modules", modules);
    // Only auto-update detailed HTML — don't overwrite concise if user edited it
    set("detailed_syllabus_html", syllabusToHtml(modules));
    // Auto-generate concise only if currently empty or was previously auto-generated
    if (!draft.concise_syllabus || draft.concise_syllabus.startsWith("Modules covered:")) {
      set("concise_syllabus", syllabusToConcisc(modules));
    }
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const save = async () => {
    if (!draft.name) { toast.error("Course name is required"); return; }
    setSaving(true);

    const autoSlug = draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    // Convert modules → JSON array for DB
    const syllabusJson = draft.syllabus_modules.length > 0
      ? draft.syllabus_modules.map((m) =>
          m.topics?.length ? { title: m.title, topics: m.topics } : m.title
        )
      : null;

    // Auto-sync detailed HTML from modules if HTML is empty
    const finalDetailedHtml = draft.detailed_syllabus_html ||
      (draft.syllabus_modules.length ? syllabusToHtml(draft.syllabus_modules) : null);

    // Auto-sync concise_syllabus from modules if empty
    const finalConcise = draft.concise_syllabus ||
      (draft.syllabus_modules.length ? syllabusToConcisc(draft.syllabus_modules) : null);

    // EMI options: comma string → array
    const emiArr = draft.emi_options
      ? draft.emi_options.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const payload = {
      // Core
      name:               draft.name,
      category:           draft.category,
      duration:           draft.duration || null,
      mode:               draft.mode,
      badge_label:        draft.badge_label || null,
      display_order:      draft.display_order || 0,
      is_active:          draft.is_active,
      is_featured:        draft.is_featured,

      // Fees
      total_fee:          draft.total_fee || 0,
      registration_fee:   draft.registration_fee || 0,
      emi_options:        emiArr,
      // Keep old fee column in sync so Admin panel still shows value
      fee:                draft.total_fee ? `₹${draft.total_fee.toLocaleString("en-IN")}` : null,

      // Syllabus — all three formats saved simultaneously
      syllabus:           syllabusJson,              // old JSON column — Admin panel reads this
      concise_syllabus:   finalConcise,              // new column — WhatsApp & cards
      short_description:  finalConcise,              // old column — keep in sync
      detailed_syllabus_html: finalDetailedHtml,     // new column — course page
      full_description:   finalDetailedHtml,         // old column — keep in sync

      // Media — both old and new column names kept in sync
      thumbnail_url:      draft.thumbnail_url || null,
      og_image_url:       draft.og_image_url || draft.thumbnail_url || null,
      syllabus_image_url: draft.syllabus_image_url || null,
      youtube_url:        draft.youtube_url || null,
      video_url:          draft.video_url || draft.youtube_url || null,
      instagram_url:      draft.instagram_url || null,
      brochure_url:       draft.brochure_url || null,
      brochure_pdf_url:   draft.brochure_url || null, // old column — keep in sync
      syllabus_pdf_url:   draft.brochure_url || null, // old column — keep in sync

      // Batch & cert
      next_batch_date:    draft.next_batch_date || null,
      certificate_title:  draft.certificate_title || null,

      // WhatsApp
      whatsapp_template_key: draft.whatsapp_template_key || null,

      // SEO
      slug:              draft.slug || autoSlug,
      meta_title:        draft.meta_title || null,
      meta_description:  draft.meta_description || null,
    };

    if (draft.id) {
      const { error } = await supabase.from("courses").update(payload).eq("id", draft.id);
      setSaving(false);
      if (error) return toast.error(error.message);
      logAudit("update", "course", draft.id);
      toast.success("Course updated ✓");
    } else {
      const { data, error } = await supabase.from("courses").insert(payload).select("id").single();
      setSaving(false);
      if (error) return toast.error(error.message);
      logAudit("create", "course", data?.id ?? null);
      toast.success("Course created ✓");
    }
    navigate("/crm/courses");
  };

  const remove = async () => {
    if (!draft.id) return;
    if (!confirm("Delete this course? This cannot be undone.")) return;
    const { error } = await supabase.from("courses").delete().eq("id", draft.id);
    if (error) return toast.error(error.message);
    logAudit("delete", "course", draft.id);
    toast.success("Deleted");
    navigate("/crm/courses");
  };

  // ── WhatsApp message preview ───────────────────────────────────────────────
  const waPreview = (() => {
    const bulletSyllabus = syllabusToWhatsApp(draft.syllabus_modules);
    const brochure = draft.brochure_url || "";
    const video = draft.youtube_url || draft.video_url || "";
    const parts: string[] = [];
    if (draft.concise_syllabus) parts.push(draft.concise_syllabus);
    if (bulletSyllabus) parts.push("\n*Course Syllabus:*\n" + bulletSyllabus);
    if (brochure) parts.push("\n📄 *Brochure:* " + brochure);
    if (video) parts.push("🎬 *Video:* " + video);
    return parts.join("\n");
  })();

  return (
    <div>
      <PageHeader
        title={draft.id ? "Edit course" : "New course"}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate("/crm/courses")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            {draft.id && (
              <Button variant="destructive" onClick={remove}>
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
            )}
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT: main content ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* BASICS */}
          <Section title="Basics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Course name *">
                <Input value={draft.name} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field label="Category *">
                <Select value={draft.category} onValueChange={(v) => set("category", v as Cat)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="computer">Computer</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="AI Programs">AI Programs</SelectItem>
                    <SelectItem value="Digital Marketing Stack">Digital Marketing Stack</SelectItem>
                    <SelectItem value="Tally Certifications">Tally Certifications</SelectItem>
                    <SelectItem value="Commerce Courses">Commerce Courses</SelectItem>
                    <SelectItem value="Office & Productivity">Office &amp; Productivity</SelectItem>
                    <SelectItem value="AI Kids Programs">AI Kids Programs</SelectItem>
                    <SelectItem value="Programming">Programming</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Duration">
                <Input value={draft.duration} onChange={(e) => set("duration", e.target.value)} placeholder="3 Months" />
              </Field>
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
              <Field label="Total fee ₹">
                <Input type="number" value={draft.total_fee} onChange={(e) => set("total_fee", Number(e.target.value))} />
              </Field>
              <Field label="Registration fee ₹">
                <Input type="number" value={draft.registration_fee} onChange={(e) => set("registration_fee", Number(e.target.value))} />
              </Field>
              <Field label="EMI options (comma-separated)">
                <Input value={draft.emi_options} onChange={(e) => set("emi_options", e.target.value)} placeholder="3 EMIs of ₹3000, 6 EMIs of ₹1500" />
              </Field>
              <Field label="Next batch date">
                <Input type="date" value={draft.next_batch_date} onChange={(e) => set("next_batch_date", e.target.value)} />
              </Field>
              <Field label="Badge label (e.g. Popular, New, Hot)">
                <Input value={draft.badge_label} onChange={(e) => set("badge_label", e.target.value)} placeholder="Popular" />
              </Field>
              <Field label="WhatsApp template key">
                <Input value={draft.whatsapp_template_key} onChange={(e) => set("whatsapp_template_key", e.target.value)} placeholder="COURSE_INFO" />
              </Field>
              <Field label="Display order">
                <Input type="number" value={draft.display_order} onChange={(e) => set("display_order", Number(e.target.value))} />
              </Field>
              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center gap-3">
                  <Switch checked={draft.is_active} onCheckedChange={(v) => set("is_active", v)} />
                  <Label>Active (visible on website)</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={draft.is_featured} onCheckedChange={(v) => set("is_featured", v)} />
                  <Label>Featured on homepage</Label>
                </div>
              </div>
            </div>
          </Section>

          {/* SYLLABUS — the core section */}
          <Section title="Syllabus">

            {/* 1. JSON module list */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Course modules / syllabus items — sent as bullet points in WhatsApp
              </Label>
              <p className="text-[11px] text-muted-foreground">
                This is the main syllabus. Each module becomes a numbered bullet in WhatsApp messages.
                Also auto-populates the detailed course page and the concise summary below.
              </p>
              <div className="space-y-2">
                {draft.syllabus_modules.map((mod, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
                    <Input
                      value={mod.title}
                      onChange={(e) => {
                        const mods = [...draft.syllabus_modules];
                        mods[i] = { ...mods[i], title: e.target.value };
                        syncFromModules(mods);
                      }}
                      placeholder={`Module ${i + 1} title`}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const mods = draft.syllabus_modules.filter((_, idx) => idx !== i);
                        syncFromModules(mods);
                      }}
                    >
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => {
                const mods = [...draft.syllabus_modules, { title: "" }];
                syncFromModules(mods);
              }}>
                <Plus className="w-4 h-4 mr-1" /> Add module
              </Button>
            </div>

            {/* 2. Concise syllabus — WhatsApp short text */}
            <Field label="Short description / concise syllabus — used in WhatsApp & course cards (auto-filled from modules above)">
              <Textarea
                rows={3}
                value={draft.concise_syllabus}
                onChange={(e) => set("concise_syllabus", e.target.value)}
                placeholder="Brief overview shown on course cards and at the top of WhatsApp messages."
              />
            </Field>

            {/* 3. Detailed HTML syllabus */}
            <Field label="Detailed syllabus HTML — shown on full course page (auto-filled from modules above)">
              <Textarea
                rows={8}
                className="font-mono text-xs"
                value={draft.detailed_syllabus_html}
                onChange={(e) => set("detailed_syllabus_html", e.target.value)}
                placeholder={"<ol>\n  <li>Module 1</li>\n  <li>Module 2</li>\n</ol>"}
              />
            </Field>

            {/* WhatsApp message preview */}
            <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                WhatsApp message preview
              </p>
              {waPreview ? (
                <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/90 bg-background rounded-lg p-3 border max-h-56 overflow-y-auto">
                  {waPreview}
                </pre>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Add modules above to see how the WhatsApp message will look.
                </p>
              )}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <StatusBadge ok={draft.syllabus_modules.length > 0} label="Modules" />
                <StatusBadge ok={!!draft.brochure_url} label="Brochure PDF" />
                <StatusBadge ok={!!(draft.youtube_url || draft.video_url)} label="Video link" />
              </div>
            </div>
          </Section>

          {/* PROMO MEDIA */}
          <Section title="Promo media">
            <Field label="YouTube URL (used in WhatsApp {video_link} and course page embed)">
              <Input value={draft.youtube_url} onChange={(e) => set("youtube_url", e.target.value)} placeholder="https://youtube.com/watch?v=..." />
            </Field>
            <Field label="Instagram URL">
              <Input value={draft.instagram_url} onChange={(e) => set("instagram_url", e.target.value)} placeholder="https://instagram.com/reel/..." />
            </Field>
            <Field label="Uploaded video (fallback if no YouTube)">
              <div className="flex gap-2">
                <Input value={draft.video_url} onChange={(e) => set("video_url", e.target.value)} placeholder="Public video URL" />
                <input ref={videoRef} type="file" accept="video/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "video")} />
                <Button type="button" variant="outline" onClick={() => videoRef.current?.click()} disabled={uploading === "video"}>
                  <Upload className="w-4 h-4 mr-1" /> {uploading === "video" ? "..." : "Upload"}
                </Button>
              </div>
            </Field>
          </Section>

        </div>

        {/* ── RIGHT: sidebar ─────────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* BROCHURE */}
          <Section title="Brochure / Syllabus PDF">
            <Field label="Brochure URL — sent as {brochure_link} in WhatsApp">
              <div className="flex gap-2">
                <Input value={draft.brochure_url} onChange={(e) => { set("brochure_url", e.target.value); set("syllabus_pdf_url", e.target.value); }} />
                <input ref={brochureRef} type="file" accept="application/pdf" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "brochure")} />
                <Button type="button" variant="outline" onClick={() => brochureRef.current?.click()} disabled={uploading === "brochure"}>
                  <Upload className="w-4 h-4 mr-1" /> {uploading === "brochure" ? "..." : "PDF"}
                </Button>
              </div>
            </Field>
            {draft.brochure_url && (
              <a href={draft.brochure_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                Open current brochure ↗
              </a>
            )}
          </Section>

          {/* IMAGES */}
          <Section title="Images">
            <Field label="Course thumbnail (shown on cards — {thumbnail_url})">
              <div className="flex gap-2">
                <Input value={draft.thumbnail_url} onChange={(e) => set("thumbnail_url", e.target.value)} placeholder="https://..." />
                <input ref={thumbnailRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "thumbnail")} />
                <Button type="button" variant="outline" onClick={() => thumbnailRef.current?.click()} disabled={uploading === "thumbnail"}>
                  <Upload className="w-4 h-4" />
                </Button>
              </div>
              {draft.thumbnail_url && <img src={draft.thumbnail_url} alt="" className="mt-2 rounded-lg h-20 object-cover w-full" onError={(e) => (e.currentTarget.style.display = "none")} />}
            </Field>

            <Field label="OG / SEO image (used in link previews)">
              <div className="flex gap-2">
                <Input value={draft.og_image_url} onChange={(e) => set("og_image_url", e.target.value)} placeholder="https://..." />
                <input ref={ogRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "og")} />
                <Button type="button" variant="outline" onClick={() => ogRef.current?.click()} disabled={uploading === "og"}>
                  <Upload className="w-4 h-4" />
                </Button>
              </div>
            </Field>

            {/* NEW FIELD */}
            <Field label="Syllabus photo — photo of printed syllabus, sent as WhatsApp thumbnail">
              <div className="flex gap-2">
                <Input value={draft.syllabus_image_url} onChange={(e) => set("syllabus_image_url", e.target.value)} placeholder="https://..." />
                <input ref={syllabusImgRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "syllabus_image")} />
                <Button type="button" variant="outline" onClick={() => syllabusImgRef.current?.click()} disabled={uploading === "syllabus_image"}>
                  <Upload className="w-4 h-4" />
                </Button>
              </div>
              {draft.syllabus_image_url && (
                <img src={draft.syllabus_image_url} alt="Syllabus" className="mt-2 rounded-lg h-28 object-cover w-full" onError={(e) => (e.currentTarget.style.display = "none")} />
              )}
              <p className="text-[11px] text-muted-foreground mt-1">
                This image can be sent separately on WhatsApp using <code className="bg-muted px-1 rounded">{"{syllabus_image_url}"}</code>
              </p>
            </Field>
          </Section>

          {/* CERTIFICATE */}
          <Section title="Certificate">
            <Field label="Certificate title (printed on certificate)">
              <Input value={draft.certificate_title} onChange={(e) => set("certificate_title", e.target.value)} />
            </Field>
          </Section>

          {/* SEO */}
          <Section title="SEO">
            <Field label="Slug (auto from name if blank)">
              <Input value={draft.slug} onChange={(e) => set("slug", e.target.value)} placeholder="auto-generated" />
            </Field>
            <Field label="Meta title (≤60 chars)">
              <Input maxLength={60} value={draft.meta_title} onChange={(e) => set("meta_title", e.target.value)} />
            </Field>
            <Field label="Meta description (≤160 chars)">
              <Textarea rows={2} maxLength={160} value={draft.meta_description} onChange={(e) => set("meta_description", e.target.value)} />
            </Field>
          </Section>

        </div>
      </div>
    </div>
  );
}

// ── Small components ──────────────────────────────────────────────────────────
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

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs border ${ok ? "bg-green-500/10 border-green-500/30 text-green-700" : "bg-yellow-500/10 border-yellow-500/30 text-yellow-700"}`}>
      {ok
        ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
      {label}
    </div>
  );
}
