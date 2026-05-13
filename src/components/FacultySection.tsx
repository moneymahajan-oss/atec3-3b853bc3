import { useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, ArrowRight, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

type Faculty = {
  id: string; name: string; slug: string | null;
  designation: string | null; specialization: string | null;
  photo_url: string | null; experience_years: number | null;
};

export default function FacultySection() {
  const sliderRef = useRef<HTMLDivElement>(null);

  const { data: items = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['public_faculties'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_faculties");
      if (error) throw error;
      return ((data ?? []) as Faculty[]).slice(0, 8);
    },
    placeholderData: [] as Faculty[],
    retry: 2,
    retryDelay: 1000,
  });

  if (isError) return (
    <section id="faculty" className="py-16 md:py-24 bg-muted/30 text-center">
      <button onClick={() => refetch()} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <RefreshCw className="w-3 h-3" /> Retry loading faculty
      </button>
    </section>
  );

  if (!isLoading && items.length === 0) return null;

  const scroll = (direction: "left" | "right") => {
    if (!sliderRef.current) return;
    const cardWidth = sliderRef.current.querySelector("a")?.offsetWidth ?? 220;
    sliderRef.current.scrollBy({
      left: direction === "left" ? -(cardWidth + 20) : cardWidth + 20,
      behavior: "smooth",
    });
  };

  return (
    <section id="faculty" className="py-16 md:py-24 bg-muted/30 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10 md:mb-14">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">Meet Our Faculty</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mt-2">
            Learn from experienced trainers who blend industry exposure with classroom mastery.
          </p>
        </div>

        {/* Slider */}
        <div className="relative">
          {/* Left arrow */}
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 w-10 h-10 rounded-full bg-background border border-border shadow-lg flex items-center justify-center hover:bg-muted transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Slider track */}
          <div
            ref={sliderRef}
            className="flex gap-5 overflow-x-auto scroll-smooth pb-2 px-1"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {items.map((f, i) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex-shrink-0"
                style={{ width: "220px" }}
              >
                <Link
                  to={f.slug ? `/faculty/${f.slug}` : "/faculty"}
                  className="group block rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1"
                >
                  <div className="bg-muted relative overflow-hidden" style={{ aspectRatio: "1/1" }}>
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

          {/* Right arrow */}
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 w-10 h-10 rounded-full bg-background border border-border shadow-lg flex items-center justify-center hover:bg-muted transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
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

