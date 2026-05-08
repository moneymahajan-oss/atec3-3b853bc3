import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Play, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { detectPlatform, deriveThumbnail, getEmbedUrl } from "@/lib/videoUtils";

function thumbFor(v: any): string {
  const url = (v.video_url || v.video_id || "").trim();
  const platform = (v.platform || detectPlatform(url)).toLowerCase();
  return deriveThumbnail(url, platform as any, v.thumbnail_url);
}

export default function LifeAtAtecSection() {
  const settings = useSiteSettings();
  const heading = (settings.life_videos_heading || settings.life_section_heading)?.trim();
  const subheading = settings.about_section_subheading?.trim();
  const [openVideo, setOpenVideo] = useState<any | null>(null);

  const { data: videos = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['life_videos'],
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
    placeholderData: [] as never[],
    retry: 2,
    retryDelay: 1000,
  });

  if (isError) return (
    <section id="life-at-atec" className="py-12 bg-white text-center">
      <button onClick={() => refetch()} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <RefreshCw className="w-3 h-3" /> Retry loading videos
      </button>
    </section>
  );

  if (isLoading || videos.length === 0) return null;

  const handleClick = (v: any) => {
    const url = (v.video_url || v.video_id || "").trim();
    const platform = (v.platform || detectPlatform(url)).toLowerCase();
    const embed = getEmbedUrl(url, platform as any);
    if (embed) {
      setOpenVideo({ ...v, _embed: embed });
    } else if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <section id="life-at-atec" className="py-12 bg-white">
      <div className="container mx-auto px-4">
        {(heading || subheading) && (
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
            {heading && (
              <h2 className="text-3xl font-heading font-bold text-foreground mb-4 md:text-3xl">
                {heading}
              </h2>
            )}
            {subheading && <p className="text-muted-foreground max-w-2xl mx-auto">{subheading}</p>}
          </motion.div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {videos.map((v: any, i: number) => (
            <motion.button
              key={v.id}
              onClick={() => handleClick(v)}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ scale: 1.03 }}
              className="relative group rounded-2xl overflow-hidden shadow-md aspect-square cursor-pointer bg-black"
            >
              <img
                src={thumbFor(v)}
                alt={v.title || "Life at ATEC"}
                loading="lazy"
                className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center shadow-xl transition-transform group-hover:scale-110">
                  <Play className="w-7 h-7 text-black fill-black ml-1" />
                </div>
              </div>
              {v.title && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-left">
                  <p className="text-white text-sm font-medium line-clamp-2">{v.title}</p>
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {openVideo && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
                allow="autoplay; encrypted-media; picture-in-picture"
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
