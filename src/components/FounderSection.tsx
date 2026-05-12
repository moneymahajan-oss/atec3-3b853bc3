import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Quote, GraduationCap, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { detectPlatform, getEmbedUrl } from "@/lib/videoUtils";

/** Appends autoplay (and for YouTube, enablejsapi) to any embed URL */
function withAutoplay(url: string, platform: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set("autoplay", "1");
    if (platform === "youtube") {
      u.searchParams.set("enablejsapi", "1");
      // rel=0 hides unrelated suggested videos at end
      u.searchParams.set("rel", "0");
    }
    return u.toString();
  } catch {
    // fallback: just append
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}autoplay=1`;
  }
}

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
  video_url: "https://youtu.be/k5l4MhYNL2M?si=MPyE3GOP97pHBiZ7",
  poster_url: "",
};
// ─────────────────────────────────────────────────────────────────────────────

export default function FounderSection() {
  const [videoOpen, setVideoOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const platform = detectPlatform(FOUNDER.video_url);
  const baseEmbedUrl = getEmbedUrl(FOUNDER.video_url, platform);
  const autoplayEmbedUrl = baseEmbedUrl ? withAutoplay(baseEmbedUrl, platform) : null;
  const isReel = platform === "instagram";

  /** Open modal — browser allows autoplay because it follows a user gesture */
  const openVideo = useCallback(() => setVideoOpen(true), []);

  /** Close modal and kill audio/video immediately by blanking the iframe src */
  const closeVideo = useCallback(() => {
    if (iframeRef.current) iframeRef.current.src = "";
    setVideoOpen(false);
  }, []);

  return (
    <>
      <section
        id="founder"
        aria-label="Message from ATEC Founder"
        className="py-20 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #0f172a 100%)",
        }}
      >
        {/* Decorative background glow blobs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
        >
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
          {/* Subtle grid texture */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          {/* Section heading */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <Badge
              variant="outline"
              className="mb-4 text-accent border-accent/40 bg-accent/10 backdrop-blur-sm"
            >
              <Quote className="w-3 h-3 mr-1" /> From the Founder's Desk
            </Badge>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-white">
              Meet the Visionary Behind ATEC
            </h2>
          </motion.div>

          {/* ── Two-column grid — items-stretch makes both columns equal height ── */}
          <div className="grid lg:grid-cols-2 gap-0 items-stretch max-w-6xl mx-auto rounded-3xl overflow-hidden shadow-2xl shadow-black/40 border border-white/5">

            {/* LEFT — Text card */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex flex-col justify-center gap-6 p-8 md:p-10 bg-white/5 backdrop-blur-sm"
            >
              {/* Accent top line */}
              <div className="w-12 h-1 rounded-full bg-accent" />

              {/* Name + designation */}
              <div>
                <h3 className="text-2xl md:text-3xl font-heading font-bold text-white leading-tight">
                  {FOUNDER.name}
                </h3>
                <p className="text-accent font-semibold mt-1 text-sm tracking-wide uppercase">
                  {FOUNDER.designation}
                </p>
                <p className="text-white/40 text-xs mt-0.5">
                  {FOUNDER.institute} · {FOUNDER.location}
                </p>
              </div>

              {/* Quote body */}
              <div className="relative">
                <Quote
                  className="w-10 h-10 text-accent/20 absolute -top-2 -left-2"
                  aria-hidden="true"
                />
                <div className="pl-5 space-y-3 border-l-2 border-accent/30">
                  {FOUNDER.intro.split("\n\n").map((para, i) => (
                    <p
                      key={i}
                      className="text-white/70 leading-relaxed text-sm md:text-[15px]"
                    >
                      {para}
                    </p>
                  ))}
                </div>
              </div>

              {/* Signature */}
              <p className="text-white/30 text-sm italic mt-auto pt-4 border-t border-white/10">
                — {FOUNDER.name}, {FOUNDER.designation}
              </p>
            </motion.div>

            {/* RIGHT — Video card, stretches to match text column height */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="relative group cursor-pointer bg-slate-900 flex flex-col"
              onClick={openVideo}
              role="button"
              aria-label={`Watch introduction video by ${FOUNDER.name}`}
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && openVideo()}
            >
              {/* Video poster — fills remaining height via flex-1 */}
              <div className="flex-1 relative overflow-hidden">
                {FOUNDER.poster_url ? (
                  <img
                    src={FOUNDER.poster_url}
                    alt={`${FOUNDER.name} — ATEC Founder`}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-slate-800 to-accent/60 flex flex-col items-center justify-center gap-4 p-8 text-center">
                    {/* Decorative ring */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-10">
                      <div className="w-64 h-64 rounded-full border-2 border-white" />
                      <div className="absolute w-48 h-48 rounded-full border border-white" />
                    </div>
                    <div className="relative w-24 h-24 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center shadow-inner">
                      <GraduationCap className="w-12 h-12 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-heading font-bold text-xl">
                        {FOUNDER.name}
                      </p>
                      <p className="text-white/60 text-sm mt-1">
                        {FOUNDER.designation}
                      </p>
                    </div>
                  </div>
                )}

                {/* Hover overlay + play button */}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
                  <div className="relative flex items-center justify-center">
                    {/* Pulse rings */}
                    <span className="absolute w-24 h-24 rounded-full bg-accent/20 animate-ping" />
                    <span className="absolute w-20 h-20 rounded-full bg-accent/30" />
                    <div className="relative w-16 h-16 rounded-full gradient-accent flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300">
                      <Play className="w-7 h-7 text-accent-foreground ml-1" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom caption bar */}
              <div className="bg-slate-950/90 backdrop-blur-sm px-5 py-4 flex items-center gap-3 border-t border-white/5">
                <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center flex-shrink-0 shadow">
                  <GraduationCap className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold leading-tight truncate">
                    Founder's Introduction
                  </p>
                  <p className="text-white/40 text-xs truncate">
                    {FOUNDER.name} · ATEC Gurdaspur
                  </p>
                </div>
                <span className="flex-shrink-0 text-xs bg-accent/20 text-accent px-3 py-1 rounded-full border border-accent/30 group-hover:bg-accent group-hover:text-accent-foreground transition-colors duration-200">
                  Watch Now
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Full-format video overlay (not a Dialog, but a custom fullscreen modal) ── */}
      <AnimatePresence>
        {videoOpen && autoplayEmbedUrl && (
          <motion.div
            key="video-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={closeVideo}
            aria-modal="true"
            role="dialog"
            aria-label="Founder introduction video"
          >
            {/* Close button */}
            <button
              className="absolute top-5 right-5 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-colors"
              onClick={closeVideo}
              aria-label="Close video"
            >
              <X className="w-5 h-5" />
            </button>

            {/* iframe wrapper — stops propagation so clicking inside doesn't close */}
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className={
                isReel
                  ? "relative w-full max-w-[360px]"
                  : "relative w-full max-w-4xl"
              }
              style={
                isReel
                  ? { aspectRatio: "9/16", maxHeight: "85vh" }
                  : { aspectRatio: "16/9" }
              }
              onClick={(e) => e.stopPropagation()}
            >
              <iframe
                ref={iframeRef}
                src={autoplayEmbedUrl}
                className="absolute inset-0 w-full h-full rounded-xl border-0"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                title={`${FOUNDER.name} — Founder Introduction`}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
