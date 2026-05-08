import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Moon, Sun, GraduationCap, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useFavicon } from "@/hooks/useFavicon";
import { whatsAppLinkSync } from "@/lib/whatsapp";
import { supabase } from "@/integrations/supabase/client";

const baseNavLinks = [
  { label: "Home", href: "#home" },
  { label: "Courses", href: "#courses" },
  { label: "About", href: "#about" },
  { label: "Gallery", href: "#gallery" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "AI Careers", href: "#ai-careers" },
  { label: "Mock Test", href: "#mock-test" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const settings = useSiteSettings();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  const [activeSection, setActiveSection] = useState("home");
  const [navLinks, setNavLinks] = useState(() => [
    ...baseNavLinks.slice(0, 7),
    { label: "Verification", href: "/verification" },
    ...baseNavLinks.slice(7),
  ]);

  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "verification_mode").single().then(({ data }) => {
      const mode = data?.value || "internal";
      const vHref = mode === "external" ? "https://atecedu.com/verification" : "/verification";
      setNavLinks([
        ...baseNavLinks.slice(0, 7),
        { label: "Verification", href: vHref },
        ...baseNavLinks.slice(7),
      ]);
    });
  }, []);

  useFavicon(settings.logo_url);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-40% 0px -50% 0px" }
    );
    navLinks.filter(({ href }) => href.startsWith("#")).forEach(({ href }) => {
      const el = document.querySelector(href);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const waNumber = settings.whatsapp_number || "917009933289";
  const enrollLink = whatsAppLinkSync(waNumber, "Hi ATEC! I want to enroll in a course. Please share details.");
  const logoUrl = settings.logo_url;
  const logoWidth = settings.logo_width || "120";
  const logoHeight = settings.logo_height || "48";
  const instituteName = settings.institute_name || "ATEC - Avenue To Excellent Career";

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`sticky top-0 left-0 right-0 z-40 transition-all duration-300 ${
          scrolled
            ? "bg-card/80 backdrop-blur-xl shadow-lg border-b border-border/50"
            : "bg-card/60 backdrop-blur-md"
        }`}
      >
        <div className="container mx-auto px-4 flex items-center justify-between h-16 md:h-18">
          {/* Logo */}
          <a href="#home" className="flex items-center gap-3 group">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={instituteName}
                style={{ width: `${logoWidth}px`, height: `${logoHeight}px`, objectFit: "contain" }}
              />
            ) : (
              <div className="w-10 h-10 rounded-lg gradient-accent flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-accent-foreground" />
              </div>
            )}
            <span className="font-bold text-base md:text-lg text-foreground hidden sm:block">{instituteName}</span>
          </a>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-0">
            {navLinks.map(({ label, href }) => {
              const isHash = href.startsWith("#");
              const isExternal = href.startsWith("http");
              return (
                <a
                  key={href}
                  href={href}
                  {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  onClick={isHash ? (e) => {
                    e.preventDefault();
                    const el = document.querySelector(href);
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  } : undefined}
                  className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isHash && activeSection === href.slice(1) ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {label}
                </a>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDark(!dark)}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
              aria-label="Toggle dark mode"
            >
              {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <Button
              className="hidden md:inline-flex gradient-accent text-accent-foreground border-0 font-semibold hover:opacity-90 transition-opacity"
              asChild
            >
              <a href={enrollLink} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-4 h-4 mr-1" /> Enroll Now
              </a>
            </Button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors text-foreground"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 top-16 z-40 bg-card/95 backdrop-blur-xl lg:hidden"
          >
            <div className="flex flex-col p-6 gap-2">
              {navLinks.map(({ label, href }) => {
                const isHash = href.startsWith("#");
                const isExternal = href.startsWith("http");
                return (
                  <a
                    key={label}
                    href={href}
                    {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    onClick={isHash ? (e) => {
                      e.preventDefault();
                      setMobileOpen(false);
                      const el = document.querySelector(href);
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    } : () => setMobileOpen(false)}
                    className="px-4 py-3 rounded-xl text-lg font-medium text-foreground hover:bg-muted"
                  >
                    {label}
                  </a>
                );
              })}
              <Button className="mt-4 gradient-accent text-accent-foreground border-0 font-semibold text-lg py-6" asChild>
                <a href={enrollLink} target="_blank" rel="noopener noreferrer" onClick={() => setMobileOpen(false)}>
                  <MessageCircle className="w-5 h-5 mr-2" /> Enroll Now
                </a>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
