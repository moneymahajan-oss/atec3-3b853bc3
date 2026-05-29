// src/components/OffersSection.tsx
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import {
  Sparkles, Star, Trophy, Shield, Heart, Users,
  CheckCircle2, Zap, Gift, ArrowRight, Phone
} from "lucide-react";

// ── types ──────────────────────────────────────────────────────────────────
interface OfferCard {
  id: string;
  icon: string;
  label: string;
  tag: string;
  discount: string;
  description: string;
  highlight: boolean;
  display_order: number;
}

interface OffersSectionRow {
  id: string;
  is_active: boolean;
  heading: string;
  subheading: string;
  badge_text: string;
  cta_text: string;
  features: string[];
  cards: OfferCard[];
  footer_note: string;
}

// ── icon map ───────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  Trophy, Shield, Heart, Users, Star, Zap, Gift, Sparkles, CheckCircle2,
};

// ── reaction emojis cycling above cards ───────────────────────────────────
const REACTIONS = ["🎉", "😲", "🙌", "🥳", "😍", "💯", "🔥", "👏"];

function FloatingReaction({ emoji, x, delay }: { emoji: string; x: number; delay: number }) {
  return (
    <motion.span
      className="absolute text-xl pointer-events-none select-none"
      style={{ left: `${x}%`, bottom: "100%" }}
      initial={{ opacity: 0, y: 0, scale: 0.5 }}
      animate={{ opacity: [0, 1, 1, 0], y: [-10, -50, -80, -110], scale: [0.5, 1.2, 1, 0.8] }}
      transition={{ duration: 2.2, delay, ease: "easeOut" }}
    >
      {emoji}
    </motion.span>
  );
}

// ── Default data (shown when no DB row exists yet) ─────────────────────────
const DEFAULT_SECTION: OffersSection = {
  id: "default",
  is_active: true,
  heading: "Special Discounts Just for You!",
  subheading: "We believe great education should be accessible to everyone. Get rewarded for your effort, service, and dedication.",
  badge_text: "Limited Offers",
  cta_text: "Claim Your Discount Now",
  features: [
    "No hidden charges",
    "Discount applied at admission",
    "Valid on all courses",
    "Stackable with EMI plans",
  ],
  footer_note: "Discounts verified at time of admission. One discount per student. Contact ATEC for details.",
  cards: [
    { id: "1", icon: "Trophy", label: "Mock Test Toppers", tag: "Score 70%+", discount: "15% OFF", description: "Clear our online mock test with 70% or more and unlock an instant fee discount.", highlight: true, display_order: 1 },
    { id: "2", icon: "Shield", label: "Defence Personnel", tag: "Army / Navy / Air Force", discount: "20% OFF", description: "Serving or retired armed forces members and their families get a special salute discount.", highlight: false, display_order: 2 },
    { id: "3", icon: "Heart", label: "Senior Citizens", tag: "Age 55+", discount: "15% OFF", description: "It's never too late to learn. Elders get a warm welcome and a special fee benefit.", highlight: false, display_order: 3 },
    { id: "4", icon: "Users", label: "Homemakers", tag: "Housewives & Caregivers", discount: "10% OFF", description: "Empowering homemakers to enter the workforce with skills and confidence.", highlight: false, display_order: 4 },
    { id: "5", icon: "Star", label: "Referral Bonus", tag: "Bring a Friend", discount: "₹500 OFF", description: "Refer a friend who enrolls and both of you get a fee waiver.", highlight: false, display_order: 5 },
    { id: "6", icon: "Zap", label: "Early Bird", tag: "Register This Week", discount: "10% OFF", description: "Enroll in the first week of any new batch and lock in the early bird price.", highlight: false, display_order: 6 },
  ],
};

type OffersSection = Omit<OffersSectionRow, never>;

export default function OffersSection() {
  const settings = useSiteSettings();
  const [reactionKey, setReactionKey] = useState(0);
  const [reactions, setReactions] = useState<{ emoji: string; x: number; delay: number; id: number }[]>([]);

  const { data: section } = useQuery<OffersSection>({
    queryKey: ["offers_section"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "offers_section")
        .maybeSingle();
      if (error || !data?.value) return DEFAULT_SECTION;
      try {
        return JSON.parse(data.value) as OffersSection;
      } catch {
        return DEFAULT_SECTION;
      }
    },
    placeholderData: DEFAULT_SECTION,
  });

  if (!section?.is_active) return null;

  const cards = [...(section.cards || DEFAULT_SECTION.cards)].sort(
    (a, b) => a.display_order - b.display_order
  );

  const triggerReactions = () => {
    const burst = Array.from({ length: 6 }, (_, i) => ({
      emoji: REACTIONS[Math.floor(Math.random() * REACTIONS.length)],
      x: 10 + Math.random() * 80,
      delay: i * 0.15,
      id: Date.now() + i,
    }));
    setReactions(burst);
    setReactionKey((k) => k + 1);
    setTimeout(() => setReactions([]), 3000);
  };

  const handleCTA = async () => {
    triggerReactions();
    const link = await buildWhatsAppLink(
      "offers_enquiry",
      { student_name: "Student", message: "I want to know about discounts and offers" },
      settings.whatsapp_number
    ).catch(() => `https://wa.me/91${settings.whatsapp_number || "8659056041"}?text=Hi%2C+I+want+to+know+about+ATEC+discounts`);
    setTimeout(() => window.open(link, "_blank", "noopener,noreferrer"), 600);
  };

  return (
    <section id="offers" className="py-16 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)" }}>

      {/* Subtle grid pattern overlay */}
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* Glowing orbs */}
      <div className="absolute top-20 left-10 w-64 h-64 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #818cf8, transparent 70%)" }} />
      <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #f472b6, transparent 70%)" }} />

      <div className="container mx-auto px-4 relative z-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 text-amber-300 text-xs font-semibold mb-4">
            <Gift className="w-3.5 h-3.5" />
            {section.badge_text || DEFAULT_SECTION.badge_text}
          </div>

          <h2 className="text-3xl md:text-5xl font-heading font-bold text-white mb-4 leading-tight">
            {section.heading || DEFAULT_SECTION.heading}
          </h2>
          <p className="text-slate-300 max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
            {section.subheading || DEFAULT_SECTION.subheading}
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 justify-center mt-6">
            {(section.features || DEFAULT_SECTION.features).map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white border border-white/20">
                <CheckCircle2 className="w-3 h-3 text-green-400" />
                {f}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto mb-12">
          {cards.map((card, i) => {
            const Icon = ICON_MAP[card.icon] || Gift;
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className={`relative rounded-2xl p-5 flex flex-col gap-3 border transition-transform hover:-translate-y-1 hover:shadow-2xl
                  ${card.highlight
                    ? "bg-gradient-to-br from-indigo-500/30 to-purple-500/30 border-indigo-400/50"
                    : "bg-white/5 border-white/10 hover:border-white/30"
                  }`}
              >
                {/* Popular badge */}
                {card.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-orange-400 text-amber-900 text-[10px] font-bold px-3 py-1 rounded-full shadow-lg whitespace-nowrap">
                    ⭐ MOST POPULAR
                  </span>
                )}

                <div className="flex items-start justify-between gap-3">
                  {/* Icon */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0
                    ${card.highlight ? "bg-indigo-400/30" : "bg-white/10"}`}>
                    <Icon className={`w-5 h-5 ${card.highlight ? "text-indigo-300" : "text-slate-300"}`} />
                  </div>
                  {/* Discount badge */}
                  <div className={`px-3 py-1 rounded-lg text-sm font-bold flex-shrink-0
                    ${card.highlight
                      ? "bg-amber-400 text-amber-900"
                      : "bg-white/15 text-white"
                    }`}>
                    {card.discount}
                  </div>
                </div>

                <div>
                  <p className="text-white font-semibold text-base leading-snug">{card.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{card.tag}</p>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed flex-1">
                  {card.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* CTA block */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center relative"
        >
          {/* Floating reactions */}
          <div className="relative inline-block">
            <AnimatePresence>
              {reactions.map((r) => (
                <FloatingReaction key={r.id} emoji={r.emoji} x={r.x} delay={r.delay} />
              ))}
            </AnimatePresence>

            <button
              onClick={handleCTA}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-base text-white shadow-xl transition-all hover:scale-105 active:scale-95"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)" }}
            >
              <Phone className="w-4 h-4" />
              {section.cta_text || DEFAULT_SECTION.cta_text}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <p className="text-slate-500 text-xs mt-4 max-w-lg mx-auto">
            {section.footer_note || DEFAULT_SECTION.footer_note}
          </p>
        </motion.div>

      </div>
    </section>
  );
}
