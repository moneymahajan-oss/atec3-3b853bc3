// src/components/AnnouncementTicker.tsx
// Enhanced: dual rows, vibrant colored icons, rainbow borders, shimmer
import { useQuery } from "@tanstack/react-query";
import { Megaphone, AlertTriangle, Award, RefreshCw, GraduationCap, Users, BookOpen, Star, Zap, Trophy, CheckCircle, Shield, TrendingUp, Sparkles, Clock, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ── Static row 2: institute highlights (always shown) ──────────────────────
const HIGHLIGHTS = [
  { icon: GraduationCap, text: "Expert Faculty", color: "#FF6B6B" },
  { icon: Award, text: "Government Certified", color: "#FFD93D" },
  { icon: Users, text: "5,000+ Students Trained", color: "#6BCB77" },
  { icon: Star, text: "5-Star Rated Institute", color: "#FF922B" },
  { icon: Trophy, text: "Best Computer Institute — Gurdaspur", color: "#CC5DE8" },
  { icon: Zap, text: "Job-Ready Courses", color: "#4DABF7" },
  { icon: BookOpen, text: "20+ Courses Available", color: "#FF6B6B" },
  { icon: CheckCircle, text: "100% Practical Training", color: "#FFD93D" },
  { icon: Shield, text: "Trusted Since 2000", color: "#6BCB77" },
  { icon: TrendingUp, text: "Placement Assistance", color: "#FF922B" },
  { icon: Sparkles, text: "Tally ERP 9 + GST", color: "#CC5DE8" },
  { icon: Clock, text: "Flexible Batch Timings", color: "#4DABF7" },
  { icon: Tag, text: "Special Discounts Available", color: "#FF6B6B" },
];

const typeConfig: Record<string, { icon: React.ElementType; dotColor: string }> = {
  badge:  { icon: Award,         dotColor: "#6366f1" },
  news:   { icon: Megaphone,     dotColor: "#22c55e" },
  urgent: { icon: AlertTriangle, dotColor: "#ef4444" },
};

export default function AnnouncementTicker() {
  const { data: announcements = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    placeholderData: [] as never[],
    retry: 2,
    retryDelay: 1000,
  });

  if (isError) return (
    <section className="py-3 bg-muted/50 border-y border-border text-center">
      <button onClick={() => refetch()} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <RefreshCw className="w-3 h-3" /> Retry loading announcements
      </button>
    </section>
  );

  const hasAnnouncements = !isLoading && announcements.length > 0;
  // Triplicate for seamless loop
  const announcementItems = hasAnnouncements ? [...announcements, ...announcements, ...announcements] : [];
  const highlightItems = [...HIGHLIGHTS, ...HIGHLIGHTS, ...HIGHLIGHTS];

  return (
    <section className="relative w-full overflow-hidden" aria-label="Announcements and institute highlights">
      {/* Layered gradient background */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(90deg, #fff9f0 0%, #f0f7ff 35%, #f5f0ff 65%, #fff0f6 100%)"
      }} />

      {/* Animated shimmer sweep */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(255,255,255,0.55) 80px, rgba(255,255,255,0.55) 160px)",
        animation: "atec-shimmer 4s linear infinite",
        opacity: 0.35,
      }} />

      {/* Rainbow top border */}
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{
        background: "linear-gradient(90deg, #FF6B6B, #FFD93D, #6BCB77, #4DABF7, #CC5DE8, #FF922B, #FF6B6B)",
        backgroundSize: "300% 100%",
        animation: "atec-gradient-slide 3s linear infinite",
      }} />

      {/* Rainbow bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{
        background: "linear-gradient(90deg, #CC5DE8, #4DABF7, #6BCB77, #FFD93D, #FF6B6B, #FF922B, #CC5DE8)",
        backgroundSize: "300% 100%",
        animation: "atec-gradient-slide 3s linear infinite reverse",
      }} />

      {/* ── ROW 1: Announcements from DB (or highlights if none) ── */}
      <div className="relative overflow-hidden py-2.5">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
          style={{ background: "linear-gradient(90deg, #fff9f0, transparent)" }} />
        <div className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
          style={{ background: "linear-gradient(270deg, #fff0f6, transparent)" }} />

        <div className="flex animate-marquee" style={{ animationDuration: "32s" }}>
          {hasAnnouncements
            ? announcementItems.map((a: any, i: number) => {
                const cfg = typeConfig[a.type || "news"];
                const Icon = cfg?.icon || Megaphone;
                const dotColor = cfg?.dotColor || "#22c55e";
                return (
                  <span key={i} className="inline-flex items-center gap-2 mx-6 whitespace-nowrap select-none">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm"
                      style={{ background: dotColor + "22", border: `1.5px solid ${dotColor}55` }}>
                      <Icon size={13} style={{ color: dotColor }} />
                    </span>
                    <span className="text-sm font-semibold" style={{ color: "#1e293b" }}>{a.title}</span>
                    <span className="w-1.5 h-1.5 rounded-full ml-3 flex-shrink-0"
                      style={{ background: dotColor, opacity: 0.6, boxShadow: `0 0 4px ${dotColor}` }} />
                  </span>
                );
              })
            : highlightItems.map((item, i) => {
                const Icon = item.icon;
                return (
                  <span key={i} className="inline-flex items-center gap-2 mx-6 whitespace-nowrap select-none">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 shadow-md"
                      style={{ background: item.color, boxShadow: `0 0 8px ${item.color}55` }}>
                      <Icon size={13} color="#fff" strokeWidth={2.5} />
                    </span>
                    <span className="text-sm font-semibold" style={{ color: "#1e293b" }}>{item.text}</span>
                    <span className="w-2 h-2 rotate-45 ml-3 flex-shrink-0"
                      style={{ background: item.color, opacity: 0.65, boxShadow: `0 0 5px ${item.color}` }} />
                  </span>
                );
              })}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-6 h-px" style={{
        background: "linear-gradient(90deg, transparent, #FF6B6B, #FFD93D, #6BCB77, #4DABF7, transparent)",
        opacity: 0.35,
      }} />

      {/* ── ROW 2: Institute highlights scrolling RIGHT → LEFT (reverse) ── */}
      <div className="relative overflow-hidden py-2.5">
        <div className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
          style={{ background: "linear-gradient(90deg, #f0f7ff, transparent)" }} />
        <div className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
          style={{ background: "linear-gradient(270deg, #f5f0ff, transparent)" }} />

        <div className="flex" style={{ animation: "atec-marquee-reverse 28s linear infinite" }}>
          {highlightItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <span key={i} className="inline-flex items-center gap-2 mx-6 whitespace-nowrap select-none">
                <span className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 shadow-md"
                  style={{ background: item.color, boxShadow: `0 0 8px ${item.color}55` }}>
                  <Icon size={13} color="#fff" strokeWidth={2.5} />
                </span>
                <span className="text-sm font-semibold" style={{ color: "#1e293b" }}>{item.text}</span>
                <span className="w-2 h-2 rotate-45 ml-3 flex-shrink-0"
                  style={{ background: item.color, opacity: 0.65, boxShadow: `0 0 5px ${item.color}` }} />
              </span>
            );
          })}
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes atec-marquee-reverse {
          0%   { transform: translateX(-33.333%); }
          100% { transform: translateX(0); }
        }
        @keyframes atec-gradient-slide {
          0%   { background-position: 0% 50%; }
          100% { background-position: 300% 50%; }
        }
        @keyframes atec-shimmer {
          0%   { transform: translateX(-160px); }
          100% { transform: translateX(160px); }
        }
      `}</style>
    </section>
  );
}
