import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Users, Briefcase, FlaskConical, CalendarClock, BadgeIndianRupee, ShieldCheck, Linkedin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";

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
  // If it's already a bare YouTube ID (no slashes, no spaces, ~11 chars)
  if (/^[A-Za-z0-9_-]{6,15}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

export default function AboutSection() {
  const settings = useSiteSettings();
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [aboutVideos, setAboutVideos] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("team_members").select("*").order("display_order").then(({ data }) => {
      if (data) setTeamMembers(data);
    });
    supabase
      .from("youtube_videos")
      .select("*")
      .eq("is_active", true)
      .eq("section", "about")
      .order("display_order")
      .limit(4)
      .then(({ data }) => {
        if (data) setAboutVideos(data);
      });
  }, []);

  return (
    <section id="about" className="py-12 bg-[#f8fafc]">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <Badge variant="outline" className="mb-4 text-accent border-accent/30 bg-accent/5"><Sparkles className="w-3 h-3 mr-1" /> About Us</Badge>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">
            {settings.about_section_heading || "About ATEC"}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {settings.about_section_subheading || "Watch our story unfold"}
          </p>
        </motion.div>

        {/* 4 YouTube videos */}
        {aboutVideos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            {aboutVideos.map((v, i) => {
              const id = getYouTubeId(v.video_id || v.youtube_url || "");
              return (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="glass rounded-2xl overflow-hidden"
                >
                  <div className="aspect-video bg-black">
                    {id && (
                      <iframe
                        src={`https://www.youtube.com/embed/${id}`}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={v.title}
                      />
                    )}
                  </div>
                  {v.title && (
                    <div className="p-4">
                      <div className="font-heading font-semibold text-foreground">{v.title}</div>
                      {v.description && <p className="text-sm text-muted-foreground mt-1">{v.description}</p>}
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

        {teamMembers.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h3 className="text-2xl md:text-3xl font-heading font-bold text-foreground text-center mb-10">Meet Our Team</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {teamMembers.map((m, i) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="glass rounded-2xl p-5 text-center group">
                  <img src={m.photo_url} alt={m.name} className="w-24 h-24 mx-auto rounded-full object-cover mb-4 ring-4 ring-border group-hover:ring-accent/30 transition-all" />
                  <div className="font-heading font-semibold text-foreground">{m.name}</div>
                  <div className="text-sm text-accent">{m.role}</div>
                  <div className="text-xs text-muted-foreground mt-1">{m.bio}</div>
                  {m.linkedin_url && (
                    <a href={m.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex mt-3 text-muted-foreground hover:text-primary transition-colors">
                      <Linkedin className="w-4 h-4" />
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
