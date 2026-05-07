import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sparkles, Star, Quote, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";

function getYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([^&\?\/]+)/);
  return match ? match[1] : null;
}

export default function TestimonialsSection() {
  const settings = useSiteSettings();

  const { data: testimonials = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['testimonials'],
    queryFn: async () => {
      const { data, error } = await supabase.from("testimonials").select("*").eq("is_active", true).order("display_order");
      if (error) throw error;
      return data ?? [];
    },
    placeholderData: [] as never[],
    retry: 2,
    retryDelay: 1000,
  });

  if (isError) return (
    <section id="testimonials" className="py-12 bg-[#f8fafc] text-center">
      <button onClick={() => refetch()} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <RefreshCw className="w-3 h-3" /> Retry loading testimonials
      </button>
    </section>
  );

  if (isLoading || testimonials.length === 0) return null;

  const videoTestimonials = testimonials.filter((t: any) => getYouTubeId(t.youtube_url));
  const textTestimonials = testimonials.filter((t: any) => !getYouTubeId(t.youtube_url));

  return (
    <section id="testimonials" className="py-12 bg-[#f8fafc]">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <Badge variant="outline" className="mb-4 text-accent border-accent/30 bg-accent/5"><Sparkles className="w-3 h-3 mr-1" /> Testimonials</Badge>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">
            {settings.testimonials_section_heading || "What Our Students Say"}
          </h2>
        </motion.div>

        {videoTestimonials.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {videoTestimonials.map((t: any, i: number) => {
              const id = getYouTubeId(t.youtube_url);
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="glass rounded-2xl overflow-hidden"
                >
                  <div className="aspect-video bg-black">
                    <iframe
                      src={`https://www.youtube.com/embed/${id}`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={t.student_name}
                    />
                  </div>
                  <div className="p-4">
                    <div className="font-heading font-semibold text-foreground">{t.student_name}</div>
                    {t.course_name && <div className="text-xs text-muted-foreground">{t.course_name}</div>}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {textTestimonials.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {textTestimonials.map((t: any, i: number) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="glass rounded-2xl p-6 hover:shadow-xl transition-shadow relative">
                <Quote className="w-8 h-8 text-accent/20 absolute top-4 right-4" />
                <div className="flex items-center gap-3 mb-4">
                  {t.photo_url && <img src={t.photo_url} alt={t.student_name} className="w-12 h-12 rounded-full object-cover ring-2 ring-border" />}
                  <div>
                    <div className="font-heading font-semibold text-foreground">{t.student_name}</div>
                    <div className="text-xs text-muted-foreground">{t.course_name} {t.batch_year && `• Batch ${t.batch_year}`}</div>
                  </div>
                </div>
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className={`w-4 h-4 ${j < (t.rating || 5) ? "text-accent fill-accent" : "text-muted-foreground/30"}`} />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{t.review_text}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
