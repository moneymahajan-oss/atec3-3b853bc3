import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useCrmAuth } from "../hooks/useCrmAuth";
import { logAudit } from "../lib/audit";
import { toast } from "sonner";

type Batch = {
  id: string; name: string; course_id: string | null; course_name_snapshot: string | null;
  start_date: string | null; end_date: string | null; schedule: string | null; timing: string | null;
  capacity: number; status: string; faculty_name: string | null; notes: string | null;
};
type Course = { id: string; name: string };

const statusColors: Record<string, string> = {
  planned: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  running: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

const empty: Partial<Batch> = {
  name: "", course_id: null, start_date: "", end_date: "",
  schedule: "", timing: "", capacity: 30, status: "planned", faculty_name: "", notes: "",
};

export default function CrmBatches() {
  const navigate = useNavigate();
  const { isAdmin, user, hasAccess } = useCrmAuth();
  const [items, setItems] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [liveCounts, setLiveCounts] = useState<Record<string, number>>({});
  const [workingDays, setWorkingDays] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Batch>>(empty);

  const load = async () => {
    setLoading(true);
    const [bRes, cRes, lsRes, atRes] = await Promise.all([
      supabase.from("crm_batches").select("*").order("created_at", { ascending: false }),
      supabase.from("crm_courses").select("id,name").eq("is_active", true).order("name"),
      supabase.from("crm_students").select("batch_id").eq("status", "active"),
      supabase.from("crm_attendance").select("batch_id,attended_on"),
    ]);
    if (bRes.error) throw new Error(bRes.error.message);
    const { data: b } = bRes;
    const { data: c } = cRes;
    const { data: ls } = lsRes;
    const { data: at } = atRes;
    setItems((b ?? []) as Batch[]);
    setCourses((c ?? []) as Course[]);
    const lc: Record<string, number> = {};
    (ls ?? []).forEach((r: { batch_id: string | null }) => {
      if (r.batch_id) lc[r.batch_id] = (lc[r.batch_id] || 0) + 1;
    });
    setLiveCounts(lc);
    const wd: Record<string, Set<string>> = {};
    (at ?? []).forEach((r: { batch_id: string; attended_on: string }) => {
      (wd[r.batch_id] ||= new Set()).add(r.attended_on);
    });
    const wdMap: Record<string, number> = {};
    Object.entries(wd).forEach(([k, v]) => { wdMap[k] = v.size; });
    setWorkingDays(wdMap);
    setLoading(false);
  };
  useEffect(() => { if (hasAccess) load(); }, [hasAccess]);

  const filtered = useMemo(() => items.filter((b) => {
    if (status !== "all" && b.status !== status) return false;
    if (!q) return true;
    const t = q.toLowerCase();
    return b.name.toLowerCase().includes(t)
      || (b.course_name_snapshot ?? "").toLowerCase().includes(t)
      || (b.faculty_name ?? "").toLowerCase().includes(t);
  }), [items, q, status]);

  const set = <K extends keyof Batch>(k: K, v: Batch[K]) => setEditing((e) => ({ ...e, [k]: v }));

  const save = async () => {
    if (!editing.name) { toast.error("Batch name required"); return; }
    const courseRow = courses.find((c) => c.id === editing.course_id);
    const payload = {
      name: editing.name!.trim(),
      course_id: editing.course_id || null,
      course_name_snapshot: courseRow?.name ?? editing.course_name_snapshot ?? null,
      start_date: editing.start_date || null,
      end_date: editing.end_date || null,
      schedule: editing.schedule || null,
      timing: editing.timing || null,
      capacity: Number(editing.capacity) || 30,
      status: (editing.status || "planned") as never,
      faculty_name: editing.faculty_name || null,
      notes: editing.notes || null,
    };
    if (editing.id) {
      const { error } = await supabase.from("crm_batches").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      await logAudit("crm_batches", "update", editing.id, payload);
    } else {
      const { data, error } = await supabase.from("crm_batches").insert({ ...payload, created_by: user?.id }).select("id").maybeSingle();
      if (error) { toast.error(error.message); return; }
      await logAudit("crm_batches", "create", data?.id, payload);
    }
    toast.success("Saved");
    setOpen(false); setEditing(empty); load();
  };

  const remove = async (b: Batch) => {
    if (!confirm(`Delete batch "${b.name}"?`)) return;
    const { error } = await supabase.from("crm_batches").delete().eq("id", b.id);
    if (error) { toast.error(error.message); return; }
    await logAudit("crm_batches", "delete", b.id);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Batches"
        description="Plan and manage class batches with schedules and capacity."
        actions={<Button onClick={() => { setEditing(empty); setOpen(true); }}><Plus className="w-4 h-4 mr-2" /> New Batch</Button>}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search batch, course, faculty…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-44"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="planned">Planned</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Live / Cap</TableHead>
              <TableHead>Working days</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">No batches yet.</TableCell></TableRow>
            ) : filtered.map((b) => {
              const live = liveCounts[b.id] || 0;
              const ratio = b.capacity > 0 ? live / b.capacity : 0;
              const liveCls = ratio >= 1 ? "text-rose-600 dark:text-rose-400 font-semibold"
                : ratio >= 0.8 ? "text-amber-600 dark:text-amber-400 font-semibold" : "";
              return (
              <TableRow key={b.id}>
                <TableCell>
                  <div className="font-medium">{b.name}</div>
                  {b.faculty_name && <div className="text-xs text-muted-foreground">Faculty: {b.faculty_name}</div>}
                </TableCell>
                <TableCell className="text-sm">{b.course_name_snapshot || "—"}</TableCell>
                <TableCell className="text-sm">
                  <div>{b.schedule || "—"}</div>
                  {b.timing && <div className="text-xs text-muted-foreground">{b.timing}</div>}
                </TableCell>
                <TableCell className="text-sm">{b.start_date || "—"} → {b.end_date || "—"}</TableCell>
                <TableCell className={`text-sm font-mono ${liveCls}`}>{live} / {b.capacity}</TableCell>
                <TableCell className="text-sm font-mono">{workingDays[b.id] || 0}</TableCell>
                <TableCell><Badge variant="secondary" className={statusColors[b.status] || ""}>{b.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/crm/attendance?batch=${b.id}`)}>Mark</Button>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/crm/batches/${b.id}/report`)}>Report</Button>
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(b); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                    {isAdmin && <Button size="icon" variant="ghost" onClick={() => remove(b)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
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
          <DialogHeader><DialogTitle>{editing.id ? "Edit Batch" : "New Batch"}</DialogTitle></DialogHeader>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Batch name *</Label>
              <Input value={editing.name ?? ""} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Tally Morning Batch — Aug 2025" />
            </div>
            <div>
              <Label>Course</Label>
              <Select value={editing.course_id ?? "none"} onValueChange={(v) => set("course_id", v === "none" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={editing.status ?? "planned"} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["planned","running","completed","cancelled"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Start date</Label><Input type="date" value={editing.start_date ?? ""} onChange={(e) => set("start_date", e.target.value)} /></div>
            <div><Label>End date</Label><Input type="date" value={editing.end_date ?? ""} onChange={(e) => set("end_date", e.target.value)} /></div>
            <div><Label>Schedule</Label><Input value={editing.schedule ?? ""} onChange={(e) => set("schedule", e.target.value)} placeholder="Mon-Sat" /></div>
            <div><Label>Timing</Label><Input value={editing.timing ?? ""} onChange={(e) => set("timing", e.target.value)} placeholder="10:00 AM – 12:00 PM" /></div>
            <div><Label>Capacity</Label><Input type="number" value={editing.capacity ?? 30} onChange={(e) => set("capacity", Number(e.target.value))} /></div>
            <div><Label>Faculty</Label><Input value={editing.faculty_name ?? ""} onChange={(e) => set("faculty_name", e.target.value)} /></div>
            <div className="sm:col-span-2"><Label>Notes</Label><Textarea rows={2} value={editing.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
