import { motion } from "framer-motion";
import { Instagram, Facebook, Youtube, MessageCircle, MapPin } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

type Platform = {
  key: string;
  visibilityKey: string;
  label: string;
  icon: any;
  color: string;
  buildUrl: (settings: Record<string, string>) => string;
};

const platforms: Platform[] = [
  {
    key: "social_whatsapp",
    visibilityKey: "social_whatsapp_visible",
    label: "WhatsApp",
    icon: MessageCircle,
    color: "#25D366",
    buildUrl: (s) => {
      const num = (s.whatsapp_number || "917009933289").replace(/\D/g, "");
      return num ? `https://wa.me/${num}` : "";
    },
  },
  {
    key: "social_instagram_url",
    visibilityKey: "social_instagram_visible",
    label: "Instagram",
    icon: Instagram,
    color: "#E1306C",
    buildUrl: (s) => (s.social_instagram_url || "").trim(),
  },
  {
    key: "social_facebook_url",
    visibilityKey: "social_facebook_visible",
    label: "Facebook",
    icon: Facebook,
    color: "#1877F2",
    buildUrl: (s) => (s.social_facebook_url || "").trim(),
  },
  {
    key: "social_youtube_url",
    visibilityKey: "social_youtube_visible",
    label: "YouTube",
    icon: Youtube,
    color: "#FF0000",
    buildUrl: (s) => (s.social_youtube_url || "").trim(),
  },
  {
    key: "social_gmb_url",
    visibilityKey: "social_gmb_visible",
    label: "Google Reviews",
    icon: MapPin,
    color: "#4285F4",
    buildUrl: (s) => (s.social_gmb_url || "").trim(),
  },
];

export default function SocialConnectSection() {
  const settings = useSiteSettings();

  const cards = platforms
    .map((p) => ({ p, url: p.buildUrl(settings as any) }))
    .filter(({ p }) => (settings[p.visibilityKey] ?? "true") !== "false");

  return (
    <section className="py-14 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-2">
            Connect With Us
          </h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Scan a QR or tap a card to follow us — stay updated with latest courses, events &amp; student wins
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-5 max-w-4xl mx-auto">
          {cards.map(({ p, url }, i) => {
            const Icon = p.icon;
            const active = !!url;
            const Tag: any = active ? motion.a : motion.div;
            const linkProps = active ? { href: url, target: "_blank", rel: "noopener noreferrer" } : {};
            return (
              <Tag
                key={p.key}
                {...linkProps}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, type: "spring", stiffness: 200 }}
                whileHover={active ? { y: -4 } : undefined}
                className={`flex flex-col items-center gap-3 p-5 rounded-2xl border border-border bg-card shadow-sm transition-all ${
                  active ? "hover:shadow-xl cursor-pointer" : "opacity-60 cursor-not-allowed"
                }`}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: p.color }}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="bg-white p-2 rounded-lg">
                  <QRCodeSVG
                    value={url || "https://atecedu.com"}
                    size={112}
                    level="M"
                    includeMargin={false}
                    fgColor={active ? "#000000" : "#999999"}
                  />
                </div>
                <span className="text-sm font-semibold text-foreground">{p.label}</span>
                {!active && <span className="text-[10px] text-muted-foreground -mt-2">Coming soon</span>}
              </Tag>
            );
          })}
        </div>
      </div>
    </section>
  );
}

