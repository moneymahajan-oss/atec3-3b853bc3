import { supabase } from "@/integrations/supabase/client";
import { fillTemplate, buildWaLink } from "./whatsapp";
import { coursePublicUrl, brochureShareUrl, videoShareUrl } from "@/lib/courseLinks";

export const ENQUIRY_TEMPLATE_KEYS = [
  "ENQUIRY_WELCOME",
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
  video_url?: string | null;
  youtube_url?: string | null;
  instagram_url?: string | null;
  concise_syllabus?: string | null;
  detailed_syllabus_html?: string | null;
  next_batch_date?: string | null;
}

export interface InstituteCtx {
  name?: string | null;
  phone?: string | null;
  whatsapp_number?: string | null;
  website?: string | null;
  address?: string | null;
}

export function buildVars(e: EnquiryCtx, course: CourseCtx | null, inst: InstituteCtx) {
  const longSyl = course?.detailed_syllabus_html
    ? course.detailed_syllabus_html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
    : "";
  const institutePhone = inst.phone || inst.whatsapp_number || "";
  const instituteWebsite = inst.website || "";
  const duration = course?.duration || "";
  const mode = course?.mode || "";
  const concise = course?.concise_syllabus || "";
  const brochure = course?.brochure_url || "";
  const video = course?.video_url || "";
  const courseShareLink = course ? coursePublicUrl(course.slug, course.name) : "";
  const brochureLink = course ? brochureShareUrl(course.slug, course.name) : "";
  // If course has no hosted video/youtube, fall back to Instagram URL directly
  // so the {video_share_link} placeholder still resolves to a real, clickable
  // media link in WhatsApp messages.
  const hasVideo = !!(course?.video_url || course?.youtube_url);
  const videoLink = course
    ? (hasVideo ? videoShareUrl(course.slug, course.name) : (course.instagram_url || ""))
    : "";
  return {
    name: e.name,
    course_name: course?.name || e.course_name_snapshot || "our course",
    course_fee: course?.total_fee ?? "",
    course_duration: duration,
    course_mode: mode,
    course_short_syllabus: concise,
    course_long_syllabus: longSyl,
    // NEW: short, course-named share links → WhatsApp renders an image card
    course_share_link: courseShareLink,
    brochure_share_link: brochureLink,
    video_share_link: videoLink,
    // Backward-compat: old templates may still reference these — now point to short links
    brochure_url: brochureLink || brochure,
    video_url: videoLink || video,
    instagram_url: course?.instagram_url || "",
    next_batch_date: course?.next_batch_date || "soon",
    institute_name: inst.name || "ATEC Education",
    institute_phone: institutePhone,
    institute_website: instituteWebsite,
    institute_address: inst.address || "",
    // Aliases used by existing template bodies
    phone: institutePhone,
    website_link: instituteWebsite,
    website: instituteWebsite,
    address: inst.address || "",
    duration,
    mode,
    concise_syllabus: concise,
    brochure_link: brochureLink || brochure,
    video_link: videoLink || video,
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
