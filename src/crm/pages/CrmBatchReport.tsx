import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, MessageSquare, Send } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "../components/PageHeader";
import { sendAttendanceReportWa } from "../lib/attendanceWa";
import { toast } from "sonner";

type Batch = { id: string; name: string; start_date: string | null; course_name_snapshot: string | null };
type Student = { id: string; full_name: string; phone: string; enrolment_no: string | null };
type Att = { student_id: string; attended_on: string; status: string };

const STATUS_SHORT: Record<string, string> = { present: "P", absent: "A", late: "L", excused: "E" };
const STATUS_CLR: Record<string, string> = {
  P: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  A: "bg-rose-500/20 text-rose-700 dark:text-rose-300",
  L: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
  E: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
};

export default function CrmBatchReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Att[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: b } = await supabase.from("crm_batches")
        .select("id,name,start_date,course_name_snapshot").eq("id", id).maybeSingle();
      if (b) {
        setBatch(b as Batch);
        setFrom(b.start_date || new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10));
      }
      const { data: ss } = await supabase.from("crm_students")
        .select("id,full_name,phone,enrolment_no").eq("batch_id", id).order("full_name");
      setStudents((ss ?? []) as Student[]);
    })();
  }, [id]);

  useEffect(() => {
    if (!id || !from || !to) return;
    (async () => {
      const { data } = await supabase.from("crm_attendance")
        .select("student_id,attended_on,status")
        .eq("batch_id", id).gte("attended_on", from).lte("attended_on", to);
      setAttendance((data ?? []) as Att[]);
    })();
  }, [id, from, to]);

  const workingDays = useMemo(() => {
    const set = new Set(attendance.map((a) => a.attended_on));
    return Array.from(set).sort();
  }, [attendance]);

  const matrix = useMemo(() => {
    const m: Record<string, Record<string, string>> = {};
    attendance.forEach((a) => {
      m[a.student_id] ||= {};
      m[a.student_id][a.attended_on] = STATUS_SHORT[a.status] || "?";
    });
    return m;
  }, [attendance]);

  const studentSummary = (sid: string) => {
    const counts = { P: 0, A: 0, L: 0, E: 0 };
    workingDays.forEach((d) => {
      const s = matrix[sid]?.[d];
      if (s && s in counts) counts[s as keyof typeof counts]++;
    });
    const total = workingDays.length;
    const pct = total ? Math.round((counts.P / total) * 100) : 0;
    return { ...counts, total, pct };
  };

  const exportXlsx = () => {
    if (!batch) return;
    const rows = students.map((s) => {
      const row: Record<string, string | number> = {
        "Enrolment №": s.enrolment_no || "",
        "Name": s.full_name,
        "Phone": s.phone,
      };
      workingDays.forEach((d) => { row[d] = matrix[s.id]?.[d] || "-"; });
      const sm = studentSummary(s.id);
      row["Working days"] = sm.total;
      row["Present"] = sm.P;
      row["Absent"] = sm.A;
      row["Attendance %"] = sm.pct;
      return row;
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Attendance");
    XLSX.writeFile(wb, `${batch.name.replace(/\s+/g, "_")}_${from}_to_${to}.xlsx`);
  };

  const sendOne = async (s: Student) => {
    if (!batch) return;
    const sm = studentSummary(s.id);
    const r = await sendAttendanceReportWa({
      studentId: s.id, studentName: s.full_name, phone: s.phone,
      batchName: batch.name, from, to,
      workingDays: sm.total, present: sm.P, absent: sm.A,
    });
    if (!r.ok) { toast.error(r.error || "Failed"); return; }
    window.open(r.url!, "_blank", "noopener");
  };

  const sendAll = async () => {
    if (!batch) return;
    if (!confirm(`Open WhatsApp link for ${students.length} students one by one?`)) return;
    setSending(true);
    let count = 0;
    for (const s of students) {
      if (!s.phone) continue;
      const sm = studentSummary(s.id);
      const r = await sendAttendanceReportWa({
        studentId: s.id, studentName: s.full_name, phone: s.phone,
        batchName: batch.name, from, to,
        workingDays: sm.total, present: sm.P, absent: sm.A,
      });
      if (r.ok) {
        window.open(r.url!, "_blank", "noopener");
        count++;
        await new Promise((res) => setTimeout(res, 800));
      }
    }
    setSending(false);
    toast.success(`Opened ${count} WhatsApp links`);
  };

  if (!batch) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Attendance Report — ${batch.name}`}
        description={batch.course_name_snapshot || ""}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/crm/batches")}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
            <Button variant="outline" onClick={exportXlsx}><Download className="w-4 h-4 mr-2" /> Export</Button>
            <Button onClick={sendAll} disabled={sending}>
              <Send className="w-4 h-4 mr-2" /> {sending ? "Sending…" : "Send to all"}
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="pt-5 grid sm:grid-cols-4 gap-4">
          <div><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="flex flex-col justify-end">
            <div className="text-xs text-muted-foreground">Working days</div>
            <div className="text-2xl font-bold">{workingDays.length}</div>
          </div>
          <div className="flex flex-col justify-end">
            <div className="text-xs text-muted-foreground">Live students</div>
            <div className="text-2xl font-bold">{students.length}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Attendance matrix</CardTitle></CardHeader>
        <CardContent className="overflow-auto">
          {workingDays.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No attendance recorded in this range.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card z-10 min-w-[160px]">Student</TableHead>
                  {workingDays.map((d) => (
                    <TableHead key={d} className="text-center text-[10px] font-mono">{d.slice(5)}</TableHead>
                  ))}
                  <TableHead className="text-right">P/Total</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-right">Send</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => {
                  const sm = studentSummary(s.id);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="sticky left-0 bg-card z-10 font-medium text-sm">
                        {s.full_name}
                        <div className="text-[10px] text-muted-foreground font-mono">{s.enrolment_no || s.phone}</div>
                      </TableCell>
                      {workingDays.map((d) => {
                        const v = matrix[s.id]?.[d] || "-";
                        return (
                          <TableCell key={d} className="text-center p-1">
                            {v === "-" ? <span className="text-muted-foreground">·</span> : (
                              <Badge variant="secondary" className={`${STATUS_CLR[v] || ""} text-[10px] px-1.5`}>{v}</Badge>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-mono text-xs">{sm.P}/{sm.total}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        <span className={sm.pct >= 75 ? "text-emerald-600" : "text-rose-600"}>{sm.pct}%</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => sendOne(s)} disabled={!s.phone}>
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
