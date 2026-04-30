import { useEffect, useMemo, useState } from "react";
import { Download, TrendingUp, TrendingDown, Users, GraduationCap, Wallet } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { PageHeader } from "../components/PageHeader";
import { useCrmAuth } from "../hooks/useCrmAuth";

type Pay = { id: string; paid_on: string; amount: number; mode: string; student_id: string };
type Exp = { id: string; spent_on: string; amount: number; category_name_snapshot: string | null };
type Enq = { id: string; status: string; source: string; created_at: string };
type Stud = { id: string; course_name_snapshot: string | null; total_fee: number; created_at: string };
type AllStud = { id: string; full_name: string; phone: string; course_id: string | null; course_name_snapshot: string | null; total_fee: number; status: string; batch_id: string | null };
type Batch = { id: string; name: string; faculty_name: string | null; status: string; capacity: number; course_name_snapshot: string | null; schedule: string | null; timing: string | null };

const monthKey = (d: string) => d?.slice(0, 7);
const monthLabel = (k: string) => {
  const [y, m] = k.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString("en-IN", { month: "short", year: "2-digit" });
};

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#a855f7", "#ef4444", "#06b6d4", "#8b5cf6", "#64748b"];

export default function CrmReports() {
  const { isAdmin } = useCrmAuth();
  const today = new Date();
  const firstOfYear = `${today.getFullYear()}-01-01`;
  const todayStr = today.toISOString().slice(0, 10);
  const [from, setFrom] = useState(firstOfYear);
  const [to, setTo] = useState(todayStr);
  const [pays, setPays] = useState<Pay[]>([]);
  const [exps, setExps] = useState<Exp[]>([]);
  const [enqs, setEnqs] = useState<Enq[]>([]);
  const [studs, setStuds] = useState<Stud[]>([]);
  const [allStuds, setAllStuds] = useState<AllStud[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: p }, { data: e }, { data: en }, { data: s }] = await Promise.all([
        supabase.from("crm_payments").select("id,paid_on,amount,mode,student_id").eq("is_void", false).gte("paid_on", from).lte("paid_on", to),
        isAdmin
          ? supabase.from("crm_expenses").select("id,spent_on,amount,category_name_snapshot").eq("is_void", false).gte("spent_on", from).lte("spent_on", to)
          : Promise.resolve({ data: [] as Exp[] }),
        supabase.from("crm_enquiries").select("id,status,source,created_at").gte("created_at", from).lte("created_at", to + "T23:59:59"),
        supabase.from("crm_students").select("id,course_name_snapshot,total_fee,created_at").gte("created_at", from).lte("created_at", to + "T23:59:59"),
      ]);
      setPays((p ?? []) as Pay[]);
      setExps((e ?? []) as Exp[]);
      setEnqs((en ?? []) as Enq[]);
      setStuds((s ?? []) as Stud[]);
      const { data: all } = await supabase.from("crm_students")
        .select("id,full_name,phone,course_id,course_name_snapshot,total_fee,status");
      setAllStuds((all ?? []) as AllStud[]);
      setLoading(false);
    })();
  }, [from, to, isAdmin]);

  // Monthly trend
  const monthly = useMemo(() => {
    const map: Record<string, { collected: number; expenses: number }> = {};
    pays.forEach((p) => {
      const k = monthKey(p.paid_on); if (!k) return;
      (map[k] ||= { collected: 0, expenses: 0 }).collected += p.amount;
    });
    exps.forEach((e) => {
      const k = monthKey(e.spent_on); if (!k) return;
      (map[k] ||= { collected: 0, expenses: 0 }).expenses += e.amount;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => ({ month: monthLabel(k), Collected: v.collected, Expenses: v.expenses, Net: v.collected - v.expenses }));
  }, [pays, exps]);

  // Totals
  const totals = useMemo(() => {
    const collected = pays.reduce((a, p) => a + p.amount, 0);
    const expenses = exps.reduce((a, e) => a + e.amount, 0);
    return {
      collected, expenses, net: collected - expenses,
      receipts: pays.length,
      newEnquiries: enqs.length,
      converted: enqs.filter((e) => e.status === "converted").length,
      newStudents: studs.length,
      newRevenue: studs.reduce((a, s) => a + (s.total_fee || 0), 0),
    };
  }, [pays, exps, enqs, studs]);

  const conversionRate = totals.newEnquiries > 0 ? (totals.converted / totals.newEnquiries) * 100 : 0;

  // Funnel
  const funnel = useMemo(() => {
    const buckets: Record<string, number> = { new: 0, contacted: 0, follow_up: 0, converted: 0, lost: 0, junk: 0 };
    enqs.forEach((e) => { if (e.status in buckets) buckets[e.status]++; });
    return Object.entries(buckets).map(([name, value]) => ({ name: name.replace("_", " "), value }));
  }, [enqs]);

  // Source breakdown
  const sources = useMemo(() => {
    const m: Record<string, number> = {};
    enqs.forEach((e) => { m[e.source] = (m[e.source] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name: name.replace("_", " "), value })).sort((a, b) => b.value - a.value);
  }, [enqs]);

  // Course revenue
  const courseRevenue = useMemo(() => {
    const m: Record<string, { revenue: number; students: number }> = {};
    studs.forEach((s) => {
      const k = s.course_name_snapshot || "Unassigned";
      (m[k] ||= { revenue: 0, students: 0 });
      m[k].revenue += s.total_fee || 0;
      m[k].students += 1;
    });
    return Object.entries(m).map(([course, v]) => ({ course, ...v })).sort((a, b) => b.revenue - a.revenue);
  }, [studs]);

  // Expense breakdown
  const expenseBreakdown = useMemo(() => {
    const m: Record<string, number> = {};
    exps.forEach((e) => { m[e.category_name_snapshot || "Uncategorised"] = (m[e.category_name_snapshot || "Uncategorised"] || 0) + e.amount; });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [exps]);

  // Students who joined more than one course (grouped by normalized phone)
  const multiCourse = useMemo(() => {
    const groups: Record<string, AllStud[]> = {};
    allStuds.forEach((s) => {
      const norm = (s.phone || "").replace(/\D/g, "").slice(-10);
      if (!norm || norm.length < 10) return;
      (groups[norm] ||= []).push(s);
    });
    return Object.entries(groups)
      .filter(([, list]) => {
        const distinct = new Set(list.map((x) => x.course_id || x.course_name_snapshot || ""));
        return distinct.size >= 2;
      })
      .map(([phone, list]) => ({
        phone,
        name: list[0].full_name,
        firstId: list[0].id,
        courses: Array.from(new Set(list.map((x) => x.course_name_snapshot || "—"))).join(", "),
        totalFee: list.reduce((a, x) => a + (x.total_fee || 0), 0),
        count: list.length,
      }))
      .sort((a, b) => b.count - a.count);
  }, [allStuds]);

  const exportFullReport = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthly), "Monthly P&L");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(funnel), "Enquiry Funnel");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sources), "Sources");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(courseRevenue), "Course Revenue");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenseBreakdown), "Expense Breakdown");
    XLSX.writeFile(wb, `atec-report-${from}-to-${to}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Insights across collections, expenses, enquiries, students, and courses."
        actions={<Button variant="outline" onClick={exportFullReport}><Download className="w-4 h-4 mr-2" /> Export full report</Button>}
      />

      <Card>
        <CardContent className="pt-5 grid sm:grid-cols-3 gap-4">
          <div><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="flex items-end text-sm text-muted-foreground">
            {loading ? "Loading…" : `${pays.length} payments · ${enqs.length} enquiries · ${studs.length} new students`}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={<TrendingUp className="w-4 h-4 text-emerald-500" />} label="Collected" value={`₹${totals.collected.toLocaleString("en-IN")}`} />
        {isAdmin && <Stat icon={<TrendingDown className="w-4 h-4 text-rose-500" />} label="Expenses" value={`₹${totals.expenses.toLocaleString("en-IN")}`} />}
        {isAdmin && <Stat icon={<Wallet className="w-4 h-4 text-blue-500" />} label="Net" value={`₹${totals.net.toLocaleString("en-IN")}`} accent={totals.net >= 0 ? "success" : "danger"} />}
        <Stat icon={<Users className="w-4 h-4 text-violet-500" />} label="New enquiries" value={String(totals.newEnquiries)} />
        <Stat icon={<GraduationCap className="w-4 h-4 text-amber-500" />} label="New students" value={String(totals.newStudents)} />
        <Stat icon={<TrendingUp className="w-4 h-4 text-emerald-500" />} label="Conversion" value={`${conversionRate.toFixed(1)}%`} />
        <Stat icon={<Wallet className="w-4 h-4" />} label="New revenue billed" value={`₹${totals.newRevenue.toLocaleString("en-IN")}`} />
        <Stat icon={<Wallet className="w-4 h-4" />} label="Receipts issued" value={String(totals.receipts)} />
      </div>

      <Card>
        <CardHeader><CardTitle>Monthly trend</CardTitle></CardHeader>
        <CardContent>
          {monthly.length === 0 ? (
            <p className="text-muted-foreground text-sm py-6 text-center">No data in this range.</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Bar dataKey="Collected" fill="#10b981" radius={[4,4,0,0]} />
                {isAdmin && <Bar dataKey="Expenses" fill="#ef4444" radius={[4,4,0,0]} />}
                {isAdmin && <Bar dataKey="Net" fill="#3b82f6" radius={[4,4,0,0]} />}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Enquiry funnel</CardTitle></CardHeader>
          <CardContent>
            {funnel.every((f) => f.value === 0) ? (
              <p className="text-muted-foreground text-sm py-6 text-center">No enquiries.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={funnel} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={80} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="value" fill="#a855f7" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Lead sources</CardTitle></CardHeader>
          <CardContent>
            {sources.length === 0 ? (
              <p className="text-muted-foreground text-sm py-6 text-center">No data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={sources} dataKey="value" nameKey="name" outerRadius={90} label>
                    {sources.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Course-wise enrolments & revenue</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead className="text-right">New students</TableHead>
                <TableHead className="text-right">Revenue billed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courseRevenue.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">No new enrolments in this range.</TableCell></TableRow>
              ) : courseRevenue.map((c) => (
                <TableRow key={c.course}>
                  <TableCell className="font-medium">{c.course}</TableCell>
                  <TableCell className="text-right">{c.students}</TableCell>
                  <TableCell className="text-right font-mono">₹{c.revenue.toLocaleString("en-IN")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Multi-course students ({multiCourse.length})</CardTitle>
          <p className="text-xs text-muted-foreground">Students whose phone appears across 2+ different courses (lifetime)</p>
        </CardHeader>
        <CardContent>
          {multiCourse.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No students enrolled in multiple courses yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Courses</TableHead>
                  <TableHead className="text-right">Enrolments</TableHead>
                  <TableHead className="text-right">Total fees</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {multiCourse.map((m) => (
                  <TableRow key={m.phone} className="cursor-pointer" onClick={() => window.location.assign(`/crm/students/${m.firstId}`)}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell className="font-mono text-sm">{m.phone}</TableCell>
                    <TableCell className="text-sm">{m.courses}</TableCell>
                    <TableCell className="text-right font-mono">{m.count}</TableCell>
                    <TableCell className="text-right font-mono">₹{m.totalFee.toLocaleString("en-IN")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {isAdmin && expenseBreakdown.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Expense breakdown by category</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">% of total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenseBreakdown.map((c) => (
                  <TableRow key={c.name}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-right font-mono">₹{c.value.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {totals.expenses > 0 ? ((c.value / totals.expenses) * 100).toFixed(1) : 0}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ icon, label, value, accent }: { icon?: React.ReactNode; label: string; value: string; accent?: "success" | "danger" }) {
  const cls = accent === "success" ? "text-emerald-700 dark:text-emerald-400"
    : accent === "danger" ? "text-rose-700 dark:text-rose-400" : "";
  return (
    <Card><CardContent className="pt-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}{label}
      </div>
      <div className={`text-xl font-bold mt-1 ${cls}`}>{value}</div>
    </CardContent></Card>
  );
}
