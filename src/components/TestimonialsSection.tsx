import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Star, Quote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("testimonials").select("*").order("display_order").then(({ data }) => {
      if (data) setTestimonials(data);
    });
  }, []);

  if (testimonials.length === 0) return null;

  return (
    <section id="testimonials" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <Badge variant="outline" className="mb-4 text-accent border-accent/30 bg-accent/5"><Sparkles className="w-3 h-3 mr-1" /> Testimonials</Badge>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">What Our Students Say</h2>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="glass rounded-2xl p-6 hover:shadow-xl transition-shadow relative">
              <Quote className="w-8 h-8 text-accent/20 absolute top-4 right-4" />
              <div className="flex items-center gap-3 mb-4">
                <img src={t.photo_url} alt={t.student_name} className="w-12 h-12 rounded-full object-cover ring-2 ring-border" />
                <div>
                  <div className="font-heading font-semibold text-foreground">{t.student_name}</div>
                  <div className="text-xs text-muted-foreground">{t.course_name} • Batch {t.batch_year}</div>
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
      </div>
    </section>
  );
}
