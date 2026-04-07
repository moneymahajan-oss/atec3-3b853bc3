import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

export default function VideosSection() {
  const [videos, setVideos] = useState<any[]>([]);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("youtube_videos").select("*").order("display_order").then(({ data }) => {
      if (data) setVideos(data);
    });
  }, []);

  if (videos.length === 0) return null;

  return (
    <section id="videos" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <Badge variant="outline" className="mb-4 text-accent border-accent/30 bg-accent/5"><Sparkles className="w-3 h-3 mr-1" /> Videos</Badge>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">Watch & Learn</h2>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((v, i) => (
            <motion.div key={v.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="glass rounded-2xl overflow-hidden group cursor-pointer hover:shadow-xl transition-shadow" onClick={() => setActiveVideo(v.video_id)}>
              <div className="relative h-48 overflow-hidden">
                <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                  <div className="w-14 h-14 rounded-full gradient-accent flex items-center justify-center group-hover:scale-110 transition-transform shadow-xl">
                    <Play className="w-6 h-6 text-accent-foreground ml-0.5" />
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-heading font-semibold text-foreground mb-1">{v.title}</h3>
                <p className="text-sm text-muted-foreground">{v.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      <Dialog open={!!activeVideo} onOpenChange={() => setActiveVideo(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {activeVideo && (
            <div className="aspect-video">
              <iframe src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1`} className="w-full h-full" allow="autoplay; encrypted-media" allowFullScreen />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
