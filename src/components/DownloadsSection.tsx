import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sparkles, FileText, FileDown, BookOpen, BarChart3, IndianRupee, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const iconMap: Record<string, React.ElementType> = { FileText, FileDown, BookOpen, BarChart3, IndianRupee };

export default function DownloadsSection() {
  const { data: downloads = [], isLoading } = useQuery({
    queryKey: ['downloads'],
    queryFn: async () => {
      const { data } = await supabase.from("downloads").select("*").order("display_order");
      return data || [];
    },
    staleTime: 0,
    retry: 2,
    retryDelay: 1000,
  });

  if (isLoading || downloads.length === 0) return null;

  return (
    <section id="downloads" className="py-12 bg-[#f8fafc]">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <Badge variant="outline" className="mb-4 text-accent border-accent/30 bg-accent/5"><Sparkles className="w-3 h-3 mr-1" /> Resources</Badge>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">Downloads</h2>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {downloads.map((d: any, i: number) => {
            const Icon = iconMap[d.icon_name] || FileText;
            return (
              <motion.div key={d.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="glass rounded-xl p-5 flex items-start gap-4 hover:shadow-lg transition-shadow group">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-heading font-semibold text-foreground">{d.title}</div>
                  <p className="text-xs text-muted-foreground mt-1">{d.description}</p>
                  <Button size="sm" variant="ghost" className="mt-2 text-accent hover:text-accent p-0 h-auto" asChild>
                    <a href={d.file_url}><Download className="w-3 h-3 mr-1" /> Download</a>
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
