import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Users, Briefcase, FlaskConical, CalendarClock, BadgeIndianRupee, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const highlights = [
  { icon: Users, title: "Industry Experts", desc: "Learn from professionals with real-world experience" },
  { icon: Briefcase, title: "Placement Support", desc: "100% placement assistance for all students" },
  { icon: FlaskConical, title: "Hands-on Labs", desc: "State-of-the-art computer & robotics labs" },
  { icon: CalendarClock, title: "Flexible Batches", desc: "Morning, evening & weekend batches available" },
  { icon: BadgeIndianRupee, title: "Affordable Fees", desc: "Quality education at competitive prices" },
  { icon: ShieldCheck, title: "Certified Courses", desc: "Industry-recognized certifications included" },
];

function getYouTubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[A-Za-z0-9_-]{6,15}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

export default function AboutSection() {,
    retry: 2,
    retryDelay: 1000,
  const { data: aboutVideos = [] } = useQuery({
    queryKey: ['about_videos'],
    queryFn: async () => {
      const { data } = await supabase
        .from("youtube_videos")
        .select("*")
        .eq("is_active", true)
        .eq("section", "about")
        .order("display_order")
        .limit(4);
      return data || [];
    },
    staleTime: 0,
  });

  return (
    <section id="about" className="py-12 bg-[#f8fafc]">
      <div className="container mx-auto px-4">

        {aboutVideos.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
            {aboutVideos.map((v: any, i: number) => {
              const id = getYouTubeId(v.video_id || v.youtube_url || "");
              return (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="relative rounded-2xl overflow-hidden aspect-square bg-black"
                >
                  {id && (
                    <iframe
                      src={`https://www.youtube.com/embed/${id}`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={v.title}
                    />
                  )}
                  {v.title && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      <div
                        className="absolute bg-black/70 text-white font-bold text-xs px-8 py-1.5 shadow-lg whitespace-nowrap"
                        style={{
                          bottom: "20%",
                          left: "-25%",
                          transform: "rotate(-20deg)",
                          transformOrigin: "center",
                          width: "150%",
                          textAlign: "center",
                        }}
                      >
                        {v.title}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12">
          <h3 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-10 font-sans">Why Choose ATEC?</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {highlights.map((h, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="glass rounded-xl p-5 text-center hover:shadow-lg transition-shadow group">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <h.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="font-heading font-semibold text-foreground mb-1">{h.title}</div>
                <p className="text-xs text-muted-foreground">{h.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

      </div>
    </section>
  );
}
