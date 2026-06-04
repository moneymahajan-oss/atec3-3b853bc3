import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, IndianRupee, Download, Play, MessageCircle, ArrowLeft, CalendarDays, Award, CreditCard } from "lucide-react";
import { resolveCourseOgImage, youtubeId, slugifyCourseName, coursePublicUrl } from "@/lib/courseLinks";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { FAQ } from "@/components/FAQ";

const COURSE_FAQS = [
  {
    question: "Who is this course suitable for?",
    answer:
      "This course is suitable for students, job seekers, and working professionals. No prior experience is required for beginner-level programs at ATEC Gurdaspur.",
  },
  {
    question: "Is this course available online or offline?",
    answer:
      "ATEC offers classroom and hybrid learning options in Gurdaspur. Call +91-7009933289 to confirm availability for this specific course.",
  },
  {
    question: "Will I get a certificate after completing this course?",
    answer:
      "Yes. A completion certificate is awarded to all students who finish the course and meet attendance requirements at ATEC.",
  },
];

interface CourseRow {
  id: string;
  name: string;
  slug: string | null;
  category: string;
  duration: string | null;
  mode: string;
  total_fee: number;
  registration_fee: number | null;
  emi_options: string[] | null;
  brochure_url: string | null;
  youtube_url: string | null;
  video_url: string | null;
  instagram_url: string | null;
  og_image_url: string | null;
  concise_syllabus: string | null;
  detailed_syllabus_html: string | null;
  meta_title: string | null;
  meta_description: string | null;
  next_batch_date: string | null;
  certificate_title: string | null;
}

export default function CoursePublic() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const settings = useSiteSettings();
  const [course, setCourse] = useState<CourseRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      // 1) try by slug column
      let { data } = await supabase
        .from("courses")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      // 2) fallback: match slugified name
      if (!data) {
        const { data: all } = await supabase
          .from("courses")
          .select("*")
          .eq("is_active", true);
        data = (all || []).find((c: { name: string }) => slugifyCourseName(c.name) === slug) || null;
      }
      setCourse((data as CourseRow) ?? null);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (!course) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4">
        <h1 className="text-2xl font-bold">Course not found</h1>
        <Button onClick={() => navigate("/")}>Back to home</Button>
      </div>
    );
  }

  const ogImage = resolveCourseOgImage(course);
  const ytId = youtubeId(course.youtube_url) || youtubeId(course.video_url);
  const description =
    (course.meta_description || course.concise_syllabus || "")
      .replace(/<[^>]+>/g, "")
      .slice(0, 200) || `${course.name} — at ATEC Education.`;
  const title = course.meta_title || `${course.name} — ATEC Education`;
  const canonical = coursePublicUrl(course.slug, course.name);
  const longSyllabus = course.detailed_syllabus_html?.replace(/<[^>]+>/g, "\n") || "";

  // Format next batch date nicely
  const formattedBatchDate = course.next_batch_date
    ? new Date(course.next_batch_date).toLocaleDateString("en-IN", {
        day: "numeric", month: "long", year: "numeric",
      })
    : null;

  // Parse EMI options (stored as array in DB)
  const emiList: string[] = Array.isArray(course.emi_options)
    ? course.emi_options
    : [];

  const courseJsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.name,
    description,
    provider: {
      "@type": "Organization",
      name: "ATEC Gurdaspur",
      url: "https://ateceducation.in",
    },
    courseMode: "blended",
    educationalLevel: "beginner",
    ...(course.total_fee > 0 && {
      offers: {
        "@type": "Offer",
        price: course.total_fee,
        priceCurrency: "INR",
        category: "Tuition",
      },
    }),
  };

  const breadcrumbsJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://ateceducation.in/" },
      { "@type": "ListItem", position: 2, name: "Courses", item: "https://ateceducation.in/courses" },
      { "@type": "ListItem", position: 3, name: course.name, item: canonical },
    ],
  };

  const quickAnswer = `${course.name} at ATEC Gurdaspur — ${course.duration || "flexible duration"}, ${course.mode} mode. ${(course.concise_syllabus || "").replace(/<[^>]+>/g, "").split(/\n|\./)[0] || "Practical training with completion certificate."}.`;

  return (
    <>
      <SEO
        title={title}
        description={description}
        canonical={canonical}
        ogImage={ogImage}
        ogType="article"
        hreflang="en-IN"
        jsonLd={[courseJsonLd, breadcrumbsJsonLd]}
      />
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> ATEC Education
            </Link>
            <Button asChild size="sm">
              <Link to={`/enquire?course=${encodeURIComponent(course.name)}`}>
                <MessageCircle className="w-4 h-4 mr-1" /> Enquire
              </Link>
            </Button>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="rounded-2xl overflow-hidden border mb-6 bg-muted">
            <img src={ogImage} alt={course.name} className="w-full h-auto object-cover" />
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge>{course.category}</Badge>
            <Badge variant="outline">{course.mode}</Badge>
            {course.duration && (
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" /> {course.duration}
              </span>
            )}
            {course.total_fee > 0 && (
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <IndianRupee className="w-4 h-4" /> {course.total_fee.toLocaleString("en-IN")}
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-3">{course.name}</h1>

          <aside
            aria-label="Quick Answer"
            className="mb-6 rounded-2xl border-l-4 border-primary bg-primary/5 p-5"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
              Quick Answer
            </p>
            <p className="text-foreground leading-relaxed">{quickAnswer}</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span><strong className="text-foreground">Duration:</strong> {course.duration || "Flexible"}</span>
              <span><strong className="text-foreground">Mode:</strong> {course.mode}</span>
              {course.total_fee > 0 && (
                <span><strong className="text-foreground">Fee:</strong> ₹{course.total_fee.toLocaleString("en-IN")}</span>
              )}
              {(course.registration_fee ?? 0) > 0 && (
                <span><strong className="text-foreground">Registration:</strong> ₹{(course.registration_fee ?? 0).toLocaleString("en-IN")}</span>
              )}
            </div>
          </aside>

          {course.concise_syllabus && (
            <p className="text-muted-foreground mb-6 whitespace-pre-line">{course.concise_syllabus}</p>
          )}

          {/* NEW: Fee, Batch & Certificate info card */}
          {(formattedBatchDate || emiList.length > 0 || course.certificate_title || (course.registration_fee ?? 0) > 0) && (
            <div className="rounded-2xl border bg-card p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {formattedBatchDate && (
                <div className="flex items-start gap-3">
                  <CalendarDays className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Next Batch</p>
                    <p className="text-sm font-medium">{formattedBatchDate}</p>
                  </div>
                </div>
              )}
              {(course.registration_fee ?? 0) > 0 && (
                <div className="flex items-start gap-3">
                  <IndianRupee className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Registration Fee</p>
                    <p className="text-sm font-medium">₹{(course.registration_fee ?? 0).toLocaleString("en-IN")}</p>
                  </div>
                </div>
              )}
              {emiList.length > 0 && (
                <div className="flex items-start gap-3 sm:col-span-2">
                  <CreditCard className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">EMI Options Available</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {emiList.map((emi, i) => (
                        <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full border border-primary/20">
                          {emi}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {course.certificate_title && (
                <div className="flex items-start gap-3 sm:col-span-2">
                  <Award className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Certificate Awarded</p>
                    <p className="text-sm font-medium">{course.certificate_title}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3 mb-8">
            {course.brochure_url && (
              <Button asChild id="brochure">
                <a href={course.brochure_url} target="_blank" rel="noreferrer">
                  <Download className="w-4 h-4 mr-2" /> Download Brochure (PDF)
                </a>
              </Button>
            )}
            {(course.youtube_url || course.video_url) ? (
              <Button asChild variant="outline" id="video">
                <a href={course.youtube_url || course.video_url || "#"} target="_blank" rel="noreferrer">
                  <Play className="w-4 h-4 mr-2" /> Watch Course Video
                </a>
              </Button>
            ) : course.instagram_url ? (
              <Button asChild variant="outline" id="video">
                <a href={course.instagram_url} target="_blank" rel="noreferrer">
                  <Play className="w-4 h-4 mr-2" /> Watch on Instagram
                </a>
              </Button>
            ) : null}
          </div>

          {ytId && (
            <div id="video-embed" className="aspect-video rounded-xl overflow-hidden border mb-8">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${ytId}`}
                title={course.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {longSyllabus && (
            <section className="mb-10">
              <h2 className="text-xl font-bold mb-3">Detailed Syllabus</h2>
              <div className="prose prose-sm max-w-none whitespace-pre-line text-foreground/90">
                {longSyllabus}
              </div>
            </section>
          )}

          <FAQ items={COURSE_FAQS} title="Course FAQs" className="!py-0 mb-10" />

          <div className="rounded-2xl border p-6 bg-muted/30 text-center">
            <h3 className="font-bold text-lg mb-1">Ready to start?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Talk to our counsellor for batch dates, demo class &amp; admission.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link to={`/enquire?course=${encodeURIComponent(course.name)}`}>
                  <MessageCircle className="w-4 h-4 mr-1" /> Enquire Now
                </Link>
              </Button>
              {settings.whatsapp_number && (
                <Button variant="outline" onClick={async () => {
                  const link = await buildWhatsAppLink("enroll_button", {
                    course_name: course.name,
                    student_name: "",
                    phone: "",
                  }, "917009933289");
                  window.open(link, "_blank", "noopener,noreferrer");
                }}>
                  WhatsApp Us
                </Button>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
