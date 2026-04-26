import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, IndianRupee } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { whatsAppLinkSync } from "@/lib/whatsapp";

interface UseCase {
  id: string;
  title: string;
  description: string;
  earning_potential: string;
  icon: string;
}

const IMAGES: Record<string, string> = {
  "AI Content Creator": "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&h=400&fit=crop",
  "AI Video Editor": "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=600&h=400&fit=crop",
  "AI Data Analyst": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop",
  "AI Chatbot Builder": "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=600&h=400&fit=crop",
  "Prompt Engineer": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop",
  "AI Tutor / Trainer": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=400&fit=crop",
};

export default function AIUseCasesSection() {
  const [items, setItems] = useState<UseCase[]>([]);
  const settings = useSiteSettings();

  useEffect(() => {
    supabase
      .from("ai_use_cases")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (data) setItems(data as UseCase[]);
      });
  }, []);

  if (items.length === 0) return null;

  const waNumber = settings.whatsapp_number || "917009933289";
  const ctaLink = whatsAppLinkSync(
    waNumber,
    "Hi ATEC! I want to learn AI courses. Please share batch and fee details."
  );

  return (
    <section id="ai-careers" className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <Badge variant="outline" className="mb-4 text-accent border-accent/30 bg-accent/5">
            <Sparkles className="w-3 h-3 mr-1" /> AI Careers
          </Badge>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">
            {settings.ai_usecases_heading || "AI Career Opportunities"}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {settings.ai_usecases_subheading || "Real careers you can build with AI skills from ATEC"}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {items.map((uc, i) => (
            <motion.div
              key={uc.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="glass rounded-2xl overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div className="relative h-40 overflow-hidden">
                <img
                  src={IMAGES[uc.title] || "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop"}
                  alt={uc.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 text-2xl bg-white/90 rounded-full w-9 h-9 flex items-center justify-center shadow">
                  {uc.icon}
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-heading font-bold text-lg text-foreground mb-2">{uc.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{uc.description}</p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold border border-accent/20">
                  <IndianRupee className="w-3 h-3" />
                  {uc.earning_potential}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <Button
            size="lg"
            className="gradient-accent text-accent-foreground border-0 font-semibold"
            asChild
          >
            <a href={ctaLink} target="_blank" rel="noopener noreferrer">
              Learn AI at ATEC <ArrowRight className="w-4 h-4 ml-1" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
