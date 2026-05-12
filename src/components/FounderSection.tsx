import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Quote, GraduationCap, Award, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { detectPlatform, getEmbedUrl, getDialogSize } from "@/lib/videoUtils";

// ─── Edit these details in admin or hardcode here ───────────────────────────
const FOUNDER = {
  name: "Manav Mahajan",
  designation: "Founder & Director",
  institute: "Avenue to Excellent Careers (ATEC)",
  location: "Gurdaspur, Punjab",
  intro: `With over 20 years of experience in IT education, I founded ATEC with one mission — to make quality technology education accessible to every student in Punjab.

We started as a small computer training centre in 2000, and today we're proud to have trained over 5,000+ students across Gurdaspur, Pathankot, and Batala — placing them in careers across India and abroad.

My belief is simple: the right skill at the right time changes a life. Whether it's AI, Digital Marketing, Tally, or Full Stack Development — we make sure every student gets practical, job-ready training with personal attention.

Join us and let's build your future together.`,
  stats: [
    { label: "Years of Experience", value: "25+", icon: Award },
    { label: "Students Trained", value: "5,000+", icon: Users },
    { label: "Courses Offered", value: "15+", icon: GraduationCap },
  ],
  // Put your YouTube or Instagram Reel intro video link here
  video_url: "https://youtu.be/k5l4MhYNL2M?si=MPyE3GOP97pHBiZ7", // ← replace with real link
  // Optional: poster image shown before video plays
  poster_url: "",
};
// ─────────────────────────────────────────────────────────────────────────────

export default function FounderSection() {
  const [videoOpen, setVideoOpen] = useState(false);

  const platform = detectPlatform(FOUNDER.video_url);
  const embedUrl = getEmbedUrl(FOUNDER.video_url, platform);
  const sizing = getDialogSize(platform);

  const isReel = platform === "instagram";

  return (
    <>
      <section
        id="founder"
        aria-label="Message from ATEC Founder"
        className="py-16 bg-gradient-to-br from-slate-50 to-blue-50"
      >
        <div className="container mx-auto px-4">
          {/* Section heading */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <Badge
              variant="outline"
              className="mb-4 text-accent border-accent/30 bg-accent/5"
            >
              <Quote className="w-3 h-3 mr-1" /> From the Founder's Desk
            </Badge>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">
              Meet the Visionary Behind ATEC
            </h2>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">

            {/* LEFT — Text area */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              {/* Name + designation */}
              <div>
                <h3 className="text-2xl font-heading font-bold text-foreground">
                  {FOUNDER.name}
                </h3>
                <p className="text-accent font-medium mt-1">
                  {FOUNDER.designation}
                </p>
                <p className="text-sm text-muted-foreground">
                  {FOUNDER.institute} · {FOUNDER.location}
                </p>
              </div>

              {/* Quote mark */}
              <div className="relative">
                <Quote
                  className="w-8 h-8 text-accent/30 absolute -top-2 -left-1"
                  aria-hidden="true"
                />
                <div className="pl-6 space-y-3">
                  {FOUNDER.intro.split("\n\n").map((para, i) => (
                    <p
                      key={i}
                      className="text-muted-foreground leading-relaxed text-sm md:text-base"
                    >
                      {para}
                    </p>
                  ))}
                </div>
              </div>

              {/* Stats strip */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                {FOUNDER.stats.map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="flex justify-center mb-1">
                      <stat.icon
                        className="w-5 h-5 text-accent"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="text-xl font-bold text-foreground font-heading">
                      {stat.value}
                    </div>
                    <div className="text-xs text-muted-foreground leading-tight">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Signature line */}
              <div className="pt-2">
                <p className="text-sm text-muted-foreground italic">
                  — {FOUNDER.name}, {FOUNDER.designation}
                </p>
              </div>
            </motion.div>

            {/* RIGHT — Video card */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="flex justify-center"
            >
              <div
                className={`relative group cursor-pointer rounded-2xl overflow-hidden shadow-2xl w-full ${
                  isReel
                    ? "max-w-[300px]"   // portrait for Instagram Reel
                    : "max-w-[520px]"   // landscape for YouTube
                }`}
                onClick={() => setVideoOpen(true)}
                role="button"
                aria-label={`Watch introduction video by ${FOUNDER.name}`}
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setVideoOpen(true)}
              >
                {/* Poster / placeholder */}
                <div
                  className={`w-full bg-gradient-to-br from-slate-800 to-slate-900 ${
                    isReel ? "aspect-[9/16]" : "aspect-video"
                  } flex items-center justify-center relative`}
                >
                  {FOUNDER.poster_url ? (
                    <img
                      src={FOUNDER.poster_url}
                      alt={`${FOUNDER.name} — ATEC Founder`}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-accent/60 flex flex-col items-center justify-center gap-3 p-6 text-center">
                      <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center">
                        <GraduationCap className="w-10 h-10 text-white" />
                      </div>
                      <p className="text-white font-heading font-semibold text-lg">
                        {FOUNDER.name}
                      </p>
                      <p className="text-white/80 text-sm">{FOUNDER.designation}</p>
                    </div>
                  )}

                  {/* Overlay + play button */}
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full gradient-accent flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300">
                      <Play className="w-9 h-9 text-accent-foreground ml-1" />
                    </div>
                  </div>
                </div>

                {/* Caption bar */}
                <div className="bg-slate-900 px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold leading-tight">
                      Founder's Introduction
                    </p>
                    <p className="text-white/60 text-xs">
                      {FOUNDER.name} · ATEC Gurdaspur
                    </p>
                  </div>
                  <div className="ml-auto">
                    <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
                      Watch Now
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Video Dialog — platform-aware format */}
      {embedUrl && (
        <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
          <DialogContent className={sizing.dialogClass}>
            {isReel ? (
              <div style={{ width: "100%", aspectRatio: "9/16", maxHeight: "85vh" }}>
                <iframe
                  src={embedUrl}
                  className="w-full h-full border-0"
                  scrolling="no"
                  allowTransparency={true}
                  allowFullScreen
                  title={`${FOUNDER.name} — Founder Introduction`}
                />
              </div>
            ) : (
              <div className={sizing.containerClass}>
                <iframe
                  src={embedUrl}
                  className="w-full h-full border-0"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  title={`${FOUNDER.name} — Founder Introduction`}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
