import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ClipboardCheck } from "lucide-react";

type Row = {
  id: string;
  attended_on: string;
  status: string;
  notes: string | null;
  batch_id: string;
};

const colors: Record<string, string> = {
  present: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  absent: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  late: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  excused: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
};

export function StudentAttendanceCard({ studentId }: { studentId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [batches, setBatches] = useState<Record<string, string>>({});
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("crm_attendance")
        .select("id,attended_on,status,notes,batch_id")
        .eq("student_id", studentId)
        .order("attended_on", { ascending: false });
      const list = (data ?? []) as Row[];
      setRows(list);
      const ids = Array.from(new Set(list.map((r) => r.batch_id)));
      if (ids.length) {
        const { data: bs } = await supabase.from("crm_batches").select("id,name").in("id", ids);
        const map: Record<string, string> = {};
        (bs ?? []).forEach((b: { id: string; name: string }) => { map[b.id] = b.name; });
        setBatches(map);
      }
      setLoading(false);
    })();
  }, [studentId]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (from && r.attended_on < from) return false;
    if (to && r.attended_on > to) return false;
    return true;
  }), [rows, from, to]);

  const summary = useMemo(() => {
    const total = filtered.length;
    const present = filtered.filter((r) => r.status === "present").length;
    const absent = filtered.filter((r) => r.status === "absent").length;
    const late = filtered.filter((r) => r.status === "late").length;
    const excused = filtered.filter((r) => r.status === "excused").length;
    const pct = total ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, late, excused, pct };
  }, [filtered]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="w-4 h-4" /> Attendance history
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Stat label="Working days" value={summary.total} />
          <Stat label="Present" value={summary.present} tone="emerald" />
          <Stat label="Absent" value={summary.absent} tone="rose" />
          <Stat label="Late / Exc." value={summary.late + summary.excused} tone="amber" />
          <Stat label="Attendance %" value={`${summary.pct}%`} tone={summary.pct >= 75 ? "emerald" : "rose"} />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label className="text-xs">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label className="text-xs">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground py-4">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No attendance records.</p>
        ) : (
          <div className="rounded border max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{r.attended_on}</TableCell>
                    <TableCell className="text-sm">{batches[r.batch_id] || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={colors[r.status] || ""}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.notes || ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: "emerald" | "rose" | "amber" }) {
  const cls = tone === "emerald" ? "text-emerald-700 dark:text-emerald-300"
    : tone === "rose" ? "text-rose-700 dark:text-rose-300"
    : tone === "amber" ? "text-amber-700 dark:text-amber-300" : "";
  return (
    <div className="rounded-lg border p-3 bg-card">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold ${cls}`}>{value}</div>
    </div>
  );
}
