import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sparkles, Play, Clock, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import VideoThumbnail from "@/components/VideoThumbnail";
import {
  detectPlatform,
  deriveThumbnail,
  getEmbedUrl,
  getDialogSize,
  extractInstagramCode,
} from "@/lib/videoUtils";

const META: Record<string, { duration: string; category: string; desc: string }> = {
  "Introduction to Python": { duration: "12:45", category: "Programming", desc: "Beginner-friendly intro to Python syntax and logic." },
  "Digital Marketing Basics": { duration: "15:20", category: "Marketing", desc: "SEO, social media and ads fundamentals." },
  "Tally Prime for Beginners": { duration: "18:30", category: "Accounting", desc: "Step-by-step Tally accounting & GST entries." },
  "Excel Masterclass": { duration: "22:10", category: "Office", desc: "Formulas, pivot tables and dashboards." },
  "Graphic Design with Canva": { duration: "10:55", category: "Design", desc: "Create posters and social posts in minutes." },
  "English Communication Skills": { duration: "14:05", category: "Soft Skills", desc: "Speak fluent English with confidence." },
};

export default function VideosSection() {
  const [active, setActive] = useState<{
    embed: string;
    platform: string;
  } | null>(null);

  const { data: videos = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["learn_videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("youtube_videos")
        .select("*")
        .eq("section", "learn")
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
      <section id="videos" className="py-12 bg-white text-center">
        <button
          onClick={() => refetch()}
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" /> Retry loading videos
        </button>
      </section>
    );

  if (isLoading || videos.length === 0) return null;

  const handlePlay = (v: any) => {
    const url = (v.video_url || v.video_id || "").trim();
    const platform = (v.platform || detectPlatform(url)).toLowerCase();
    const embed = getEmbedUrl(url, platform as any);
    if (embed) {
      setActive({ embed, platform });
    } else if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  // Active platform sizing
  const sizing = active
    ? getDialogSize(active.platform as any)
    : { dialogClass: "max-w-3xl p-0 bg-black border-0", containerClass: "aspect-video w-full" };

  const videoJsonLd = videos.map((v: any) => {
    const url = (v.video_url || v.video_id || "").trim();
    const platform = (v.platform || detectPlatform(url)).toLowerCase();
    const thumb = deriveThumbnail(url, platform as any, v.thumbnail_url);
    const meta = META[v.title] || { duration: "10:00", category: "Course", desc: v.description || "" };
    return {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: v.title,
      description: v.description || meta.desc || v.title,
      thumbnailUrl: thumb,
      uploadDate: v.created_at || new Date().toISOString(),
      ...(url && { contentUrl: url }),
    };
  });

  return (
    <section id="videos" aria-label="Videos" className="py-12 bg-white">
      {videoJsonLd.length > 0 && (
        <Helmet>
          {videoJsonLd.map((obj, i) => (
            <script key={i} type="application/ld+json">
              {JSON.stringify(obj)}
            </script>
          ))}
        </Helmet>
      )}
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <Badge variant="outline" className="mb-4 text-accent border-accent/30 bg-accent/5">
            <Sparkles className="w-3 h-3 mr-1" /> Videos
          </Badge>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-2">
            Watch & Learn
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Bite-sized lessons from our top instructors
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {videos.map((v: any, i: number) => {
            const meta = META[v.title] || { duration: "10:00", category: "Course", desc: v.description || "" };
            const url = (v.video_url || v.video_id || "").trim();
            const platform = (v.platform || detectPlatform(url)).toLowerCase();
            const thumb = deriveThumbnail(url, platform as any, v.thumbnail_url);
            const isReel = platform === "instagram";

            return (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                onClick={() => handlePlay(v)}
                className="glass rounded-2xl overflow-hidden group cursor-pointer hover:shadow-xl transition-shadow flex flex-col"
              >
                {/* Thumbnail — portrait for reels, landscape for YouTube */}
                <div
                  className={`relative w-full overflow-hidden ${
                    isReel ? "aspect-[9/16] max-h-[320px]" : "aspect-video"
                  }`}
                >
                  <VideoThumbnail
                    src={thumb}
                    alt={v.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                    <div className="w-16 h-16 rounded-full gradient-accent flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-7 h-7 text-accent-foreground ml-1" />
                    </div>
                  </div>
                  {/* Platform badge */}
                  <span className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-semibold px-2 py-0.5 rounded capitalize">
                    {platform === "youtube" ? "YouTube" : platform === "instagram" ? "Instagram" : platform}
                  </span>
                  <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-semibold px-2 py-1 rounded inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {meta.duration}
                  </span>
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <Badge variant="outline" className="self-start mb-2 text-xs text-primary border-primary/30">
                    {meta.category}
                  </Badge>
                  <h3 className="font-heading font-semibold text-foreground text-lg mb-1.5 line-clamp-2">
                    {v.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{meta.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Video Dialog — sizes correctly per platform */}
      <Dialog open={!!active} onOpenChange={() => setActive(null)}>
        <DialogContent className={sizing.dialogClass}>
          {active && (
            <>
              {/* Instagram Reel: portrait 9:16 */}
              {active.platform === "instagram" ? (
                <div className="w-full" style={{ aspectRatio: "9/16", maxHeight: "85vh" }}>
                  <iframe
                    src={active.embed}
                    className="w-full h-full border-0"
                    scrolling="no"
                    allowTransparency={true}
                    allowFullScreen
                    title="Instagram Reel"
                  />
                </div>
              ) : (
                /* YouTube / Facebook / Other: landscape 16:9 */
                <div className={sizing.containerClass}>
                  <iframe
                    src={active.embed}
                    className="w-full h-full border-0"
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    title="Video player"
                  />
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
