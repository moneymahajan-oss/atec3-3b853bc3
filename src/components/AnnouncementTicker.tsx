// src/components/AnnouncementTicker.tsx
// Row 1: DB announcements (existing table)
// Row 2: DB marquee_highlights (new table, admin-editable)
// Falls back to hardcoded highlights if DB is empty

import { useQuery } from "@tanstack/react-query";
import {
  Megaphone, AlertTriangle, Award, RefreshCw,
  GraduationCap, Users, BookOpen, Star, Zap, Trophy,
  CheckCircle, Shield, TrendingUp, Sparkles, Clock, Tag,
  MessageCircle, Heart, Globe
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ── Icon map for DB-driven highlights ─────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  GraduationCap, Users, BookOpen, Star, Zap, Trophy,
  CheckCircle, Shield, TrendingUp, Sparkles, Clock, Tag,
  Award, Megaphone, MessageCircle, Heart, Globe,
};

// ── Fallback highlights (shown when DB table is empty) ────────────────────
const FALLBACK_HIGHLIGHTS = [
  { id: "f1", text: "Expert Faculty", icon_name: "GraduationCap", color: "#FF6B6B", sort_order: 1 },
  { id: "f2", text: "Government Certified", icon_name: "Award", color: "#FFD93D", sort_order: 2 },
  { id: "f3", text: "5,000+ Students Trained", icon_name: "Users", color: "#6BCB77", sort_order: 3 },
  { id: "f4", text: "5-Star Rated Institute", icon_name: "Star", color: "#FF922B", sort_order: 4 },
  { id: "f5", text: "Best Computer Institute — Gurdaspur", icon_name: "Trophy", color: "#CC5DE8", sort_order: 5 },
  { id: "f6", text: "Job-Ready Courses", icon_name: "Zap", color: "#4DABF7", sort_order: 6 },
  { id: "f7", text: "20+ Courses Available", icon_name: "BookOpen", color: "#FF6B6B", sort_order: 7 },
  { id: "f8", text: "100% Practical Training", icon_name: "CheckCircle", color: "#FFD93D", sort_order: 8 },
  { id: "f9", text: "Trusted Since 2000", icon_name: "Shield", color: "#6BCB77", sort_order: 9 },
  { id: "f10", text: "Placement Assistance", icon_name: "TrendingUp", color: "#FF922B", sort_order: 10 },
  { id: "f11", text: "Tally ERP 9 + GST", icon_name: "Sparkles", color: "#CC5DE8", sort_order: 11 },
  { id: "f12", text: "Flexible Batch Timings", icon_name: "Clock", color: "#4DABF7", sort_order: 12 },
  { id: "f13", text: "Special Discounts Available", icon_name: "Tag", color: "#FF6B6B", sort_order: 13 },
];

const typeConfig: Record<string, { icon: React.ElementType; dotColor: string }> = {
  badge:  { icon: Award,         dotColor: "#6366f1" },
  news:   { icon: Megaphone,     dotColor: "#22c55e" },
  urgent: { icon: AlertTriangle, dotColor: "#ef4444" },
};

interface HighlightItem {
  id: string;
  text: string;
  icon_name: string;
  color: string;
  sort_order: number;
}

export default function AnnouncementTicker() {
  // Row 1: announcements from DB
  const { data: announcements = [], isLoading: loadingAnn, isError, refetch } = useQuery({
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

  // Row 2: marquee highlights from DB
  const { data: dbHighlights = [], isLoading: loadingHL } = useQuery<HighlightItem[]>({
    queryKey: ["marquee_highlights"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marquee_highlights" as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) return [];
      return (data ?? []) as HighlightItem[];
    },
    placeholderData: [],
    retry: 1,
  });

  if (isError) return (
    <section className="py-3 bg-muted/50 border-y border-border text-center">
      <button onClick={() => refetch()} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <RefreshCw className="w-3 h-3" /> Retry loading announcements
      </button>
    </section>
  );

  const hasAnnouncements = !loadingAnn && announcements.length > 0;

  // Use DB highlights if available, otherwise fallback
  const highlights = (!loadingHL && dbHighlights.length > 0) ? dbHighlights : FALLBACK_HIGHLIGHTS;

  // Triplicate for seamless loop
  const announcementItems = hasAnnouncements
    ? [...announcements, ...announcements, ...announcements]
    : [...highlights, ...highlights, ...highlights];

  const highlightItems = [...highlights, ...highlights, ...highlights];

  return (
    <section className="relative w-full overflow-hidden" aria-label="Announcements and institute highlights">
      {/* Layered gradient background */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(90deg, #fff9f0 0%, #f0f7ff 35%, #f5f0ff 65%, #fff0f6 100%)"
      }} />

      {/* Shimmer */}
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

      {/* ── ROW 1 ── */}
      <div className="relative overflow-hidden py-2.5">
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
            : announcementItems.map((item: any, i: number) => {
                const Icon = ICON_MAP[item.icon_name] || Tag;
                const color = item.color || "#FF6B6B";
                return (
                  <span key={i} className="inline-flex items-center gap-2 mx-6 whitespace-nowrap select-none">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 shadow-md"
                      style={{ background: color, boxShadow: `0 0 8px ${color}55` }}>
                      <Icon size={13} color="#fff" strokeWidth={2.5} />
                    </span>
                    <span className="text-sm font-semibold" style={{ color: "#1e293b" }}>{item.text}</span>
                    <span className="w-2 h-2 rotate-45 ml-3 flex-shrink-0"
                      style={{ background: color, opacity: 0.65, boxShadow: `0 0 5px ${color}` }} />
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

      {/* ── ROW 2: highlights scrolling reverse ── */}
      <div className="relative overflow-hidden py-2.5">
        <div className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
          style={{ background: "linear-gradient(90deg, #f0f7ff, transparent)" }} />
        <div className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
          style={{ background: "linear-gradient(270deg, #f5f0ff, transparent)" }} />

        <div className="flex" style={{ animation: "atec-marquee-reverse 28s linear infinite" }}>
          {highlightItems.map((item, i) => {
            const Icon = ICON_MAP[item.icon_name] || Tag;
            const color = item.color || "#FF6B6B";
            return (
              <span key={i} className="inline-flex items-center gap-2 mx-6 whitespace-nowrap select-none">
                <span className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 shadow-md"
                  style={{ background: color, boxShadow: `0 0 8px ${color}55` }}>
                  <Icon size={13} color="#fff" strokeWidth={2.5} />
                </span>
                <span className="text-sm font-semibold" style={{ color: "#1e293b" }}>{item.text}</span>
                <span className="w-2 h-2 rotate-45 ml-3 flex-shrink-0"
                  style={{ background: color, opacity: 0.65, boxShadow: `0 0 5px ${color}` }} />
              </span>
            );
          })}
        </div>
      </div>

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
