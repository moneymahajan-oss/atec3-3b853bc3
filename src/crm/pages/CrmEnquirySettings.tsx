import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Copy, ExternalLink, Lock, Pencil, ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { useCrmAuth } from "../hooks/useCrmAuth";
import { fillTemplate, buildWaLink } from "../lib/whatsapp";
import { ENQUIRY_TEMPLATE_KEYS } from "../lib/enquiryWa";

interface FieldRow {
  id: string;
  field_key: string;
  field_label: string;
  show_on_public: boolean;
  required_on_public: boolean;
  show_in_crm_form: boolean;
  dropdown_options: string[] | null;
  sort_order: number;
  is_locked: boolean;
}
interface ColRow {
  id: string;
  column_key: string;
  label: string;
  show_in_list: boolean;
  show_in_export: boolean;
  sort_order: number;
}
interface SelfFill {
  id: string;
  self_fill_form_title: string | null;
  self_fill_form_subtitle: string | null;
  self_fill_thank_you_message: string | null;
}
interface Tpl {
  id: string;
  template_key: string;
  name: string;
  body: string;
  variables: string[];
  is_active: boolean;
}

export default function CrmEnquirySettings() {
  const { isAdmin, loading } = useCrmAuth();
  if (!loading && !isAdmin) return <Navigate to="/crm" replace />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enquiry Configuration"
        description="Control which fields appear on the public form and CRM form, list/export columns, the self-fill landing, and enquiry WhatsApp templates."
      />
      <Tabs defaultValue="fields" className="space-y-4">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto">
          <TabsTrigger value="fields">Form Fields</TabsTrigger>
          <TabsTrigger value="columns">Report Columns</TabsTrigger>
          <TabsTrigger value="selffill">Self-Fill Form</TabsTrigger>
          <TabsTrigger value="templates">WhatsApp Templates</TabsTrigger>
        </TabsList>
        <TabsContent value="fields"><FieldsTab /></TabsContent>
        <TabsContent value="columns"><ColumnsTab /></TabsContent>
        <TabsContent value="selffill"><SelfFillTab /></TabsContent>
        <TabsContent value="templates"><TemplatesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// =================== Tab 1: Form Fields ===================

function FieldsTab() {
  const [rows, setRows] = useState<FieldRow[]>([]);
  const [editing, setEditing] = useState<FieldRow | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("crm_enquiry_form_fields")
      .select("*")
      .order("sort_order");
    setRows((data ?? []) as unknown as FieldRow[]);
  };
  useEffect(() => { load(); }, []);

  const patch = async (id: string, p: Partial<FieldRow>) => {
    const { error } = await supabase.from("crm_enquiry_form_fields").update(p as never).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setRows((r) => r.map((row) => (row.id === id ? { ...row, ...p } : row)));
  };

  return (
    <>
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Field</TableHead>
              <TableHead>Label</TableHead>
              <TableHead className="text-center">Public</TableHead>
              <TableHead className="text-center">Required</TableHead>
              <TableHead className="text-center">CRM Form</TableHead>
              <TableHead className="text-right">Options</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">
                  {r.field_key}
                  {r.is_locked && <Lock className="w-3 h-3 inline ml-1 text-muted-foreground" />}
                </TableCell>
                <TableCell>
                  <Input
                    defaultValue={r.field_label}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== r.field_label) patch(r.id, { field_label: v });
                    }}
                    className="h-8"
                  />
                </TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={r.show_on_public}
                    disabled={r.is_locked}
                    onCheckedChange={(v) => patch(r.id, { show_on_public: v })}
                  />
                </TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={r.required_on_public}
                    disabled={r.is_locked || !r.show_on_public}
                    onCheckedChange={(v) => patch(r.id, { required_on_public: v })}
                  />
                </TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={r.show_in_crm_form}
                    disabled={r.is_locked}
                    onCheckedChange={(v) => patch(r.id, { show_in_crm_form: v })}
                  />
                </TableCell>
                <TableCell className="text-right">
                  {r.dropdown_options !== null && r.field_key !== "course_interested" && (
                    <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>
                      <Pencil className="w-3.5 h-3.5 mr-1" /> Edit options
                    </Button>
                  )}
                  {r.field_key === "course_interested" && (
                    <span className="text-xs text-muted-foreground">auto from courses</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <OptionsDialog
        row={editing}
        onClose={() => setEditing(null)}
        onSaved={(opts) => {
          if (!editing) return;
          patch(editing.id, { dropdown_options: opts });
          setEditing(null);
        }}
      />
    </>
  );
}

function OptionsDialog({ row, onClose, onSaved }: {
  row: FieldRow | null;
  onClose: () => void;
  onSaved: (opts: string[]) => void;
}) {
  const [opts, setOpts] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  useEffect(() => { setOpts(row?.dropdown_options ?? []); setDraft(""); }, [row]);
  if (!row) return null;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit options — {row.field_label}</DialogTitle></DialogHeader>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {opts.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={o} onChange={(e) => setOpts((s) => s.map((v, idx) => idx === i ? e.target.value : v))} />
              <Button size="icon" variant="ghost" disabled={i === 0} onClick={() => setOpts((s) => { const c = [...s]; [c[i-1], c[i]] = [c[i], c[i-1]]; return c; })}>
                <ArrowUp className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" disabled={i === opts.length - 1} onClick={() => setOpts((s) => { const c = [...s]; [c[i+1], c[i]] = [c[i], c[i+1]]; return c; })}>
                <ArrowDown className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setOpts((s) => s.filter((_, idx) => idx !== i))}>
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-3">
          <Input placeholder="New option" value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { setOpts((s) => [...s, draft.trim()]); setDraft(""); } }} />
          <Button onClick={() => { if (draft.trim()) { setOpts((s) => [...s, draft.trim()]); setDraft(""); } }}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSaved(opts.filter((o) => o.trim()))}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =================== Tab 2: Report Columns ===================

function ColumnsTab() {
  const [rows, setRows] = useState<ColRow[]>([]);
  const load = async () => {
    const { data } = await supabase
      .from("crm_enquiry_report_columns")
      .select("*")
      .order("sort_order");
    setRows((data ?? []) as unknown as ColRow[]);
  };
  useEffect(() => { load(); }, []);

  const patch = async (id: string, p: Partial<ColRow>) => {
    const { error } = await supabase.from("crm_enquiry_report_columns").update(p as never).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setRows((r) => r.map((row) => (row.id === id ? { ...row, ...p } : row)));
  };

  const move = async (i: number, dir: -1 | 1) => {
    const target = i + dir;
    if (target < 0 || target >= rows.length) return;
    const a = rows[i], b = rows[target];
    await Promise.all([
      supabase.from("crm_enquiry_report_columns").update({ sort_order: b.sort_order } as never).eq("id", a.id),
      supabase.from("crm_enquiry_report_columns").update({ sort_order: a.sort_order } as never).eq("id", b.id),
    ]);
    load();
  };

  return (
    <div className="rounded-lg border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Order</TableHead>
            <TableHead>Column</TableHead>
            <TableHead className="text-center">Show in List</TableHead>
            <TableHead className="text-center">Show in Export</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={r.id}>
              <TableCell>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                    <ArrowDown className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </TableCell>
              <TableCell>
                <div className="font-medium">{r.label}</div>
                <code className="text-[10px] text-muted-foreground">{r.column_key}</code>
              </TableCell>
              <TableCell className="text-center">
                <Switch checked={r.show_in_list} onCheckedChange={(v) => patch(r.id, { show_in_list: v })} />
              </TableCell>
              <TableCell className="text-center">
                <Switch checked={r.show_in_export} onCheckedChange={(v) => patch(r.id, { show_in_export: v })} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// =================== Tab 3: Self-Fill ===================

function SelfFillTab() {
  const [s, setS] = useState<SelfFill | null>(null);
  const [saving, setSaving] = useState(false);
  const url = `${window.location.origin}/enquire`;

  useEffect(() => {
    supabase.from("crm_institute_settings")
      .select("id, self_fill_form_title, self_fill_form_subtitle, self_fill_thank_you_message")
      .maybeSingle()
      .then(({ data }) => setS((data as SelfFill) ?? null));
  }, []);

  const save = async () => {
    if (!s) return;
    setSaving(true);
    const { id, ...patch } = s;
    const { error } = await supabase.from("crm_institute_settings").update(patch as never).eq("id", id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  if (!s) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="bg-card border rounded-2xl p-6 space-y-5 max-w-2xl">
      <div className="space-y-1.5">
        <Label>Public form URL</Label>
        <div className="flex gap-2">
          <Input value={url} readOnly />
          <Button variant="outline" onClick={() => { navigator.clipboard.writeText(url); toast.success("Copied"); }}>
            <Copy className="w-4 h-4" />
          </Button>
          <Button variant="outline" asChild>
            <a href={url} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" /></a>
          </Button>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Form title</Label>
        <Input value={s.self_fill_form_title ?? ""} onChange={(e) => setS({ ...s, self_fill_form_title: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Subtitle / instructions</Label>
        <Textarea rows={3} value={s.self_fill_form_subtitle ?? ""} onChange={(e) => setS({ ...s, self_fill_form_subtitle: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Thank-you message</Label>
        <Textarea rows={4} value={s.self_fill_thank_you_message ?? ""} onChange={(e) => setS({ ...s, self_fill_thank_you_message: e.target.value })} />
      </div>
      <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
    </div>
  );
}

// =================== Tab 4: Templates ===================

function TemplatesTab() {
  const [tpls, setTpls] = useState<Tpl[]>([]);
  const [previewing, setPreviewing] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("crm_whatsapp_templates")
      .select("id, template_key, name, body, variables, is_active")
      .in("template_key", ENQUIRY_TEMPLATE_KEYS as unknown as string[]);
    const arr = ((data ?? []) as unknown as Tpl[])
      .sort((a, b) => ENQUIRY_TEMPLATE_KEYS.indexOf(a.template_key as never) - ENQUIRY_TEMPLATE_KEYS.indexOf(b.template_key as never));
    setTpls(arr);
  };
  useEffect(() => { load(); }, []);

  const setLocal = (id: string, p: Partial<Tpl>) => setTpls((t) => t.map((row) => row.id === id ? { ...row, ...p } : row));

  const save = async (t: Tpl) => {
    const vars = Array.from(new Set(Array.from(t.body.matchAll(/\{([a-zA-Z0-9_]+)\}/g)).map((m) => m[1])));
    const { error } = await supabase.from("crm_whatsapp_templates").update({
      body: t.body, is_active: t.is_active, variables: vars,
    } as never).eq("id", t.id);
    if (error) toast.error(error.message); else toast.success(`${t.name} saved`);
  };

  const sample = useMemo(() => ({
    name: "Riya Sharma", phone: "9876543210",
    course_name: "Diploma in AI Tools", course_fee: 24999, course_duration: "3 months",
    course_mode: "Offline", course_short_syllabus: "ChatGPT, Midjourney, Automation",
    course_long_syllabus: "Module 1 – ChatGPT essentials, Module 2 – Midjourney, Module 3 – Automation",
    brochure_url: "https://example.com/brochure.jpg",
    video_url: "https://youtu.be/sample", instagram_url: "https://instagram.com/atec",
    next_batch_date: "1 May 2026",
    institute_name: "ATEC Education", institute_phone: "+91-98765-43210",
    institute_website: "https://ateceducation.in",
  }), []);

  return (
    <div className="space-y-4">
      {tpls.length === 0 && <p className="text-muted-foreground">No enquiry templates seeded yet.</p>}
      {tpls.map((t) => {
        const vars = Array.from(new Set(Array.from(t.body.matchAll(/\{([a-zA-Z0-9_]+)\}/g)).map((m) => m[1])));
        const rendered = fillTemplate(t.body, sample as Record<string, string | number>);
        return (
          <div key={t.id} className="bg-card border rounded-2xl p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold">{t.name}</h3>
                <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{t.template_key}</code>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={t.is_active} onCheckedChange={(v) => setLocal(t.id, { is_active: v })} />
                <span className="text-xs">{t.is_active ? "Active" : "Inactive"}</span>
              </div>
            </div>
            <Textarea rows={8} className="font-mono text-xs" value={t.body}
              onChange={(e) => setLocal(t.id, { body: e.target.value })} />
            {vars.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {vars.map((v) => (
                  <span key={v} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">
                    {`{${v}}`}
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => save(t)}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => setPreviewing(t.id)}>Preview</Button>
            </div>
            {previewing === t.id && (
              <div className="border rounded-lg p-3 bg-muted/40 mt-2">
                <p className="text-xs text-muted-foreground mb-2">Sample render:</p>
                <pre className="text-xs whitespace-pre-wrap">{rendered}</pre>
                <a className="text-xs text-primary underline mt-2 inline-block"
                   href={buildWaLink("919999999999", rendered)} target="_blank" rel="noreferrer">
                  Open in WhatsApp (test)
                </a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
