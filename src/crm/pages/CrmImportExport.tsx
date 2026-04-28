import { useState } from "react";
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "../components/PageHeader";
import { useCrmAuth } from "../hooks/useCrmAuth";
import { logAudit } from "../lib/audit";
import { toast } from "sonner";

type EntityKey = "enquiries" | "students" | "payments" | "expenses";

const ENTITIES: Record<EntityKey, {
  label: string;
  table: string;
  exportSelect: string;
  templateRow: Record<string, string | number>;
  fields: { key: string; required?: boolean; type?: "number" | "date"; enumValues?: string[] }[];
  adminOnly?: boolean;
}> = {
  enquiries: {
    label: "Enquiries",
    table: "crm_enquiries",
    exportSelect: "name,phone,alt_phone,email,course_name_snapshot,source,status,priority,follow_up_date,notes,assigned_to_name,created_at",
    templateRow: { name: "Aman Kumar", phone: "9876543210", alt_phone: "", email: "aman@x.com", course_name_snapshot: "Tally", source: "walk_in", status: "new", priority: "medium", follow_up_date: "2025-08-15", notes: "" },
    fields: [
      { key: "name", required: true },
      { key: "phone", required: true },
      { key: "alt_phone" },
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
      { key: "phone", required: true },
      { key: "alt_phone" },
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
      { key: "student_phone", required: true },
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

type ImportResult = { ok: number; failed: number; errors: string[] };

export default function CrmImportExport() {
  const { isAdmin, user } = useCrmAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{ entity: string; data: ImportResult } | null>(null);

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

  const importData = async (key: EntityKey, file: File) => {
    const cfg = ENTITIES[key];
    if (cfg.adminOnly && !isAdmin) { toast.error("Admins only"); return; }
    setBusy(`import-${key}`);
    setResult(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });

      const errors: string[] = [];
      let ok = 0, failed = 0;

      // For payments, look up student_id by phone
      let studentByPhone: Record<string, string> = {};
      if (key === "payments") {
        const { data: ss } = await supabase.from("crm_students").select("id,phone");
        (ss ?? []).forEach((s) => { studentByPhone[(s as { id: string; phone: string }).phone] = (s as { id: string; phone: string }).id; });
      }

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const payload: Record<string, unknown> = {};
        let rowErr = "";
        for (const f of cfg.fields) {
          let v = r[f.key];
          if (v === undefined || v === null || v === "") {
            if (f.required) { rowErr = `Row ${i + 2}: missing ${f.key}`; break; }
            continue;
          }
          if (f.type === "number") v = Number(v);
          if (f.type === "date") {
            // xlsx may give Date objects
            if (v instanceof Date) v = v.toISOString().slice(0, 10);
            else v = String(v).slice(0, 10);
          }
          if (f.enumValues && !f.enumValues.includes(String(v))) {
            rowErr = `Row ${i + 2}: ${f.key}="${v}" must be one of ${f.enumValues.join("|")}`; break;
          }
          payload[f.key] = v;
        }
        if (rowErr) { failed++; errors.push(rowErr); continue; }

        // Entity-specific transforms
        if (key === "payments") {
          const phone = String(r.student_phone || "").trim();
          const sid = studentByPhone[phone];
          if (!sid) { failed++; errors.push(`Row ${i + 2}: no student with phone ${phone}`); continue; }
          delete payload.student_phone;
          payload.student_id = sid;
          payload.collected_by = user?.id;
          payload.collected_by_name = user?.user_metadata?.full_name || user?.email || null;
        }
        if (key === "expenses") {
          payload.recorded_by = user?.id;
          payload.recorded_by_name = user?.user_metadata?.full_name || user?.email || null;
        }
        if (key === "enquiries") {
          payload.created_by = user?.id;
          payload.created_by_name = user?.user_metadata?.full_name || user?.email || null;
        }

        const { error } = await supabase.from(cfg.table as never).insert(payload as never);
        if (error) { failed++; errors.push(`Row ${i + 2}: ${error.message}`); }
        else ok++;
      }

      setResult({ entity: cfg.label, data: { ok, failed, errors: errors.slice(0, 25) } });
      await logAudit(cfg.table, "import", undefined, { ok, failed });
      if (ok > 0) toast.success(`${ok} ${cfg.label} imported`);
      if (failed > 0) toast.error(`${failed} rows failed`);
    } catch (err) {
      toast.error(`Import failed: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import / Export"
        description="Bulk move data in and out using Excel (.xlsx) files."
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
                    <input type="file" accept=".xlsx,.xls,.csv" hidden disabled={busy?.startsWith("import")}
                      onChange={(e) => e.target.files?.[0] && importData(key, e.target.files[0])} />
                    <Button asChild size="sm" disabled={busy?.startsWith("import")}>
                      <span><Upload className="w-4 h-4 mr-1" /> {busy === `import-${key}` ? "Importing…" : "Import"}</span>
                    </Button>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Required: {cfg.fields.filter((f) => f.required).map((f) => f.key).join(", ") || "—"}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {result.data.failed === 0 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-500" />
              )}
              Last import: {result.entity}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-3">
              <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">{result.data.ok} succeeded</Badge>
              {result.data.failed > 0 && <Badge variant="secondary" className="bg-rose-500/15 text-rose-700 dark:text-rose-300">{result.data.failed} failed</Badge>}
            </div>
            {result.data.errors.length > 0 && (
              <div className="text-sm bg-muted rounded p-3 space-y-1 max-h-64 overflow-y-auto">
                {result.data.errors.map((e, i) => <div key={i} className="font-mono text-xs">{e}</div>)}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
