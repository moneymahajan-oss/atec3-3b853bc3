import { motion } from "framer-motion";
import { Sparkles, Users, Briefcase, FlaskConical, CalendarClock, BadgeIndianRupee, ShieldCheck, Linkedin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { teamMembers } from "@/data/mockData";

const highlights = [
  { icon: Users, title: "Industry Experts", desc: "Learn from professionals with real-world experience" },
  { icon: Briefcase, title: "Placement Support", desc: "100% placement assistance for all students" },
  { icon: FlaskConical, title: "Hands-on Labs", desc: "State-of-the-art computer & robotics labs" },
  { icon: CalendarClock, title: "Flexible Batches", desc: "Morning, evening & weekend batches available" },
  { icon: BadgeIndianRupee, title: "Affordable Fees", desc: "Quality education at competitive prices" },
  { icon: ShieldCheck, title: "Certified Courses", desc: "Industry-recognized certifications included" },
];

export default function AboutSection() {
  return (
    <section id="about" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* About intro */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="relative">
            <div className="grid grid-cols-2 gap-4">
              <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&q=80" alt="Students" className="rounded-2xl h-48 object-cover w-full" />
              <img src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&q=80" alt="Lab" className="rounded-2xl h-48 object-cover w-full mt-8" />
              <img src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400&q=80" alt="Seminar" className="rounded-2xl h-48 object-cover w-full" />
              <img src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=400&q=80" alt="Group" className="rounded-2xl h-48 object-cover w-full mt-8" />
            </div>
            <div className="absolute -bottom-4 -right-4 glass rounded-xl p-4 shadow-xl">
              <div className="text-2xl font-heading font-bold text-accent">12+</div>
              <div className="text-xs text-muted-foreground">Years of Excellence</div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <Badge variant="outline" className="mb-4 text-accent border-accent/30 bg-accent/5">
              <Sparkles className="w-3 h-3 mr-1" /> About Us
            </Badge>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">
              Avenue to Excellent Careers
            </h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Founded in 2013, E-Tech has been Gurdaspur's premier computer education institute, empowering over 5,000 students with industry-ready skills. We blend cutting-edge technology with practical, hands-on training to prepare students for the careers of tomorrow.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="glass rounded-xl p-4">
                <div className="font-heading font-bold text-foreground">Our Mission</div>
                <p className="text-sm text-muted-foreground mt-1">To democratize quality tech education and make it accessible to every student in Punjab.</p>
              </div>
              <div className="glass rounded-xl p-4">
                <div className="font-heading font-bold text-foreground">Our Vision</div>
                <p className="text-sm text-muted-foreground mt-1">To be North India's most trusted EdTech institution by 2030.</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Why Choose */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-20">
          <h3 className="text-2xl md:text-3xl font-heading font-bold text-foreground text-center mb-10">Why Choose E-Tech?</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {highlights.map((h, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass rounded-xl p-5 text-center hover:shadow-lg transition-shadow group"
              >
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <h.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="font-heading font-semibold text-foreground mb-1">{h.title}</div>
                <p className="text-xs text-muted-foreground">{h.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Team */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h3 className="text-2xl md:text-3xl font-heading font-bold text-foreground text-center mb-10">Meet Our Team</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {teamMembers.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass rounded-2xl p-5 text-center group"
              >
                <img src={m.photo_url} alt={m.name} className="w-24 h-24 mx-auto rounded-full object-cover mb-4 ring-4 ring-border group-hover:ring-accent/30 transition-all" />
                <div className="font-heading font-semibold text-foreground">{m.name}</div>
                <div className="text-sm text-accent">{m.role}</div>
                <div className="text-xs text-muted-foreground mt-1">{m.bio}</div>
                <a href={m.linkedin_url} className="inline-flex mt-3 text-muted-foreground hover:text-primary transition-colors">
                  <Linkedin className="w-4 h-4" />
                </a>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
