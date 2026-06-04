import { supabase } from "@/integrations/supabase/client";
import { fillTemplate, buildWaLink } from "./whatsapp";
import { coursePublicUrl } from "@/lib/courseLinks";

export const ENQUIRY_TEMPLATE_KEYS = [
  "ENQUIRY_WELCOME",
  "ENQUIRY_FIRST",
  "SEND_BROCHURE_IMAGE",
  "COURSE_INFO",
  "COURSE_LONG_DETAIL",
  "COURSE_MEDIA",
  "ENQUIRY_FOLLOWUP_1",
  "ENQUIRY_FOLLOWUP_2",
] as const;

export type EnquiryTemplateKey = typeof ENQUIRY_TEMPLATE_KEYS[number];

export interface EnquiryButtonDef {
  key: EnquiryTemplateKey | "SEND_ALL";
  emoji: string;
  label: string;
}

export const ENQUIRY_BUTTONS: EnquiryButtonDef[] = [
  { key: "ENQUIRY_WELCOME",     emoji: "📩", label: "Welcome Message" },
  { key: "ENQUIRY_FIRST",       emoji: "🎯", label: "Enquiry First (Full)" },
  { key: "SEND_BROCHURE_IMAGE", emoji: "🖼️", label: "Course Catalogue (Picture)" },
  { key: "COURSE_INFO",         emoji: "📋", label: "Short Syllabus" },
  { key: "COURSE_LONG_DETAIL",  emoji: "📚", label: "Detailed Syllabus" },
  { key: "COURSE_MEDIA",        emoji: "🎬", label: "Video / Instagram" },
  { key: "ENQUIRY_FOLLOWUP_1",  emoji: "📅", label: "Follow-up 1" },
  { key: "ENQUIRY_FOLLOWUP_2",  emoji: "📅", label: "Follow-up 2" },
  { key: "SEND_ALL",            emoji: "📦", label: "Send All Course Info" },
];

export interface EnquiryCtx {
  enquiryId: string;
  name: string;
  phone: string;
  whatsapp?: string | null;
  course_id?: string | null;
  course_name_snapshot?: string | null;
}

export interface CourseCtx {
  id: string;
  name: string;
  slug?: string | null;
  total_fee?: number | null;
  duration?: string | null;
  mode?: string | null;
  brochure_url?: string | null;
  syllabus_pdf_url?: string | null;
  brochure_pdf_url?: string | null;
  video_url?: string | null;
  youtube_url?: string | null;
  instagram_url?: string | null;
  concise_syllabus?: string | null;
  short_description?: string | null;
  detailed_syllabus_html?: string | null;
  full_description?: string | null;
  syllabus?: unknown;               // JSON array of module strings/objects
  syllabus_image_url?: string | null;
  next_batch_date?: string | null;
  registration_fee?: number | null;
  emi_options?: string[] | null;
  certificate_title?: string | null;
}

export interface InstituteCtx {
  name?: string | null;
  phone?: string | null;
  whatsapp_number?: string | null;
  website?: string | null;
  address?: string | null;
}

// Convert JSON syllabus array → WhatsApp numbered bullet text
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
        return topics.length ? num + "\n" + topics.map((t) => `   • ${t}`).join("\n") : num;
      })
      .filter(Boolean)
      .join("\n");
  } catch {
    return "";
  }
}

export function buildVars(e: EnquiryCtx, course: CourseCtx | null, inst: InstituteCtx) {
  const institutePhone = inst.phone || inst.whatsapp_number || "";
  const instituteWebsite = inst.website || "";
  const duration = course?.duration || "";
  const mode = course?.mode || "";

  // Concise syllabus — new column first, fall back to old short_description
  const concise = course?.concise_syllabus || course?.short_description || "";

  // Detailed syllabus — strip HTML tags for plain text version
  const longSyl = (course?.detailed_syllabus_html || course?.full_description || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // JSON syllabus → numbered bullet list (the main format for WA)
  const syllabusBullets = syllabusToWaBullets(course?.syllabus);

  // FIXED: use actual direct PDF URL, not a #brochure anchor
  const brochure = course?.brochure_url
    || course?.brochure_pdf_url
    || course?.syllabus_pdf_url
    || "";

  // FIXED: use actual YouTube/video URL, not a #video anchor
  const video = course?.youtube_url || course?.video_url || "";

  // Course page URL for sharing
  const courseShareLink = course ? coursePublicUrl(course.slug, course.name) : "";

  // Video link: real URL first, then Instagram, then course page
  const videoLink = video || course?.instagram_url || (course ? `${courseShareLink}#video` : "");

  // Brochure link: real PDF first, then course page anchor
  const brochureLink = brochure || (course ? `${courseShareLink}#brochure` : "");

  // Fee formatted
  const feeFormatted = course?.total_fee
    ? `₹${Number(course.total_fee).toLocaleString("en-IN")}`
    : "";

  // EMI options
  const emiText = Array.isArray(course?.emi_options) && course.emi_options.length
    ? course.emi_options.join(", ")
    : "";

  // Next batch date formatted
  const batchDate = course?.next_batch_date
    ? new Date(course.next_batch_date).toLocaleDateString("en-IN", {
        day: "numeric", month: "long", year: "numeric",
      })
    : "Coming soon";

  return {
    // Student
    name:                  e.name,
    student_name:          e.name,

    // Course basics
    course_name:           course?.name || e.course_name_snapshot || "our course",
    course_fee:            feeFormatted,
    fee:                   feeFormatted,
    course_duration:       duration,
    duration,
    course_mode:           mode,
    mode,
    next_batch_date:       batchDate,
    emi_options:           emiText,
    certificate_title:     course?.certificate_title || "",

    // Syllabus — ALL THREE formats available in templates
    concise_syllabus:      concise,
    course_short_syllabus: concise,      // backward compat alias
    syllabus_bullets:      syllabusBullets, // NEW: numbered bullet list from JSON
    syllabus_text:         syllabusBullets || concise, // bullets or fallback
    course_long_syllabus:  longSyl,      // plain text version of HTML
    detailed_syllabus:     longSyl,

    // Links — all DIRECT URLs (no page anchors)
    brochure_link:         brochureLink,
    brochure_url:          brochureLink,
    brochure_pdf_url:      brochureLink,
    syllabus_pdf_url:      brochureLink,
    brochure_share_link:   brochureLink,
    video_link:            videoLink,
    video_url:             videoLink,
    video_share_link:      videoLink,
    course_share_link:     courseShareLink,
    instagram_url:         course?.instagram_url || "",

    // Syllabus image URL (send manually as WA image before the text message)
    syllabus_image_url:    course?.syllabus_image_url || "",

    // Institute
    institute_name:        inst.name || "ATEC Education",
    institute_phone:       institutePhone,
    institute_website:     instituteWebsite,
    institute_address:     inst.address || "",
    phone:                 institutePhone,
    website_link:          instituteWebsite,
    website:               instituteWebsite,
    address:               inst.address || "",
  };
}

export interface SendArgs {
  templateKey: EnquiryTemplateKey;
  enquiry: EnquiryCtx;
  course: CourseCtx | null;
  institute: InstituteCtx;
  triggeredFrom: "enquiry_panel" | "send_all";
}

export async function sendWhatsAppForEnquiry({
  templateKey, enquiry, course, institute, triggeredFrom,
}: SendArgs): Promise<{ ok: boolean; url?: string; error?: string }> {
  const { data: tpl } = await supabase
    .from("crm_whatsapp_templates")
    .select("body, template_key")
    .eq("template_key", templateKey)
    .eq("is_active", true)
    .maybeSingle();
  if (!tpl) return { ok: false, error: `Template ${templateKey} not found or inactive` };

  const vars = buildVars(enquiry, course, institute);
  const message = fillTemplate(tpl.body, vars as Record<string, string | number>);
  const number = (enquiry.whatsapp || enquiry.phone || "").replace(/\D/g, "");
  if (!number) return { ok: false, error: "No phone number" };
  const url = buildWaLink(number, message);

  // Log (non-blocking on success)
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (user) {
    await supabase.from("crm_whatsapp_logs").insert({
      template_key: templateKey,
      contact_number: number,
      contact_name: enquiry.name,
      message_snapshot: message,
      entity_type: "enquiry",
      entity_id: enquiry.enquiryId,
      status: "link_generated",
      staff_id: user.id,
      staff_name: user.user_metadata?.full_name || user.email || null,
      triggered_from: triggeredFrom,
    } as never);
  }
  return { ok: true, url };
}
