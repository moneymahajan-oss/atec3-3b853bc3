// src/components/OffersSliderSection.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { ChevronLeft, ChevronRight, MessageCircle, Tag } from "lucide-react";

interface PromoSlide {
  id: string;
  title: string;
  subtitle: string;
  caption: string;
  badge_text: string;
  cta_text: string;
  whatsapp_message: string;
  bg_color_from: string;
  bg_color_to: string;
  bg_image_url: string;
  bg_overlay_opacity: number;
  text_color: string;
  slide_order: number;
  duration_seconds: number;
  is_active: boolean;
  is_visible: boolean;
}

export default function OffersSliderSection() {
  const settings = useSiteSettings();

  const { data: slides = [] } = useQuery<PromoSlide[]>({
    queryKey: ["promo_slides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promo_slides" as any)
        .select("*")
        .eq("is_active", true)
        .eq("is_visible", true)
        .order("slide_order", { ascending: true });
      if (error) return [];
      return (data ?? []) as PromoSlide[];
    },
    placeholderData: [],
    retry: 1,
  });

  const isVisible = settings["promo_slider_visible"] === "true";

  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<"fwd" | "bwd">("fwd");
  const [animating, setAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const bounceDir = useRef(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback((idx: number, dir: "fwd" | "bwd") => {
    if (animating) return;
    setAnimating(true);
    setDirection(dir);
    setCurrent(idx);
    setTimeout(() => setAnimating(false), 550);
  }, [animating]);

  const next = useCallback(() => {
    goTo((current + 1) % slides.length, "fwd");
  }, [current, slides.length, goTo]);

  const prev = useCallback(() => {
    goTo((current - 1 + slides.length) % slides.length, "bwd");
  }, [current, slides.length, goTo]);

  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    const ms = (slides[current]?.duration_seconds ?? 5) * 1000;
    timerRef.current = setTimeout(() => {
      let nextIdx = current + bounceDir.current;
      if (nextIdx >= slides.length) { bounceDir.current = -1; nextIdx = current - 1; }
      else if (nextIdx < 0) { bounceDir.current = 1; nextIdx = current + 1; }
      nextIdx = Math.max(0, Math.min(nextIdx, slides.length - 1));
      goTo(nextIdx, bounceDir.current > 0 ? "fwd" : "bwd");
    }, ms);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, slides, isPaused, goTo]);

  const handleCTA = async (slide: PromoSlide) => {
    const link = await buildWhatsAppLink(
      "offers_enquiry",
      { student_name: "Student", message: slide.whatsapp_message || "Hello ATEC! I am interested in your offer." },
      settings.whatsapp_number
    ).catch(() =>
      `https://wa.me/${(settings.whatsapp_number || "917009933289").replace(/\D/g, "")}?text=${encodeURIComponent(slide.whatsapp_message || "Hello ATEC!")}`
    );
    window.open(link, "_blank", "noopener,noreferrer");
  };

  if (!isVisible || slides.length === 0) return null;

  return (
    <section
      className="w-full overflow-hidden"
      aria-label="Special offers and promotions"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative w-full" style={{ height: "clamp(150px, 26vw, 300px)" }}>

        {slides.map((s, idx) => {
          const isActive = idx === current;
          const isLeft = direction === "fwd" ? idx < current : idx > current;
          const overlayOpacity = s.bg_overlay_opacity ?? 0.55;

          return (
            <div
              key={s.id}
              className="absolute inset-0 transition-all duration-[550ms] ease-in-out overflow-hidden"
              style={{
                opacity: isActive ? 1 : 0,
                transform: isActive ? "translateX(0)" : isLeft ? "translateX(-100%)" : "translateX(100%)",
                zIndex: isActive ? 10 : 0,
                pointerEvents: isActive ? "auto" : "none",
              }}
            >
              {/* ── Background layer ── */}
              {s.bg_image_url ? (
                <>
                  {/* JPEG/PNG image as background */}
                  <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: `url(${s.bg_image_url})` }}
                  />
                  {/* Color overlay on top of image for text readability */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, ${s.bg_color_from || "#000000"} 0%, ${s.bg_color_to || "#1a1a2e"} 100%)`,
                      opacity: overlayOpacity,
                    }}
                  />
                </>
              ) : (
                /* No image — pure gradient */
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(135deg, ${s.bg_color_from || "#1a1a2e"} 0%, ${s.bg_color_to || "#16213e"} 100%)`,
                  }}
                />
              )}

              {/* Decorative shapes */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full opacity-10"
                  style={{ background: s.text_color || "#fff" }} />
                <div className="absolute -bottom-8 left-1/3 w-36 h-36 rounded-full opacity-5"
                  style={{ background: s.text_color || "#fff" }} />
              </div>

              {/* ── Content ── */}
              <div className="relative z-10 h-full flex items-center justify-between px-6 md:px-14">
                <div className="flex-1 max-w-[62%]">
                  {s.badge_text && (
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2 uppercase tracking-wider"
                      style={{
                        background: "rgba(255,255,255,0.18)",
                        border: "1px solid rgba(255,255,255,0.3)",
                        color: s.text_color || "#fff",
                      }}
                    >
                      <Tag className="w-3 h-3" />
                      {s.badge_text}
                    </span>
                  )}
                  <h2
                    className="font-extrabold leading-tight mb-1"
                    style={{ fontSize: "clamp(1rem, 3.2vw, 1.9rem)", color: s.text_color || "#fff" }}
                  >
                    {s.title}
                  </h2>
                  {s.subtitle && (
                    <p className="font-semibold mb-0.5 opacity-90"
                      style={{ fontSize: "clamp(0.7rem, 1.8vw, 1rem)", color: s.text_color || "#fff" }}>
                      {s.subtitle}
                    </p>
                  )}
                  {s.caption && (
                    <p className="opacity-70"
                      style={{ fontSize: "clamp(0.6rem, 1.3vw, 0.82rem)", color: s.text_color || "#fff" }}>
                      {s.caption}
                    </p>
                  )}
                </div>

                <div className="flex-shrink-0 ml-3">
                  <button
                    onClick={() => handleCTA(s)}
                    className="group flex items-center gap-2 font-bold rounded-full shadow-lg transition-all duration-300 hover:scale-105 active:scale-95"
                    style={{
                      background: "#25D366",
                      color: "#fff",
                      padding: "clamp(7px, 1.4vw, 13px) clamp(13px, 2.8vw, 26px)",
                      fontSize: "clamp(0.6rem, 1.35vw, 0.9rem)",
                      boxShadow: "0 4px 16px rgba(37,211,102,0.45)",
                    }}
                  >
                    <MessageCircle
                      className="group-hover:animate-bounce"
                      style={{ width: "clamp(13px, 1.8vw, 19px)", height: "clamp(13px, 1.8vw, 19px)" }}
                    />
                    {s.cta_text || "Enquire on WhatsApp"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Arrows */}
        {slides.length > 1 && (
          <>
            <button onClick={prev} aria-label="Previous promo"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center rounded-full transition-all hover:scale-110"
              style={{ background: "rgba(0,0,0,0.35)", color: "#fff" }}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={next} aria-label="Next promo"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center rounded-full transition-all hover:scale-110"
              style={{ background: "rgba(0,0,0,0.35)", color: "#fff" }}>
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Dots */}
        {slides.length > 1 && (
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
            {slides.map((_, idx) => (
              <button key={idx}
                onClick={() => goTo(idx, idx > current ? "fwd" : "bwd")}
                className="rounded-full transition-all duration-300"
                style={{
                  width: idx === current ? "20px" : "8px",
                  height: "8px",
                  background: idx === current ? "#fff" : "rgba(255,255,255,0.4)",
                }} />
            ))}
          </div>
        )}

        {/* Progress bar */}
        {!isPaused && slides.length > 1 && (
          <div className="absolute bottom-0 left-0 w-full h-0.5 bg-black/15 z-20">
            <div
              key={`pb-${current}`}
              className="h-full bg-white/60"
              style={{ animation: `promo-progress ${slides[current]?.duration_seconds ?? 5}s linear forwards` }}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes promo-progress {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </section>
  );
}
