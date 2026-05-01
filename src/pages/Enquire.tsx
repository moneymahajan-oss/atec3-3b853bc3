import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useFavicon } from "@/hooks/useFavicon";
import { SEO } from "@/components/SEO";

interface FieldRow {
  field_key: string;
  field_label: string;
  required_on_public: boolean;
  dropdown_options: string[] | null;
  sort_order: number;
}
interface Course { id: string; name: string }
interface Settings {
  name: string;
  logo_url: string | null;
  favicon_url: string | null;
  self_fill_form_title: string | null;
  self_fill_form_subtitle: string | null;
  self_fill_thank_you_message: string | null;
  whatsapp_number: string | null;
  phone: string | null;
}

const TEXTAREA_FIELDS = new Set(["any_message"]);

export default function Enquire() {
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useFavicon(settings?.favicon_url || undefined);

  useEffect(() => {
    (async () => {
      const [fRes, cRes, sRes] = await Promise.all([
        supabase
          .from("crm_enquiry_form_fields")
          .select("field_key, field_label, required_on_public, dropdown_options, sort_order")
          .eq("show_on_public", true)
          .order("sort_order"),
        supabase.from("crm_courses").select("id, name").eq("is_active", true).order("name"),
        supabase
          .from("crm_institute_settings")
          .select("name, logo_url, favicon_url, self_fill_form_title, self_fill_form_subtitle, self_fill_thank_you_message, whatsapp_number, phone")
          .maybeSingle(),
      ]);
      setFields((fRes.data ?? []) as unknown as FieldRow[]);
      setCourses((cRes.data ?? []) as Course[]);
      setSettings((sRes.data ?? null) as Settings | null);
      setLoading(false);
    })();
  }, []);

  const set = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }));

  const schema = useMemo(() => z.object({
    full_name: z.string().trim().min(1, "Name is required").max(100),
    mobile: z.string().trim().regex(/^\d{10}$/, "Mobile must be 10 digits"),
    whatsapp: z.string().trim().regex(/^\d{10}$/).or(z.literal("")).optional(),
    email: z.string().trim().email().or(z.literal("")).optional(),
    any_message: z.string().max(1000).optional(),
  }).passthrough(), []);

  const submit = async () => {
    // Required check from config
    for (const f of fields) {
      if (f.required_on_public && !(values[f.field_key] || "").trim()) {
        toast.error(`${f.field_label} is required`);
        return;
      }
    }
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Please check the form");
      return;
    }

    setSubmitting(true);
    const courseRow = courses.find((c) => c.id === values.course_interested);
    const payload: Record<string, unknown> = {
      name: values.full_name?.trim(),
      phone: (values.mobile || "").replace(/\D/g, "").slice(-10),
      alt_phone: values.whatsapp ? values.whatsapp.replace(/\D/g, "").slice(-10) : null,
      whatsapp: values.whatsapp ? values.whatsapp.replace(/\D/g, "").slice(-10) : null,
      email: values.email || null,
      city: values.city || null,
      college_name: values.college_name || null,
      class_year: values.class_year || null,
      stream: values.stream || null,
      company_name: values.company_name || null,
      designation: values.designation || null,
      preferred_mode: values.preferred_mode || null,
      preferred_timing: (values.preferred_timing || "").toLowerCase() || null,
      budget_range: (values.budget_range || "").toLowerCase().replace(/[\s+-]+/g, "_") || null,
      hear_about_us: values.how_heard || null,
      any_message: values.any_message || null,
      qualification: (values.qualification || "").toLowerCase().replace(/\s+/g, "_") || null,
      current_status: (values.current_status || "").toLowerCase().replace(/\s+/g, "_") || null,
      course_id: values.course_interested || null,
      course_name_snapshot: courseRow?.name || null,
      source: "student_self_fill",
      status: "new",
      priority: "medium",
      notes: values.any_message || null,
    };

    const normPhone = (values.mobile || "").replace(/\D/g, "").slice(-10);
    // Silent dedupe: if a same-phone + same-course enquiry exists in last 30 days, refresh it instead of inserting
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const courseIdForCheck = values.course_interested || null;
    let dupeId: string | null = null;
    if (normPhone) {
      const dupeQuery = supabase
        .from("crm_enquiries")
        .select("id")
        .eq("phone", normPhone)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1);
      const { data: dupe } = courseIdForCheck
        ? await dupeQuery.eq("course_id", courseIdForCheck).maybeSingle()
        : await dupeQuery.maybeSingle();
      if (dupe?.id) dupeId = dupe.id;
    }
    let error: { message: string } | null = null;
    if (dupeId) {
      const { error: updErr } = await supabase
        .from("crm_enquiries")
        .update({
          notes: `Re-submitted via website self-fill on ${new Date().toLocaleString()}${values.any_message ? `\nMessage: ${values.any_message}` : ""}`,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", dupeId);
      error = updErr as never;
    } else {
      const { error: insErr } = await supabase.from("crm_enquiries").insert(payload as never);
      error = insErr as never;
    }

  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const title = settings?.self_fill_form_title || "Enquire Now";
  const subtitle = settings?.self_fill_form_subtitle || "Tell us about yourself and we'll get in touch.";

  return (
    <>
      <SEO
        title={`${title} | ${settings?.name || "ATEC Education"}`}
        description={subtitle}
      />
      <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <header className="text-center mb-8">
            {settings?.logo_url && (
              <img src={settings.logo_url} alt={settings?.name || ""} className="h-16 mx-auto mb-4 object-contain" />
            )}
            <h1 className="text-3xl sm:text-4xl font-bold text-primary">{title}</h1>
            {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
          </header>

          {submitted ? (
            <div className="bg-card border rounded-2xl p-8 text-center shadow-sm">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-3">Thank you!</h2>
              <p className="text-muted-foreground whitespace-pre-wrap mb-6">
                {settings?.self_fill_thank_you_message || "Thank you! Our team will contact you shortly."}
              </p>
              <Button onClick={() => { setSubmitted(false); setValues({}); }}>
                Submit another enquiry
              </Button>
            </div>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); submit(); }}
              className="bg-card border rounded-2xl p-6 sm:p-8 space-y-5 shadow-sm"
            >
              {fields.map((f) => {
                const id = `f_${f.field_key}`;
                const required = f.required_on_public;
                const label = (
                  <Label htmlFor={id} className="mb-1.5 block">
                    {f.field_label} {required && <span className="text-destructive">*</span>}
                  </Label>
                );

                if (f.field_key === "course_interested") {
                  return (
                    <div key={f.field_key}>
                      {label}
                      <Select value={values[f.field_key] || ""} onValueChange={(v) => set(f.field_key, v)}>
                        <SelectTrigger id={id}><SelectValue placeholder="Select a course" /></SelectTrigger>
                        <SelectContent>
                          {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                }

                if (f.dropdown_options && Array.isArray(f.dropdown_options) && f.dropdown_options.length > 0) {
                  return (
                    <div key={f.field_key}>
                      {label}
                      <Select value={values[f.field_key] || ""} onValueChange={(v) => set(f.field_key, v)}>
                        <SelectTrigger id={id}><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {f.dropdown_options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                }

                if (TEXTAREA_FIELDS.has(f.field_key)) {
                  return (
                    <div key={f.field_key}>
                      {label}
                      <Textarea id={id} rows={4} maxLength={1000} value={values[f.field_key] || ""}
                        onChange={(e) => set(f.field_key, e.target.value)} />
                    </div>
                  );
                }

                const isPhone = f.field_key === "mobile" || f.field_key === "whatsapp";
                const isEmail = f.field_key === "email";
                return (
                  <div key={f.field_key}>
                    {label}
                    <Input
                      id={id}
                      type={isEmail ? "email" : isPhone ? "tel" : "text"}
                      inputMode={isPhone ? "numeric" : undefined}
                      maxLength={isPhone ? 15 : 200}
                      value={values[f.field_key] || ""}
                      onChange={(e) => set(f.field_key, e.target.value)}
                      required={required}
                    />
                  </div>
                );
              })}

              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</> : "Submit Enquiry"}
              </Button>
            </form>
          )}

          <p className="text-xs text-center text-muted-foreground mt-6">
            © {new Date().getFullYear()} {settings?.name || "ATEC Education"}
          </p>
        </div>
      </div>
    </>
  );
}
