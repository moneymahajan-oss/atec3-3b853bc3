import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, IndianRupee, Download, Play, MessageCircle, ArrowLeft } from "lucide-react";
import { resolveCourseOgImage, youtubeId, slugifyCourseName, coursePublicUrl } from "@/lib/courseLinks";
import { useSiteSettings } from "@/hooks/useSiteSettings";

interface CourseRow {
  id: string;
  name: string;
  slug: string | null;
  category: string;
  duration: string | null;
  mode: string;
  total_fee: number;
  brochure_url: string | null;
  youtube_url: string | null;
  video_url: string | null;
  og_image_url: string | null;
  concise_syllabus: string | null;
  detailed_syllabus_html: string | null;
  meta_title: string | null;
  meta_description: string | null;
  next_batch_date: string | null;
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
        .from("crm_courses")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      // 2) fallback: match slugified name
      if (!data) {
        const { data: all } = await supabase
          .from("crm_courses")
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

  return (
    <>
      <SEO title={title} description={description} canonical={canonical} ogImage={ogImage} ogType="article" />
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
          {course.concise_syllabus && (
            <p className="text-muted-foreground mb-6 whitespace-pre-line">{course.concise_syllabus}</p>
          )}

          <div className="flex flex-wrap gap-3 mb-8">
            {course.brochure_url && (
              <Button asChild id="brochure">
                <a href={course.brochure_url} target="_blank" rel="noreferrer">
                  <Download className="w-4 h-4 mr-2" /> Download Brochure (PDF)
                </a>
              </Button>
            )}
            {(course.youtube_url || course.video_url) && (
              <Button asChild variant="outline" id="video">
                <a href={course.youtube_url || course.video_url || "#"} target="_blank" rel="noreferrer">
                  <Play className="w-4 h-4 mr-2" /> Watch Course Video
                </a>
              </Button>
            )}
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
                <Button asChild variant="outline">
                  <a
                    href={`https://wa.me/${settings.whatsapp_number.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, I'm interested in ${course.name}.`)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp Us
                  </a>
                </Button>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
