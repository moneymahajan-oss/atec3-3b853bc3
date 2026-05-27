mport { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Receipt, Ban, Printer, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { StudentWhatsAppButton } from "../components/StudentWhatsAppButton";
import { useCrmAuth } from "../hooks/useCrmAuth";
import { logAudit } from "../lib/audit";
import { getStudentEnrolments, type Enrolment } from "../lib/enrolments";
import { toast } from "sonner";

type Student = {
  id: string; full_name: string; enrolment_no: string | null; phone: string;
  course_name_snapshot: string | null; total_fee: number;
};
type Plan = {
  id: string; installment_no: number; label: string | null;
  due_date: string | null; amount: number; amount_paid: number; status: string;
  enrolment_id?: string | null;
  is_void?: boolean; void_reason?: string | null; voided_by_name?: string | null; voided_at?: string | null;
};
type Payment = {
  id: string; receipt_no: string | null; amount: number; mode: string;
  paid_on: string; reference: string | null; fee_plan_id: string | null;
  enrolment_id?: string | null;
  collected_by_name: string | null;
  is_void?: boolean; void_reason?: string | null; voided_by_name?: string | null; voided_at?: string | null;
};

const feeStatusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  partial: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  paid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  overdue: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  waived: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
};

// Compute plan status from actual amount_paid — never trust the stored status for display
function computePlanStatus(plan: Plan): string {
  if (plan.is_void) return "void";
  if (plan.amount_paid >= plan.amount) return "paid";
  if (plan.amount_paid > 0) return "partial";
  if (plan.due_date && new Date(plan.due_date) < new Date()) return "overdue";
  return "pending";
}

export default function CrmStudentFees() {
  const { studentId } = useParams();
  const { user, isAdmin } = useCrmAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [enrolments, setEnrolments] = useState<Enrolment[]>([]);
  const [enrolmentFilter, setEnrolmentFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [planOpen, setPlanOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<Plan>>({ installment_no: 1, amount: 0 });
  const [payOpen, setPayOpen] = useState(false);
  const [pay, setPay] = useState({ amount: 0, mode: "cash", reference: "", paid_on: new Date().toISOString().slice(0,10), notes: "", fee_plan_id: "" as string, enrolment_id: "" as string });
  const [voidPlan, setVoidPlan] = useState<Plan | null>(null);
  const [voidPay, setVoidPay] = useState<Payment | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: s }, { data: p }, { data: pay }, enr] = await Promise.all([
      supabase.from("crm_students").select("id,full_name,enrolment_no,phone,course_name_snapshot,total_fee,registration_fee_paid").eq("id", studentId!).maybeSingle(),
      supabase.from("crm_fee_plans").select("*").eq("student_id", studentId!).order("installment_no"),
      supabase.from("crm_payments").select("*").eq("student_id", studentId!).order("paid_on", { ascending: false }),
      getStudentEnrolments(studentId!),
    ]);
    setStudent(s as Student);
    setPlans((p ?? []) as Plan[]);
    setPayments((pay ?? []) as Payment[]);
    setEnrolments(enr);
    setLoading(false);
  };
  useEffect(() => { load(); }, [studentId]);

  const regPaid = (student as unknown as { registration_fee_paid?: number } | null)?.registration_fee_paid ?? 0;
  const paymentsPaid = payments.filter((p) => !p.is_void).reduce((a, p) => a + (p.amount || 0), 0);

  const enrolmentsBilled = enrolments.reduce((a, e) => a + (e.net_payable_fee ?? e.total_fee ?? 0), 0);
  const enrolmentsRegPaid = enrolments.reduce((a, e) => a + (e.registration_fee_paid ?? 0), 0);

  const totalBilled = enrolments.length > 0 ? enrolmentsBilled : (student?.total_fee ?? 0);
  const totalPaid = enrolments.length > 0
    ? paymentsPaid + enrolmentsRegPaid
    : paymentsPaid + regPaid;
  const due = totalBilled - totalPaid;

  // Per-course breakdown — full list
  const courseBreakdown = useMemo(() => {
    return enrolments.map((e) => {
      const fee = e.total_fee ?? 0;
      const discount = e.discount_amount ?? 0;
      const netFee = e.net_payable_fee ?? Math.max(0, fee - discount);
      const coursePayments = payments
        .filter((p) => !p.is_void && p.enrolment_id === e.id)
        .sort((a, b) => (a.paid_on < b.paid_on ? 1 : -1));
      const paidForCourse =
        coursePayments.reduce((a, p) => a + (p.amount || 0), 0) +
        (e.registration_fee_paid ?? 0);
      return {
        id: e.id,
        course: e.course_name_snapshot || "—",
        fee,
        discount,
        netFee,
        paid: paidForCourse,
        balance: Math.max(0, netFee - paidForCourse),
        payments: coursePayments,
        regPaid: e.registration_fee_paid ?? 0,
      };
    });
  }, [enrolments, payments]);

  // FIX 1: Apply course filter to the breakdown table
  const filteredCourseBreakdown = useMemo(
    () => enrolmentFilter === "all" ? courseBreakdown : courseBreakdown.filter((r) => r.id === enrolmentFilter),
    [courseBreakdown, enrolmentFilter]
  );

  // Totals only over filtered rows
  const totals = useMemo(() => {
    return filteredCourseBreakdown.reduce(
      (acc, r) => ({
        fee: acc.fee + r.fee,
        discount: acc.discount + r.discount,
        netFee: acc.netFee + r.netFee,
        paid: acc.paid + r.paid,
        balance: acc.balance + r.balance,
      }),
      { fee: 0, discount: 0, netFee: 0, paid: 0, balance: 0 },
    );
  }, [filteredCourseBreakdown]);

  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});
  const toggleCourse = (id: string) =>
    setExpandedCourses((prev) => ({ ...prev, [id]: !prev[id] }));

  const fmt = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

  const activeEnrolments = useMemo(() => enrolments.filter((e) => e.status === "active"), [enrolments]);
  const defaultEnrolmentId = activeEnrolments.length === 1 ? activeEnrolments[0].id : "";

  const savePlan = async () => {
    if (!editingPlan.amount || editingPlan.amount <= 0) { toast.error("Amount required"); return; }
    const enrolmentId = editingPlan.enrolment_id ?? (editingPlan.id ? null : defaultEnrolmentId || null);
    if (!editingPlan.id && enrolments.length > 1 && !enrolmentId) {
      toast.error("Please choose which course this installment is for");
      return;
    }
    // FEE CAP: sum of existing non-void plans for this enrolment must not exceed net payable fee
    const newAmount = Number(editingPlan.amount);
    if (enrolmentId) {
      const enrol = enrolments.find((e) => e.id === enrolmentId);
      const netPayable = enrol ? (enrol.net_payable_fee ?? Math.max(0, (enrol.total_fee ?? 0) - (enrol.discount_amount ?? 0))) : 0;
      const existingTotal = plans
        .filter((pl) => !pl.is_void && pl.enrolment_id === enrolmentId && pl.id !== editingPlan.id)
        .reduce((a, pl) => a + pl.amount, 0);
      if (netPayable > 0 && existingTotal + newAmount > netPayable) {
        const remaining = netPayable - existingTotal;
        toast.error(
          `Installment exceeds course fee cap. Already planned: ₹${existingTotal.toLocaleString("en-IN")} of ₹${netPayable.toLocaleString("en-IN")}. Max you can add: ₹${Math.max(0, remaining).toLocaleString("en-IN")}`
        );
        return;
      }
    } else if (enrolments.length === 0) {
      // Single-course fallback using student total_fee
      const cap = student?.total_fee ?? 0;
      const existingTotal = plans.filter((pl) => !pl.is_void && pl.id !== editingPlan.id).reduce((a, pl) => a + pl.amount, 0);
      if (cap > 0 && existingTotal + newAmount > cap) {
        const remaining = cap - existingTotal;
        toast.error(
          `Installment exceeds fee cap of ₹${cap.toLocaleString("en-IN")}. Already planned: ₹${existingTotal.toLocaleString("en-IN")}. Max you can add: ₹${Math.max(0, remaining).toLocaleString("en-IN")}`
        );
        return;
      }
    }

    const payload = {
      student_id: studentId!,
      installment_no: Number(editingPlan.installment_no || 1),
      label: editingPlan.label || null,
      due_date: editingPlan.due_date || null,
      amount: newAmount,
      // status is always "pending" on create/edit — computed from payments for display
      status: "pending" as never,
      enrolment_id: enrolmentId || null,
    };
    if (editingPlan.id) {
      const { error } = await supabase.from("crm_fee_plans").update(payload).eq("id", editingPlan.id);
      if (error) { toast.error(error.message); return; }
      await logAudit("crm_fee_plans", "update", editingPlan.id, payload);
    } else {
      const { data, error } = await supabase.from("crm_fee_plans").insert(payload).select("id").maybeSingle();
      if (error) { toast.error(error.message); return; }
      await logAudit("crm_fee_plans", "create", data?.id, payload);
    }
    toast.success("Saved");
    setPlanOpen(false);
    setEditingPlan({ installment_no: plans.length + 2, amount: 0 });
    load();
  };

  const confirmVoidPlan = async (reason: string) => {
    if (!voidPlan) return;
    const patch = {
      is_void: true, void_reason: reason, voided_at: new Date().toISOString(),
      voided_by: user?.id ?? null,
      voided_by_name: user?.user_metadata?.full_name || user?.email || null,
    };
    const { error } = await supabase.from("crm_fee_plans").update(patch).eq("id", voidPlan.id);
    if (error) { toast.error(error.message); return; }
    await logAudit("crm_fee_plans", "void", voidPlan.id, { reason });
    toast.success("Installment voided");
    setVoidPlan(null);
    load();
  };

  const savePayment = async () => {
    if (!pay.amount || pay.amount <= 0) { toast.error("Amount required"); return; }
    let enrolmentId = pay.enrolment_id || "";
    if (!enrolmentId && pay.fee_plan_id) {
      const linkedPlan = plans.find((pl) => pl.id === pay.fee_plan_id);
      if (linkedPlan?.enrolment_id) enrolmentId = linkedPlan.enrolment_id;
    }
    if (!enrolmentId) enrolmentId = defaultEnrolmentId;
    if (enrolments.length > 1 && !enrolmentId) {
      toast.error("Please choose which course this payment is for");
      return;
    }
    const payload = {
      student_id: studentId!,
      fee_plan_id: pay.fee_plan_id || null,
      amount: Number(pay.amount),
      mode: pay.mode as never,
      reference: pay.reference || null,
      paid_on: pay.paid_on,
      notes: pay.notes || null,
      collected_by: user?.id,
      collected_by_name: user?.user_metadata?.full_name || user?.email || null,
      enrolment_id: enrolmentId || null,
    };
    const { data, error } = await supabase.from("crm_payments").insert(payload).select("id,receipt_no").maybeSingle();
    if (error) { toast.error(error.message); return; }
    await logAudit("crm_payments", "create", data?.id, payload);
    toast.success(`Receipt ${data?.receipt_no} recorded`);
    setPayOpen(false);
    setPay({ amount: 0, mode: "cash", reference: "", paid_on: new Date().toISOString().slice(0,10), notes: "", fee_plan_id: "", enrolment_id: "" });
    load();
  };

  const confirmVoidPayment = async (reason: string) => {
    if (!voidPay) return;
    const patch = {
      is_void: true, void_reason: reason, voided_at: new Date().toISOString(),
      voided_by: user?.id ?? null,
      voided_by_name: user?.user_metadata?.full_name || user?.email || null,
    };
    const { error } = await supabase.from("crm_payments").update(patch).eq("id", voidPay.id);
    if (error) { toast.error(error.message); return; }
    await logAudit("crm_payments", "void", voidPay.id, { reason });
    toast.success("Receipt voided. Fee balance recalculated.");
    setVoidPay(null);
    load();
  };

  if (loading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!student) return <div className="p-8">Student not found.</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Fees · ${student.full_name}`}
        description={`${student.enrolment_no ?? student.phone} — ${student.course_name_snapshot ?? "No course"}`}
        actions={
          <div className="flex gap-2 items-center">
            <Button asChild variant="outline"><Link to="/crm/fees"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Link></Button>
            <StudentWhatsAppButton
              section="fees" size="default" variant="outline" label="WhatsApp"
              student={{ id: student.id, full_name: student.full_name, phone: student.phone, enrolment_no: student.enrolment_no, course_name_snapshot: student.course_name_snapshot, total_fee: totalBilled, total_paid: totalPaid }}
            />
            <Button onClick={() => setPayOpen(true)}><Receipt className="w-4 h-4 mr-2" /> Record Payment</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SmallStat label="Total billed" value={`₹${totalBilled.toLocaleString("en-IN")}`} />
        <SmallStat label="Paid" value={`₹${totalPaid.toLocaleString("en-IN")}`} accent="success" />
        <SmallStat label="Due" value={`₹${due.toLocaleString("en-IN")}`} accent={due > 0 ? "warning" : undefined} />
        <SmallStat label="Receipts" value={String(payments.length)} />
      </div>

      {/* Course filter — only shown when student has multiple enrolments */}
      {enrolments.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">Course:</span>
          <Select value={enrolmentFilter} onValueChange={setEnrolmentFilter}>
            <SelectTrigger className="h-8 w-[280px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All courses ({enrolments.length})</SelectItem>
              {enrolments.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.course_name_snapshot || "—"} · {e.enrolment_no}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* FIX 1: Use filteredCourseBreakdown — respects the course filter */}
      {filteredCourseBreakdown.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Per-course breakdown</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Course</TableHead>
                  <TableHead className="text-right">Fee</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Net Fee</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourseBreakdown.map((row) => {
                  const isOpen = !!expandedCourses[row.id];
                  const hasHistory = row.payments.length > 0 || row.regPaid > 0;
                  return (
                    <Fragment key={row.id}>
                      <TableRow>
                        <TableCell className="p-2">
                          <button type="button" onClick={() => toggleCourse(row.id)} className="text-muted-foreground hover:text-foreground" aria-label={isOpen ? "Collapse" : "Expand"}>
                            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        </TableCell>
                        <TableCell className="text-sm">{row.course}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(row.fee)}</TableCell>
                        <TableCell className="text-right font-mono">
                          {row.discount > 0 ? <span className="text-emerald-700 dark:text-emerald-400">−{fmt(row.discount)}</span> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right font-mono">{fmt(row.netFee)}</TableCell>
                        <TableCell className="text-right font-mono text-emerald-700 dark:text-emerald-400">{fmt(row.paid)}</TableCell>
                        <TableCell className={`text-right font-mono ${row.balance > 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"}`}>{fmt(row.balance)}</TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow key={`${row.id}-history`} className="bg-muted/30 hover:bg-muted/30">
                          <TableCell />
                          <TableCell colSpan={6}>
                            {hasHistory ? (
                              <div className="space-y-1 py-1">
                                <div className="text-xs font-medium text-muted-foreground mb-1">Payment history</div>
                                {row.regPaid > 0 && (
                                  <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Registration fee paid</span>
                                    <span className="font-mono">{fmt(row.regPaid)}</span>
                                  </div>
                                )}
                                {row.payments.map((p) => (
                                  <div key={p.id} className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">{p.paid_on} · {p.mode}{p.receipt_no ? ` · ${p.receipt_no}` : ""}</span>
                                    <span className="font-mono">{fmt(p.amount)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground py-1">No payments recorded yet.</div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
                {filteredCourseBreakdown.length > 1 && (
                  <TableRow className="font-semibold bg-muted/40">
                    <TableCell /><TableCell>TOTAL</TableCell>
                    <TableCell className="text-right font-mono">{fmt(totals.fee)}</TableCell>
                    <TableCell className="text-right font-mono text-emerald-700 dark:text-emerald-400">{totals.discount > 0 ? `−${fmt(totals.discount)}` : "—"}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(totals.netFee)}</TableCell>
                    <TableCell className="text-right font-mono text-emerald-700 dark:text-emerald-400">{fmt(totals.paid)}</TableCell>
                    <TableCell className={`text-right font-mono ${totals.balance > 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"}`}>{fmt(totals.balance)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Installment plan</CardTitle>
          <Button size="sm" onClick={() => {
            setEditingPlan({ installment_no: plans.length + 1, amount: 0, enrolment_id: enrolmentFilter !== "all" ? enrolmentFilter : (defaultEnrolmentId || undefined) });
            setPlanOpen(true);
          }}>
            <Plus className="w-4 h-4 mr-1" /> Add installment
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                {enrolments.length > 1 && <TableHead>Course</TableHead>}
                <TableHead>Label</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                {/* FIX 2: Status is now auto-computed — no manual setting */}
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const filteredPlans = plans.filter((p) => !p.is_void && (enrolmentFilter === "all" || (p.enrolment_id ?? "") === enrolmentFilter));
                const voidedPlans = plans.filter((p) => p.is_void && (enrolmentFilter === "all" || (p.enrolment_id ?? "") === enrolmentFilter));
                const allFiltered = [...filteredPlans, ...voidedPlans];
                return allFiltered.length === 0 ? (
                  <TableRow><TableCell colSpan={enrolments.length > 1 ? 8 : 7} className="text-center py-6 text-muted-foreground">No installments yet.</TableCell></TableRow>
                ) : allFiltered.map((p) => {
                  const computedStatus = computePlanStatus(p);
                  return (
                    <TableRow key={p.id} className={p.is_void ? "opacity-50 line-through" : ""}>
                      <TableCell className="font-mono">{p.installment_no}</TableCell>
                      {enrolments.length > 1 && (
                        <TableCell className="text-xs text-muted-foreground">
                          {enrolments.find((e) => e.id === p.enrolment_id)?.course_name_snapshot ?? "—"}
                        </TableCell>
                      )}
                      <TableCell className="text-sm">{p.label || "—"}</TableCell>
                      <TableCell className="text-sm">{p.due_date || "—"}</TableCell>
                      <TableCell className="text-right font-mono">₹{p.amount.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-right font-mono text-emerald-700 dark:text-emerald-400">₹{p.amount_paid.toLocaleString("en-IN")}</TableCell>
                      <TableCell>
                        {p.is_void ? (
                          <Badge variant="secondary" className="bg-rose-500/15 text-rose-700 dark:text-rose-300" title={`Voided: ${p.void_reason ?? ""}`}>VOID</Badge>
                        ) : (
                          <Badge variant="secondary" className={feeStatusColors[computedStatus] || ""}>{computedStatus}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          {!p.is_void && computedStatus !== "paid" && (
                            <StudentWhatsAppButton
                              section="plan"
                              student={{ id: student.id, full_name: student.full_name, phone: student.phone, enrolment_no: student.enrolment_no, course_name_snapshot: student.course_name_snapshot, total_fee: totalBilled, total_paid: totalPaid, next_due_date: p.due_date, next_due_amount: p.amount - p.amount_paid }}
                              extraVars={{ installment_no: p.installment_no }}
                            />
                          )}
                          {!p.is_void && (
                            <Button size="icon" variant="ghost" title="Edit" onClick={() => { setEditingPlan(p); setPlanOpen(true); }}>
                              <Plus className="w-4 h-4 rotate-45" />
                            </Button>
                          )}
                          {isAdmin && !p.is_void && (
                            <Button size="icon" variant="ghost" title="Void installment" onClick={() => setVoidPlan(p)}>
                              <Ban className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                });
              })()}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Payment history</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt №</TableHead>
                {enrolments.length > 1 && <TableHead>Course</TableHead>}
                <TableHead>Date</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Collected by</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const filteredPayments = payments.filter((p) => enrolmentFilter === "all" || (p.enrolment_id ?? "") === enrolmentFilter);
                return filteredPayments.length === 0 ? (
                  <TableRow><TableCell colSpan={enrolments.length > 1 ? 8 : 7} className="text-center py-6 text-muted-foreground">No payments yet.</TableCell></TableRow>
                ) : filteredPayments.map((p) => (
                  <TableRow key={p.id} className={p.is_void ? "opacity-50 line-through" : ""}>
                    <TableCell className="font-mono text-xs">
                      {p.receipt_no}
                      {p.is_void && (
                        <Badge variant="secondary" className="ml-2 bg-rose-500/15 text-rose-700 dark:text-rose-300" title={`Voided by ${p.voided_by_name ?? "—"}: ${p.void_reason ?? ""}`}>VOID</Badge>
                      )}
                    </TableCell>
                    {enrolments.length > 1 && (
                      <TableCell className="text-xs text-muted-foreground">
                        {enrolments.find((e) => e.id === p.enrolment_id)?.course_name_snapshot ?? "—"}
                      </TableCell>
                    )}
                    <TableCell>{p.paid_on}</TableCell>
                    <TableCell className="uppercase text-xs">{p.mode.replace("_"," ")}</TableCell>
                    <TableCell className="text-sm">{p.reference || "—"}</TableCell>
                    <TableCell className="text-right font-mono">₹{p.amount.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-sm">{p.collected_by_name || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        {!p.is_void && (
                          <>
                            <StudentWhatsAppButton
                              section="payment"
                              student={{ id: student.id, full_name: student.full_name, phone: student.phone, enrolment_no: student.enrolment_no, course_name_snapshot: student.course_name_snapshot, total_fee: totalBilled, total_paid: totalPaid }}
                              extraVars={{ last_payment_amount: p.amount.toLocaleString("en-IN"), last_receipt_no: p.receipt_no ?? "" }}
                            />
                            <Button size="icon" variant="ghost" title="Print" onClick={() => window.print()}><Printer className="w-4 h-4" /></Button>
                            {isAdmin && (
                              <Button size="icon" variant="ghost" title="Void receipt" onClick={() => setVoidPay(p)}><Ban className="w-4 h-4 text-destructive" /></Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ));
              })()}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Installment dialog — FIX 3: No manual Status field */}
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingPlan.id ? "Edit installment" : "Add installment"}</DialogTitle></DialogHeader>
          {/* Show fee cap summary at top of dialog */}
          {(() => {
            const eid = editingPlan.enrolment_id || defaultEnrolmentId;
            const enrol = enrolments.find((e) => e.id === eid);
            const cap = enrol ? (enrol.net_payable_fee ?? Math.max(0, (enrol.total_fee ?? 0) - (enrol.discount_amount ?? 0))) : (student?.total_fee ?? 0);
            const allocated = plans.filter((pl) => !pl.is_void && (eid ? pl.enrolment_id === eid : true) && pl.id !== editingPlan.id).reduce((a, pl) => a + pl.amount, 0);
            const remaining = Math.max(0, cap - allocated);
            if (cap <= 0) return null;
            return (
              <div className="rounded-md bg-muted px-3 py-2 text-sm grid grid-cols-3 gap-2 text-center mb-2">
                <div><div className="text-xs text-muted-foreground">Course fee</div><div className="font-semibold">₹{cap.toLocaleString("en-IN")}</div></div>
                <div><div className="text-xs text-muted-foreground">Planned</div><div className="font-semibold text-amber-700 dark:text-amber-400">₹{allocated.toLocaleString("en-IN")}</div></div>
                <div><div className="text-xs text-muted-foreground">Available</div><div className={`font-semibold ${remaining <= 0 ? "text-rose-600" : "text-emerald-700 dark:text-emerald-400"}`}>₹{remaining.toLocaleString("en-IN")}</div></div>
              </div>
            );
          })()}
          <div className="grid sm:grid-cols-2 gap-4">
            {enrolments.length > 1 && (
              <div className="sm:col-span-2">
                <Label>Course (enrolment) *</Label>
                <Select value={editingPlan.enrolment_id || "none"} onValueChange={(v) => setEditingPlan((p) => ({ ...p, enrolment_id: v === "none" ? null : v }))}>
                  <SelectTrigger><SelectValue placeholder="Choose a course" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— select —</SelectItem>
                    {enrolments.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.course_name_snapshot || "—"} · {e.enrolment_no}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div><Label>#</Label><Input type="number" value={editingPlan.installment_no ?? 1} onChange={(e) => setEditingPlan((p) => ({ ...p, installment_no: Number(e.target.value) }))} /></div>
            <div><Label>Due date</Label><Input type="date" value={editingPlan.due_date ?? ""} onChange={(e) => setEditingPlan((p) => ({ ...p, due_date: e.target.value }))} /></div>
            <div className="sm:col-span-2"><Label>Label</Label><Input value={editingPlan.label ?? ""} onChange={(e) => setEditingPlan((p) => ({ ...p, label: e.target.value }))} placeholder="e.g. Registration / Month 1" /></div>
            <div className="sm:col-span-2"><Label>Amount (₹)</Label><Input type="number" value={editingPlan.amount ?? 0} onChange={(e) => setEditingPlan((p) => ({ ...p, amount: Number(e.target.value) }))} /></div>
            <p className="sm:col-span-2 text-xs text-muted-foreground">Status is automatically calculated from recorded payments.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanOpen(false)}>Cancel</Button>
            <Button onClick={savePlan}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Amount (₹) *</Label><Input type="number" value={pay.amount} onChange={(e) => setPay((p) => ({ ...p, amount: Number(e.target.value) }))} /></div>
            <div><Label>Mode</Label>
              <Select value={pay.mode} onValueChange={(v) => setPay((p) => ({ ...p, mode: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["cash","upi","bank_transfer","card","cheque","other"].map((s) => <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Reference / UTR</Label><Input value={pay.reference} onChange={(e) => setPay((p) => ({ ...p, reference: e.target.value }))} /></div>
            <div><Label>Paid on</Label><Input type="date" value={pay.paid_on} onChange={(e) => setPay((p) => ({ ...p, paid_on: e.target.value }))} /></div>
            {enrolments.length > 1 && (
              <div className="sm:col-span-2">
                <Label>Course (enrolment) *</Label>
                <Select value={pay.enrolment_id || defaultEnrolmentId || "none"} onValueChange={(v) => setPay((p) => ({ ...p, enrolment_id: v === "none" ? "" : v, fee_plan_id: "" }))}>
                  <SelectTrigger><SelectValue placeholder="Choose a course" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— select —</SelectItem>
                    {enrolments.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.course_name_snapshot || "—"} · {e.enrolment_no}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="sm:col-span-2">
              <Label>Apply to installment</Label>
              <Select value={pay.fee_plan_id || "none"} onValueChange={(v) => setPay((p) => ({ ...p, fee_plan_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Standalone —</SelectItem>
                  {plans
                    .filter((p) => !p.is_void && computePlanStatus(p) !== "paid")
                    .filter((p) => {
                      const eid = pay.enrolment_id || defaultEnrolmentId;
                      return enrolments.length <= 1 || !eid || (p.enrolment_id ?? "") === eid;
                    })
                    .map((p) => <SelectItem key={p.id} value={p.id}>#{p.installment_no} · {p.label || "Installment"} · ₹{(p.amount - p.amount_paid).toLocaleString("en-IN")} due</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label>Notes</Label><Textarea rows={2} value={pay.notes} onChange={(e) => setPay((p) => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button onClick={savePayment}>Save & generate receipt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VoidDialog
        open={!!voidPlan} onOpenChange={(v) => { if (!v) setVoidPlan(null); }}
        title={voidPlan ? `Void installment #${voidPlan.installment_no}` : "Void installment"}
        description="This installment will be removed from totals and reminders, but kept for audit history."
        onConfirm={confirmVoidPlan}
      />
      <VoidDialog
        open={!!voidPay} onOpenChange={(v) => { if (!v) setVoidPay(null); }}
        title={voidPay ? `Void receipt ${voidPay.receipt_no ?? ""}` : "Void receipt"}
        description="The fee balance will be recalculated automatically."
        onConfirm={confirmVoidPayment}
      />
    </div>
  );
}

function SmallStat({ label, value, accent }: { label: string; value: string; accent?: "success" | "warning" }) {
  const cls = accent === "success" ? "text-emerald-700 dark:text-emerald-400"
    : accent === "warning" ? "text-amber-700 dark:text-amber-400" : "";
  return (
    <Card><CardContent className="pt-5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold mt-1 ${cls}`}>{value}</div>
    </CardContent></Card>
  );
}
