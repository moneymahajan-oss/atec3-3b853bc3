import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Play, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

const META: Record<string, { duration: string; category: string; desc: string }> = {
  "Introduction to Python": { duration: "12:45", category: "Programming", desc: "Beginner-friendly intro to Python syntax and logic." },
  "Digital Marketing Basics": { duration: "15:20", category: "Marketing", desc: "SEO, social media and ads fundamentals." },
  "Tally Prime for Beginners": { duration: "18:30", category: "Accounting", desc: "Step-by-step Tally accounting & GST entries." },
  "Excel Masterclass": { duration: "22:10", category: "Office", desc: "Formulas, pivot tables and dashboards." },
  "Graphic Design with Canva": { duration: "10:55", category: "Design", desc: "Create posters and social posts in minutes." },
  "English Communication Skills": { duration: "14:05", category: "Soft Skills", desc: "Speak fluent English with confidence." },
};

export default function VideosSection() {
  const [videos, setVideos] = useState<any[]>([]);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("youtube_videos").select("*").eq("section", "learn").eq("is_active", true).order("display_order").then(({ data }) => {
      if (data) setVideos(data);
    });
  }, []);

  if (videos.length === 0) return null;

  return (
    <section id="videos" className="py-12 bg-[#f8fafc]">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <Badge variant="outline" className="mb-4 text-accent border-accent/30 bg-accent/5"><Sparkles className="w-3 h-3 mr-1" /> Videos</Badge>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-2">Watch & Learn</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">Bite-sized lessons from our top instructors</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-4 max-w-5xl mx-auto">
          {videos.map((v, i) => {
            const meta = META[v.title] || { duration: "10:00", category: "Course", desc: v.description || "" };
            return (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                onClick={() => setActiveVideo(v.video_id)}
                className="glass rounded-xl overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow flex"
              >
                <div className="relative w-32 sm:w-40 flex-shrink-0 overflow-hidden">
                  <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                    <div className="w-10 h-10 rounded-full gradient-accent flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-4 h-4 text-accent-foreground ml-0.5" />
                    </div>
                  </div>
                  <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />{meta.duration}
                  </span>
                </div>
                <div className="p-3 sm:p-4 flex flex-col justify-center min-w-0 flex-1">
                  <Badge variant="outline" className="self-start mb-1.5 text-[10px] py-0 h-4 text-primary border-primary/30">{meta.category}</Badge>
                  <h3 className="font-heading font-semibold text-foreground text-sm sm:text-base mb-1 line-clamp-1">{v.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{meta.desc}</p>
                </div>
              </motion.div>
            );
          })}
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
