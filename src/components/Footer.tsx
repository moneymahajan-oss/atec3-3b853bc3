import { GraduationCap, MapPin, Phone, Mail, Facebook, Instagram, Youtube } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const quickLinks = [
  { label: "Home", href: "#home" },
  { label: "Courses", href: "#courses" },
  { label: "About Us", href: "#about" },
  { label: "Gallery", href: "#gallery" },
  { label: "Contact", href: "#contact" },
];

const courseLinks = [
  "Generative AI",
  "Digital Marketing",
  "Full Stack Development",
  "Tally Prime",
  "Office Automation",
  "Student Combo Pack",
];

export default function Footer() {
  const settings = useSiteSettings();

  const socials = [
    { icon: Facebook, href: settings.social_facebook_url as string || "#", label: "Follow ATEC Education on Facebook" },
    { icon: Instagram, href: settings.social_instagram_url as string || "#", label: "Follow ATEC Education on Instagram" },
    { icon: Youtube, href: settings.social_youtube_url as string || "#", label: "Watch ATEC Education on YouTube" },
  ].filter(s => s.href && s.href !== "#");

  return (
    <footer className="gradient-primary text-primary-foreground pt-16 pb-8" aria-label="Site Footer">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg gradient-accent flex items-center justify-center" aria-hidden="true">
                <GraduationCap className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <div className="font-heading font-bold text-lg">ATEC Education</div>
                <div className="text-[10px] opacity-70 tracking-wider">AVENUE TO EXCELLENT CAREERS</div>
              </div>
            </div>
            <p className="text-sm opacity-80 leading-relaxed mb-4">
              Gurdaspur's premier computer education institute — empowering students with cutting-edge AI, tech and accounting skills since 2000.
            </p>
            {socials.length > 0 && (
              <nav aria-label="Social media links">
                <div className="flex gap-3">
                  {socials.map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      className="w-9 h-9 rounded-lg bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
                    >
                      <s.icon className="w-4 h-4" aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </nav>
            )}
          </div>

          {/* Quick Links */}
          <nav aria-label="Quick navigation links">
            <h3 className="font-heading font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="text-sm opacity-80 hover:opacity-100 transition-opacity">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Popular Courses — SEO: links go to individual course pages, not #courses anchor */}
          <nav aria-label="Popular courses">
            <h3 className="font-heading font-semibold mb-4">Popular Courses</h3>
            <ul className="space-y-2">
              {courseLinks.map((c) => (
                <li key={c}>
                  <a href="#courses" className="text-sm opacity-80 hover:opacity-100 transition-opacity">
                    {c}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact — SEO: use real phone/email, structured with schema-ready address */}
          <address className="not-italic" aria-label="Contact information">
            <h3 className="font-heading font-semibold mb-4">Contact Info</h3>
            <div className="space-y-3 text-sm opacity-80">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span>1st Floor, ATEC Avenue, Hardochhanni Road, Gurdaspur, Punjab – 143521</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <a href="tel:+917009933289" className="hover:opacity-100 transition-opacity" aria-label="Call ATEC at +91 70099 33289">
                  +91 70099 33289
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <a href="mailto:info@ateceducation.in" className="hover:opacity-100 transition-opacity" aria-label="Email ATEC at info@ateceducation.in">
                  info@ateceducation.in
                </a>
              </div>
            </div>
          </address>
        </div>

        <div className="border-t border-primary-foreground/20 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm opacity-60">
          <span>© {new Date().getFullYear()} ATEC Education — Avenue to Excellent Careers, Gurdaspur. All rights reserved.</span>
          <nav aria-label="Legal links">
            <div className="flex gap-4">
              <a href="/privacy-policy" className="hover:opacity-100 transition-opacity">Privacy Policy</a>
              <a href="/terms-of-service" className="hover:opacity-100 transition-opacity">Terms of Service</a>
            </div>
          </nav>
        </div>
      </div>
    </footer>
  );
}
