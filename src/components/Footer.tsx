import { GraduationCap, MapPin, Phone, Mail, Facebook, Instagram, Youtube, Linkedin } from "lucide-react";

const quickLinks = [
  { label: "Home", href: "#home" },
  { label: "Courses", href: "#courses" },
  { label: "About Us", href: "#about" },
  { label: "Gallery", href: "#gallery" },
  { label: "Contact", href: "#contact" },
];

const courseLinks = [
  "Generative AI", "Digital Marketing", "Full Stack Development",
  "Tally Prime", "Office Automation", "Student Combo Pack",
];

const socials = [
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Youtube, href: "#", label: "YouTube" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
];

export default function Footer() {
  return (
    <footer className="gradient-primary text-primary-foreground pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg gradient-accent flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <div className="font-heading font-bold text-lg">E-Tech</div>
                <div className="text-[10px] opacity-70 tracking-wider">AVENUE TO EXCELLENT CAREERS</div>
              </div>
            </div>
            <p className="text-sm opacity-80 leading-relaxed mb-4">
              Gurdaspur's premier computer education institute — empowering students with cutting-edge skills since 2013.
            </p>
            <div className="flex gap-3">
              {socials.map((s) => (
                <a key={s.label} href={s.href} aria-label={s.label} className="w-9 h-9 rounded-lg bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors">
                  <s.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-heading font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {quickLinks.map((l) => (
                <li key={l.href}><a href={l.href} className="text-sm opacity-80 hover:opacity-100 transition-opacity">{l.label}</a></li>
              ))}
            </ul>
          </div>

          {/* Popular Courses */}
          <div>
            <h4 className="font-heading font-semibold mb-4">Popular Courses</h4>
            <ul className="space-y-2">
              {courseLinks.map((c) => (
                <li key={c}><a href="#courses" className="text-sm opacity-80 hover:opacity-100 transition-opacity">{c}</a></li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-heading font-semibold mb-4">Contact Info</h4>
            <div className="space-y-3 text-sm opacity-80">
              <div className="flex items-start gap-2"><MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>E-Tech Avenue, Hardo Channi Road, Gurdaspur, Punjab – 143521</span></div>
              <div className="flex items-center gap-2"><Phone className="w-4 h-4 flex-shrink-0" /><span>+91 98765 43210</span></div>
              <div className="flex items-center gap-2"><Mail className="w-4 h-4 flex-shrink-0" /><span>info@etech.edu.in</span></div>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm opacity-60">
          <span>© {new Date().getFullYear()} E-Tech — Avenue to Excellent Careers. All rights reserved.</span>
          <div className="flex gap-4">
            <a href="#" className="hover:opacity-100 transition-opacity">Privacy Policy</a>
            <a href="#" className="hover:opacity-100 transition-opacity">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
