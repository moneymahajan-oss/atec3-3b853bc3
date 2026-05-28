import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Play, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { detectPlatform, getEmbedUrl, getDialogSize } from "@/lib/videoUtils";

const fallbackSlides = [
  {
    id: "fallback-hero",
    title: "Welcome to ATEC",
    subtitle: "Punjab's Premier Destination for Technology Education",
    badge_text: "Avenue To Excellent Careers",
    cta_text: "Explore Courses",
    cta_link: "/courses",
    image_url:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80",
    demo_video_url: null,
  },
];

export default function HeroSection() {
  const { data: slides = fallbackSlides } = useQuery({
    queryKey: ["hero_slides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hero_slides")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) {
        console.error("[HeroSection] fetch error:", error.message);
        return fallbackSlides;
      }
      const validSlides = (data ?? []).filter(
        (slide: any) =>
          slide?.is_active && slide?.title?.trim() && slide?.image_url?.trim()
      );
      return validSlides.length ? validSlides : fallbackSlides;
    },
    placeholderData: fallbackSlides,
    retry: 2,
    retryDelay: 1000,
  });

  const [current, setCurrent] = useState(0);
  const [videoOpen, setVideoOpen] = useState(false);

  useEffect(() => {
    if (slides.length === 0) return;
    setCurrent(0);
  }, [slides]);

  // FIX: Pause carousel auto-advance while video modal is open
  useEffect(() => {
    if (slides.length === 0) return;
    if (videoOpen) return; // <-- do nothing when video is playing
    const timer = setInterval(
      () => setCurrent((p) => (p + 1) % slides.length),
      8000
    );
    return () => clearInterval(timer);
  }, [slides.length, videoOpen]); // <-- videoOpen added as dependency

  const slide = slides[current];
  if (!slide) return null;

  const demoUrl = (slide as any).demo_video_url?.trim() || "";
  const demoPlatform = demoUrl ? detectPlatform(demoUrl) : "youtube";
  const demoEmbed = demoUrl ? getEmbedUrl(demoUrl, demoPlatform) : null;
  const demoSizing = getDialogSize(demoPlatform);

  const handleDemoClick = () => {
    if (demoEmbed) {
      setVideoOpen(true);
    } else if (demoUrl) {
      window.open(demoUrl, "_blank", "noopener,noreferrer");
    } else {
      document.getElementById("videos")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <section
        id="home"
        aria-label="Hero — ATEC Education, Gurdaspur"
        className="relative h-screen min-h-[600px] max-h-[900px] overflow-hidden bg-gray-900"
      >
        <AnimatePresence mode="sync">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0"
          >
            <img
              src={slide.image_url}
              alt={`${slide.title} — ATEC Computer Institute Gurdaspur`}
              className="w-full h-full object-cover"
              loading="eager"
              fetchPriority="high"
              width={1200}
              height={900}
            />
            <div
              className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/30"
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 gradient-mesh opacity-40"
              aria-hidden="true"
            />
          </motion.div>
        </AnimatePresence>

        <div className="relative z-10 h-full container mx-auto px-4 flex items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
              className="max-w-2xl"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/20 border border-accent/30 text-accent-foreground mb-6"
                aria-label="Badge: Avenue To Excellent Careers"
              >
                <Sparkles className="w-4 h-4 text-accent" aria-hidden="true" />
                <span className="text-sm font-medium text-accent">
                  {slide.badge_text}
                </span>
              </motion.div>

              <h1
                className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-heading font-bold leading-tight mb-6"
                style={{ color: "white" }}
              >
                {slide.title}
              </h1>
              <p
                className="text-lg sm:text-xl mb-8 max-w-xl"
                style={{ color: "rgba(255,255,255,0.8)" }}
              >
                {slide.subtitle}
              </p>

              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  className="gradient-accent text-accent-foreground border-0 font-semibold text-base px-8 hover:opacity-90 transition-opacity"
                  asChild
                >
                  
                    href={slide.cta_link}
                    aria-label={`${slide.cta_text} — ATEC Gurdaspur`}
                  >
                    {slide.cta_text}
                  </a>
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-white/40 text-white font-semibold text-base px-8 backdrop-blur-sm hover:bg-white/10 hover:text-white"
                  onClick={handleDemoClick}
                  aria-label="Watch ATEC demo video"
                >
                  <Play className="w-4 h-4 mr-2" aria-hidden="true" />
                  Watch Demo
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Carousel controls */}
        <div className="absolute bottom-8 left-0 right-0 z-10 container mx-auto px-4 flex items-center justify-between">
          <div
            className="flex gap-2"
            role="tablist"
            aria-label="Hero slide indicators"
          >
            {slides.map((_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === current}
                aria-label={`Slide ${i + 1}`}
                onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === current
                    ? "w-8 bg-accent"
                    : "w-2 bg-white/40 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2" role="group" aria-label="Slide navigation">
            <button
              onClick={() =>
                setCurrent((p) => (p - 1 + slides.length) % slides.length)
              }
              aria-label="Previous slide"
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <ChevronLeft
                className="w-5 h-5"
                style={{ color: "white" }}
                aria-hidden="true"
              />
            </button>
            <button
              onClick={() => setCurrent((p) => (p + 1) % slides.length)}
              aria-label="Next slide"
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <ChevronRight
                className="w-5 h-5"
                style={{ color: "white" }}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </section>

      {/* Demo video dialog */}
      {demoEmbed && (
        <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
          <DialogContent className={demoSizing.dialogClass}>
            {demoPlatform === "instagram" ? (
              <div style={{ width: "100%", aspectRatio: "9/16", maxHeight: "85vh" }}>
                <iframe
                  src={demoEmbed}
                  className="w-full h-full border-0"
                  scrolling="no"
                  allowTransparency={true}
                  allowFullScreen
                  title="ATEC Demo Video"
                />
              </div>
            ) : (
              <div className={demoSizing.containerClass}>
                <iframe
                  src={demoEmbed}
                  className="w-full h-full border-0"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  title="ATEC Demo Video"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
