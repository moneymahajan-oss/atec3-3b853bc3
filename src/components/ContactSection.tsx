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
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export default function ContactSection() {
  const { toast } = useToast();
  const settings = useSiteSettings();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    supabase
      .from("courses")
      .select("id, name")
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => {
        if (data) setCourses(data);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const name = (form.get("name") as string) || "";
    const phone = (form.get("phone") as string) || "";
    const email = (form.get("email") as string) || "";
    const courseInterest = selectedCourse || "";
    const message = (form.get("message") as string) || "";

    const { error } = await supabase.from("leads").insert({
      source: "contact_form",
      student_name: name,
      phone,
      email,
      course_name: courseInterest,
      message,
    });

    // Also create a CRM enquiry so it appears in the Enquiry panel — with silent dedupe
    if (name && phone) {
      const normPhone = phone.replace(/\D/g, "").slice(-10);
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: dupe } = await supabase
        .from("crm_enquiries")
        .select("id")
        .eq("phone", normPhone)
        .eq("course_name_snapshot", courseInterest || "")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (dupe?.id) {
        await supabase.from("crm_enquiries")
          .update({
            notes: `Re-submitted via website Contact form on ${new Date().toLocaleString()}${message ? `\nMessage: ${message}` : ""}`,
            updated_at: new Date().toISOString(),
          } as never)
          .eq("id", dupe.id);
      } else {
        await supabase.from("crm_enquiries").insert({
          name,
          phone: normPhone,
          whatsapp: normPhone,
          email: email || null,
          course_name_snapshot: courseInterest || null,
          source: "website_form",
          status: "new",
          priority: "medium",
          any_message: message || null,
          notes: "Auto-created from website Contact form",
        } as never);
      }
    }

    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setSubmitted(true);
    toast({ title: "Message sent!", description: "Opening WhatsApp to confirm." });
    (e.target as HTMLFormElement).reset();
    setTimeout(() => setSubmitted(false), 3000);

    // Build WhatsApp link with template
    const link = await buildWhatsAppLink(
      "contact_form",
      {
        student_name: name,
        phone,
        course_name: courseInterest,
        message,
      },
      settings.whatsapp_number
    );
    window.open(link, "_blank", "noopener,noreferrer");
  };

  return (
    <section id="contact" className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <Badge variant="outline" className="mb-4 text-accent border-accent/30 bg-accent/5"><Sparkles className="w-3 h-3 mr-1" /> Contact</Badge>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">
            {settings.contact_heading || "Get in Touch"}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {settings.contact_subheading || "We're here to help you choose the right course"}
          </p>
        </motion.div>
        <div className="grid lg:grid-cols-2 gap-12">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-6">
            {[
              { icon: MapPin, title: "Visit Us", text: settings.address || settings.footer_address || "ATEC Avenue, Hardo Channi Road,\nGurdaspur, Punjab – 143521" },
              { icon: Phone, title: "Call Us", text: [settings.phone_primary || settings.footer_phone, settings.phone_secondary].filter(Boolean).join("\n") || "+91 7009933289" },
              { icon: Mail, title: "Email Us", text: [settings.email_primary || settings.footer_email, settings.email_secondary].filter(Boolean).join("\n") || "atecgsp@gmail.com" },
              { icon: Clock, title: "Working Hours", text: settings.working_hours || "Mon–Sat: 9:00 AM – 7:00 PM\nSunday: Closed" },
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
              <iframe
                src={settings.google_maps_embed_url || "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3380.0!2d75.4!3d32.04!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sGurdaspur!5e0!3m2!1sen!2sin!4v1"}
                className="w-full h-full border-0"
                loading="lazy"
                allowFullScreen
              />
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 md:p-8 space-y-4">
              <h3 className="font-heading font-bold text-xl text-foreground mb-2">Send us a message</h3>
              <div className="grid grid-cols-2 gap-4">
                <Input name="name" placeholder="Your Name" required className="bg-background" />
                <Input name="email" type="email" placeholder="Email Address" className="bg-background" />
              </div>
              <Input name="phone" type="tel" placeholder="WhatsApp Number" required className="bg-background" />
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Interested Course" /></SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea name="message" placeholder="Your message..." rows={4} className="bg-background" />
              <Button type="submit" className="w-full gradient-accent text-accent-foreground border-0 font-semibold hover:opacity-90 transition-opacity" disabled={submitted || loading}>
                {submitted ? <><CheckCircle className="w-4 h-4 mr-2" /> Sent!</> : <><Send className="w-4 h-4 mr-2" /> Send via WhatsApp</>}
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
