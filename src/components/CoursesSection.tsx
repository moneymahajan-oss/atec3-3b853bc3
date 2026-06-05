import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, IndianRupee, Sparkles, Brain, Megaphone, Server,
  Calculator, Laptop, GraduationCap, MessageCircle, Send,
  RefreshCw, BookOpen, Play, Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { coursePublicUrl } from "@/lib/courseLinks";
import { useToast } from "@/hooks/use-toast";
import { detectPlatform, getEmbedUrl, getDialogSize } from "@/lib/videoUtils";

// ─── Types ────────────────────────────────────────────────────────────────────
// Mirrors the actual `courses` DB columns exactly — no old ghost fields
interface Course {
  id: string;
  name: string;
  slug: string | null;
  category: string;
  duration: string | null;
  mode: string | null;
  // FIX: correct column name is total_fee, NOT fee
  total_fee: number | null;
  registration_fee: number | null;
  emi_options: string[] | null;
  // FIX: correct column is concise_syllabus, NOT short_description
  concise_syllabus: string | null;
  // FIX: correct column is detailed_syllabus_html, NOT syllabus / full_description
  detailed_syllabus_html: string | null;
  // FIX: correct column is brochure_url (was missing from WhatsApp vars)
  brochure_url: string | null;
  youtube_url: string | null;
  video_url: string | null;
  instagram_url: string | null;
  // FIX: correct column is og_image_url, NOT thumbnail_url
  og_image_url: string | null;
  next_batch_date: string | null;
  certificate_title: string | null;
  badge_label: string | null;
  display_order: number | null;
  is_active: boolean;
  // JSON syllabus array — sent as bullet points in WhatsApp
  syllabus?: unknown;
  syllabus_image_url?: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const categoryIcons: Record<string, React.ElementType> = {
  "AI Programs": Brain,
  "Digital Marketing Stack": Megaphone,
  "Tally Certifications": Server,
  "Commerce Courses": Calculator,
  "Office & Productivity": Laptop,
  "AI Kids Programs": GraduationCap,
  "Programming": GraduationCap,
};

const categories = [
  "All",
  "AI Programs",
  "Digital Marketing Stack",
  "Tally Certifications",
  "Commerce Courses",
  "Office & Productivity",
  "AI Kids Programs",
  "Programming",
];

type WaAction = "enquiry" | "enroll" | "syllabus" | "share" | "video";

// ─── Helper: resolve best image for a course ─────────────────────────────────
function resolveCourseImage(course: Course): string {
  if (course.og_image_url) return course.og_image_url;
  // YouTube thumbnail fallback
  const ytUrl = course.youtube_url || course.video_url || "";
  const ytMatch = ytUrl.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  return "/og-course-default.png";
}

// ─── Helper: build all WhatsApp template variables from a course ──────────────
// Single source of truth — used by BOTH CoursesSection and SendCourseDrawer
function buildCourseWaVars(course: Course, studentName: string, studentPhone: string) {
  // FIX: pass course.slug to coursePublicUrl — don't use null
  const coursePageUrl = coursePublicUrl(course.slug, course.name);

  // FIX: direct PDF link, not #brochure anchor
  const brochureLink = course.brochure_url || `${coursePageUrl}#brochure`;

  // FIX: actual YouTube/video URL, not #video anchor
  const videoLink = course.youtube_url || course.video_url || `${coursePageUrl}#video`;

  // FIX: total_fee is the correct column name
  const feeFormatted = course.total_fee
    ? `₹${Number(course.total_fee).toLocaleString("en-IN")}`
    : "Contact us";

  const emiText = Array.isArray(course.emi_options) && course.emi_options.length > 0
    ? course.emi_options.join(", ")
    : "";

  const batchDate = course.next_batch_date
    ? new Date(course.next_batch_date).toLocaleDateString("en-IN", {
        day: "numeric", month: "long", year: "numeric",
      })
    : "Coming soon";

  return {
    // Identity
    name: studentName || "there",
    student_name: studentName || "there",
    phone: studentPhone,
    // Course basics
    course_name: course.name,
    duration: course.duration || "",
    // FIX: mode was never passed — template var {mode} stayed blank
    mode: course.mode || "",
    fee: feeFormatted,
    // FIX: concise_syllabus is the correct column name
    concise_syllabus: course.concise_syllabus || "",
    // FIX: next_batch_date was never passed
    next_batch_date: batchDate,
    // FIX: emi_options was never passed
    emi_options: emiText,
    // Links — all direct, none are page anchors
    course_link: coursePageUrl,
    course_share_link: coursePageUrl,
    brochure_link: brochureLink,
    brochure_pdf_url: brochureLink,
    syllabus_pdf_url: brochureLink,
    video_link: videoLink,
    video_share_link: videoLink,
    // JSON syllabus as numbered WhatsApp bullets
    syllabus_bullets: syllabusToWaBullets(course.syllabus),
    syllabus_text:    syllabusToWaBullets(course.syllabus) || course.concise_syllabus || "",
    syllabus_image_url: course.syllabus_image_url || "",
  };
}

// Convert JSON syllabus array → WhatsApp numbered bullet text
function syllabusToWaBullets(raw: unknown): string {
  if (!raw) return "";
  try {
    const arr: unknown[] = Array.isArray(raw) ? raw : JSON.parse(String(raw));
    return arr
      .map((item, i) => {
        const title =
          typeof item === "string" ? item
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

// ─── Component ────────────────────────────────────────────────────────────────
export default function CoursesSection() {
  const settings = useSiteSettings();
  const { toast } = useToast();
  const [active, setActive] = useState("All");
  const [dialogCourse, setDialogCourse] = useState<Course | null>(null);
  const [dialogAction, setDialogAction] = useState<WaAction>("enquiry");
  const [studentName, setStudentName] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [videoCourse, setVideoCourse] = useState<Course | null>(null);
  const [syllabusCourse, setSyllabusCourse] = useState<Course | null>(null);

  const { data: courses = [], isError, refetch } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return (data ?? []) as Course[];
    },
    placeholderData: [] as Course[],
    retry: 2,
    retryDelay: 1000,
  });

  const filtered =
    active === "All" ? courses : courses.filter((c) => c.category === active);

  const openDialog = (course: Course, action: WaAction) => {
    setDialogCourse(course);
    setDialogAction(action);
    setStudentName("");
    setStudentPhone("");
  };

  // ─── Submit: save lead + open WhatsApp ──────────────────────────────────────
  const handleSubmit = async () => {
    if (!dialogCourse) return;

    if (!studentName.trim()) {
      toast({ title: "Required", description: "Please enter your name.", variant: "destructive" });
      return;
    }
    if (!studentPhone.trim()) {
      toast({ title: "Required", description: "Please enter your WhatsApp number.", variant: "destructive" });
      return;
    }
    const normPhone = studentPhone.replace(/\D/g, "").slice(-10);
    if (normPhone.length < 10) {
      toast({ title: "Invalid phone", description: "Please enter a valid 10-digit number.", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    const sourceMap: Record<WaAction, string> = {
      enquiry: "enquiry_button",
      enroll:  "enroll_button",
      syllabus: "syllabus_request",
      share:   "share_course",
      video:   "watch_video",
    };

    // Save lead
    await supabase.from("leads").insert({
      source: sourceMap[dialogAction],
      student_name: studentName,
      phone: normPhone,
      course_name: dialogCourse.name,
    });

    // Upsert CRM enquiry (deduplicated within 30 days)
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: dupe } = await supabase
      .from("crm_enquiries")
      .select("id")
      .eq("phone", normPhone)
      .eq("course_name_snapshot", dialogCourse.name)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dupe?.id) {
      await supabase
        .from("crm_enquiries")
        .update({
          notes: `Re-enquiry via ${dialogAction} on ${new Date().toLocaleString()}`,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", dupe.id);
    } else {
      await supabase.from("crm_enquiries").insert({
        name: studentName,
        phone: normPhone,
        whatsapp: normPhone,
        course_name_snapshot: dialogCourse.name,
        source: "website_course_page",
        status: "new",
        priority: "medium",
        notes: `Auto-created from website course card (${dialogAction})`,
      } as never);
    }

    // For video: show player after lead capture, don't open WhatsApp
    if (dialogAction === "video") {
      setSubmitting(false);
      const course = dialogCourse;
      setDialogCourse(null);
      setVideoCourse(course);
      return;
    }

    // Build WhatsApp message using the unified helper
    const waVars = buildCourseWaVars(dialogCourse, studentName, normPhone);

    const templateMap: Record<string, string> = {
      enquiry:  "enquiry_button",
      enroll:   "enroll_button",
      share:    "syllabus_share",
      syllabus: "syllabus_download",
    };
    const tplKey = templateMap[dialogAction];

    // share / syllabus → send to the student's own number
    // enquiry / enroll → send to the institute number
    let link: string;
    if (dialogAction === "share" || dialogAction === "syllabus") {
      link = await buildWhatsAppLink(tplKey, waVars, `91${normPhone}`);
    } else {
      link = await buildWhatsAppLink(tplKey, waVars);
    }

    setSubmitting(false);
    setDialogCourse(null);

    const toastMsg = dialogAction === "enquiry" || dialogAction === "enroll"
      ? "Send the message to ATEC!"
      : "Sending details to the student.";
    toast({ title: "Opening WhatsApp", description: toastMsg });
    window.open(link, "_blank", "noopener,noreferrer");
  };

  // ─── Dialog copy ────────────────────────────────────────────────────────────
  const dialogTitles: Record<WaAction, string> = {
    enquiry:  "Enquire via WhatsApp",
    enroll:   "Enroll via WhatsApp",
    share:    "Share Syllabus",
    syllabus: "Get Syllabus on WhatsApp",
    video:    "Watch Course Video",
  };

  const dialogDescriptions: Record<WaAction, string> = {
    enquiry:  "Enter your name & number. An enquiry message will open to send to ATEC.",
    enroll:   "Enter your name & number. An enrollment message will open to send to ATEC.",
    share:    "Enter the student's name & WhatsApp number to send them the syllabus.",
    syllabus: "Enter your name & number to receive the syllabus on WhatsApp.",
    video:    "Enter your name & number to watch the course video.",
  };

  // ─── Video player setup ─────────────────────────────────────────────────────
  // FIX: check youtube_url first, then video_url (both columns)
  const videoUrl = (videoCourse?.youtube_url || videoCourse?.video_url || "").trim();
  const videoPlatform = videoCourse ? detectPlatform(videoUrl) : "youtube";
  const videoEmbed    = videoCourse ? getEmbedUrl(videoUrl, videoPlatform) : null;
  const videoSizing   = getDialogSize(videoPlatform);

  if (isError)
    return (
      <section id="courses" className="py-12 bg-white text-center">
        <button
          onClick={() => refetch()}
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" /> Retry loading courses
        </button>
      </section>
    );

  return (
    <section id="courses" className="py-12 bg-white">
      <div className="container mx-auto px-4">

        {/* Section heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <Badge variant="outline" className="mb-4 text-accent border-accent/30 bg-accent/5">
            <Sparkles className="w-3 h-3 mr-1" /> Our Programs
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 font-sans">
            {settings.courses_section_heading || "Explore Our Courses"}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {settings.courses_section_subheading ||
              "Industry-aligned curriculum designed to give you practical, job-ready skills"}
          </p>
        </motion.div>

        {/* Category filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map((cat) => {
            const Icon = categoryIcons[cat];
            return (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  active === cat
                    ? "gradient-primary text-primary-foreground shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {cat}
              </button>
            );
          })}
        </div>

        {/* Course cards */}
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filtered.map((course) => (
              <motion.div
                key={course.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="glass rounded-2xl overflow-hidden group hover:shadow-xl transition-shadow flex flex-col"
              >
                {/* Thumbnail */}
                <div className="relative h-48 overflow-hidden">
                  {/* FIX: og_image_url is the correct column; fallback chain added */}
                  <img
                    src={resolveCourseImage(course)}
                    alt={course.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/og-course-default.png"; }}
                  />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Badge className="bg-primary/90 text-primary-foreground text-xs">
                      {course.category}
                    </Badge>
                    {course.badge_label && (
                      <Badge className="gradient-accent text-accent-foreground text-xs border-0">
                        {course.badge_label}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Card body */}
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-heading font-bold text-lg text-foreground mb-2">
                    {course.name}
                  </h3>
                  {/* FIX: concise_syllabus is the correct column */}
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {course.concise_syllabus || ""}
                  </p>
                  <div className="flex items-center gap-3 mb-4 text-sm text-muted-foreground">
                    {course.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" /> {course.duration}
                      </span>
                    )}
                    {/* FIX: total_fee is the correct column */}
                    {(course.total_fee ?? 0) > 0 && (
                      <span className="flex items-center gap-1">
                        <IndianRupee className="w-4 h-4" />
                        {Number(course.total_fee).toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-auto">
                    <Button
                      size="sm"
                      className="gradient-accent text-accent-foreground border-0 hover:opacity-90"
                      onClick={() => openDialog(course, "enquiry")}
                    >
                      <MessageCircle className="w-4 h-4 mr-1" /> Enquire
                    </Button>
                    <Button
                      size="sm"
                      className="gradient-primary text-primary-foreground border-0 hover:opacity-90"
                      onClick={() => setSyllabusCourse(course)}
                    >
                      <BookOpen className="w-4 h-4 mr-1" /> View Syllabus
                    </Button>
                    {/* FIX: check youtube_url OR video_url, not just video_url */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDialog(course, "video")}
                      disabled={!course.youtube_url && !course.video_url}
                    >
                      <Play className="w-4 h-4 mr-1" /> Watch Video
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDialog(course, "share")}
                    >
                      <Share2 className="w-4 h-4 mr-1" /> Share Syllabus
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ── Video player dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!videoCourse} onOpenChange={(o) => !o && setVideoCourse(null)}>
        <DialogContent className={videoSizing.dialogClass}>
          {videoCourse && videoEmbed && (
            <>
              {videoPlatform === "instagram" ? (
                <div style={{ width: "100%", aspectRatio: "9/16", maxHeight: "85vh" }}>
                  <iframe
                    src={videoEmbed}
                    className="w-full h-full border-0"
                    scrolling="no"
                    allowTransparency={true}
                    allowFullScreen
                    title={videoCourse.name}
                  />
                </div>
              ) : (
                <div className={videoSizing.containerClass}>
                  <iframe
                    src={videoEmbed}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={videoCourse.name}
                  />
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Lead capture + WhatsApp action dialog ──────────────────────────── */}
      <Dialog open={!!dialogCourse} onOpenChange={(o) => !o && setDialogCourse(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">
              {dialogTitles[dialogAction]} — {dialogCourse?.name}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            {dialogDescriptions[dialogAction]}
          </p>

          {/* Show what will be sent so the user knows what to expect */}
          {dialogCourse && (dialogAction === "share" || dialogAction === "syllabus") && (
            <div className="rounded-lg border bg-muted/40 p-3 mb-3 space-y-1 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground text-[11px] uppercase tracking-wide mb-1">
                What will be shared
              </p>
              <p>📄 Brochure/Syllabus: {dialogCourse.brochure_url
                ? <span className="text-green-600 font-medium">Direct PDF link ✓</span>
                : <span className="text-yellow-600">Course page link (no PDF uploaded yet)</span>
              }</p>
              <p>🎬 Video: {(dialogCourse.youtube_url || dialogCourse.video_url)
                ? <span className="text-green-600 font-medium">Direct video link ✓</span>
                : <span className="text-yellow-600">Course page link (no video added yet)</span>
              }</p>
            </div>
          )}

          <div className="space-y-3">
            <Input
              placeholder="Your Name"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
            />
            <Input
              placeholder="WhatsApp Number (10 digits)"
              type="tel"
              value={studentPhone}
              onChange={(e) => setStudentPhone(e.target.value)}
            />
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full gradient-accent text-accent-foreground border-0"
            >
              {dialogAction === "video" ? (
                <><Play className="w-4 h-4 mr-2" /> {submitting ? "Loading..." : "Watch Now"}</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> {submitting ? "Sending..." : "Continue on WhatsApp"}</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Syllabus viewer dialog ──────────────────────────────────────────── */}
      <Dialog open={!!syllabusCourse} onOpenChange={(o) => !o && setSyllabusCourse(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              {syllabusCourse?.name} — Syllabus
            </DialogTitle>
          </DialogHeader>

          {syllabusCourse && (() => {
            // FIX: read from correct DB columns in priority order:
            // 1. detailed_syllabus_html (admin-entered rich HTML → strip tags for display)
            // 2. concise_syllabus (short text description)
            // 3. legacy syllabus jsonb (old data)
            const rawHtml = syllabusCourse.detailed_syllabus_html || "";
            const stripped = rawHtml
              .replace(/<br\s*\/?>/gi, "\n")
              .replace(/<\/p>/gi, "\n")
              .replace(/<\/li>/gi, "\n")
              .replace(/<[^>]+>/g, "")
              .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
              .replace(/\n{3,}/g, "\n\n")
              .trim();
            const concise  = syllabusCourse.concise_syllabus || "";
            const legacySyl = (syllabusCourse as any).syllabus;
            const legacyItems: any[] = Array.isArray(legacySyl) ? legacySyl : legacySyl ? [legacySyl] : [];
            const hasContent = stripped || concise || legacyItems.length > 0;

            if (!hasContent) {
              return (
                <p className="text-sm text-muted-foreground py-4">
                  Syllabus details coming soon. Please contact us for more information.
                </p>
              );
            }

            return (
              <div className="space-y-4">
                {/* Concise summary at top */}
                {concise && (
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{concise}</p>
                )}

                {/* Detailed syllabus (HTML stripped to clean text) */}
                {stripped && (
                  <div className="rounded-xl border bg-muted/30 p-4 text-sm text-foreground/90 whitespace-pre-line">
                    {stripped}
                  </div>
                )}

                {/* Legacy jsonb modules (backward compatible) */}
                {legacyItems.length > 0 && (
                  <ol className="space-y-3">
                    {legacyItems.map((item: any, i: number) => {
                      const title =
                        typeof item === "string"
                          ? item
                          : item?.title || item?.name || item?.module || `Module ${i + 1}`;
                      const desc =
                        typeof item === "object"
                          ? item?.description || item?.desc || item?.content
                          : null;
                      const topics =
                        typeof item === "object" && Array.isArray(item?.topics)
                          ? item.topics
                          : null;
                      return (
                        <li key={i} className="glass rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-7 h-7 rounded-full gradient-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                              {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-foreground">{title}</h4>
                              {desc && (
                                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{desc}</p>
                              )}
                              {topics && (
                                <ul className="mt-2 space-y-1 list-disc list-inside text-sm text-muted-foreground">
                                  {topics.map((t: any, j: number) => (
                                    <li key={j}>{typeof t === "string" ? t : t?.title || JSON.stringify(t)}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}

                <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                  <Button
                    className="flex-1 gradient-accent text-accent-foreground border-0"
                    onClick={() => {
                      const c = syllabusCourse;
                      setSyllabusCourse(null);
                      openDialog(c, "enroll");
                    }}
                  >
                    <GraduationCap className="w-4 h-4 mr-2" /> Enroll Now
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      const c = syllabusCourse;
                      setSyllabusCourse(null);
                      openDialog(c, "share");
                    }}
                  >
                    <Share2 className="w-4 h-4 mr-2" /> Get on WhatsApp
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </section>
  );
}
