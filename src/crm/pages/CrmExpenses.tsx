import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Filter, Pencil, Ban, Download, Upload as UploadIcon, Receipt as ReceiptIcon } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "../components/PageHeader";
import { VoidDialog } from "../components/VoidDialog";
import { useCrmAuth } from "../hooks/useCrmAuth";
import { logAudit } from "../lib/audit";
import { toast } from "sonner";

type Cat = { id: string; name: string; color: string };
type Expense = {
  id: string; spent_on: string; category_id: string | null; category_name_snapshot: string | null;
  vendor: string | null; description: string; amount: number; mode: string;
  reference: string | null; notes: string | null; receipt_url: string | null;
  recorded_by_name: string | null;
  is_void?: boolean; void_reason?: string | null; voided_by_name?: string | null;
};

const empty: Partial<Expense> = {
  spent_on: new Date().toISOString().slice(0, 10),
  category_id: null, vendor: "", description: "", amount: 0, mode: "cash", reference: "", notes: "",
};

export default function CrmExpenses() {
  const { user, isAdmin, hasAccess } = useCrmAuth();
  const [items, setItems] = useState<Expense[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Expense>>(empty);
  const [uploading, setUploading] = useState(false);
  const [voidTarget, setVoidTarget] = useState<Expense | null>(null);
  const [showVoided, setShowVoided] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: e, error }, { data: c }] = await Promise.all([
      supabase.from("crm_expenses").select("*").order("spent_on", { ascending: false }),
      supabase.from("crm_expense_categories").select("id,name,color").eq("is_active", true).order("display_order"),
    ]);
    if (error) { toast.error(error.message); throw new Error(error.message); }
    setItems((e ?? []) as Expense[]);
    setCats((c ?? []) as Cat[]);
    setLoading(false);
  };
  useEffect(() => { if (hasAccess) load(); }, [hasAccess]);

  const filtered = useMemo(() => items.filter((e) => {
    if (!showVoided && e.is_void) return false;
    if (catFilter !== "all" && e.category_id !== catFilter) return false;
    if (from && e.spent_on < from) return false;
    if (to && e.spent_on > to) return false;
    if (!q) return true;
    const t = q.toLowerCase();
    return e.description.toLowerCase().includes(t)
      || (e.vendor ?? "").toLowerCase().includes(t)
      || (e.reference ?? "").toLowerCase().includes(t);
  }), [items, q, catFilter, from, to, showVoided]);

  const totals = useMemo(() => {
    const live = filtered.filter((e) => !e.is_void);
    const total = live.reduce((a, e) => a + (e.amount || 0), 0);
    const byCat: Record<string, number> = {};
    live.forEach((e) => {
      const k = e.category_name_snapshot || "Uncategorised";
      byCat[k] = (byCat[k] || 0) + (e.amount || 0);
    });
    const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
    return { total, count: live.length, top };
  }, [filtered]);

  const set = <K extends keyof Expense>(k: K, v: Expense[K]) => setEditing((e) => ({ ...e, [k]: v }));

  const uploadReceipt = async (file: File) => {
    setUploading(true);
    const path = `expenses/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const { error } = await supabase.storage.from("crm-receipts").upload(path, file);
    if (error) { toast.error(error.message); setUploading(false); return; }
    set("receipt_url", path);
    setUploading(false);
    toast.success("Receipt uploaded");
  };

  const save = async () => {
    if (!editing.description || !editing.amount) { toast.error("Description and amount required"); return; }
    const cat = cats.find((c) => c.id === editing.category_id);
    const payload = {
      spent_on: editing.spent_on || new Date().toISOString().slice(0, 10),
      category_id: editing.category_id || null,
      category_name_snapshot: cat?.name ?? editing.category_name_snapshot ?? null,
      vendor: editing.vendor || null,
      description: editing.description!.trim(),
      amount: Number(editing.amount),
      mode: (editing.mode || "cash") as never,
      reference: editing.reference || null,
      notes: editing.notes || null,
      receipt_url: editing.receipt_url || null,
    };
    if (editing.id) {
      const { error } = await supabase.from("crm_expenses").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      await logAudit("crm_expenses", "update", editing.id, payload);
    } else {
      const { data, error } = await supabase.from("crm_expenses").insert({
        ...payload,
        recorded_by: user?.id,
        recorded_by_name: user?.user_metadata?.full_name || user?.email || null,
      }).select("id").maybeSingle();
      if (error) { toast.error(error.message); return; }
      await logAudit("crm_expenses", "create", data?.id, payload);
    }
    toast.success("Saved");
    setOpen(false); setEditing(empty); load();
  };

  const confirmVoid = async (reason: string) => {
    if (!voidTarget) return;
    const patch = {
      is_void: true,
      void_reason: reason,
      voided_at: new Date().toISOString(),
      voided_by: user?.id ?? null,
      voided_by_name: user?.user_metadata?.full_name || user?.email || null,
    };
    const { error } = await supabase.from("crm_expenses").update(patch).eq("id", voidTarget.id);
    if (error) { toast.error(error.message); return; }
    await logAudit("crm_expenses", "void", voidTarget.id, { reason });
    toast.success("Expense voided");
    setVoidTarget(null);
    load();
  };

  const exportXlsx = () => {
    const rows = filtered.filter((e) => !e.is_void).map((e) => ({
      Date: e.spent_on,
      Category: e.category_name_snapshot,
      Vendor: e.vendor,
      Description: e.description,
      Amount: e.amount,
      Mode: e.mode,
      Reference: e.reference,
      "Recorded By": e.recorded_by_name,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");
    XLSX.writeFile(wb, `expenses-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Only administrators can access expenses.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Institute expense ledger. Admin-only."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportXlsx}><Download className="w-4 h-4 mr-2" /> Export</Button>
            <Button onClick={() => { setEditing(empty); setOpen(true); }}><Plus className="w-4 h-4 mr-2" /> New Expense</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Stat label="Total spent (filtered)" value={`₹${totals.total.toLocaleString("en-IN")}`} />
        <Stat label="Entries" value={String(totals.count)} />
        <Stat label="Top category" value={totals.top ? `${totals.top[0]} · ₹${totals.top[1].toLocaleString("en-IN")}` : "—"} />
      </div>

      <div className="grid sm:grid-cols-4 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search description, vendor, reference…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-2">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="From" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} placeholder="To" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
        <input type="checkbox" checked={showVoided} onChange={(e) => setShowVoided(e.target.checked)} />
        Show voided entries
      </label>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No expenses match the filters.</TableCell></TableRow>
            ) : filtered.map((e) => {
              const cat = cats.find((c) => c.id === e.category_id);
              return (
                <TableRow key={e.id} className={e.is_void ? "opacity-50 line-through" : ""}>
                  <TableCell className="text-sm">{e.spent_on}</TableCell>
                  <TableCell>
                    <div className="font-medium flex items-center gap-2">
                      {e.description}
                      {e.is_void && (
                        <Badge variant="secondary" className="bg-rose-500/15 text-rose-700 dark:text-rose-300" title={`Voided by ${e.voided_by_name ?? "—"}: ${e.void_reason ?? ""}`}>
                          VOID
                        </Badge>
                      )}
                    </div>
                    {e.reference && <div className="text-xs text-muted-foreground">Ref: {e.reference}</div>}
                  </TableCell>
                  <TableCell>
                    {e.category_name_snapshot ? (
                      <Badge variant="outline" style={{ borderColor: cat?.color, color: cat?.color }}>
                        {e.category_name_snapshot}
                      </Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-sm">{e.vendor || "—"}</TableCell>
                  <TableCell className="uppercase text-xs">{e.mode.replace("_", " ")}</TableCell>
                  <TableCell className="text-right font-mono">₹{e.amount.toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      {e.receipt_url && (
                        <Button size="icon" variant="ghost" title="View receipt" onClick={async () => {
                          const { data } = await supabase.storage.from("crm-receipts").createSignedUrl(e.receipt_url!, 60);
                          if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                        }}>
                          <ReceiptIcon className="w-4 h-4" />
                        </Button>
                      )}
                      {!e.is_void && (
                        <>
                          <Button size="icon" variant="ghost" title="Edit" onClick={() => { setEditing(e); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" title="Void" onClick={() => setVoidTarget(e)}><Ban className="w-4 h-4 text-destructive" /></Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing.id ? "Edit Expense" : "New Expense"}</DialogTitle></DialogHeader>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Date</Label><Input type="date" value={editing.spent_on ?? ""} onChange={(e) => set("spent_on", e.target.value)} /></div>
            <div><Label>Amount (₹) *</Label><Input type="number" value={editing.amount ?? 0} onChange={(e) => set("amount", Number(e.target.value))} /></div>
            <div className="sm:col-span-2"><Label>Description *</Label><Input value={editing.description ?? ""} onChange={(e) => set("description", e.target.value)} /></div>
            <div>
              <Label>Category</Label>
              <Select value={editing.category_id ?? "none"} onValueChange={(v) => set("category_id", v === "none" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Uncategorised —</SelectItem>
                  {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Vendor</Label><Input value={editing.vendor ?? ""} onChange={(e) => set("vendor", e.target.value)} /></div>
            <div>
              <Label>Mode</Label>
              <Select value={editing.mode ?? "cash"} onValueChange={(v) => set("mode", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["cash","upi","bank_transfer","card","cheque","other"].map((s) => <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Reference</Label><Input value={editing.reference ?? ""} onChange={(e) => set("reference", e.target.value)} /></div>
            <div className="sm:col-span-2"><Label>Notes</Label><Textarea rows={2} value={editing.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></div>
            <div className="sm:col-span-2">
              <Label>Receipt (private)</Label>
              <Input type="file" accept="image/*,application/pdf" disabled={uploading}
                onChange={(e) => e.target.files?.[0] && uploadReceipt(e.target.files[0])} />
              {editing.receipt_url && <p className="text-xs text-muted-foreground mt-1">📎 {editing.receipt_url.split("/").pop()}</p>}
              {uploading && <p className="text-xs text-muted-foreground mt-1"><UploadIcon className="inline w-3 h-3 animate-pulse mr-1" />Uploading…</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VoidDialog
        open={!!voidTarget}
        onOpenChange={(v) => { if (!v) setVoidTarget(null); }}
        title={voidTarget ? `Void expense "${voidTarget.description}"` : "Void expense"}
        description="This expense will be excluded from totals and reports, but kept for audit history."
        onConfirm={confirmVoid}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card><CardContent className="pt-5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </CardContent></Card>
  );
}
