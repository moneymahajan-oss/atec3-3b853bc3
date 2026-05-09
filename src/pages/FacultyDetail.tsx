import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { GraduationCap, Linkedin, Instagram, ArrowLeft, BookOpen, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";

type Faculty = {
  id: string; name: string; slug: string | null;
  designation: string | null; specialization: string | null;
  qualifications: string | null; bio: string | null;
  photo_url: string | null; experience_years: number | null;
  linkedin_url: string | null; instagram_url: string | null;
};

export default function FacultyDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [f, setF] = useState<Faculty | null>(null);
  const [courses, setCourses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!slug) { setLoading(false); return; }
      const { data: facData } = await supabase.rpc("get_public_faculty_by_slug", { _slug: slug });
      const fac = Array.isArray(facData) ? facData[0] : null;
      setF((fac as Faculty) || null);
      if (fac) {
        const { data: bs } = await supabase
          .from("crm_batches").select("course_name_snapshot").eq("faculty_name", (fac as Faculty).name);
        const set = new Set<string>();
        (bs ?? []).forEach((b: { course_name_snapshot: string | null }) => {
          if (b.course_name_snapshot) set.add(b.course_name_snapshot);
        });
        setCourses(Array.from(set).sort());
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <p className="text-center text-muted-foreground py-20">Loading…</p>
      </div>
    );
  }

  if (!f) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-2">Faculty not found</h1>
          <Link to="/faculty" className="text-primary hover:underline">← Back to all faculty</Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${f.name} | ATEC Education`} description={f.designation || `Faculty profile of ${f.name}`} />
      <Navbar />
      <main className="container mx-auto px-4 py-10 md:py-16 max-w-4xl">
        <Link to="/faculty" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /> All faculty
        </Link>

        <div className="grid md:grid-cols-[260px_1fr] gap-8 items-start">
          <div className="rounded-2xl overflow-hidden border bg-muted aspect-square">
            {f.photo_url ? (
              <img src={f.photo_url} alt={f.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <GraduationCap className="w-20 h-20" />
              </div>
            )}
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl font-heading font-bold">{f.name}</h1>
            {f.designation && <p className="text-lg text-muted-foreground">{f.designation}</p>}
            {f.qualifications && <p className="text-sm">{f.qualifications}</p>}
            {f.specialization && (
              <div className="flex flex-wrap gap-2 pt-2">
                {f.specialization.split(",").map((s, i) => (
                  <Badge key={i} variant="secondary">{s.trim()}</Badge>
                ))}
              </div>
            )}
            {f.experience_years != null && (
              <p className="text-sm pt-2"><span className="font-semibold">{f.experience_years}+ years</span> of teaching experience</p>
            )}
            <div className="flex gap-2 pt-3">
              {f.linkedin_url && (
                <Button variant="outline" size="icon" asChild>
                  <a href={f.linkedin_url} target="_blank" rel="noreferrer noopener" aria-label="LinkedIn"><Linkedin className="w-4 h-4" /></a>
                </Button>
              )}
              {f.instagram_url && (
                <Button variant="outline" size="icon" asChild>
                  <a href={f.instagram_url} target="_blank" rel="noreferrer noopener" aria-label="Instagram"><Instagram className="w-4 h-4" /></a>
                </Button>
              )}
              <Button asChild>
                <Link to={`/enquire?referred_by=${encodeURIComponent(f.name)}`}>
                  <MessageCircle className="w-4 h-4 mr-2" /> Enquire
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {f.bio && (
          <section className="mt-10">
            <h2 className="text-xl font-heading font-bold mb-3">About</h2>
            <p className="text-foreground whitespace-pre-wrap leading-relaxed">{f.bio}</p>
          </section>
        )}

        {courses.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-heading font-bold mb-3 flex items-center gap-2">
              <BookOpen className="w-5 h-5" /> Courses I teach
            </h2>
            <div className="flex flex-wrap gap-2">
              {courses.map((c) => <Badge key={c} variant="outline">{c}</Badge>)}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
