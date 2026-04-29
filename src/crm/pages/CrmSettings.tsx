import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "../components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCrmAuth } from "../hooks/useCrmAuth";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { logAudit } from "../lib/audit";

interface ReminderSettingsValue {
  feeOverdueDaysOffset: number;
  feeDueSoonWindow: number;
  batchEndingWindow: number;
  attendanceThreshold: number;
}

const DEFAULT_REMINDER: ReminderSettingsValue = {
  feeOverdueDaysOffset: 0,
  feeDueSoonWindow: 3,
  batchEndingWindow: 14,
  attendanceThreshold: 75,
};

interface Settings {
  id: string;
  name: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  email: string | null;
  website: string | null;
  gst: string | null;
  upi_id: string | null;
  fee_reminder_days: number;
  referral_reward: number;
  receipt_header: string | null;
  receipt_footer: string | null;
  collection_timings: string | null;
  reminder_settings: ReminderSettingsValue | null;
}

export default function CrmSettings() {
  const { isAdmin, loading } = useCrmAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("crm_institute_settings").select("*").maybeSingle();
      if (data) setSettings(data as Settings);
    })();
  }, []);

  if (!loading && !isAdmin) return <Navigate to="/crm" replace />;

  const update = (k: keyof Settings, v: string | number) => {
    if (!settings) return;
    setSettings({ ...settings, [k]: v });
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const { id, ...patch } = settings;
    const { error } = await supabase.from("crm_institute_settings").update(patch).eq("id", id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Settings saved");
      logAudit("update", "institute_settings", id);
    }
  };

  if (!settings) return <div className="p-6 text-muted-foreground">Loading…</div>;

  return (
    <div>
      <PageHeader
        title="Institute Settings"
        description="These details are used in WhatsApp templates, receipts, and certificates."
        actions={<Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Identity">
          <Field label="Institute name"><Input value={settings.name} onChange={(e) => update("name", e.target.value)} /></Field>
          <Field label="Logo URL"><Input value={settings.logo_url ?? ""} onChange={(e) => update("logo_url", e.target.value)} placeholder="https://..." /></Field>
          <Field label="Website"><Input value={settings.website ?? ""} onChange={(e) => update("website", e.target.value)} /></Field>
          <Field label="GST number"><Input value={settings.gst ?? ""} onChange={(e) => update("gst", e.target.value)} /></Field>
        </Section>

        <Section title="Contact">
          <Field label="Address"><Textarea rows={3} value={settings.address ?? ""} onChange={(e) => update("address", e.target.value)} /></Field>
          <Field label="Phone"><Input value={settings.phone ?? ""} onChange={(e) => update("phone", e.target.value)} placeholder="+91..." /></Field>
          <Field label="WhatsApp number">
            <Input value={settings.whatsapp_number ?? ""} onChange={(e) => update("whatsapp_number", e.target.value)} placeholder="91XXXXXXXXXX (digits only, with country code)" />
          </Field>
          <Field label="Email"><Input type="email" value={settings.email ?? ""} onChange={(e) => update("email", e.target.value)} /></Field>
        </Section>

        <Section title="Payments & rewards">
          <Field label="UPI ID"><Input value={settings.upi_id ?? ""} onChange={(e) => update("upi_id", e.target.value)} placeholder="atec@upi" /></Field>
          <Field label="Fee reminder threshold (days before due)">
            <Input type="number" min={0} value={settings.fee_reminder_days} onChange={(e) => update("fee_reminder_days", Number(e.target.value))} />
          </Field>
          <Field label="Referral reward (₹)">
            <Input type="number" min={0} value={settings.referral_reward} onChange={(e) => update("referral_reward", Number(e.target.value))} />
          </Field>
          <Field label="Collection timings"><Input value={settings.collection_timings ?? ""} onChange={(e) => update("collection_timings", e.target.value)} /></Field>
        </Section>

        <Section title="Receipt">
          <Field label="Receipt header"><Textarea rows={2} value={settings.receipt_header ?? ""} onChange={(e) => update("receipt_header", e.target.value)} /></Field>
          <Field label="Receipt footer"><Textarea rows={2} value={settings.receipt_footer ?? ""} onChange={(e) => update("receipt_footer", e.target.value)} /></Field>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border rounded-2xl p-5 space-y-4">
      <h2 className="font-heading font-bold text-lg">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
