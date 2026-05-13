import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sparkles, Play, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Dialog, DialogContent } from "@/components/ui/dialog";

function getEmbedUrl(url?: string | null): string | null {
  if (!url) return null;
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([^&\?\/]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
  // Instagram reel/post
  const igMatch = url.match(/instagram\.com\/(reel|p)\/([^\/\?]+)/);
  if (igMatch) return `https://www.instagram.com/${igMatch[1]}/${igMatch[2]}/embed`;
  // Generic — try as-is in iframe
  return url;
}

export default function TestimonialsSection() {
  const settings = useSiteSettings();
  const [activeVideo, setActiveVideo] = useState<{ url: string; name: string } | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  const { data: testimonials = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["testimonials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data ?? [];
    },
    placeholderData: (prev: any) => prev,
    retry: 2,
    retryDelay: 1000,
  });

  if (isError)
    return (
      <section id="testimonials" className="py-12 bg-muted/30 text-center">
        <button
          onClick={() => refetch()}
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          Retry loading testimonials
        </button>
      </section>
    );

  if (isLoading || testimonials.length === 0) return null;

  const videoCards = testimonials.filter((t: any) => t.youtube_url);
  const textCards = testimonials.filter((t: any) => !t.youtube_url);

  const scroll = (direction: "left" | "right") => {
    if (!sliderRef.current) return;
    const cardWidth = sliderRef.current.querySelector("div")?.offsetWidth ?? 200;
    sliderRef.current.scrollBy({
      left: direction === "left" ? -(cardWidth + 16) : cardWidth + 16,
      behavior: "smooth",
    });
  };

  return (
    <section id="testimonials" className="py-14 bg-muted/30 overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <Badge variant="outline" className="mb-4 text-accent border-accent/30 bg-accent/5">
            <Sparkles className="w-3 h-3 mr-1" /> Testimonials
          </Badge>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-2">
            {settings.testimonials_section_heading || "What Our Students Say"}
          </h2>
        </motion.div>

        {/* Horizontal Slider */}
        {videoCards.length > 0 && (
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
              className="flex gap-4 overflow-x-auto scroll-smooth pb-2 px-1"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {videoCards.map((t: any, i: number) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="group relative rounded-2xl overflow-hidden cursor-pointer bg-black shadow-lg flex-shrink-0"
                  style={{ width: "200px", aspectRatio: "9/16" }}
                  onClick={() => setActiveVideo({ url: t.youtube_url, name: t.student_name })}
                >
                  {/* Thumbnail */}
                  <img
                    src={t.thumbnail_url || t.photo_url || "/placeholder.svg"}
                    alt={t.student_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                  {/* Play button */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                    </div>
                  </div>

                  {/* Bottom info */}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    {t.review_text && (
                      <p className="text-white text-xs leading-snug mb-1.5 line-clamp-2 italic">
                        "{t.review_text}"
                      </p>
                    )}
                    <p className="text-white font-semibold text-sm leading-tight truncate">
                      {t.student_name}
                    </p>
                    {(t.course_name || t.batch_year) && (
                      <p className="text-white/70 text-xs truncate mt-0.5">
                        {t.course_name}
                        {t.course_name && t.batch_year ? " • " : ""}
                        {t.batch_year && `Batch ${t.batch_year}`}
                      </p>
                    )}
                  </div>
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
        )}

        {/* Text testimonials */}
        {textCards.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
            {textCards.map((t: any, i: number) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass rounded-2xl p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-center gap-3 mb-3">
                  {t.photo_url && (
                    <img
                      src={t.photo_url}
                      alt={t.student_name}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-border"
                    />
                  )}
                  <div>
                    <div className="font-heading font-semibold text-foreground text-sm">
                      {t.student_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t.course_name} {t.batch_year && `• Batch ${t.batch_year}`}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{t.review_text}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ── Full-screen-style Video Modal ── */}
      <Dialog open={!!activeVideo} onOpenChange={(open) => !open && setActiveVideo(null)}>
        <DialogContent
          className="p-0 border-none bg-black"
          style={{
            width: "min(420px, 95vw)",
            maxWidth: "420px",
            maxHeight: "90vh",
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setActiveVideo(null)}
            className="absolute top-3 right-3 z-50 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          {activeVideo && (
            <div
              className="w-full rounded-lg overflow-hidden"
              style={{ aspectRatio: "9/16" }}
            >
              <iframe
                src={getEmbedUrl(activeVideo.url) || ""}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                title={activeVideo.name}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
