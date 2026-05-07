import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const fallbackSlides = [
  {
    id: "fallback-hero",
    title: "Welcome to ATEC",
    subtitle: "Punjab's Premier Destination for Technology Education",
    badge_text: "Avenue To Excellent Careers",
    cta_text: "Explore Courses",
    cta_link: "/courses",
    image_url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80",
  },
];

export default function HeroSection() {
  const [slides, setSlides] = useState<any[]>(fallbackSlides);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase.from("hero_slides").select("*").eq("is_active", true).order("display_order");
        if (error) {
          console.error("[HeroSection] fetch error:", error.message);
          return;
        }
        const validSlides = (data || []).filter(
          (slide: any) => slide?.is_active && slide?.title?.trim() && slide?.image_url?.trim()
        );
        if (validSlides.length) {
          setSlides(validSlides);
          setCurrent(0);
        }
      } catch (e) {
        console.error("[HeroSection] unexpected:", e);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (slides.length === 0) return;
    const timer = setInterval(() => setCurrent((p) => (p + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const slide = slides[current];
  if (!slide) return null;

  return (
    <section id="home" className="relative h-screen min-h-[600px] max-h-[900px] overflow-hidden bg-gray-900">
      <AnimatePresence mode="sync">
        <motion.div key={slide.id} initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }} className="absolute inset-0">
          <img src={slide.image_url} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/30" />
          <div className="absolute inset-0 gradient-mesh opacity-40" />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 h-full container mx-auto px-4 flex items-center">
        <AnimatePresence mode="wait">
          <motion.div key={slide.id} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.6 }} className="max-w-2xl">
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/20 border border-accent/30 text-accent-foreground mb-6">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">{slide.badge_text}</span>
            </motion.div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-heading font-bold leading-tight mb-6" style={{ color: "white" }}>{slide.title}</h1>
            <p className="text-lg sm:text-xl mb-8 max-w-xl" style={{ color: "rgba(255,255,255,0.8)" }}>{slide.subtitle}</p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="gradient-accent text-accent-foreground border-0 font-semibold text-base px-8 hover:opacity-90 transition-opacity" asChild>
                <a href={slide.cta_link}>{slide.cta_text}</a>
              </Button>
              <Button size="lg" variant="outline" className="border-white/30 font-semibold text-base px-8 backdrop-blur-sm hover:bg-white/10" style={{ color: "white" }} asChild>
                <a href="#videos"><Play className="w-4 h-4 mr-2" />Watch Demo</a>
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute bottom-8 left-0 right-0 z-10 container mx-auto px-4 flex items-center justify-between">
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} className={`h-2 rounded-full transition-all duration-300 ${i === current ? "w-8 bg-accent" : "w-2 bg-white/40 hover:bg-white/60"}`} />
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCurrent((p) => (p - 1 + slides.length) % slides.length)}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors">
            <ChevronLeft className="w-5 h-5" style={{ color: "white" }} />
          </button>
          <button onClick={() => setCurrent((p) => (p + 1) % slides.length)}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors">
            <ChevronRight className="w-5 h-5" style={{ color: "white" }} />
          </button>
        </div>
      </div>
    </section>
  );
}
