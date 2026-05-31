// src/components/FacultySection.tsx
// Auto-scroll with interval + speed controlled via site_settings:
//   faculty_auto_scroll   → "true" / "false"
//   faculty_scroll_interval → seconds (default 3)
//   faculty_scroll_speed    → animation ms (default 600)

import { useRef, useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, ArrowRight, RefreshCw, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";

type Faculty = {
  id: string; name: string; slug: string | null;
  designation: string | null; specialization: string | null;
  photo_url: string | null; experience_years: number | null;
};

export default function FacultySection() {
  const sliderRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const settings = useSiteSettings();

  // Read admin-controlled settings
  const autoScrollEnabled = settings["faculty_auto_scroll"] !== "false"; // default true
  const intervalSec = parseFloat(settings["faculty_scroll_interval"] || "3");
  const scrollSpeed = parseInt(settings["faculty_scroll_speed"] || "600");

  const { data: items = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["public_faculties"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_faculties");
      if (error) throw error;
      return ((data ?? []) as Faculty[]).slice(0, 8);
    },
    placeholderData: [] as Faculty[],
    retry: 2,
    retryDelay: 1000,
  });

  const getCardWidth = useCallback(() => {
    if (!sliderRef.current) return 240;
    const card = sliderRef.current.querySelector("a") as HTMLElement | null;
    return card ? card.offsetWidth + 20 : 240;
  }, []);

  const scrollToIndex = useCallback((idx: number) => {
    if (!sliderRef.current || items.length === 0) return;
    const cardWidth = getCardWidth();
    sliderRef.current.scrollTo({
      left: idx * cardWidth,
      behavior: "smooth",
    });
    setCurrentIndex(idx);
  }, [items.length, getCardWidth]);

  const scrollNext = useCallback(() => {
    if (items.length === 0) return;
    // When reaching end, smoothly scroll back to start
    const cardWidth = getCardWidth();
    const maxScroll = sliderRef.current
      ? sliderRef.current.scrollWidth - sliderRef.current.clientWidth
      : 0;
    const currentScroll = sliderRef.current?.scrollLeft ?? 0;

    if (currentScroll >= maxScroll - 10) {
      // At end — scroll back to start
      sliderRef.current?.scrollTo({ left: 0, behavior: "smooth" });
      setCurrentIndex(0);
    } else {
      const nextIdx = currentIndex + 1;
      scrollToIndex(nextIdx);
    }
  }, [currentIndex, items.length, getCardWidth, scrollToIndex]);

  const scrollPrev = useCallback(() => {
    const prevIdx = Math.max(0, currentIndex - 1);
    scrollToIndex(prevIdx);
  }, [currentIndex, scrollToIndex]);

  // Manual arrow scroll
  const handleManualScroll = (dir: "left" | "right") => {
    setIsPaused(true);
    if (dir === "left") scrollPrev();
    else scrollNext();
    // Resume after 5s
    setTimeout(() => setIsPaused(false), 5000);
  };

  // Auto-scroll timer
  useEffect(() => {
    if (!autoScrollEnabled || isPaused || items.length <= 1) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      scrollNext();
    }, intervalSec * 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [autoScrollEnabled, isPaused, intervalSec, scrollNext, items.length]);

  if (isError) return (
    <section id="faculty" className="py-16 md:py-24 bg-muted/30 text-center">
      <button onClick={() => refetch()} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <RefreshCw className="w-3 h-3" /> Retry loading faculty
      </button>
    </section>
  );

  if (!isLoading && items.length === 0) return null;

  return (
    <section
      id="faculty"
      className="py-16 md:py-24 bg-muted/30 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="container mx-auto px-4">
        <div className="text-center mb-10 md:mb-14">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">
            Meet Our Faculty
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mt-2">
            Learn from experienced trainers who blend industry exposure with classroom mastery.
          </p>

          {/* Auto-scroll indicator */}
          {autoScrollEnabled && items.length > 1 && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <button
                onClick={() => setIsPaused(p => !p)}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-full border border-border hover:border-accent/50"
              >
                {isPaused
                  ? <><Play className="w-3 h-3" /> Resume auto-scroll</>
                  : <><Pause className="w-3 h-3" /> Pause</>}
              </button>
              {/* Dot indicators */}
              <div className="flex gap-1 ml-2">
                {items.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => { scrollToIndex(idx); setIsPaused(true); }}
                    className="rounded-full transition-all duration-300"
                    style={{
                      width: idx === currentIndex ? "16px" : "6px",
                      height: "6px",
                      background: idx === currentIndex ? "var(--color-accent, #f97316)" : "#cbd5e1",
                    }}
                    aria-label={`Go to faculty ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Slider */}
        <div className="relative">
          {/* Left arrow */}
          <button
            onClick={() => handleManualScroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 w-10 h-10 rounded-full bg-background border border-border shadow-lg flex items-center justify-center hover:bg-muted transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Slider track */}
          <div
            ref={sliderRef}
            className="flex gap-5 overflow-x-auto pb-2 px-1"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              scrollBehavior: "smooth",
            }}
          >
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 rounded-2xl border border-border bg-card overflow-hidden animate-pulse"
                    style={{ width: "220px" }}>
                    <div className="bg-muted" style={{ aspectRatio: "1/1" }} />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                ))
              : items.map((f, i) => (
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
                          <img
                            src={f.photo_url}
                            alt={f.name}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
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
            onClick={() => handleManualScroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 w-10 h-10 rounded-full bg-background border border-border shadow-lg flex items-center justify-center hover:bg-muted transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar showing time to next scroll */}
        {autoScrollEnabled && !isPaused && items.length > 1 && (
          <div className="mt-4 mx-auto max-w-xs h-0.5 bg-border rounded-full overflow-hidden">
            <div
              key={`fp-${currentIndex}`}
              className="h-full rounded-full"
              style={{
                background: "var(--color-accent, #f97316)",
                animation: `faculty-progress ${intervalSec}s linear forwards`,
              }}
            />
          </div>
        )}

        <div className="text-center mt-8">
          <Link
            to="/faculty"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            View all faculty <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes faculty-progress {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </section>
  );
}
