import { motion } from "framer-motion";
import { Instagram, Facebook, Youtube, MapPin } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const platforms = [
  {
    key: "social_instagram_url",
    label: "Instagram",
    icon: Instagram,
    gradient: "from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]",
    hoverBg: "hover:bg-gradient-to-br hover:from-[#f9ce34] hover:via-[#ee2a7b] hover:to-[#6228d7]",
  },
  {
    key: "social_facebook_url",
    label: "Facebook",
    icon: Facebook,
    gradient: "from-[#1877F2] to-[#0C5DC7]",
    hoverBg: "hover:bg-gradient-to-br hover:from-[#1877F2] hover:to-[#0C5DC7]",
  },
  {
    key: "social_google_url",
    label: "Google My Business",
    icon: MapPin,
    gradient: "from-[#4285F4] via-[#EA4335] to-[#FBBC05]",
    hoverBg: "hover:bg-gradient-to-br hover:from-[#4285F4] hover:via-[#EA4335] hover:to-[#FBBC05]",
  },
  {
    key: "social_youtube_url",
    label: "YouTube",
    icon: Youtube,
    gradient: "from-[#FF0000] to-[#CC0000]",
    hoverBg: "hover:bg-gradient-to-br hover:from-[#FF0000] hover:to-[#CC0000]",
  },
];

export default function SocialConnectSection() {
  const settings = useSiteSettings();

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
            Follow us on social media to stay updated with latest courses, events &amp; student achievements
          </p>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-6">
          {platforms.map((platform, i) => {
            const Icon = platform.icon;
            const url = (settings[platform.key] as string)?.trim();
            const isActive = !!url;
            const Tag: any = isActive ? motion.a : motion.div;
            const linkProps = isActive ? { href: url, target: "_blank", rel: "noopener noreferrer" } : {};
            return (
              <Tag
                key={platform.key}
                {...linkProps}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, type: "spring", stiffness: 200 }}
                whileHover={isActive ? { y: -6, scale: 1.05 } : undefined}
                className={`group flex flex-col items-center gap-3 w-36 h-36 rounded-2xl border border-border bg-card shadow-md justify-center transition-all duration-300 ${
                  isActive
                    ? `${platform.hoverBg} hover:text-white hover:border-transparent hover:shadow-xl cursor-pointer`
                    : "opacity-60 cursor-not-allowed"
                }`}
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${platform.gradient} flex items-center justify-center ${isActive ? "group-hover:bg-white/20" : ""} transition-colors`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <span className={`text-sm font-medium text-foreground ${isActive ? "group-hover:text-white" : ""} transition-colors`}>
                  {platform.label}
                </span>
                {!isActive && (
                  <span className="text-[10px] text-muted-foreground -mt-1">Coming soon</span>
                )}
              </Tag>
            );
          })}
        </div>
      </div>
    </section>
  );
}
