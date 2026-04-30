import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, IndianRupee, Eye, Sparkles, Brain, Megaphone, Server, Calculator, Laptop, GraduationCap, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { buildWhatsAppLink, whatsAppLinkSync } from "@/lib/whatsapp";
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

export default function CoursesSection() {
  const settings = useSiteSettings();
  const { toast } = useToast();
  const [active, setActive] = useState("All");
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [shareCourse, setShareCourse] = useState<any | null>(null);
  const [studentName, setStudentName] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.from("courses").select("*").eq("is_active", true).order("display_order").then(({ data }) => {
      if (data) setCourses(data);
    });
  }, []);

  const filtered = active === "All" ? courses : courses.filter((c) => c.category === active);
  const waNumber = settings.whatsapp_number || "917009933289";

  // Enroll now also captures the visitor as an enquiry — route through the
  // Share form so we collect name + phone before opening WhatsApp.
  const handleEnroll = (course: any) => {
    setShareCourse(course);
  };

  const handleShareSubmit = async () => {
    if (!shareCourse) return;
    if (!studentName || !studentPhone) {
      toast({ title: "Required", description: "Please enter your name and WhatsApp number.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    // Save lead (legacy)
    await supabase.from("leads").insert({
      source: "syllabus_request",
      student_name: studentName,
      phone: studentPhone,
      course_name: shareCourse.name,
    });
    // Also create a CRM enquiry so it appears in the Enquiry panel
    await supabase.from("crm_enquiries").insert({
      name: studentName,
      phone: studentPhone.replace(/\D/g, ""),
      whatsapp: studentPhone.replace(/\D/g, ""),
      course_name_snapshot: shareCourse.name,
      source: "website_course_page",
      status: "new",
      priority: "medium",
      notes: "Auto-created from website course card (Share / Enroll)",
    } as never);
    // Build WhatsApp message — pass SHORT course-named links
    // (legacy `courses` table has no slug; helper falls back to slugified name)
    const link = await buildWhatsAppLink(
      "syllabus_share",
      {
        student_name: studentName,
        course_name: shareCourse.name,
        course_link: coursePublicUrl(null, shareCourse.name),
        syllabus_pdf_url: brochureShareUrl(null, shareCourse.name),
        brochure_pdf_url: brochureShareUrl(null, shareCourse.name),
        video_link: videoShareUrl(null, shareCourse.name),
      },
      waNumber
    );
    setSubmitting(false);
    setShareCourse(null);
    setStudentName("");
    setStudentPhone("");
    toast({ title: "Sent!", description: "Opening WhatsApp with your course details." });
    window.open(link, "_blank", "noopener,noreferrer");
  };

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
            {filtered.map((course) => (
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
                  <div className="flex flex-col gap-2 mt-auto">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelectedCourse(course)}>
                        <Eye className="w-4 h-4 mr-1" /> Syllabus
                      </Button>
                      <Button size="sm" className="flex-1 gradient-accent text-accent-foreground border-0 hover:opacity-90" onClick={() => handleEnroll(course)}>
                        <MessageCircle className="w-4 h-4 mr-1" /> Enroll
                      </Button>
                    </div>
                    <Button variant="ghost" size="sm" className="w-full text-accent" onClick={() => setShareCourse(course)}>
                      <Send className="w-4 h-4 mr-1" /> Share Course Details
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Syllabus modal */}
      <Dialog open={!!selectedCourse} onOpenChange={() => setSelectedCourse(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {selectedCourse && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-xl">{selectedCourse.name} — Syllabus</DialogTitle>
              </DialogHeader>
              <div className="flex gap-3 mb-4 text-sm text-muted-foreground">
                {selectedCourse.duration && <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{selectedCourse.duration}</span>}
                {selectedCourse.fee && <span className="flex items-center gap-1"><IndianRupee className="w-4 h-4" />{selectedCourse.fee}</span>}
              </div>
              <p className="text-sm text-muted-foreground mb-4">{selectedCourse.full_description}</p>
              <ol className="space-y-2">
                {(Array.isArray(selectedCourse.syllabus) ? selectedCourse.syllabus : []).map((topic: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                    <span className="w-6 h-6 rounded-full gradient-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0 font-bold">{i + 1}</span>
                    <span className="text-sm text-foreground">{topic}</span>
                  </li>
                ))}
              </ol>
              <Button className="w-full mt-4 gradient-accent text-accent-foreground border-0" onClick={() => handleEnroll(selectedCourse)}>
                <MessageCircle className="w-4 h-4 mr-2" /> Enroll via WhatsApp
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Share Course Details modal */}
      <Dialog open={!!shareCourse} onOpenChange={(o) => !o && setShareCourse(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Get {shareCourse?.name} Details</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Enter your WhatsApp number to receive the full syllabus and brochure.
          </p>
          <div className="space-y-3">
            <Input placeholder="Your Name" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
            <Input placeholder="WhatsApp Number" type="tel" value={studentPhone} onChange={(e) => setStudentPhone(e.target.value)} />
            <Button onClick={handleShareSubmit} disabled={submitting} className="w-full gradient-accent text-accent-foreground border-0">
              <Send className="w-4 h-4 mr-2" /> {submitting ? "Sending..." : "Send to WhatsApp"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
