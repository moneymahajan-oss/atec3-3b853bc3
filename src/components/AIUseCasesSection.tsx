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
    <section id="ai-careers" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {items.map((uc, i) => (
            <motion.div
              key={uc.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="glass rounded-2xl p-6 hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div className="text-4xl mb-3">{uc.icon}</div>
              <h3 className="font-heading font-bold text-lg text-foreground mb-2">{uc.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{uc.description}</p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold border border-accent/20">
                <IndianRupee className="w-3 h-3" />
                {uc.earning_potential}
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
