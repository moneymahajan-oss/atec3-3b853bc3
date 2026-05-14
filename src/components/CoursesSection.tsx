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
import { coursePublicUrl, brochureShareUrl, videoShareUrl } from "@/lib/courseLinks";
import { useToast } from "@/hooks/use-toast";
import { detectPlatform, getEmbedUrl, getDialogSize } from "@/lib/videoUtils";

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

export default function CoursesSection() {
  const settings = useSiteSettings();
  const { toast } = useToast();
  const [active, setActive] = useState("All");
  const [dialogCourse, setDialogCourse] = useState<any | null>(null);
  const [dialogAction, setDialogAction] = useState<WaAction>("enquiry");
  const [studentName, setStudentName] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [videoCourse, setVideoCourse] = useState<any | null>(null);
  const [syllabusCourse, setSyllabusCourse] = useState<any | null>(null);

  const { data: courses = [], isError, refetch } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data ?? [];
    },
    placeholderData: [] as never[],
    retry: 2,
    retryDelay: 1000,
  });

  const filtered =
    active === "All" ? courses : courses.filter((c: any) => c.category === active);

  const openDialog = (course: any, action: WaAction) => {
    setDialogCourse(course);
    setDialogAction(action);
    setStudentName("");
    setStudentPhone("");
  };

  const handleWatchVideo = (course: any) => {
    openDialog(course, "video");
  };

  const handleSubmit = async () => {
    if (!dialogCourse) return;

    // FIX: WhatsApp number required for ALL actions (not just share/syllabus)
    // This ensures phone is always captured for leads table
    const needsPhone = true; // capture for every action
    const needsPhoneValidation = dialogAction === "share" || dialogAction === "syllabus" || dialogAction === "enroll";

    if (!studentName) {
      toast({ title: "Required", description: "Please enter your name.", variant: "destructive" });
      return;
    }
    if (!studentPhone) {
      toast({ title: "Required", description: "Please enter your WhatsApp number.", variant: "destructive" });
      return;
    }

    const normPhone = studentPhone.replace(/\D/g, "").slice(-10);
    if (normPhone.length < 10) {
      toast({ title: "Invalid phone", description: "Please enter a valid 10-digit WhatsApp number.", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    const sourceMap: Record<WaAction, string> = {
      enquiry: "enquiry_button",
      enroll: "enroll_button",
      syllabus: "syllabus_request",
      share: "share_course",
      video: "watch_video",
    };

    // FIX: Always save phone in leads table
    await supabase.from("leads").insert({
      source: sourceMap[dialogAction],
      student_name: studentName,
      phone: normPhone,           // ← always captured now
      course_name: dialogCourse.name,
    });

    // Save to CRM enquiries for all actions that have a phone
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

    // For video action: show video after lead capture
    if (dialogAction === "video") {
      setSubmitting(false);
      const course = dialogCourse;
      setDialogCourse(null);
      setStudentName("");
      setStudentPhone("");
      setVideoCourse(course);
      return;
    }

    const commonVars = {
      student_name: studentName,
      phone: normPhone,
      course_name: dialogCourse.name,
      fee: dialogCourse.fee || "",
      duration: dialogCourse.duration || "",
      course_link: coursePublicUrl(null, dialogCourse.name),
      syllabus_pdf_url: brochureShareUrl(null, dialogCourse.name),
      brochure_pdf_url: brochureShareUrl(null, dialogCourse.name),
      video_link: videoShareUrl(null, dialogCourse.name),
    };

    const templateMap: Record<string, string> = {
      enquiry: "enquiry_button",
      enroll: "enroll_button",
      share: "syllabus_share",
      syllabus: "syllabus_download",
    };
    const tplKey = templateMap[dialogAction];

    let link: string;
    if (dialogAction === "share" || dialogAction === "syllabus") {
      link = await buildWhatsAppLink(tplKey, commonVars, `91${normPhone}`);
    } else {
      link = await buildWhatsAppLink(tplKey, commonVars);
    }

    setSubmitting(false);
    setDialogCourse(null);
    setStudentName("");
    setStudentPhone("");

    const toastMsg =
      dialogAction === "enquiry" || dialogAction === "enroll"
        ? "Send the message to ATEC!"
        : "Sending details to the student.";
    toast({ title: "Opening WhatsApp", description: toastMsg });
    window.open(link, "_blank", "noopener,noreferrer");
  };

  // FIX: "Enquire Now" renamed to "Enroll" in syllabus dialog
  // All dialog titles updated
  const dialogTitles: Record<WaAction, string> = {
    enquiry: "Enquire via WhatsApp",
    enroll: "Enroll via WhatsApp",
    share: "Share Syllabus",
    syllabus: "Get Syllabus on WhatsApp",
    video: "Watch Course Video",
  };

  const dialogDescriptions: Record<WaAction, string> = {
    enquiry: "Enter your name & WhatsApp number. An enquiry message will open to send to ATEC.",
    enroll: "Enter your name & WhatsApp number. An enrollment message will open to send to ATEC.",
    share: "Enter student's name & WhatsApp number to send syllabus from ATEC.",
    syllabus: "Enter your name & WhatsApp number to receive the syllabus from ATEC.",
    video: "Enter your name & WhatsApp number to watch the course video.",
  };

  // Video dialog sizing based on platform
  const videoUrl = (videoCourse?.video_url || "").trim();
  const videoPlatform = videoCourse ? detectPlatform(videoUrl) : "youtube";
  const videoEmbed = videoCourse ? getEmbedUrl(videoUrl, videoPlatform) : null;
  const videoSizing = getDialogSize(videoPlatform);

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

        {/* Category Filter */}
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

        {/* Course Cards */}
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filtered.map((course: any) => (
              <motion.div
                key={course.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="glass rounded-2xl overflow-hidden group hover:shadow-xl transition-shadow flex flex-col"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={course.thumbnail_url}
                    alt={course.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-heading font-bold text-lg text-foreground mb-2">
                    {course.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {course.short_description}
                  </p>
                  <div className="flex items-center gap-3 mb-4 text-sm text-muted-foreground">
                    {course.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {course.duration}
                      </span>
                    )}
                    {course.fee && (
                      <span className="flex items-center gap-1">
                        <IndianRupee className="w-4 h-4" />
                        {course.fee}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-auto">
                    {/* FIX: "Enquire" button kept as enquiry action */}
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleWatchVideo(course)}
                      disabled={!course.video_url}
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

      {/* FIX: Video Player Dialog — platform-aware sizing */}
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

      {/* Student Info Dialog — now always captures WhatsApp number */}
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
          <div className="space-y-3">
            <Input
              placeholder="Your Name"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
            />
            {/* FIX: WhatsApp number field shown for ALL actions */}
            <Input
              placeholder="Your WhatsApp Number (10 digits)"
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

      {/* Syllabus Viewer Dialog — FIX: "Enquire Now" renamed to "Enroll" */}
      <Dialog open={!!syllabusCourse} onOpenChange={(o) => !o && setSyllabusCourse(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" /> {syllabusCourse?.name} — Syllabus
            </DialogTitle>
          </DialogHeader>
          {syllabusCourse &&
            (() => {
              const syl = syllabusCourse.syllabus;
              const items: any[] = Array.isArray(syl) ? syl : syl ? [syl] : [];
              if (items.length === 0 && !syllabusCourse.full_description) {
                return (
                  <p className="text-sm text-muted-foreground">
                    Syllabus details coming soon. Please contact us for more information.
                  </p>
                );
              }
              return (
                <div className="space-y-4">
                  {syllabusCourse.full_description && (
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {syllabusCourse.full_description}
                    </p>
                  )}
                  {items.length > 0 && (
                    <ol className="space-y-3">
                      {items.map((item: any, i: number) => {
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
                                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                                    {desc}
                                  </p>
                                )}
                                {topics && (
                                  <ul className="mt-2 space-y-1 list-disc list-inside text-sm text-muted-foreground">
                                    {topics.map((t: any, j: number) => (
                                      <li key={j}>
                                        {typeof t === "string" ? t : t?.title || JSON.stringify(t)}
                                      </li>
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
                  {/* FIX: "Enquire Now" → "Enroll" */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                    <Button
                      className="flex-1 gradient-accent text-accent-foreground border-0"
                      onClick={() => {
                        const c = syllabusCourse;
                        setSyllabusCourse(null);
                        openDialog(c, "enroll"); // ← changed from "enquiry" to "enroll"
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
