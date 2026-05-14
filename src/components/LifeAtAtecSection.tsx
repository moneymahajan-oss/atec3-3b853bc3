import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Play, X, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { detectPlatform, deriveThumbnail, getEmbedUrl } from "@/lib/videoUtils";

function thumbFor(v: any): string {
  const url = (v.video_url || v.video_id || "").trim();
  const platform = (v.platform || detectPlatform(url)).toLowerCase();
  return deriveThumbnail(url, platform as any, v.thumbnail_url);
}

// How many cards visible per breakpoint
function getSlidesVisible(): number {
  if (typeof window === "undefined") return 4;
  if (window.innerWidth < 640) return 1;
  if (window.innerWidth < 1024) return 2;
  return 4;
}

export default function LifeAtAtecSection() {
  const settings = useSiteSettings();
  const heading = (settings.life_videos_heading || settings.life_section_heading)?.trim();
  const subheading = settings.about_section_subheading?.trim();
  const [openVideo, setOpenVideo] = useState<any | null>(null);
  const [current, setCurrent] = useState(0);
  const [slidesVisible, setSlidesVisible] = useState(getSlidesVisible);
  const [isHovered, setIsHovered] = useState(false);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef<number | null>(null);

  const { data: videos = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["life_videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("youtube_videos")
        .select("*")
        .eq("is_active", true)
        .eq("section", "life")
        .order("display_order");
      if (error) throw error;
      return data ?? [];
    },
    placeholderData: (prev: any) => prev,
    retry: 2,
    retryDelay: 1000,
  });

  // Responsive slides visible
  useEffect(() => {
    const handleResize = () => setSlidesVisible(getSlidesVisible());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const maxIndex = Math.max(0, videos.length - slidesVisible);

  const next = useCallback(() => {
    setCurrent(prev => (prev >= maxIndex ? 0 : prev + 1));
  }, [maxIndex]);

  const prev = useCallback(() => {
    setCurrent(prev => (prev <= 0 ? maxIndex : prev - 1));
  }, [maxIndex]);

  // Auto-play: advance every 3s, pause on hover
  useEffect(() => {
    if (videos.length <= slidesVisible) return;
    if (isHovered) return;
    autoPlayRef.current = setInterval(next, 3000);
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [next, isHovered, videos.length, slidesVisible]);

  // Clamp current if videos count changes
  useEffect(() => {
    if (current > maxIndex) setCurrent(maxIndex);
  }, [maxIndex, current]);

  const handleClick = (v: any) => {
    const url = (v.video_url || v.video_id || "").trim();
    const platform = (v.platform || detectPlatform(url)).toLowerCase();
    const embed = getEmbedUrl(url, platform as any);
    if (embed) {
      setOpenVideo({ ...v, platform, _embed: embed });
    } else if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  // Touch/swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
    touchStartX.current = null;
  };

  if (isError) return (
    <section id="life-at-atec" className="py-12 bg-white text-center">
      <button onClick={() => refetch()} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <RefreshCw className="w-3 h-3" /> Retry loading videos
      </button>
    </section>
  );

  if (isLoading || videos.length === 0) return null;

  const cardWidthPct = 100 / slidesVisible;
  const showControls = videos.length > slidesVisible;
  // Dot count = total positions (maxIndex + 1)
  const dotCount = maxIndex + 1;

  return (
    <section id="life-at-atec" className="py-12 bg-white">
      <div className="container mx-auto px-4">
        {(heading || subheading) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            {heading && (
              <h2 className="text-3xl font-heading font-bold text-foreground mb-4 md:text-3xl">
                {heading}
              </h2>
            )}
            {subheading && (
              <p className="text-muted-foreground max-w-2xl mx-auto">{subheading}</p>
            )}
          </motion.div>
        )}

        {/* Slider wrapper */}
        <div className="relative"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Prev button */}
          {showControls && (
            <button
              onClick={prev}
              className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center hover:bg-orange-50 hover:border-orange-300 transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
          )}

          {/* Track container — clips overflow */}
          <div
            className="overflow-hidden rounded-2xl"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Sliding track */}
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${current * cardWidthPct}%)` }}
            >
              {videos.map((v: any, i: number) => (
                <div
                  key={v.id}
                  className="flex-shrink-0 px-2"
                  style={{ width: `${cardWidthPct}%` }}
                >
                  <button
                    onClick={() => handleClick(v)}
                    className="relative group w-full rounded-2xl overflow-hidden shadow-md aspect-square cursor-pointer bg-black block"
                  >
                    <img
                      src={thumbFor(v)}
                      alt={v.title || "Life at ATEC"}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:opacity-80 transition-opacity duration-300"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center shadow-xl transition-transform duration-200 group-hover:scale-110">
                        <Play className="w-7 h-7 text-black fill-black ml-1" />
                      </div>
                    </div>
                    {v.title && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-left">
                        <p className="text-white text-sm font-medium line-clamp-2">{v.title}</p>
                      </div>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Next button */}
          {showControls && (
            <button
              onClick={next}
              className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center hover:bg-orange-50 hover:border-orange-300 transition-colors"
              aria-label="Next"
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>
          )}
        </div>

        {/* Dot indicators */}
        {showControls && dotCount > 1 && (
          <div className="flex justify-center gap-2 mt-5">
            {Array.from({ length: dotCount }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === current
                    ? "w-6 h-2 bg-orange-500"
                    : "w-2 h-2 bg-gray-300 hover:bg-gray-400"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Video lightbox */}
      <AnimatePresence>
        {openVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setOpenVideo(null)}
          >
            <button className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-10">
              <X className="w-6 h-6" />
            </button>
            <div
              className={
                openVideo.platform === "instagram"
                  ? "w-full max-w-[420px] h-[85vh]"
                  : openVideo.platform === "facebook"
                  ? "w-full max-w-2xl h-[75vh]"
                  : "w-full max-w-4xl aspect-video"
              }
              onClick={e => e.stopPropagation()}
            >
              <iframe
                src={openVideo._embed}
                className="w-full h-full rounded-xl bg-black"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                scrolling="no"
                title={openVideo.title || "Video"}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
