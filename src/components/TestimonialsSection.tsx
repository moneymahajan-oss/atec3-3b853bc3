import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sparkles, Play, X } from "lucide-react";
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
    placeholderData: [] as never[],
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

  // Show only video testimonials (first 4) for the reel layout
  const videoCards = testimonials
    .filter((t: any) => t.youtube_url)
    .slice(0, 4);

  const textCards = testimonials.filter((t: any) => !t.youtube_url);

  return (
    <section id="testimonials" className="py-14 bg-muted/30">
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

        {/* Instagram Reel-style video cards — 4 columns */}
        {videoCards.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {videoCards.map((t: any, i: number) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative rounded-2xl overflow-hidden cursor-pointer bg-black shadow-lg"
                style={{ aspectRatio: "9/16" }}
                onClick={() =>
                  setActiveVideo({ url: t.youtube_url, name: t.student_name })
                }
              >
                {/* Thumbnail */}
                <img
                  src={
                    t.thumbnail_url ||
                    t.photo_url ||
                    "/placeholder.svg"
                  }
                  alt={t.student_name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Play button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform">
                    <Play className="w-7 h-7 text-white fill-white ml-1" />
                  </div>
                </div>

                {/* Bottom info */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white font-semibold text-sm leading-tight truncate">
                    {t.student_name}
                  </p>
                  {t.course_name && (
                    <p className="text-white/70 text-xs truncate mt-0.5">
                      {t.course_name}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Text testimonials (kept as fallback) */}
        {textCards.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                      {t.course_name}{" "}
                      {t.batch_year && `• Batch ${t.batch_year}`}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t.review_text}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Video playback dialog */}
      <Dialog
        open={!!activeVideo}
        onOpenChange={(open) => !open && setActiveVideo(null)}
      >
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-black border-none">
          {activeVideo && (
            <div className="w-full" style={{ aspectRatio: "9/16", maxHeight: "85vh" }}>
              <iframe
                src={getEmbedUrl(activeVideo.url) || ""}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
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
