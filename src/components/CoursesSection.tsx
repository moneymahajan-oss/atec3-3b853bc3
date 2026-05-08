import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, IndianRupee, Eye, Sparkles, Brain, Megaphone, Server, Calculator, Laptop, GraduationCap, MessageCircle, Send, RefreshCw, BookOpen, Play, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { coursePublicUrl, brochureShareUrl, videoShareUrl } from "@/lib/courseLinks";
import { useToast } from "@/hooks/use-toast";

const categoryIcons: Record<string, React.ElementType> = {
  "AI & Emerging Tech": Brain,
  "Digital Skills & Marketing": Megaphone,
  "Full Stack & Networking": Server,
  "Finance & Accounting": Calculator,
  "Office & Productivity": Laptop,
  "Student Courses": GraduationCap,
};

const categories = ["All", "AI & Emerging Tech", "Digital Skills & Marketing", "Full Stack & Networking", "Finance & Accounting", "Office & Productivity", "Student Courses"];

const ATEC_WA = "917009933289";

type WaAction = "enquiry" | "enroll" | "syllabus" | "share" | "video";

function getEmbedUrl(url?: string | null): string | null {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([^&\?\/]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
  const igMatch = url.match(/instagram\.com\/(reel|p)\/([^\/\?]+)/);
  if (igMatch) return `https://www.instagram.com/${igMatch[1]}/${igMatch[2]}/embed`;
  return url;
}

export default function CoursesSection() {
  const settings = useSiteSettings();
  const { toast } = useToast();
  const [active, setActive] = useState("All");
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [dialogCourse, setDialogCourse] = useState<any | null>(null);
  const [dialogAction, setDialogAction] = useState<WaAction>("enquiry");
  const [studentName, setStudentName] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [videoCourse, setVideoCourse] = useState<any | null>(null);

  const { data: courses = [], isError, refetch } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("is_active", true).order("display_order");
      if (error) throw error;
      return data ?? [];
    },
    placeholderData: [] as never[],
    retry: 2,
    retryDelay: 1000,
  });

  const filtered = active === "All" ? courses : courses.filter((c: any) => c.category === active);

  const openDialog = (course: any, action: WaAction) => {
    setDialogCourse(course);
    setDialogAction(action);
    setStudentName("");
    setStudentPhone("");
  };

  const handleWatchVideo = async (course: any) => {
    // Capture lead before showing video
    openDialog(course, "video");
  };

  const handleSubmit = async () => {
    if (!dialogCourse) return;
    const needsPhone = dialogAction === "share" || dialogAction === "syllabus";
    if (!studentName || (needsPhone && !studentPhone)) {
      toast({ title: "Required", description: needsPhone ? "Please enter your name and WhatsApp number." : "Please enter your name.", variant: "destructive" });
      return;
    }
    const normPhone = studentPhone.replace(/\D/g, "").slice(-10);
    if (needsPhone && normPhone.length < 10) {
      toast({ title: "Invalid phone", description: "Please enter a 10-digit WhatsApp number.", variant: "destructive" });
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

    // Save lead
    await supabase.from("leads").insert({
      source: sourceMap[dialogAction],
      student_name: studentName,
      phone: needsPhone ? normPhone : "",
      course_name: dialogCourse.name,
    });

    // Create/update CRM enquiry (skip for video action if no phone)
    if (dialogAction !== "video") {
      const phoneToUse = needsPhone ? normPhone : "";
      if (phoneToUse) {
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: dupe } = await supabase
          .from("crm_enquiries")
          .select("id")
          .eq("phone", phoneToUse)
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
            phone: phoneToUse,
            whatsapp: phoneToUse,
            course_name_snapshot: dialogCourse.name,
            source: "website_course_page",
            status: "new",
            priority: "medium",
            notes: `Auto-created from website course card (${dialogAction})`,
          } as never);
        }
      }
    }

    // For video action: just show the video after lead capture
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

    const toastMsg = (dialogAction === "enquiry" || dialogAction === "enroll")
      ? "Send the message to ATEC!"
      : "Sending details to the student.";
    toast({ title: "Opening WhatsApp", description: toastMsg });
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const dialogTitles: Record<WaAction, string> = {
    enquiry: "Enquiry via WhatsApp",
    enroll: "Enroll via WhatsApp",
    share: "Share Syllabus",
    syllabus: "Get Syllabus on WhatsApp",
    video: "Watch Course Video",
  };
  const dialogDescriptions: Record<WaAction, string> = {
    enquiry: "Enter your name. A WhatsApp enquiry message will open to send to ATEC.",
    enroll: "Enter your name. An enrollment message will open to send to ATEC.",
    share: "Enter student's name & WhatsApp number to send syllabus from ATEC.",
    syllabus: "Enter student's name & WhatsApp number to receive the syllabus from ATEC.",
    video: "Enter your name to watch the course video.",
  };

  if (isError) return (
    <section id="courses" className="py-12 bg-white text-center">
      <button onClick={() => refetch()} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <RefreshCw className="w-3 h-3" /> Retry loading courses
      </button>
    </section>
  );

  return (
    <section id="courses" className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <Badge variant="outline" className="mb-4 text-accent border-accent/30 bg-accent/5">
            <Sparkles className="w-3 h-3 mr-1" /> Our Programs
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 font-sans">
            {settings.courses_section_heading || "Explore Our Courses"}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {settings.courses_section_subheading || "Industry-aligned curriculum designed to give you practical, job-ready skills"}
          </p>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map((cat) => {
            const Icon = categoryIcons[cat];
            return (
              <button key={cat} onClick={() => setActive(cat)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${active === cat ? "gradient-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                {Icon && <Icon className="w-4 h-4" />}
                {cat}
              </button>
            );
          })}
        </div>

        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filtered.map((course: any) => (
              <motion.div key={course.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3 }}
                className="glass rounded-2xl overflow-hidden group hover:shadow-xl transition-shadow flex flex-col">
                <div className="relative h-48 overflow-hidden">
                  <img src={course.thumbnail_url} alt={course.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Badge className="bg-primary/90 text-primary-foreground text-xs">{course.category}</Badge>
                    {course.badge_label && <Badge className="gradient-accent text-accent-foreground text-xs border-0">{course.badge_label}</Badge>}
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-heading font-bold text-lg text-foreground mb-2">{course.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{course.short_description}</p>
                  <div className="flex items-center gap-3 mb-4 text-sm text-muted-foreground">
                    {course.duration && <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{course.duration}</span>}
                    {course.fee && <span className="flex items-center gap-1"><IndianRupee className="w-4 h-4" />{course.fee}</span>}
                  </div>
                  {/* 4 Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 mt-auto">
                    <Button size="sm" className="gradient-accent text-accent-foreground border-0 hover:opacity-90" onClick={() => openDialog(course, "enquiry")}>
                      <MessageCircle className="w-4 h-4 mr-1" /> Enquire
                    </Button>
                    <Button size="sm" className="gradient-primary text-primary-foreground border-0 hover:opacity-90" onClick={() => openDialog(course, "enroll")}>
                      <GraduationCap className="w-4 h-4 mr-1" /> Enroll
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleWatchVideo(course)} disabled={!course.video_url}>
                      <Play className="w-4 h-4 mr-1" /> Watch Video
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openDialog(course, "share")}>
                      <Share2 className="w-4 h-4 mr-1" /> Share Syllabus
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Video Player Dialog */}
      <Dialog open={!!videoCourse} onOpenChange={(o) => !o && setVideoCourse(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-black border-none">
          {videoCourse?.video_url && (
            <div className="w-full aspect-video">
              <iframe
                src={getEmbedUrl(videoCourse.video_url) || ""}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={videoCourse.name}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Student Info Dialog for all WhatsApp actions + video lead capture */}
      <Dialog open={!!dialogCourse} onOpenChange={(o) => !o && setDialogCourse(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">{dialogTitles[dialogAction]} — {dialogCourse?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            {dialogDescriptions[dialogAction]}
          </p>
          <div className="space-y-3">
            <Input placeholder="Your Name" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
            {(dialogAction === "share" || dialogAction === "syllabus") && (
              <Input placeholder="Student WhatsApp Number (10 digits)" type="tel" value={studentPhone} onChange={(e) => setStudentPhone(e.target.value)} />
            )}
            <Button onClick={handleSubmit} disabled={submitting} className="w-full gradient-accent text-accent-foreground border-0">
              {dialogAction === "video" ? (
                <><Play className="w-4 h-4 mr-2" /> {submitting ? "Loading..." : "Watch Now"}</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> {submitting ? "Sending..." : "Send to WhatsApp"}</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
