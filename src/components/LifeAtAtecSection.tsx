import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";

function getYouTubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[A-Za-z0-9_-]{6,15}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

export default function LifeAtAtecSection() {
  const settings = useSiteSettings();
  const [videos, setVideos] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("youtube_videos")
      .select("*")
      .eq("is_active", true)
      .eq("section", "life")
      .order("display_order")
      .then(({ data }) => {
        if (data) setVideos(data);
      });
  }, []);

  if (videos.length === 0) return null;

  return (
    <section id="life-at-atec" className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <Badge variant="outline" className="mb-4 text-accent border-accent/30 bg-accent/5">
            <Sparkles className="w-3 h-3 mr-1" /> ABOUT US
          </Badge>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">
            {settings.life_at_atec_heading || "About ATEC"}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto whitespace-pre-line">
            {settings.life_at_atec_subheading || "Watch our story unfold"}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {videos.map((v, i) => {
            const id = getYouTubeId(v.video_id || v.youtube_url || "");
            if (!id) return null;
            return (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl overflow-hidden shadow-md bg-black aspect-square"
              >
                <iframe
                  src={`https://www.youtube.com/embed/${id}`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={v.title || "Life at ATEC"}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
