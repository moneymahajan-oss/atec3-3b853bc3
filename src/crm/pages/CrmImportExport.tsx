import { useState } from "react";
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Eye } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { PageHeader } from "../components/PageHeader";
import { useCrmAuth } from "../hooks/useCrmAuth";
import { logAudit } from "../lib/audit";
import { toast } from "sonner";

type EntityKey = "enquiries" | "students" | "payments" | "expenses";

type FieldDef = {
  key: string;
  required?: boolean;
  type?: "number" | "date" | "phone";
  enumValues?: string[];
};

const ENTITIES: Record<EntityKey, {
  label: string;
  table: string;
  exportSelect: string;
  templateRow: Record<string, string | number>;
  fields: FieldDef[];
  adminOnly?: boolean;
}> = {
  enquiries: {
    label: "Enquiries",
    table: "crm_enquiries",
    exportSelect: "name,phone,alt_phone,email,course_name_snapshot,source,status,priority,follow_up_date,notes,assigned_to_name,created_at",
    templateRow: { name: "Aman Kumar", phone: "9876543210", alt_phone: "", email: "aman@x.com", course_name_snapshot: "Tally", source: "walk_in", status: "new", priority: "medium", follow_up_date: "2025-08-15", notes: "" },
    fields: [
      { key: "name", required: true },
      { key: "phone", required: true, type: "phone" },
      { key: "alt_phone", type: "phone" },
      { key: "email" },
      { key: "course_name_snapshot" },
      { key: "source", enumValues: ["walk_in","phone","whatsapp","website","instagram","facebook","referral","other"] },
      { key: "status", enumValues: ["new","contacted","follow_up","converted","lost","junk"] },
      { key: "priority", enumValues: ["low","medium","high"] },
      { key: "follow_up_date", type: "date" },
      { key: "notes" },
    ],
  },
  students: {
    label: "Students",
    table: "crm_students",
    exportSelect: "enrolment_no,full_name,phone,alt_phone,email,dob,gender,address,course_name_snapshot,enrolment_date,status,total_fee,registration_fee_paid",
    templateRow: { full_name: "Priya Sharma", phone: "9876543210", alt_phone: "", email: "", dob: "2002-04-12", gender: "female", address: "", course_name_snapshot: "Tally", enrolment_date: "2025-07-01", status: "active", total_fee: 12000, registration_fee_paid: 1000 },
    fields: [
      { key: "full_name", required: true },
      { key: "phone", required: true, type: "phone" },
      { key: "alt_phone", type: "phone" },
      { key: "email" },
      { key: "dob", type: "date" },
      { key: "gender", enumValues: ["male","female","other"] },
      { key: "address" },
      { key: "course_name_snapshot" },
      { key: "enrolment_date", type: "date" },
      { key: "status", enumValues: ["active","completed","on_hold","dropped"] },
      { key: "total_fee", type: "number" },
      { key: "registration_fee_paid", type: "number" },
    ],
  },
  payments: {
    label: "Payments",
    table: "crm_payments",
    exportSelect: "receipt_no,paid_on,amount,mode,reference,student_id,collected_by_name",
    templateRow: { paid_on: "2025-07-15", amount: 5000, mode: "upi", reference: "UPI/123", student_phone: "9876543210", notes: "" },
    fields: [
      { key: "paid_on", required: true, type: "date" },
      { key: "amount", required: true, type: "number" },
      { key: "mode", enumValues: ["cash","upi","bank_transfer","card","cheque","other"] },
      { key: "reference" },
      { key: "student_phone", required: true, type: "phone" },
      { key: "notes" },
    ],
  },
  expenses: {
    label: "Expenses",
    table: "crm_expenses",
    exportSelect: "spent_on,category_name_snapshot,vendor,description,amount,mode,reference,recorded_by_name",
    templateRow: { spent_on: "2025-07-10", category_name_snapshot: "Rent", vendor: "Landlord", description: "July rent", amount: 25000, mode: "bank_transfer", reference: "NEFT/123", notes: "" },
    fields: [
      { key: "spent_on", required: true, type: "date" },
      { key: "category_name_snapshot" },
      { key: "vendor" },
      { key: "description", required: true },
      { key: "amount", required: true, type: "number" },
      { key: "mode", enumValues: ["cash","upi","bank_transfer","card","cheque","other"] },
      { key: "reference" },
      { key: "notes" },
    ],
    adminOnly: true,
  },
};

interface RowError {
  row: number;
  field?: string;
  message: string;
}

interface ValidationResult {
  validRows: Record<string, unknown>[];
  errors: RowError[];
  totalRows: number;
}

interface CommitResult {
  ok: number;
  failed: number;
  errors: string[];
}

function normalisePhone(v: unknown): string {
  return String(v ?? "").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
}

function validateRow(
  cfg: { fields: FieldDef[] },
  raw: Record<string, unknown>,
  rowNum: number,
): { payload: Record<string, unknown> | null; errors: RowError[] } {
  const errors: RowError[] = [];
  const payload: Record<string, unknown> = {};

  for (const f of cfg.fields) {
    let v = raw[f.key];
    if (v === undefined || v === null || v === "") {
      if (f.required) errors.push({ row: rowNum, field: f.key, message: `Missing required "${f.key}"` });
      continue;
    }
    if (f.type === "number") {
      const n = Number(v);
      if (Number.isNaN(n)) { errors.push({ row: rowNum, field: f.key, message: `"${f.key}" must be a number (got "${v}")` }); continue; }
      v = n;
    }
    if (f.type === "date") {
      if (v instanceof Date) v = v.toISOString().slice(0, 10);
      else {
        const s = String(v).slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) { errors.push({ row: rowNum, field: f.key, message: `"${f.key}" must be YYYY-MM-DD (got "${v}")` }); continue; }
        v = s;
      }
    }
    if (f.type === "phone") {
      const p = normalisePhone(v);
      if (p.length !== 10) { errors.push({ row: rowNum, field: f.key, message: `"${f.key}" must be 10 digits (got "${v}")` }); continue; }
      v = p;
    }
    if (f.enumValues && !f.enumValues.includes(String(v))) {
      errors.push({ row: rowNum, field: f.key, message: `"${f.key}"="${v}" must be one of ${f.enumValues.join(" | ")}` });
      continue;
    }
    payload[f.key] = v;
  }

  return { payload: errors.length ? null : payload, errors };
}

export default function CrmImportExport() {
  const { isAdmin, user } = useCrmAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState<EntityKey | null>(null);
  const [preview, setPreview] = useState<ValidationResult | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [committing, setCommitting] = useState(false);
  const [lastResult, setLastResult] = useState<{ entity: string; data: CommitResult } | null>(null);

  const downloadTemplate = (key: EntityKey) => {
    const cfg = ENTITIES[key];
    const ws = XLSX.utils.json_to_sheet([cfg.templateRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, cfg.label);
    XLSX.writeFile(wb, `template-${key}.xlsx`);
  };

  const exportData = async (key: EntityKey) => {
    setBusy(`export-${key}`);
    const cfg = ENTITIES[key];
    const { data, error } = await supabase.from(cfg.table as never).select(cfg.exportSelect).limit(10000);
    if (error) { toast.error(error.message); setBusy(null); return; }
    const rows = (data ?? []) as Record<string, unknown>[];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, cfg.label);
    XLSX.writeFile(wb, `${key}-${new Date().toISOString().slice(0,10)}.xlsx`);
    setBusy(null);
    toast.success(`Exported ${rows.length} ${cfg.label}`);
  };

  const onFilePicked = async (key: EntityKey, file: File) => {
    const cfg = ENTITIES[key];
    if (cfg.adminOnly && !isAdmin) { toast.error("Admins only"); return; }
    setBusy(`validate-${key}`);
    setLastResult(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });

      const errors: RowError[] = [];
      const validRows: Record<string, unknown>[] = [];

      for (let i = 0; i < rows.length; i++) {
        const { payload, errors: rowErrs } = validateRow(cfg, rows[i], i + 2);
        if (rowErrs.length) errors.push(...rowErrs);
        if (payload) {
          // keep original row index for student-phone lookup later
          (payload as Record<string, unknown>).__src = rows[i];
          validRows.push(payload);
        }
      }

      setPreviewKey(key);
      setPendingFile(file);
      setPreview({ validRows, errors, totalRows: rows.length });
    } catch (err) {
      toast.error(`Failed to read file: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const commitImport = async () => {
    if (!previewKey || !preview) return;
    const cfg = ENTITIES[previewKey];
    setCommitting(true);
    let ok = 0, failed = 0;
    const errors: string[] = [];

    let studentByPhone: Record<string, string> = {};
    if (previewKey === "payments") {
      const { data: ss } = await supabase.from("crm_students").select("id,phone");
      (ss ?? []).forEach((s) => {
        const phone = normalisePhone((s as { phone: string }).phone);
        if (phone) studentByPhone[phone] = (s as { id: string }).id;
      });
    }

    for (let i = 0; i < preview.validRows.length; i++) {
      const payload = { ...preview.validRows[i] };
      const src = (payload.__src ?? {}) as Record<string, unknown>;
      delete payload.__src;

      if (previewKey === "payments") {
        const phone = normalisePhone(src.student_phone);
        const sid = studentByPhone[phone];
        if (!sid) { failed++; errors.push(`Row ${i + 2}: no student found for phone ${phone}`); continue; }
        delete payload.student_phone;
        payload.student_id = sid;
        payload.collected_by = user?.id;
        payload.collected_by_name = user?.user_metadata?.full_name || user?.email || null;
      }
      if (previewKey === "expenses") {
        payload.recorded_by = user?.id;
        payload.recorded_by_name = user?.user_metadata?.full_name || user?.email || null;
      }
      if (previewKey === "enquiries") {
        payload.created_by = user?.id;
        payload.created_by_name = user?.user_metadata?.full_name || user?.email || null;
      }

      const { error } = await supabase.from(cfg.table as never).insert(payload as never);
      if (error) { failed++; errors.push(`Row ${i + 2}: ${error.message}`); }
      else ok++;
    }

    await logAudit(cfg.table, "import", undefined, { ok, failed });
    setLastResult({ entity: cfg.label, data: { ok, failed, errors: errors.slice(0, 50) } });
    if (ok > 0) toast.success(`${ok} ${cfg.label} imported`);
    if (failed > 0) toast.error(`${failed} rows failed during commit`);
    setCommitting(false);
    setPreviewKey(null);
    setPreview(null);
    setPendingFile(null);
  };

  const cancelPreview = () => {
    setPreviewKey(null);
    setPreview(null);
    setPendingFile(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import / Export"
        description="Bulk move data in and out using Excel (.xlsx) files. Imports are validated row-by-row before commit."
      />

      <div className="grid md:grid-cols-2 gap-6">
        {(Object.keys(ENTITIES) as EntityKey[]).map((key) => {
          const cfg = ENTITIES[key];
          if (cfg.adminOnly && !isAdmin) return null;
          return (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" /> {cfg.label}
                  {cfg.adminOnly && <Badge variant="outline" className="text-[10px]">Admin</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => downloadTemplate(key)}>
                    <Download className="w-4 h-4 mr-1" /> Template
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy === `export-${key}`} onClick={() => exportData(key)}>
                    <Download className="w-4 h-4 mr-1" /> Export all
                  </Button>
                  <label>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      hidden
                      disabled={busy?.startsWith("validate") || committing}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) { onFilePicked(key, f); e.target.value = ""; }
                      }}
                    />
                    <Button asChild size="sm" disabled={busy?.startsWith("validate") || committing}>
                      <span><Upload className="w-4 h-4 mr-1" /> {busy === `validate-${key}` ? "Validating…" : "Import"}</span>
                    </Button>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Required: {cfg.fields.filter((f) => f.required).map((f) => f.key).join(", ") || "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Phones must be 10 digits. Dates must be YYYY-MM-DD. Numbers must be plain digits (no commas/₹).
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {lastResult.data.failed === 0 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-500" />
              )}
              Last import: {lastResult.entity}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-3">
              <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">{lastResult.data.ok} succeeded</Badge>
              {lastResult.data.failed > 0 && <Badge variant="secondary" className="bg-rose-500/15 text-rose-700 dark:text-rose-300">{lastResult.data.failed} failed</Badge>}
            </div>
            {lastResult.data.errors.length > 0 && (
              <div className="text-sm bg-muted rounded p-3 space-y-1 max-h-64 overflow-y-auto">
                {lastResult.data.errors.map((e, i) => <div key={i} className="font-mono text-xs">{e}</div>)}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pre-commit preview dialog */}
      <Dialog open={!!preview} onOpenChange={(v) => { if (!v && !committing) cancelPreview(); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" /> Preview · {previewKey ? ENTITIES[previewKey].label : ""}
            </DialogTitle>
            <DialogDescription>
              {pendingFile?.name} — {preview?.totalRows ?? 0} rows scanned. Review errors before committing.
            </DialogDescription>
          </DialogHeader>

          {preview && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                  {preview.validRows.length} valid
                </Badge>
                {preview.errors.length > 0 && (
                  <Badge variant="secondary" className="bg-rose-500/15 text-rose-700 dark:text-rose-300">
                    {preview.errors.length} errors in {new Set(preview.errors.map((e) => e.row)).size} rows
                  </Badge>
                )}
              </div>

              {preview.errors.length > 0 ? (
                <div className="text-sm bg-muted rounded p-3 space-y-1 max-h-72 overflow-y-auto">
                  {preview.errors.slice(0, 100).map((e, i) => (
                    <div key={i} className="font-mono text-xs">
                      <span className="text-rose-600 dark:text-rose-400">Row {e.row}</span>
                      {e.field && <span className="text-muted-foreground"> · {e.field}</span>}
                      <span> — {e.message}</span>
                    </div>
                  ))}
                  {preview.errors.length > 100 && (
                    <div className="text-xs text-muted-foreground italic">…and {preview.errors.length - 100} more</div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> All rows passed validation.
                </div>
              )}

              {preview.errors.length > 0 && preview.validRows.length > 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Only the {preview.validRows.length} valid rows will be committed. Fix errors in the file and re-import to include the rest.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={cancelPreview} disabled={committing}>Cancel</Button>
            <Button
              onClick={commitImport}
              disabled={committing || !preview || preview.validRows.length === 0}
            >
              {committing ? "Committing…" : `Commit ${preview?.validRows.length ?? 0} rows`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
