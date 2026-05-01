import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { Plus, Search, Filter, Phone, User, RotateCcw, Download, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "../components/PageHeader";
import { StudentWhatsAppButton } from "../components/StudentWhatsAppButton";
import { ColumnPickerPopover } from "../components/ColumnPickerPopover";
import { useReportColumns } from "../hooks/useReportColumns";
import { toast } from "sonner";

type Student = {
  id: string;
  enrolment_no: string | null;
  full_name: string;
  phone: string;
  alt_phone: string | null;
  email: string | null;
  course_id: string | null;
  course_name_snapshot: string | null;
  enrolment_date: string;
  status: string;
  total_fee: number;
  net_payable_fee: number | null;
  photo_url: string | null;
  batch_id: string | null;
  city: string | null;
  state: string | null;
  qualification: string | null;
  college_name: string | null;
  referred_by: string | null;
  hear_about_us: string | null;
  father_name: string | null;
  father_phone: string | null;
  created_at: string;
};

type BatchInfo = { id: string; name: string; faculty_name: string | null; status: string };

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  completed: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  dropped: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  on_hold: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

export default function CrmStudents() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Student[]>([]);
  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [paidMap, setPaidMap] = useState<Record<string, number>>({});
  const [enrolMap, setEnrolMap] = useState<Record<string, { course_name_snapshot: string | null; net_payable_fee: number | null; total_fee: number; status: string }[]>>({});
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [course, setCourse] = useState("all");
  const [batch, setBatch] = useState("all");
  const [faculty, setFaculty] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rangePreset, setRangePreset] = useState("all");
  const [groupByPerson, setGroupByPerson] = useState(false);

  const { cols, visibleCols, exportCols, toggleVisible } = useReportColumns("crm_student_report_columns");

  useEffect(() => {
    (async () => {
      const [{ data, error }, { data: bs }, { data: pays }, { data: enr }] = await Promise.all([
        supabase
          .from("crm_students")
          .select("id,enrolment_no,full_name,phone,alt_phone,email,course_id,course_name_snapshot,enrolment_date,status,total_fee,net_payable_fee,photo_url,batch_id,city,state,qualification,college_name,referred_by,hear_about_us,father_name,father_phone,created_at")
          .order("created_at", { ascending: false }),
        supabase.from("crm_batches").select("id,name,faculty_name,status"),
        supabase.from("crm_payments").select("student_id,amount,is_void"),
        supabase.from("crm_student_enrolments" as never).select("student_id,course_name_snapshot,net_payable_fee,total_fee,status"),
      ]);
      if (error) toast.error(error.message);
      setItems((data ?? []) as Student[]);
      setBatches((bs ?? []) as BatchInfo[]);
      const pm: Record<string, number> = {};
      ((pays ?? []) as { student_id: string; amount: number; is_void: boolean }[]).forEach((p) => {
        if (p.is_void) return;
        pm[p.student_id] = (pm[p.student_id] || 0) + (p.amount || 0);
      });
      setPaidMap(pm);
      const em: Record<string, { course_name_snapshot: string | null; net_payable_fee: number | null; total_fee: number; status: string }[]> = {};
      ((enr ?? []) as unknown as { student_id: string; course_name_snapshot: string | null; net_payable_fee: number | null; total_fee: number; status: string }[]).forEach((e) => {
        (em[e.student_id] = em[e.student_id] || []).push(e);
      });
      setEnrolMap(em);
      setLoading(false);
    })();
  }, []);

  const batchMap = useMemo(() => {
    const m = new Map<string, BatchInfo>();
    batches.forEach((b) => m.set(b.id, b));
    return m;
  }, [batches]);

  const runningBatchIds = useMemo(
    () => new Set(batches.filter((b) => b.status === "running").map((b) => b.id)),
    [batches]
  );

  const courseOptions = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((s) => { if (s.course_id && s.course_name_snapshot) map.set(s.course_id, s.course_name_snapshot); });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const facultyOptions = useMemo(() => {
    const set = new Set<string>();
    batches.forEach((b) => { if (b.faculty_name) set.add(b.faculty_name); });
    return Array.from(set).sort();
  }, [batches]);

  const sortedBatches = useMemo(() => {
    const order: Record<string, number> = { running: 0, planned: 1, completed: 2 };
    return [...batches].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || a.name.localeCompare(b.name));
  }, [batches]);

  const applyPreset = (preset: string) => {
    setRangePreset(preset);
    const today = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    if (preset === "all") { setFrom(""); setTo(""); return; }
    if (preset === "today") { setFrom(iso(today)); setTo(iso(today)); return; }
    if (preset === "7d") { const d = new Date(today); d.setDate(d.getDate() - 6); setFrom(iso(d)); setTo(iso(today)); return; }
    if (preset === "30d") { const d = new Date(today); d.setDate(d.getDate() - 29); setFrom(iso(d)); setTo(iso(today)); return; }
    if (preset === "this_month") { setFrom(iso(new Date(today.getFullYear(), today.getMonth(), 1))); setTo(iso(today)); return; }
    if (preset === "this_year") { setFrom(iso(new Date(today.getFullYear(), 0, 1))); setTo(iso(today)); return; }
  };

  const filtered = useMemo(() => items.filter((s) => {
    if (status === "live") {
      if (s.status !== "active") return false;
      if (!s.batch_id || !runningBatchIds.has(s.batch_id)) return false;
    } else if (status !== "all" && s.status !== status) return false;
    if (course !== "all" && s.course_id !== course) return false;
    if (batch !== "all" && s.batch_id !== batch) return false;
    if (faculty !== "all") {
      const b = s.batch_id ? batchMap.get(s.batch_id) : null;
      if (!b || b.faculty_name !== faculty) return false;
    }
    if (from && s.enrolment_date && s.enrolment_date < from) return false;
    if (to && s.enrolment_date && s.enrolment_date > to) return false;
    if (!q) return true;
    const t = q.toLowerCase();
    return (
      s.full_name.toLowerCase().includes(t) ||
      s.phone.includes(t) ||
      (s.enrolment_no ?? "").toLowerCase().includes(t) ||
      (s.course_name_snapshot ?? "").toLowerCase().includes(t)
    );
  }), [items, q, status, course, batch, faculty, from, to, runningBatchIds, batchMap]);

  const liveCount = useMemo(
    () => items.filter((s) => s.status === "active" && s.batch_id && runningBatchIds.has(s.batch_id)).length,
    [items, runningBatchIds]
  );

  const reset = () => {
    setQ(""); setStatus("all"); setCourse("all"); setBatch("all"); setFaculty("all");
    setFrom(""); setTo(""); setRangePreset("all");
  };

  const effectiveTotal = (s: Student): number => {
    const enrols = enrolMap[s.id];
    if (enrols && enrols.length > 0) return enrols.reduce((a, e) => a + (e.total_fee || 0), 0);
    return s.total_fee || 0;
  };
  const effectiveNet = (s: Student): number => {
    const enrols = enrolMap[s.id];
    if (enrols && enrols.length > 0) return enrols.reduce((a, e) => a + (e.net_payable_fee ?? e.total_fee ?? 0), 0);
    return s.net_payable_fee ?? s.total_fee ?? 0;
  };

  const valueOf = (key: string, s: Student): string | number => {
    const b = s.batch_id ? batchMap.get(s.batch_id) : null;
    const paid = paidMap[s.id] || 0;
    const net = effectiveNet(s);
    const total = effectiveTotal(s);
    switch (key) {
      case "enrolment_no": return s.enrolment_no ?? "";
      case "full_name": return s.full_name;
      case "phone": return s.phone;
      case "alt_phone": return s.alt_phone ?? "";
      case "email": return s.email ?? "";
      case "course": {
        const enrols = enrolMap[s.id] ?? [];
        if (enrols.length > 1) {
          return enrols.map((e) => e.course_name_snapshot || "").filter(Boolean).join(", ");
        }
        return s.course_name_snapshot ?? "";
      }
      case "batch": return b?.name ?? "";
      case "faculty": return b?.faculty_name ?? "";
      case "enrolment_date": return s.enrolment_date;
      case "status": return s.status;
      case "total_fee": return s.total_fee;
      case "net_payable_fee": return net;
      case "paid_amount": return paid;
      case "balance": return Math.max(0, net - paid);
      case "city": return s.city ?? "";
      case "state": return s.state ?? "";
      case "qualification": return s.qualification ?? "";
      case "college_name": return s.college_name ?? "";
      case "referred_by": return s.referred_by ?? "";
      case "hear_about_us": return s.hear_about_us ?? "";
      case "father_name": return s.father_name ?? "";
      case "father_phone": return s.father_phone ?? "";
      case "created_at": return new Date(s.created_at).toLocaleString();
      default: return "";
    }
  };

  const renderCell = (key: string, s: Student) => {
    const b = s.batch_id ? batchMap.get(s.batch_id) : null;
    const paid = paidMap[s.id] || 0;
    const net = s.net_payable_fee ?? s.total_fee;
    switch (key) {
      case "photo": {
        const initials = s.full_name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
        return (
          <Avatar className="h-10 w-10 border">
            {s.photo_url ? <AvatarImage src={s.photo_url} alt={s.full_name} className="object-cover" /> : null}
            <AvatarFallback className="text-xs bg-muted">{initials || <User className="w-4 h-4" />}</AvatarFallback>
          </Avatar>
        );
      }
      case "enrolment_no": return <span className="font-mono text-xs">{s.enrolment_no ?? "—"}</span>;
      case "full_name": return <span className="font-medium">{s.full_name}</span>;
      case "phone": return (
        <span className="font-mono text-sm inline-flex items-center gap-1">
          <Phone className="w-3 h-3 text-muted-foreground" /> {s.phone}
        </span>
      );
      case "batch": return <span className="text-sm">{b?.name ?? "—"}</span>;
      case "faculty": return <span className="text-sm">{b?.faculty_name ?? "—"}</span>;
      case "status": return <Badge variant="secondary" className={statusColors[s.status] || ""}>{s.status.replace("_", " ")}</Badge>;
      case "total_fee": return <span className="font-mono text-sm">₹{s.total_fee.toLocaleString("en-IN")}</span>;
      case "net_payable_fee": return <span className="font-mono text-sm">₹{net.toLocaleString("en-IN")}</span>;
      case "paid_amount": return <span className="font-mono text-sm text-emerald-700 dark:text-emerald-400">₹{paid.toLocaleString("en-IN")}</span>;
      case "balance": {
        const bal = Math.max(0, net - paid);
        return <span className={`font-mono text-sm ${bal > 0 ? "text-rose-600 dark:text-rose-400" : ""}`}>₹{bal.toLocaleString("en-IN")}</span>;
      }
      case "course": {
        const enrols = enrolMap[s.id] ?? [];
        if (enrols.length > 1) {
          return (
            <div className="flex flex-wrap gap-1">
              {enrols.map((e, i) => (
                <Badge key={i} variant="secondary" className="text-[10px]">{e.course_name_snapshot || "—"}</Badge>
              ))}
            </div>
          );
        }
        return <span className="text-sm">{s.course_name_snapshot ?? "—"}</span>;
      }
      default: {
        const v = valueOf(key, s);
        return <span className="text-sm">{v === "" || v === null || v === undefined ? "—" : String(v)}</span>;
      }
    }
  };

  const exportXlsx = () => {
    const rows = filtered.map((s) => {
      const row: Record<string, string | number> = {};
      exportCols.forEach((c) => { row[c.label] = valueOf(c.column_key, s); });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, `students-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`Exported ${rows.length} students`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Master record of every enrolled student."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate("/crm/students/new")}>
              <Plus className="w-4 h-4 mr-2" /> New Student
            </Button>
            <ColumnPickerPopover cols={cols} onToggle={toggleVisible} />
            <Button variant="outline" onClick={exportXlsx}>
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-card p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Total students</div>
          <div className="text-2xl font-bold">{items.length}</div>
        </div>
        <div className="rounded-lg border bg-emerald-500/10 p-3">
          <div className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300">🟢 Live (studying now)</div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{liveCount}</div>
          <button onClick={() => setStatus("live")} className="text-[10px] text-emerald-700/70 hover:underline mt-1">Filter →</button>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Active</div>
          <div className="text-2xl font-bold">{items.filter((s) => s.status === "active").length}</div>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Completed</div>
          <div className="text-2xl font-bold">{items.filter((s) => s.status === "completed").length}</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search name, phone, enrolment no, course…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={course} onValueChange={setCourse}>
            <SelectTrigger><SelectValue placeholder="All Courses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courseOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={batch} onValueChange={setBatch}>
            <SelectTrigger><SelectValue placeholder="All Batches" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {sortedBatches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.status === "running" ? "🟢 " : b.status === "planned" ? "🕒 " : "✓ "}{b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={faculty} onValueChange={setFaculty}>
            <SelectTrigger><SelectValue placeholder="All Faculty" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Faculty</SelectItem>
              {facultyOptions.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="live">🟢 Live (active + running batch)</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="on_hold">On hold</SelectItem>
              <SelectItem value="dropped">Dropped</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <span className="text-xs font-medium text-muted-foreground sm:w-16">Joined</span>
          <Select value={rangePreset} onValueChange={applyPreset}>
            <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="this_month">This month</SelectItem>
              <SelectItem value="this_year">This year</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setRangePreset("custom"); }} className="sm:w-40" />
          <span className="text-xs text-muted-foreground text-center">to</span>
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setRangePreset("custom"); }} className="sm:w-40" />
          <Button variant="ghost" size="sm" onClick={reset}><RotateCcw className="w-4 h-4 mr-1" /> Reset</Button>
          <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
            <input type="checkbox" className="accent-primary" checked={groupByPerson} onChange={(e) => setGroupByPerson(e.target.checked)} />
            Group by person
          </label>
          <span className="text-xs text-muted-foreground sm:ml-auto">
            {groupByPerson
              ? `${new Set(filtered.map((s) => s.phone)).size} people · ${filtered.length} enrolments`
              : `${filtered.length} student${filtered.length === 1 ? "" : "s"}`}
          </span>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleCols.map((c) => <TableHead key={c.column_key}>{c.label}</TableHead>)}
              <TableHead className="text-right">Message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={visibleCols.length + 1} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={visibleCols.length + 1} className="text-center py-12 text-muted-foreground">
                No students match your filters. <Link to="/crm/students/new" className="underline">Add one</Link>.
              </TableCell></TableRow>
            ) : (() => {
              // When "Group by person" is on, collapse rows by phone (one row per person, latest enrolment kept)
              const rowsToShow = groupByPerson
                ? Object.values(
                    filtered.reduce((acc: Record<string, Student & { _count: number }>, s) => {
                      const key = s.phone || s.id;
                      if (!acc[key]) acc[key] = { ...s, _count: 1 };
                      else acc[key]._count += 1;
                      return acc;
                    }, {})
                  )
                : filtered.map((s) => ({ ...s, _count: 1 } as Student & { _count: number }));
              return rowsToShow.map((s) => (
                <TableRow key={s.id} className="cursor-pointer" onClick={() => navigate(`/crm/students/${s.id}`)}>
                  {visibleCols.map((c) => (
                    <TableCell key={c.column_key}>
                      {c.column_key === "full_name" && groupByPerson && s._count > 1 ? (
                        <span className="inline-flex items-center gap-2">
                          {renderCell(c.column_key, s)}
                          <Badge variant="secondary" className="text-[10px]">{s._count} courses</Badge>
                        </span>
                      ) : renderCell(c.column_key, s)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex gap-1 items-center">
                      <Button size="icon" variant="ghost" asChild title="Open WhatsApp chat">
                        <a
                          href={`https://wa.me/${s.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Send className="w-4 h-4 text-emerald-600" />
                        </a>
                      </Button>
                      <StudentWhatsAppButton
                        section="students"
                        student={{
                          id: s.id,
                          full_name: s.full_name,
                          phone: s.phone,
                          enrolment_no: s.enrolment_no,
                          course_name_snapshot: s.course_name_snapshot,
                          total_fee: s.total_fee,
                        }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ));
            })()}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
