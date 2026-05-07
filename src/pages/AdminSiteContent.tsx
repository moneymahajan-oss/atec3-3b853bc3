import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabaseAdmin as supabase } from "@/integrations/supabase/adminClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, GraduationCap, LogOut, Eye, Save } from "lucide-react";

const GROUPS: { label: string; keys: { key: string; label: string; multiline?: boolean; placeholder?: string }[] }[] = [
  {
    label: "Branding",
    keys: [
      { key: "institute_name", label: "Institute Name" },
      { key: "logo_url", label: "Logo URL" },
      { key: "logo_width", label: "Logo Width (px)" },
      { key: "logo_height", label: "Logo Height (px)" },
    ],
  },
  {
    label: "Hero Section",
    keys: [
      { key: "hero_heading", label: "Hero Heading" },
      { key: "hero_subheading", label: "Hero Subheading", multiline: true },
      { key: "hero_cta_text", label: "Hero CTA Button Text" },
    ],
  },
  {
    label: "Section Headings",
    keys: [
      { key: "courses_section_heading", label: "Courses Heading" },
      { key: "courses_section_subheading", label: "Courses Subheading" },
      { key: "about_section_heading", label: "About Heading" },
      { key: "about_section_subheading", label: "About Subheading" },
      { key: "life_section_heading", label: "Life @ ATEC Heading" },
      { key: "testimonials_section_heading", label: "Testimonials Heading" },
      { key: "ai_usecases_heading", label: "AI Use Cases Heading" },
      { key: "ai_usecases_subheading", label: "AI Use Cases Subheading" },
      { key: "mocktest_section_heading", label: "Mock Test Heading" },
      { key: "mocktest_section_subheading", label: "Mock Test Subheading" },
      { key: "contact_heading", label: "Contact Heading" },
      { key: "contact_subheading", label: "Contact Subheading" },
    ],
  },
  {
    label: "Contact / Footer",
    keys: [
      { key: "footer_address", label: "Address", multiline: true },
      { key: "footer_phone", label: "Phone" },
      { key: "footer_email", label: "Email" },
    ],
  },
  {
    label: "WhatsApp",
    keys: [
      { key: "whatsapp_number", label: "WhatsApp Number (no + or spaces, e.g. 917009933289)" },
    ],
  },
];

export default function AdminSiteContent() {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/admin/login");
  }, [user, isAdmin, loading]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data } = await supabase.from("site_settings").select("key, value");
      const map: Record<string, string> = {};
      (data || []).forEach((r: any) => { map[r.key] = r.value || ""; });
      setValues(map);
    })();
  }, [isAdmin]);

  const save = async (key: string) => {
    setSaving(key);
    const { data: existing } = await supabase.from("site_settings").select("id").eq("key", key).maybeSingle();
    if (existing?.id) {
      await supabase.from("site_settings").update({ value: values[key] || "" }).eq("id", existing.id);
    } else {
      await supabase.from("site_settings").insert({ key, value: values[key] || "" });
    }
    // Bust the public site cache so changes appear immediately
    queryClient.invalidateQueries({ queryKey: ["site_settings"] });
    toast({ title: "Saved", description: key });
    setSaving(null);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="p-2 hover:bg-muted rounded-lg"><ArrowLeft className="w-5 h-5" /></Link>
            <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-accent-foreground" />
            </div>
            <span className="font-heading font-bold text-lg">Site Content</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild><Link to="/"><Eye className="w-4 h-4 mr-1" /> View Site</Link></Button>
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="w-4 h-4 mr-1" /> Sign Out</Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        {GROUPS.map(group => (
          <div key={group.label} className="glass rounded-xl p-6">
            <h2 className="font-heading font-bold text-xl mb-4">{group.label}</h2>
            <div className="space-y-4">
              {group.keys.map(f => (
                <div key={f.key} className="grid md:grid-cols-[200px_1fr_auto] gap-3 items-start">
                  <label className="text-sm font-medium pt-2">
                    {f.label}
                    <div className="text-xs text-muted-foreground font-normal">{f.key}</div>
                  </label>
                  {f.multiline ? (
                    <Textarea value={values[f.key] || ""} onChange={e => setValues({ ...values, [f.key]: e.target.value })} rows={2} className="bg-background" />
                  ) : (
                    <Input value={values[f.key] || ""} onChange={e => setValues({ ...values, [f.key]: e.target.value })} className="bg-background" />
                  )}
                  <Button size="sm" onClick={() => save(f.key)} disabled={saving === f.key} className="gradient-accent text-accent-foreground border-0">
                    <Save className="w-4 h-4 mr-1" /> {saving === f.key ? "..." : "Save"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
