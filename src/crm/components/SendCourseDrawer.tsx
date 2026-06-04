import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { fillTemplate, buildWaLink, logWaSend } from "../lib/whatsapp";
import { coursePublicUrl } from "@/lib/courseLinks";
import { Send } from "lucide-react";
import { toast } from "sonner";

interface Course {
  id: string;
  name: string;
  slug?: string | null;
  category: string;
  duration: string | null;
  mode: string | null;
  total_fee: number | null;
  brochure_url: string | null;
  youtube_url: string | null;
  video_url: string | null;
  concise_syllabus: string | null;
  next_batch_date: string | null;
  // JSON syllabus — the module-by-module structured list
  syllabus?: unknown;
  syllabus_image_url?: string | null;
  emi_options?: string[] | null;
  registration_fee?: number | null;
}

// ── Convert JSON syllabus → WhatsApp-friendly numbered bullet text ────────────
function syllabusToWaBullets(raw: unknown): string {
  if (!raw) return "";
  try {
    const arr: unknown[] = Array.isArray(raw) ? raw : JSON.parse(String(raw));
    return arr
      .map((item, i) => {
        const title =
          typeof item === "string"
            ? item
            : typeof item === "object" && item !== null
            ? String((item as Record<string, unknown>).title || (item as Record<string, unknown>).name || "")
            : String(item);
        if (!title.trim()) return null;
        const obj = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : null;
        const topics = obj && Array.isArray(obj.topics) ? (obj.topics as string[]) : [];
        const num = `${i + 1}. *${title.trim()}*`;
        return topics.length
          ? num + "\n" + topics.map((t) => `   • ${t}`).join("\n")
          : num;
      })
      .filter(Boolean)
      .join("\n");
  } catch {
    return "";
  }
}

export default function SendCourseDrawer({
  course,
  onClose,
}: {
  course: Course | null;
  onClose: () => void;
}) {
  const [contactName, setContactName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [preview, setPreview] = useState("");
  const [settings, setSettings] = useState<{
    phone?: string;
    address?: string;
    website?: string;
  } | null>(null);

  useEffect(() => {
    if (!course) return;
    setContactName("");
    setContactNumber("");
    (async () => {
      const [{ data: tpl }, { data: cfg }] = await Promise.all([
        supabase
          .from("crm_whatsapp_templates")
          .select("body")
          .eq("template_key", "COURSE_INFO")
          .maybeSingle(),
        supabase
          .from("crm_institute_settings")
          .select("phone, address, website")
          .maybeSingle(),
      ]);
      setSettings(cfg ?? {});
      if (tpl?.body) {
        setPreview(buildPreview(tpl.body, course, cfg ?? {}, ""));
      }
    })();
  }, [course]);

  function buildPreview(
    body: string,
    c: Course,
    cfg: { phone?: string; address?: string; website?: string },
    name: string
  ) {
    const shareLink = coursePublicUrl(c.slug, c.name);

    // Direct links — never anchors
    const brochureLink = c.brochure_url || `${shareLink}#brochure`;
    const videoLink    = c.youtube_url || c.video_url || `${shareLink}#video`;

    // ── JSON syllabus → numbered bullet list for WhatsApp ──────────────────
    const syllabusBullets = syllabusToWaBullets(c.syllabus);

    // Concise summary (used at top of message)
    const concise = c.concise_syllabus || "";

    // EMI options text
    const emiText = Array.isArray(c.emi_options) && c.emi_options.length
      ? c.emi_options.join(", ")
      : "";

    // Next batch date formatted
    const batchDate = c.next_batch_date
      ? new Date(c.next_batch_date).toLocaleDateString("en-IN", {
          day: "numeric", month: "long", year: "numeric",
        })
      : "Coming soon";

    // Fee formatted
    const feeFormatted = c.total_fee
      ? `₹${Number(c.total_fee).toLocaleString("en-IN")}`
      : "Contact us";

    return fillTemplate(body, {
      name:              name || "there",
      student_name:      name || "there",
      course_name:       c.name,
      duration:          c.duration ?? "",
      mode:              c.mode ?? "",
      fee:               feeFormatted,
      course_fee:        feeFormatted,
      registration_fee:  c.registration_fee
                           ? `₹${Number(c.registration_fee).toLocaleString("en-IN")}`
                           : "",
      emi_options:       emiText,
      next_batch_date:   batchDate,

      // Syllabus vars — both formats available in template
      concise_syllabus:  concise,
      syllabus_bullets:  syllabusBullets,   // {syllabus_bullets} = numbered bullet list
      syllabus_text:     syllabusBullets || concise, // {syllabus_text} = bullets or fallback

      // Links
      brochure_link:       brochureLink,
      brochure_pdf_url:    brochureLink,
      syllabus_pdf_url:    brochureLink,
      video_link:          videoLink,
      video_share_link:    videoLink,
      course_link:         shareLink,
      course_share_link:   shareLink,

      // Syllabus image URL (can be used in a separate message)
      syllabus_image_url:  c.syllabus_image_url ?? "",

      // Institute
      phone:             cfg.phone ?? "",
      website_link:      cfg.website ?? "",
      institute_address: cfg.address ?? "",
    });
  }

  // Re-build preview when name changes
  useEffect(() => {
    if (!course || !settings) return;
    (async () => {
      const { data: tpl } = await supabase
        .from("crm_whatsapp_templates")
        .select("body")
        .eq("template_key", "COURSE_INFO")
        .maybeSingle();
      if (tpl?.body) setPreview(buildPreview(tpl.body, course, settings, contactName));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactName]);

  const send = async () => {
    const cleaned = contactNumber.replace(/\D/g, "");
    if (cleaned.length < 10) {
      toast.error("Enter a valid mobile number with country code");
      return;
    }
    if (!course) return;
    const link = buildWaLink(cleaned, preview);
    await logWaSend({
      template_key: "COURSE_INFO",
      contact_number: cleaned,
      contact_name: contactName || undefined,
      message_snapshot: preview,
      entity_type: "course",
      entity_id: course.id,
    });
    window.open(link, "_blank", "noopener,noreferrer");
    toast.success("WhatsApp link opened — review and send");
    onClose();
  };

  return (
    <Sheet open={!!course} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Send course info</SheetTitle>
          <SheetDescription>{course?.name}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Recipient name (optional)</Label>
            <Input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Rahul"
            />
          </div>

          <div className="space-y-1.5">
            <Label>WhatsApp number *</Label>
            <Input
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="91XXXXXXXXXX (country code + number)"
            />
          </div>

          {/* Status indicators */}
          {course && (
            <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5 text-xs">
              <p className="font-semibold text-foreground text-[11px] uppercase tracking-wide">
                Content in this message
              </p>
              <StatusRow
                ok={!!(course.syllabus && (Array.isArray(course.syllabus) ? (course.syllabus as unknown[]).length > 0 : true))}
                ok2={!!course.concise_syllabus}
                label="Syllabus"
                detail={
                  course.syllabus && Array.isArray(course.syllabus)
                    ? `${(course.syllabus as unknown[]).length} modules as bullet list`
                    : course.concise_syllabus
                    ? "Short description"
                    : "No syllabus — add modules in course editor"
                }
              />
              <StatusRow
                ok={!!course.brochure_url}
                label="Brochure PDF"
                detail={course.brochure_url ? "Direct PDF link ✓" : "Not uploaded — will link to course page"}
              />
              <StatusRow
                ok={!!(course.youtube_url || course.video_url)}
                label="Video"
                detail={
                  course.youtube_url || course.video_url
                    ? "Direct video link ✓"
                    : "No video added"
                }
              />
              <StatusRow
                ok={!!course.syllabus_image_url}
                label="Syllabus image"
                detail={
                  course.syllabus_image_url
                    ? "Photo available (send separately)"
                    : "Not uploaded — optional"
                }
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Message preview (editable)</Label>
            <Textarea
              rows={16}
              className="font-mono text-xs"
              value={preview}
              onChange={(e) => setPreview(e.target.value)}
            />
          </div>

          <Button onClick={send} className="w-full" size="lg">
            <Send className="w-4 h-4 mr-2" /> Open WhatsApp
          </Button>

          <p className="text-[10px] text-muted-foreground text-center">
            Opens wa.me link — counsellor reviews and presses Send in WhatsApp.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StatusRow({
  ok, ok2, label, detail,
}: {
  ok: boolean; ok2?: boolean; label: string; detail: string;
}) {
  const isOk = ok || ok2;
  return (
    <div className="flex items-start gap-2">
      <span className={isOk ? "text-green-600" : "text-yellow-600"}>{isOk ? "✓" : "⚠"}</span>
      <span>
        <strong>{label}:</strong> {detail}
      </span>
    </div>
  );
}
