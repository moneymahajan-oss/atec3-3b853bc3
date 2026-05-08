import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "../components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCrmAuth } from "../hooks/useCrmAuth";
import { Navigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { logAudit } from "../lib/audit";
import { DangerZone } from "../components/DangerZone";

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
  favicon_url: string | null;
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
  const { isAdmin, loading, hasAccess } = useCrmAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  const loadSettings = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase.from("crm_institute_settings").select("*").maybeSingle();
      if (error) throw new Error(error.message);
      if (data) {
        const raw = data as unknown as Record<string, unknown>;
        const rs = (raw.reminder_settings ?? {}) as Partial<ReminderSettingsValue>;
        setSettings({
          ...(raw as unknown as Settings),
          reminder_settings: { ...DEFAULT_REMINDER, ...rs },
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load settings";
      setLoadError(msg);
      console.error("[CrmSettings] load error", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!hasAccess) return;
    loadSettings();
  }, [hasAccess]);

  // Auto-scroll to Danger Zone if URL hash matches (from sidebar link)
  useEffect(() => {
    if (!settings) return;
    if (location.hash === "#danger-zone") {
      setTimeout(() => {
        document.getElementById("danger-zone")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [settings, location.hash]);

  if (!loading && !isAdmin) return <Navigate to="/crm" replace />;

  const update = (k: keyof Settings, v: string | number) => {
    if (!settings) return;
    setSettings({ ...settings, [k]: v });
  };

  const updateReminder = (k: keyof ReminderSettingsValue, v: number) => {
    if (!settings) return;
    const cur = settings.reminder_settings ?? DEFAULT_REMINDER;
    setSettings({ ...settings, reminder_settings: { ...cur, [k]: v } });
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const { id, reminder_settings, ...rest } = settings;
    const patch = {
      ...rest,
      reminder_settings: (reminder_settings ?? DEFAULT_REMINDER) as unknown as Record<string, unknown>,
    };
    const { error } = await supabase.from("crm_institute_settings").update(patch as never).eq("id", id);
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
        description="These details are used in WhatsApp templates, receipts, and certificates. The Danger Zone is shown first below."
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
          </div>
        }
      />

      <div id="danger-zone" className="mb-6 scroll-mt-20">
        <DangerZone />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Identity">
          <Field label="Institute name"><Input value={settings.name} onChange={(e) => update("name", e.target.value)} /></Field>
          <Field label="Logo URL"><Input value={settings.logo_url ?? ""} onChange={(e) => update("logo_url", e.target.value)} placeholder="https://..." /></Field>
          <Field label="Favicon URL">
            <div className="space-y-2">
              <Input value={settings.favicon_url ?? ""} onChange={(e) => update("favicon_url", e.target.value)} placeholder="https://... (32x32 or 64x64 PNG/ICO)" />
              {settings.favicon_url && (
                <img src={settings.favicon_url} alt="Favicon preview" className="w-8 h-8 rounded border bg-muted" />
              )}
              <p className="text-xs text-muted-foreground">Applied site-wide as the browser tab icon.</p>
            </div>
          </Field>
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

        <Section title="Reminders dashboard">
          <p className="text-xs text-muted-foreground -mt-2">Tune the windows used by the Reminders page and dashboard badge.</p>
          <Field label="Show overdue once N days past due">
            <Input type="number" min={0} value={settings.reminder_settings?.feeOverdueDaysOffset ?? 0}
              onChange={(e) => updateReminder("feeOverdueDaysOffset", Number(e.target.value))} />
          </Field>
          <Field label="Fee due-soon window (days before due)">
            <Input type="number" min={0} value={settings.reminder_settings?.feeDueSoonWindow ?? 3}
              onChange={(e) => updateReminder("feeDueSoonWindow", Number(e.target.value))} />
          </Field>
          <Field label="Batch ending window (days before end)">
            <Input type="number" min={1} value={settings.reminder_settings?.batchEndingWindow ?? 14}
              onChange={(e) => updateReminder("batchEndingWindow", Number(e.target.value))} />
          </Field>
          <Field label="Low attendance threshold (%)">
            <Input type="number" min={0} max={100} value={settings.reminder_settings?.attendanceThreshold ?? 75}
              onChange={(e) => updateReminder("attendanceThreshold", Number(e.target.value))} />
          </Field>
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
