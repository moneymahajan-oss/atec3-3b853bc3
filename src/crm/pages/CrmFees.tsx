import { useEffect, useMemo, useState } from "react";
import { Search, Receipt, AlertCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "../components/PageHeader";
import { toast } from "sonner";

type Row = {
  id: string;
  full_name: string;
  enrolment_no: string | null;
  phone: string;
  course_name_snapshot: string | null;
  total_fee: number;
  total_paid: number;
  next_due_date: string | null;
  next_due_amount: number;
  overdue_count: number;
};

export default function CrmFees() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: students, error }, { data: payments }, { data: plans }] = await Promise.all([
        supabase.from("crm_students").select("id,full_name,enrolment_no,phone,course_name_snapshot,total_fee").order("created_at", { ascending: false }),
        supabase.from("crm_payments").select("student_id,amount,is_void"),
        supabase.from("crm_fee_plans").select("student_id,due_date,amount,amount_paid,status,is_void"),
      ]);
      if (error) toast.error(error.message);
      const paidByStudent: Record<string, number> = {};
      (payments ?? []).forEach((p) => {
        paidByStudent[p.student_id] = (paidByStudent[p.student_id] || 0) + (p.amount ?? 0);
      });
      const today = new Date().toISOString().slice(0, 10);
      const plansBy: Record<string, { next?: { date: string; amount: number }; overdue: number }> = {};
      (plans ?? []).forEach((p) => {
        if (!p.student_id) return;
        const bucket = plansBy[p.student_id] ||= { overdue: 0 };
        const remaining = (p.amount ?? 0) - (p.amount_paid ?? 0);
        if (remaining <= 0) return;
        if (p.due_date && p.due_date < today) bucket.overdue++;
        if (p.due_date && (!bucket.next || p.due_date < bucket.next.date)) {
          bucket.next = { date: p.due_date, amount: remaining };
        }
      });
      const built: Row[] = (students ?? []).map((s) => ({
        id: s.id,
        full_name: s.full_name,
        enrolment_no: s.enrolment_no,
        phone: s.phone,
        course_name_snapshot: s.course_name_snapshot,
        total_fee: s.total_fee ?? 0,
        total_paid: paidByStudent[s.id] || 0,
        next_due_date: plansBy[s.id]?.next?.date ?? null,
        next_due_amount: plansBy[s.id]?.next?.amount ?? 0,
        overdue_count: plansBy[s.id]?.overdue ?? 0,
      }));
      setRows(built);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => rows.filter((r) => {
    if (!q) return true;
    const t = q.toLowerCase();
    return r.full_name.toLowerCase().includes(t) || r.phone.includes(t)
      || (r.enrolment_no ?? "").toLowerCase().includes(t)
      || (r.course_name_snapshot ?? "").toLowerCase().includes(t);
  }), [rows, q]);

  const totals = useMemo(() => {
    const totalFee = rows.reduce((a, r) => a + r.total_fee, 0);
    const collected = rows.reduce((a, r) => a + r.total_paid, 0);
    const overdueStudents = rows.filter((r) => r.overdue_count > 0).length;
    return { totalFee, collected, outstanding: totalFee - collected, overdueStudents };
  }, [rows]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fees"
        description="Track every student's fee plan, payments, and outstanding dues."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total billed" value={`₹${totals.totalFee.toLocaleString("en-IN")}`} />
        <Stat label="Collected" value={`₹${totals.collected.toLocaleString("en-IN")}`} accent="success" />
        <Stat label="Outstanding" value={`₹${totals.outstanding.toLocaleString("en-IN")}`} accent="warning" />
        <Stat label="Students overdue" value={String(totals.overdueStudents)} accent="danger" />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search student, phone, enrolment no, course…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Course</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Due</TableHead>
              <TableHead>Next due</TableHead>
              <TableHead className="text-right">Manage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No students found.</TableCell></TableRow>
            ) : filtered.map((r) => {
              const due = r.total_fee - r.total_paid;
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.full_name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{r.enrolment_no || r.phone}</div>
                  </TableCell>
                  <TableCell className="text-sm">{r.course_name_snapshot || "—"}</TableCell>
                  <TableCell className="text-right font-mono">₹{r.total_fee.toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-right font-mono text-emerald-700 dark:text-emerald-400">₹{r.total_paid.toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={due > 0 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}>
                      ₹{due.toLocaleString("en-IN")}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.next_due_date ? (
                      <div className="flex items-center gap-2">
                        <span>{r.next_due_date}</span>
                        {r.overdue_count > 0 && (
                          <Badge variant="secondary" className="bg-rose-500/15 text-rose-700 dark:text-rose-300 text-[10px]">
                            <AlertCircle className="w-3 h-3 mr-1" />{r.overdue_count} overdue
                          </Badge>
                        )}
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to={`/crm/fees/${r.id}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                      <Receipt className="w-3.5 h-3.5" /> Open <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "success" | "warning" | "danger" }) {
  const cls = accent === "success" ? "text-emerald-700 dark:text-emerald-400"
    : accent === "warning" ? "text-amber-700 dark:text-amber-400"
    : accent === "danger" ? "text-rose-700 dark:text-rose-400"
    : "text-foreground";
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`text-2xl font-bold mt-1 ${cls}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
