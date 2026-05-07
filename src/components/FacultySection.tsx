import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

type Faculty = {
  id: string; name: string; slug: string | null;
  designation: string | null; specialization: string | null;
  photo_url: string | null; experience_years: number | null;
};

export default function FacultySection() {,
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['public_faculties'],
    queryFn: async () => {
      const { data } = await supabase
        .from("crm_faculties")
        .select("id,name,slug,designation,specialization,photo_url,experience_years")
        .eq("is_active", true)
        .eq("is_public", true)
        .order("display_order")
        .order("name")
        .limit(8);
      return (data ?? []) as Faculty[];
    },
    staleTime: 0,
  });

  if (!isLoading && items.length === 0) return null;

  return (
    <section id="faculty" className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10 md:mb-14">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">Meet Our Faculty</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mt-2">
            Learn from experienced trainers who blend industry exposure with classroom mastery.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          {items.map((f, i) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={f.slug ? `/faculty/${f.slug}` : "/faculty"}
                className="group block rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1"
              >
                <div className="aspect-square bg-muted relative overflow-hidden">
                  {f.photo_url ? (
                    <img src={f.photo_url} alt={f.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <GraduationCap className="w-16 h-16" />
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-1">
                  <h3 className="font-heading font-semibold text-foreground truncate">{f.name}</h3>
                  {f.designation && <p className="text-xs text-muted-foreground line-clamp-1">{f.designation}</p>}
                  {f.specialization && <p className="text-sm line-clamp-1">{f.specialization}</p>}
                  {f.experience_years != null && (
                    <p className="text-xs text-muted-foreground pt-1">{f.experience_years}+ yrs experience</p>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            to="/faculty"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            View all faculty <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
