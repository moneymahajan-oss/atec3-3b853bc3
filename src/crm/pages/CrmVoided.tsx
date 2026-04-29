import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Ban, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "../components/PageHeader";
import { useCrmAuth } from "../hooks/useCrmAuth";

type Row = {
  id: string;
  amount: number;
  void_reason: string | null;
  voided_at: string | null;
  voided_by_name: string | null;
  label?: string | null;
  receipt_no?: string | null;
  description?: string | null;
  category_name_snapshot?: string | null;
  student_id?: string | null;
  student_name?: string | null;
  date: string;
};

export default function CrmVoided() {
  const { isAdmin } = useCrmAuth();
  const today = new Date();
  const firstOfYear = `${today.getFullYear()}-01-01`;
  const [from, setFrom] = useState(firstOfYear);
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [feePlans, setFeePlans] = useState<Row[]>([]);
  const [payments, setPayments] = useState<Row[]>([]);
  const [expenses, setExpenses] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: fp }, { data: py }, { data: ex }] = await Promise.all([
        supabase
          .from("crm_fee_plans")
          .select("id,amount,label,void_reason,voided_at,voided_by_name,student_id,crm_students(full_name)")
          .eq("is_void", true)
          .gte("voided_at", from + "T00:00:00")
          .lte("voided_at", to + "T23:59:59")
          .order("voided_at", { ascending: false }),
        supabase
          .from("crm_payments")
          .select("id,amount,receipt_no,void_reason,voided_at,voided_by_name,student_id,crm_students(full_name)")
          .eq("is_void", true)
          .gte("voided_at", from + "T00:00:00")
          .lte("voided_at", to + "T23:59:59")
          .order("voided_at", { ascending: false }),
        isAdmin
          ? supabase
              .from("crm_expenses")
              .select("id,amount,description,category_name_snapshot,void_reason,voided_at,voided_by_name")
              .eq("is_void", true)
              .gte("voided_at", from + "T00:00:00")
              .lte("voided_at", to + "T23:59:59")
              .order("voided_at", { ascending: false })
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const norm = (r: any, dateField = "voided_at"): Row => ({
        id: r.id,
        amount: r.amount,
        void_reason: r.void_reason,
        voided_at: r.voided_at,
        voided_by_name: r.voided_by_name,
        label: r.label ?? null,
        receipt_no: r.receipt_no ?? null,
        description: r.description ?? null,
        category_name_snapshot: r.category_name_snapshot ?? null,
        student_id: r.student_id ?? null,
        student_name: r.crm_students?.full_name ?? null,
        date: r[dateField] ?? "",
      });

      setFeePlans(((fp ?? []) as any[]).map((r) => norm(r)));
      setPayments(((py ?? []) as any[]).map((r) => norm(r)));
      setExpenses(((ex ?? []) as any[]).map((r) => norm(r)));
      setLoading(false);
    })();
  }, [from, to, isAdmin]);

  const totals = useMemo(() => ({
    feePlans: feePlans.reduce((a, r) => a + (r.amount || 0), 0),
    payments: payments.reduce((a, r) => a + (r.amount || 0), 0),
    expenses: expenses.reduce((a, r) => a + (r.amount || 0), 0),
  }), [feePlans, payments, expenses]);

  const exportAll = () => {
    const wb = XLSX.utils.book_new();
    const flatten = (rows: Row[], type: string) =>
      rows.map((r) => ({
        Type: type,
        Date: r.date?.slice(0, 10),
        Student: r.student_name ?? "",
        Detail: r.label ?? r.receipt_no ?? r.description ?? "",
        Category: r.category_name_snapshot ?? "",
        Amount: r.amount,
        Reason: r.void_reason ?? "",
        VoidedBy: r.voided_by_name ?? "",
      }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(flatten(feePlans, "Fee plan")), "Voided Fee Plans");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(flatten(payments, "Payment")), "Voided Payments");
    if (isAdmin) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(flatten(expenses, "Expense")), "Voided Expenses");
    XLSX.writeFile(wb, `atec-voided-${from}-to-${to}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Voided / Cancelled Entries"
        description="Audit log of cancelled fee plans, payments, and expenses with reasons."
        actions={
          <Button variant="outline" onClick={exportAll}>
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-5 grid sm:grid-cols-3 gap-4">
          <div><Label>Voided from</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="flex items-end text-sm text-muted-foreground">
            {loading ? "Loading…" : `${feePlans.length + payments.length + expenses.length} voided records`}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Voided fee plans" count={feePlans.length} amount={totals.feePlans} />
        <SummaryCard label="Voided payments" count={payments.length} amount={totals.payments} />
        {isAdmin && <SummaryCard label="Voided expenses" count={expenses.length} amount={totals.expenses} />}
      </div>

      <Tabs defaultValue="fees" className="w-full">
        <TabsList>
          <TabsTrigger value="fees">Fee plans ({feePlans.length})</TabsTrigger>
          <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
          {isAdmin && <TabsTrigger value="expenses">Expenses ({expenses.length})</TabsTrigger>}
        </TabsList>

        <TabsContent value="fees">
          <VoidTable rows={feePlans} cols={[
            { key: "label", label: "Installment" },
            { key: "student", label: "Student" },
          ]} />
        </TabsContent>
        <TabsContent value="payments">
          <VoidTable rows={payments} cols={[
            { key: "receipt_no", label: "Receipt #" },
            { key: "student", label: "Student" },
          ]} />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="expenses">
            <VoidTable rows={expenses} cols={[
              { key: "description", label: "Description" },
              { key: "category_name_snapshot", label: "Category" },
            ]} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function SummaryCard({ label, count, amount }: { label: string; count: number; amount: number }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <Ban className="w-4 h-4 text-rose-500" /> {label}
        </div>
        <div className="text-xl font-bold mt-1">{count}</div>
        <div className="text-sm text-muted-foreground font-mono">₹{amount.toLocaleString("en-IN")}</div>
      </CardContent>
    </Card>
  );
}

function VoidTable({
  rows,
  cols,
}: {
  rows: Row[];
  cols: { key: string; label: string }[];
}) {
  if (rows.length === 0) {
    return (
      <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">No voided records in this range.</CardContent></Card>
    );
  }
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Records</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Voided on</TableHead>
              {cols.map((c) => <TableHead key={c.key}>{c.label}</TableHead>)}
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Voided by</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs whitespace-nowrap">
                  {r.voided_at ? new Date(r.voided_at).toLocaleString("en-IN") : "—"}
                </TableCell>
                {cols.map((c) => (
                  <TableCell key={c.key} className="text-sm">
                    {c.key === "student" ? (
                      r.student_id ? (
                        <Link to={`/crm/fees/${r.student_id}`} className="text-primary hover:underline">
                          {r.student_name ?? "View"}
                        </Link>
                      ) : "—"
                    ) : ((r as any)[c.key] ?? "—")}
                  </TableCell>
                ))}
                <TableCell className="text-right font-mono line-through text-muted-foreground">
                  ₹{(r.amount || 0).toLocaleString("en-IN")}
                </TableCell>
                <TableCell className="text-sm max-w-xs">
                  <Badge variant="outline" className="border-rose-300 text-rose-700 dark:text-rose-300 whitespace-normal text-left">
                    {r.void_reason ?? "—"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">{r.voided_by_name ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
