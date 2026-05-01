import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { SEO } from "@/components/SEO";

type Faculty = {
  id: string; name: string; slug: string | null;
  designation: string | null; specialization: string | null;
  photo_url: string | null; experience_years: number | null;
  qualifications: string | null;
};

export default function FacultyList() {
  const [items, setItems] = useState<Faculty[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("crm_faculties")
        .select("id,name,slug,designation,specialization,photo_url,experience_years,qualifications")
        .eq("is_active", true).eq("is_public", true)
        .order("display_order").order("name");
      setItems((data ?? []) as Faculty[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items;
    return items.filter((f) =>
      f.name.toLowerCase().includes(t) ||
      (f.designation || "").toLowerCase().includes(t) ||
      (f.specialization || "").toLowerCase().includes(t)
    );
  }, [items, q]);

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Our Faculty | ATEC Education" description="Meet the experienced faculty at ATEC Education." />
      <Navbar />
      <main className="container mx-auto px-4 py-10 md:py-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-heading font-bold">Our Faculty</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto mt-2">Trainers who blend deep subject expertise with practical industry experience.</p>
        </div>

        <div className="max-w-md mx-auto mb-8 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, specialization…" className="pl-9" />
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-12">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No faculty profiles yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((f) => (
              <Link
                key={f.id}
                to={f.slug ? `/faculty/${f.slug}` : "#"}
                className="group rounded-2xl border bg-card overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1"
              >
                <div className="aspect-[4/3] bg-muted overflow-hidden">
                  {f.photo_url ? (
                    <img src={f.photo_url} alt={f.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <GraduationCap className="w-16 h-16" />
                    </div>
                  )}
                </div>
                <div className="p-5 space-y-1">
                  <h3 className="font-heading font-semibold text-lg">{f.name}</h3>
                  {f.designation && <p className="text-sm text-muted-foreground">{f.designation}</p>}
                  {f.qualifications && <p className="text-xs text-muted-foreground">{f.qualifications}</p>}
                  {f.specialization && <p className="text-sm pt-1">{f.specialization}</p>}
                  {f.experience_years != null && <p className="text-xs text-muted-foreground pt-1">{f.experience_years}+ yrs experience</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
