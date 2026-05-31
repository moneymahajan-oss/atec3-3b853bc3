// src/components/FacultySection.tsx
// Infinite continuous marquee scroll — like a conveyor belt, no end
// Speed controlled from admin: site_settings key "faculty_scroll_speed"
// Values: "slow" | "normal" | "fast" | or custom px/sec number

import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, ArrowRight, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";

type Faculty = {
  id: string; name: string; slug: string | null;
  designation: string | null; specialization: string | null;
  photo_url: string | null; experience_years: number | null;
};

// Speed map: pixels per second
const SPEED_MAP: Record<string, number> = {
  slow: 40,
  normal: 70,
  fast: 120,
};

export default function FacultySection() {
  const [isPaused, setIsPaused] = useState(false);
  const settings = useSiteSettings();

  // faculty_scroll_speed: "slow" | "normal" | "fast" | "60" (custom px/s)
  const speedRaw = settings["faculty_scroll_speed"] || "normal";
  const pxPerSec = SPEED_MAP[speedRaw] ?? parseInt(speedRaw) || 70;

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

  if (isError) return (
    <section id="faculty" className="py-16 md:py-24 bg-muted/30 text-center">
      <button onClick={() => refetch()}
        className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <RefreshCw className="w-3 h-3" /> Retry loading faculty
      </button>
    </section>
  );

  if (!isLoading && items.length === 0) return null;

  // Card width + gap
  const CARD_W = 220;
  const GAP = 20;
  const CARD_STEP = CARD_W + GAP;

  // Duplicate items 3x for seamless infinite loop
  const loopItems = [...items, ...items, ...items];
  const totalWidth = items.length * CARD_STEP;
  // Duration to scroll one full set
  const durationSec = totalWidth / pxPerSec;

  return (
    <section id="faculty" className="py-16 md:py-24 bg-muted/30 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10 md:mb-14">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">
            Meet Our Faculty
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mt-2">
            Learn from experienced trainers who blend industry exposure with classroom mastery.
          </p>
        </div>
      </div>

      {/* Full-width marquee track — outside container so it bleeds edge to edge */}
      <div
        className="relative w-full overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Left fade */}
        <div className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
          style={{ background: "linear-gradient(90deg, var(--color-muted, #f1f5f9), transparent)" }} />
        {/* Right fade */}
        <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
          style={{ background: "linear-gradient(270deg, var(--color-muted, #f1f5f9), transparent)" }} />

        {isLoading ? (
          /* Skeleton */
          <div className="flex gap-5 px-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 rounded-2xl border border-border bg-card overflow-hidden animate-pulse"
                style={{ width: `${CARD_W}px` }}>
                <div className="bg-muted" style={{ aspectRatio: "1/1" }} />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="flex"
            style={{
              gap: `${GAP}px`,
              paddingLeft: `${GAP}px`,
              animation: `faculty-marquee ${durationSec}s linear infinite`,
              animationPlayState: isPaused ? "paused" : "running",
              width: "max-content",
            }}
          >
            {loopItems.map((f, i) => (
              <Link
                key={`${f.id}-${i}`}
                to={f.slug ? `/faculty/${f.slug}` : "/faculty"}
                className="group flex-shrink-0 block rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1"
                style={{ width: `${CARD_W}px` }}
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
                  {f.designation && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{f.designation}</p>
                  )}
                  {f.specialization && (
                    <p className="text-sm line-clamp-1">{f.specialization}</p>
                  )}
                  {f.experience_years != null && (
                    <p className="text-xs text-muted-foreground pt-1">{f.experience_years}+ yrs experience</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="text-center mt-10">
        <Link to="/faculty"
          className="inline-flex items-center gap-2 text-primary font-semibold hover:underline">
          View all faculty <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <style>{`
        @keyframes faculty-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-${totalWidth + GAP}px); }
        }
      `}</style>
    </section>
  );
}
