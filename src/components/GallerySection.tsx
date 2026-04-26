import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function GallerySection() {
  const settings = useSiteSettings();
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState("All");
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("gallery_items").select("*").eq("is_active", true).order("display_order").then(({ data }) => {
      if (data) setItems(data);
    });
  }, []);

  const categories = ["All", ...Array.from(new Set(items.map((g) => g.category).filter(Boolean)))];
  const filtered = filter === "All" ? items : items.filter((g) => g.category === filter);

  return (
    <section id="gallery" className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <Badge variant="outline" className="mb-4 text-accent border-accent/30 bg-accent/5"><Sparkles className="w-3 h-3 mr-1" /> Gallery</Badge>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">
            {settings.life_section_heading || "Life at ATEC"}
          </h2>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === cat ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>{cat}</button>
          ))}
        </div>

        <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <AnimatePresence>
            {filtered.map((item) => (
              <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="relative group rounded-2xl overflow-hidden cursor-pointer aspect-square" onClick={() => setLightbox(item.image_url)}>
                <img src={item.image_url} alt={item.caption || ""} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                {/* Diagonal ribbon caption */}
                {item.caption && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div
                      className="absolute bg-black/70 text-white font-bold text-xs sm:text-sm px-8 py-1.5 shadow-lg whitespace-nowrap"
                      style={{
                        bottom: "20%",
                        left: "-25%",
                        transform: "rotate(-20deg)",
                        transformOrigin: "center",
                        width: "150%",
                        textAlign: "center",
                      }}
                    >
                      {item.caption}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      <AnimatePresence>
        {lightbox && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
            <button className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
              <X className="w-6 h-6" style={{ color: "white" }} />
            </button>
            <img src={lightbox} alt="" className="max-w-full max-h-[85vh] rounded-xl object-contain" />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
