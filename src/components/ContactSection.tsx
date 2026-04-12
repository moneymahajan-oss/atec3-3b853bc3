import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, MapPin, Phone, Mail, Clock, Send, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const categories = ["AI & Emerging Tech", "Digital Skills & Marketing", "Full Stack & Networking", "Finance & Accounting", "Office & Productivity", "Student Courses"];

export default function ContactSection() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mapUrl, setMapUrl] = useState("https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3380.0!2d75.4!3d32.04!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sGurdaspur!5e0!3m2!1sen!2sin!4v1");

  useEffect(() => {
    const fetchMapUrl = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "google_maps_embed_url")
        .maybeSingle();
      if (data?.value) setMapUrl(data.value);
    };
    fetchMapUrl();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const { error } = await supabase.from("contact_submissions").insert({
      name: form.get("name") as string,
      email: form.get("email") as string,
      phone: form.get("phone") as string,
      course_interest: form.get("course_interest") as string,
      message: form.get("message") as string,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSubmitted(true);
      toast({ title: "Message sent!", description: "We'll get back to you within 24 hours." });
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSubmitted(false), 3000);
    }
  };

  return (
    <section id="contact" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <Badge variant="outline" className="mb-4 text-accent border-accent/30 bg-accent/5"><Sparkles className="w-3 h-3 mr-1" /> Contact</Badge>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">Get in Touch</h2>
        </motion.div>
        <div className="grid lg:grid-cols-2 gap-12">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-6">
            {[
              { icon: MapPin, title: "Visit Us", text: "ATEC Avenue, Hardo Channi Road,\nGurdaspur, Punjab, India – 143521" },
              { icon: Phone, title: "Call Us", text: "+91 7009933289\n+91 9815122441" },
              { icon: Mail, title: "Email Us", text: "iinfo@atecedu.com\natecgsp@gmail.com" },
              { icon: Clock, title: "Working Hours", text: "Mon–Sat: 9:00 AM – 7:00 PM\nSunday: Closed" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 glass rounded-xl p-5">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <div className="font-heading font-semibold text-foreground">{item.title}</div>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{item.text}</p>
                </div>
              </div>
            ))}
            <div className="rounded-2xl overflow-hidden h-48 glass">
              <iframe src={mapUrl} className="w-full h-full border-0" loading="lazy" allowFullScreen />
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 md:p-8 space-y-4">
              <h3 className="font-heading font-bold text-xl text-foreground mb-2">Send us a message</h3>
              <div className="grid grid-cols-2 gap-4">
                <Input name="name" placeholder="Your Name" required className="bg-background" />
                <Input name="email" type="email" placeholder="Email Address" required className="bg-background" />
              </div>
              <Input name="phone" type="tel" placeholder="Phone Number" required className="bg-background" />
              <Select name="course_interest">
                <SelectTrigger className="bg-background"><SelectValue placeholder="Interested Course" /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
              <Textarea name="message" placeholder="Your message..." rows={4} className="bg-background" />
              <Button type="submit" className="w-full gradient-accent text-accent-foreground border-0 font-semibold hover:opacity-90 transition-opacity" disabled={submitted || loading}>
                {submitted ? <><CheckCircle className="w-4 h-4 mr-2" /> Sent!</> : <><Send className="w-4 h-4 mr-2" /> Send Message</>}
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
