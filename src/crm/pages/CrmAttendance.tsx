import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Save, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "../components/PageHeader";
import { useCrmAuth } from "../hooks/useCrmAuth";
import { logAudit } from "../lib/audit";
import { toast } from "sonner";

type Batch = { id: string; name: string; course_name_snapshot: string | null };
type Student = { id: string; full_name: string; enrolment_no: string | null; phone: string };
type Attendance = { id?: string; student_id: string; status: string; notes?: string | null };

const STATUSES = ["present", "absent", "late", "excused"] as const;
const colors: Record<string, string> = {
  present: "data-[state=on]:bg-emerald-500/20 data-[state=on]:text-emerald-700 dark:data-[state=on]:text-emerald-300",
  absent: "data-[state=on]:bg-rose-500/20 data-[state=on]:text-rose-700 dark:data-[state=on]:text-rose-300",
  late: "data-[state=on]:bg-amber-500/20 data-[state=on]:text-amber-700 dark:data-[state=on]:text-amber-300",
  excused: "data-[state=on]:bg-blue-500/20 data-[state=on]:text-blue-700 dark:data-[state=on]:text-blue-300",
};

export default function CrmAttendance() {
  const { user, hasAccess } = useCrmAuth();
  const [search, setSearch] = useSearchParams();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchId, setBatchId] = useState<string>(search.get("batch") || "");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Record<string, Attendance>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!hasAccess) return;
    supabase.from("crm_batches").select("id,name,course_name_snapshot").order("created_at", { ascending: false })
      .then(({ data }) => setBatches((data ?? []) as Batch[]));
  }, [hasAccess]);

  useEffect(() => {
    if (batchId) {
      const next = new URLSearchParams(search);
      next.set("batch", batchId);
      setSearch(next, { replace: true });
    }
  }, [batchId]);

  const [workingDaysCount, setWorkingDaysCount] = useState<number>(0);

  const loadRoster = async () => {
    if (!batchId || !date) return;
    setLoading(true);
    const [rsRes, existingRes, wdRes] = await Promise.all([
      supabase.from("crm_students").select("id,full_name,enrolment_no,phone").eq("batch_id", batchId).order("full_name"),
      supabase.from("crm_attendance").select("id,student_id,status,notes").eq("batch_id", batchId).eq("attended_on", date),
      supabase.from("crm_attendance").select("attended_on").eq("batch_id", batchId),
    ]);
    if (rsRes.error) throw new Error(rsRes.error.message);
    const { data: rs } = rsRes;
    const { data: existing } = existingRes;
    const { data: wd } = wdRes;
    const list = (rs ?? []) as Student[];
    setStudents(list);
    const m: Record<string, Attendance> = {};
    list.forEach((s) => { m[s.id] = { student_id: s.id, status: "present" }; });
    (existing ?? []).forEach((e) => {
      m[e.student_id] = { id: e.id, student_id: e.student_id, status: e.status, notes: e.notes };
    });
    setMarks(m);
    const set = new Set((wd ?? []).map((r: { attended_on: string }) => r.attended_on));
    setWorkingDaysCount(set.size);
    setLoading(false);
  };

  useEffect(() => { loadRoster(); }, [batchId, date]);

  const summary = useMemo(() => {
    const acc = { present: 0, absent: 0, late: 0, excused: 0 };
    Object.values(marks).forEach((m) => { (acc as never as Record<string, number>)[m.status]++; });
    return acc;
  }, [marks]);

  const setStatus = (sid: string, s: string) => {
    setMarks((m) => ({ ...m, [sid]: { ...(m[sid] || { student_id: sid, status: s }), status: s } }));
  };

  const markAll = (s: string) => {
    setMarks((m) => {
      const next: Record<string, Attendance> = {};
      Object.entries(m).forEach(([k, v]) => { next[k] = { ...v, status: s }; });
      return next;
    });
  };

  const save = async () => {
    if (!batchId || students.length === 0) { toast.error("No students to mark"); return; }
    setSaving(true);
    const rows = Object.values(marks).map((m) => ({
      batch_id: batchId,
      student_id: m.student_id,
      attended_on: date,
      status: m.status as never,
      notes: m.notes ?? null,
      marked_by: user?.id,
    }));
    const { error } = await supabase.from("crm_attendance").upsert(rows, { onConflict: "batch_id,student_id,attended_on" });
    if (error) { toast.error(error.message); setSaving(false); return; }
    await logAudit("crm_attendance", "bulk_mark", batchId, { date, count: rows.length });
    toast.success(`Attendance saved for ${rows.length} students`);
    setSaving(false);
    loadRoster();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Mark batch attendance day-by-day. Defaults to all present."
      />

      <Card>
        <CardHeader><CardTitle className="text-base">Pick batch & date</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label>Batch</Label>
            <Select value={batchId} onValueChange={setBatchId}>
              <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
              <SelectContent>
                {batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name} {b.course_name_snapshot ? `· ${b.course_name_snapshot}` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={save} disabled={saving || !batchId || students.length === 0} className="w-full">
              <Save className="w-4 h-4 mr-2" /> {saving ? "Saving…" : "Save attendance"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {batchId && (
        <div className="flex items-center justify-between text-sm bg-muted/40 border rounded-lg px-4 py-2">
          <div>📅 Working days marked so far: <span className="font-bold">{workingDaysCount}</span></div>
          <a className="text-primary hover:underline text-xs" href={`/crm/batches/${batchId}/report`}>View full report →</a>
        </div>
      )}

      {batchId && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {STATUSES.map((s) => (
              <button key={s} onClick={() => markAll(s)} className="text-left">
                <Card className="hover:bg-accent transition">
                  <CardContent className="pt-4">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Mark all {s}</div>
                    <div className="text-2xl font-bold mt-1 capitalize">{(summary as Record<string, number>)[s]}</div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-4 h-4" /> Roster ({students.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground py-4">Loading…</p>
              ) : students.length === 0 ? (
                <p className="text-muted-foreground py-6 text-center">No students assigned to this batch yet. Assign students from their profile.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Enrolment №</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s) => {
                      const cur = marks[s.id]?.status || "present";
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.full_name}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {s.enrolment_no || <Badge variant="outline">{s.phone}</Badge>}
                          </TableCell>
                          <TableCell>
                            <ToggleGroup type="single" value={cur} onValueChange={(v) => v && setStatus(s.id, v)} className="justify-start">
                              {STATUSES.map((st) => (
                                <ToggleGroupItem key={st} value={st} className={`text-xs h-8 px-3 ${colors[st]}`}>
                                  {st}
                                </ToggleGroupItem>
                              ))}
                            </ToggleGroup>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
