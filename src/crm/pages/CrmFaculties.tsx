import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus, Search, Filter, Pencil, Trash2, Download, ArrowLeft, ExternalLink,
  Users, BookOpen, Activity, GraduationCap, Eye, EyeOff,
} from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { useCrmAuth } from "../hooks/useCrmAuth";
import { logAudit } from "../lib/audit";
import { toast } from "sonner";

type Faculty = {
  id: string; name: string; slug: string | null;
  designation: string | null; qualifications: string | null; specialization: string | null;
  bio: string | null; photo_url: string | null;
  email: string | null; phone: string | null;
  experience_years: number | null; joined_on: string | null;
  linkedin_url: string | null; instagram_url: string | null;
  display_order: number; is_active: boolean; is_public: boolean;
};
type Batch = {
  id: string; name: string; faculty_name: string | null;
  course_name_snapshot: string | null; status: string; capacity: number;
  start_date: string | null; end_date: string | null;
  schedule: string | null; timing: string | null;
};
type Student = {
  id: string; full_name: string; phone: string;
  course_name_snapshot: string | null; batch_id: string | null;
  status: string; enrolment_date: string | null;
};
type Att = { batch_id: string; attended_on: string };

const statusColors: Record<string, string> = {
  planned: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  running: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  inactive: "bg-muted text-muted-foreground",
};

const empty: Partial<Faculty> = {
  name: "", designation: "", qualifications: "", specialization: "",
  bio: "", photo_url: "", email: "", phone: "",
  experience_years: null, joined_on: "",
  linkedin_url: "", instagram_url: "",
  display_order: 0, is_active: true, is_public: true,
};

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

const overlapsRange = (b: Batch, from: string, to: string) => {
  const bStart = b.start_date || "0000-01-01";
  const bEnd = b.end_date || "9999-12-31";
  return bStart <= to && bEnd >= from;
};

export default function CrmFaculties() {
  const navigate = useNavigate();
  const { isAdmin, hasAccess } = useCrmAuth();
  const [params, setParams] = useSearchParams();

  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [att, setAtt] = useState<Att[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const yearStart = `${today.getFullYear()}-01-01`;
  const todayStr = today.toISOString().slice(0, 10);
  const [from, setFrom] = useState(params.get("from") || yearStart);
  const [to, setTo] = useState(params.get("to") || todayStr);
  const [statusFilter, setStatusFilter] = useState<string>(params.get("status") || "all");
  const [q, setQ] = useState("");
  const selectedSlug = params.get("faculty") || "";

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Faculty>>(empty);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: f }, { data: b }, { data: s }, { data: a }] = await Promise.all([
      supabase.from("crm_faculties").select("*").order("display_order").order("name"),
      supabase.from("crm_batches").select("id,name,faculty_name,course_name_snapshot,status,capacity,start_date,end_date,schedule,timing"),
      supabase.from("crm_students").select("id,full_name,phone,course_name_snapshot,batch_id,status,enrolment_date"),
      supabase.from("crm_attendance").select("batch_id,attended_on"),
    ]);
    setFaculties((f ?? []) as Faculty[]);
    setBatches((b ?? []) as Batch[]);
    setStudents((s ?? []) as Student[]);
    setAtt((a ?? []) as Att[]);
    setLoading(false);
  };
  useEffect(() => { if (hasAccess) load(); }, [hasAccess]);

  const selectedFaculty = useMemo(
    () => faculties.find((f) => f.slug === selectedSlug) || null,
    [faculties, selectedSlug]
  );

  // Group everything by normalized faculty name
  const byBatchId = useMemo(() => {
    const m: Record<string, Batch> = {};
    batches.forEach((b) => { m[b.id] = b; });
    return m;
  }, [batches]);

  type FacRow = {
    faculty: Faculty | { id: string; name: string; slug: null; is_public: false; is_active: true; designation: null; photo_url: null };
    key: string;
    totalBatches: number; runningBatches: number;
    totalStudents: number; activeStudents: number;
    workingDays: number;
    isUnregistered: boolean;
  };

  const facultyRows: FacRow[] = useMemo(() => {
    // Build map keyed by lowercase name across both faculties table and batches.faculty_name
    const map = new Map<string, FacRow>();
    faculties.forEach((f) => {
      map.set(norm(f.name), {
        faculty: f, key: norm(f.name),
        totalBatches: 0, runningBatches: 0,
        totalStudents: 0, activeStudents: 0, workingDays: 0,
        isUnregistered: false,
      });
    });

    const inRange = (b: Batch) => overlapsRange(b, from, to)
      && (statusFilter === "all" || b.status === statusFilter);

    batches.forEach((b) => {
      const k = norm(b.faculty_name);
      if (!k) return;
      if (!map.has(k)) {
        map.set(k, {
          faculty: { id: `unreg-${k}`, name: b.faculty_name!.trim(), slug: null, is_public: false, is_active: true, designation: null, photo_url: null },
          key: k,
          totalBatches: 0, runningBatches: 0,
          totalStudents: 0, activeStudents: 0, workingDays: 0,
          isUnregistered: true,
        });
      }
      if (!inRange(b)) return;
      const row = map.get(k)!;
      row.totalBatches += 1;
      if (b.status === "running") row.runningBatches += 1;
    });

    students.forEach((s) => {
      if (!s.batch_id) return;
      const b = byBatchId[s.batch_id];
      if (!b) return;
      const k = norm(b.faculty_name);
      if (!k || !map.has(k)) return;
      if (!inRange(b)) return;
      const row = map.get(k)!;
      row.totalStudents += 1;
      if (s.status === "active") row.activeStudents += 1;
    });

    const wd = new Map<string, Set<string>>();
    att.forEach((r) => {
      if (r.attended_on < from || r.attended_on > to) return;
      const b = byBatchId[r.batch_id];
      if (!b) return;
      const k = norm(b.faculty_name);
      if (!k || !map.has(k)) return;
      if (statusFilter !== "all" && b.status !== statusFilter) return;
      (wd.get(k) ?? wd.set(k, new Set()).get(k)!).add(r.attended_on);
    });
    wd.forEach((set, k) => { const r = map.get(k); if (r) r.workingDays = set.size; });

    return Array.from(map.values());
  }, [faculties, batches, students, att, byBatchId, from, to, statusFilter]);

  const filteredRows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return facultyRows
      .filter((r) => !t || r.faculty.name.toLowerCase().includes(t) || (r.faculty as Faculty).designation?.toLowerCase().includes(t))
      .sort((a, b) => b.activeStudents - a.activeStudents || b.totalBatches - a.totalBatches || a.faculty.name.localeCompare(b.faculty.name));
  }, [facultyRows, q]);

  // Detail view derivations
  const detailBatches = useMemo(() => {
    if (!selectedFaculty) return [] as (Batch & { live: number; workingDays: number })[];
    const k = norm(selectedFaculty.name);
    const live: Record<string, number> = {};
    students.forEach((s) => {
      if (s.status === "active" && s.batch_id) live[s.batch_id] = (live[s.batch_id] || 0) + 1;
    });
    const wd: Record<string, Set<string>> = {};
    att.forEach((r) => {
      if (r.attended_on < from || r.attended_on > to) return;
      (wd[r.batch_id] ||= new Set()).add(r.attended_on);
    });
    return batches
      .filter((b) => norm(b.faculty_name) === k && overlapsRange(b, from, to)
        && (statusFilter === "all" || b.status === statusFilter))
      .map((b) => ({ ...b, live: live[b.id] || 0, workingDays: (wd[b.id]?.size) || 0 }))
      .sort((a, b) => (b.start_date || "").localeCompare(a.start_date || ""));
  }, [selectedFaculty, batches, students, att, from, to, statusFilter]);

  const detailStudents = useMemo(() => {
    if (!selectedFaculty) return [] as Student[];
    const k = norm(selectedFaculty.name);
    const okBatchIds = new Set(batches.filter((b) => norm(b.faculty_name) === k).map((b) => b.id));
    return students
      .filter((s) => s.batch_id && okBatchIds.has(s.batch_id))
      .filter((s) => !s.enrolment_date || (s.enrolment_date >= from && s.enrolment_date <= to))
      .sort((a, b) => (b.enrolment_date || "").localeCompare(a.enrolment_date || ""));
  }, [selectedFaculty, batches, students, from, to]);

  // Persist filters into URL
  useEffect(() => {
    const next = new URLSearchParams(params);
    next.set("from", from); next.set("to", to);
    if (statusFilter !== "all") next.set("status", statusFilter); else next.delete("status");
    if (selectedSlug) next.set("faculty", selectedSlug); else next.delete("faculty");
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, statusFilter]);

  const set = <K extends keyof Faculty>(k: K, v: Faculty[K]) =>
    setEditing((e) => ({ ...e, [k]: v }));

  const onPhoto = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `faculty/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("crm-faculty-photos").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("crm-faculty-photos").getPublicUrl(path);
      set("photo_url", data.publicUrl);
      toast.success("Photo uploaded");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!editing.name?.trim()) { toast.error("Name required"); return; }
    const payload = {
      name: editing.name.trim(),
      designation: editing.designation || null,
      qualifications: editing.qualifications || null,
      specialization: editing.specialization || null,
      bio: editing.bio || null,
      photo_url: editing.photo_url || null,
      email: editing.email || null,
      phone: editing.phone || null,
      experience_years: editing.experience_years ?? null,
      joined_on: editing.joined_on || null,
      linkedin_url: editing.linkedin_url || null,
      instagram_url: editing.instagram_url || null,
      display_order: Number(editing.display_order ?? 0),
      is_active: editing.is_active ?? true,
      is_public: editing.is_public ?? true,
    };
    if (editing.id) {
      const { error } = await supabase.from("crm_faculties").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      await logAudit("crm_faculties", "update", editing.id, payload);
    } else {
      const { data, error } = await supabase.from("crm_faculties").insert(payload).select("id").maybeSingle();
      if (error) { toast.error(error.message); return; }
      await logAudit("crm_faculties", "create", data?.id, payload);
    }
    toast.success("Saved");
    setOpen(false); setEditing(empty); load();
  };

  const remove = async (f: Faculty) => {
    if (!confirm(`Delete faculty "${f.name}"?`)) return;
    const { error } = await supabase.from("crm_faculties").delete().eq("id", f.id);
    if (error) { toast.error(error.message); return; }
    await logAudit("crm_faculties", "delete", f.id);
    toast.success("Deleted"); load();
  };

  const togglePublic = async (f: Faculty, v: boolean) => {
    const { error } = await supabase.from("crm_faculties").update({ is_public: v }).eq("id", f.id);
    if (error) { toast.error(error.message); return; }
    setFaculties((arr) => arr.map((x) => x.id === f.id ? { ...x, is_public: v } : x));
  };

  const promoteUnregistered = (name: string) => {
    setEditing({ ...empty, name });
    setOpen(true);
  };

  const selectFaculty = (slugOrUnreg: string | null) => {
    const next = new URLSearchParams(params);
    if (slugOrUnreg) next.set("faculty", slugOrUnreg); else next.delete("faculty");
    setParams(next, { replace: true });
  };

  const exportXlsx = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filteredRows.map((r) => ({
      Name: r.faculty.name,
      Designation: (r.faculty as Faculty).designation || "",
      "Total batches": r.totalBatches,
      "Running batches": r.runningBatches,
      "Total students": r.totalStudents,
      "Active students": r.activeStudents,
      "Working days": r.workingDays,
      Public: !r.isUnregistered && (r.faculty as Faculty).is_public ? "Yes" : "No",
    }))), "Faculties");
    if (selectedFaculty) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailBatches.map((b) => ({
        Batch: b.name, Course: b.course_name_snapshot || "",
        Schedule: b.schedule || "", Timing: b.timing || "",
        Start: b.start_date || "", End: b.end_date || "",
        Live: b.live, Capacity: b.capacity, "Working days": b.workingDays, Status: b.status,
      }))), "Batches");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailStudents.map((s) => ({
        Name: s.full_name, Phone: s.phone, Course: s.course_name_snapshot || "",
        "Enrolment date": s.enrolment_date || "", Status: s.status,
      }))), "Students");
    }
    XLSX.writeFile(wb, `faculties-${from}-to-${to}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faculties"
        description="Trainer profiles synchronised with the public website. Filter by faculty and date range to see batches and students they handle."
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={exportXlsx}><Download className="w-4 h-4 mr-2" /> Export</Button>
            {isAdmin && (
              <Button onClick={() => { setEditing(empty); setOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" /> New Faculty
              </Button>
            )}
          </div>
        }
      />

      {/* Filters */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search faculty…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <div>
          <Label className="text-xs">From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Batch status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Detail view */}
      {selectedFaculty ? (
        <>
          <Button variant="ghost" size="sm" onClick={() => selectFaculty(null)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to all faculties
          </Button>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                {selectedFaculty.photo_url ? (
                  <img src={selectedFaculty.photo_url} alt={selectedFaculty.name} className="w-24 h-24 rounded-xl object-cover border" />
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                    <GraduationCap className="w-10 h-10" />
                  </div>
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-heading font-bold">{selectedFaculty.name}</h2>
                    {selectedFaculty.is_public ? (
                      <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"><Eye className="w-3 h-3 mr-1" /> Public</Badge>
                    ) : (
                      <Badge variant="secondary"><EyeOff className="w-3 h-3 mr-1" /> Hidden</Badge>
                    )}
                    {!selectedFaculty.is_active && <Badge variant="secondary" className="bg-rose-500/15 text-rose-700 dark:text-rose-300">Inactive</Badge>}
                  </div>
                  {selectedFaculty.designation && <p className="text-sm text-muted-foreground">{selectedFaculty.designation}</p>}
                  {selectedFaculty.specialization && <p className="text-sm">{selectedFaculty.specialization}</p>}
                  <div className="text-xs text-muted-foreground space-x-3 pt-1">
                    {selectedFaculty.email && <span>✉ {selectedFaculty.email}</span>}
                    {selectedFaculty.phone && <span>☎ {selectedFaculty.phone}</span>}
                    {selectedFaculty.experience_years != null && <span>{selectedFaculty.experience_years}+ yrs experience</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {selectedFaculty.is_public && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/faculty/${selectedFaculty.slug}`} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" /> Public profile
                      </a>
                    </Button>
                  )}
                  {isAdmin && (
                    <Button size="sm" onClick={() => { setEditing(selectedFaculty); setOpen(true); }}>
                      <Pencil className="w-4 h-4 mr-2" /> Edit
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Total batches", value: detailBatches.length, icon: BookOpen },
              { label: "Running batches", value: detailBatches.filter((b) => b.status === "running").length, icon: Activity },
              { label: "Active students", value: detailStudents.filter((s) => s.status === "active").length, icon: Users },
              { label: "Total students", value: detailStudents.length, icon: GraduationCap },
            ].map((kpi) => (
              <Card key={kpi.label}>
                <CardContent className="pt-6 flex items-center gap-3">
                  <kpi.icon className="w-8 h-8 text-muted-foreground" />
                  <div>
                    <div className="text-2xl font-bold">{kpi.value}</div>
                    <div className="text-xs text-muted-foreground">{kpi.label}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Batches */}
          <Card>
            <CardHeader><CardTitle>Batches ({detailBatches.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
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
                    {detailBatches.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No batches in selected range.</TableCell></TableRow>
                    ) : detailBatches.map((b) => {
                      const ratio = b.capacity > 0 ? b.live / b.capacity : 0;
                      const liveCls = ratio >= 1 ? "text-rose-600 dark:text-rose-400 font-semibold"
                        : ratio >= 0.8 ? "text-amber-600 dark:text-amber-400 font-semibold" : "";
                      return (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">{b.name}</TableCell>
                          <TableCell className="text-sm">{b.course_name_snapshot || "—"}</TableCell>
                          <TableCell className="text-sm">
                            <div>{b.schedule || "—"}</div>
                            {b.timing && <div className="text-xs text-muted-foreground">{b.timing}</div>}
                          </TableCell>
                          <TableCell className="text-sm">{b.start_date || "—"} → {b.end_date || "—"}</TableCell>
                          <TableCell className={`text-sm font-mono ${liveCls}`}>{b.live} / {b.capacity}</TableCell>
                          <TableCell className="text-sm font-mono">{b.workingDays}</TableCell>
                          <TableCell><Badge variant="secondary" className={statusColors[b.status] || ""}>{b.status}</Badge></TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => navigate(`/crm/attendance?batch=${b.id}`)}>Mark</Button>
                              <Button size="sm" variant="outline" onClick={() => navigate(`/crm/batches/${b.id}/report`)}>Report</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Students */}
          <Card>
            <CardHeader><CardTitle>Students handled ({detailStudents.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Enrolled</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailStudents.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No students in selected range.</TableCell></TableRow>
                    ) : detailStudents.map((s) => {
                      const b = s.batch_id ? byBatchId[s.batch_id] : null;
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.full_name}</TableCell>
                          <TableCell className="text-sm font-mono">{s.phone}</TableCell>
                          <TableCell className="text-sm">{s.course_name_snapshot || "—"}</TableCell>
                          <TableCell className="text-sm">{b?.name || "—"}</TableCell>
                          <TableCell className="text-sm">{s.enrolment_date || "—"}</TableCell>
                          <TableCell><Badge variant="secondary" className={statusColors[s.status] || ""}>{s.status}</Badge></TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => navigate(`/crm/students/${s.id}`)}>Open</Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Faculty</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead className="text-right">Batches</TableHead>
                <TableHead className="text-right">Running</TableHead>
                <TableHead className="text-right">Active</TableHead>
                <TableHead className="text-right">Total students</TableHead>
                <TableHead className="text-right">Working days</TableHead>
                <TableHead>On website</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filteredRows.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">No faculties yet.</TableCell></TableRow>
              ) : filteredRows.map((r) => {
                const f = r.faculty as Faculty;
                return (
                  <TableRow key={r.key} className="cursor-pointer" onClick={() => !r.isUnregistered && f.slug && selectFaculty(f.slug)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {f.photo_url ? (
                          <img src={f.photo_url} alt={f.name} className="w-9 h-9 rounded-full object-cover border" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
                            {f.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{f.name}</div>
                          {r.isUnregistered && <div className="text-xs text-amber-600 dark:text-amber-400">Not in faculty list</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{f.designation || "—"}</TableCell>
                    <TableCell className="text-right font-mono">{r.totalBatches}</TableCell>
                    <TableCell className="text-right font-mono">{r.runningBatches}</TableCell>
                    <TableCell className="text-right font-mono text-emerald-600 dark:text-emerald-400">{r.activeStudents}</TableCell>
                    <TableCell className="text-right font-mono">{r.totalStudents}</TableCell>
                    <TableCell className="text-right font-mono">{r.workingDays}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {r.isUnregistered ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <Switch checked={f.is_public} onCheckedChange={(v) => togglePublic(f, v)} disabled={!isAdmin} />
                      )}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex gap-1">
                        {r.isUnregistered ? (
                          isAdmin && <Button size="sm" variant="outline" onClick={() => promoteUnregistered(f.name)}>Add to list</Button>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" onClick={() => f.slug && selectFaculty(f.slug)}>View</Button>
                            {isAdmin && <Button size="icon" variant="ghost" onClick={() => { setEditing(f); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>}
                            {isAdmin && <Button size="icon" variant="ghost" onClick={() => remove(f)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
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
      )}

      {/* Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing.id ? "Edit Faculty" : "New Faculty"}</DialogTitle></DialogHeader>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 flex items-center gap-4">
              {editing.photo_url ? (
                <img src={editing.photo_url} alt="" className="w-20 h-20 rounded-xl object-cover border" />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                  <GraduationCap className="w-8 h-8" />
                </div>
              )}
              <div className="flex-1">
                <Label>Photo</Label>
                <Input type="file" accept="image/*" disabled={uploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhoto(f); }} />
                {uploading && <p className="text-xs text-muted-foreground mt-1">Uploading…</p>}
              </div>
            </div>
            <div className="sm:col-span-2"><Label>Name *</Label><Input value={editing.name ?? ""} onChange={(e) => set("name", e.target.value)} /></div>
            <div><Label>Designation</Label><Input value={editing.designation ?? ""} onChange={(e) => set("designation", e.target.value)} placeholder="Senior Trainer — Tally & GST" /></div>
            <div><Label>Specialization</Label><Input value={editing.specialization ?? ""} onChange={(e) => set("specialization", e.target.value)} placeholder="Tally, GST, Accounting" /></div>
            <div><Label>Qualifications</Label><Input value={editing.qualifications ?? ""} onChange={(e) => set("qualifications", e.target.value)} placeholder="M.Com, CA Inter" /></div>
            <div><Label>Experience (years)</Label><Input type="number" value={editing.experience_years ?? ""} onChange={(e) => set("experience_years", e.target.value === "" ? null : Number(e.target.value))} /></div>
            <div><Label>Email</Label><Input type="email" value={editing.email ?? ""} onChange={(e) => set("email", e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={editing.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></div>
            <div><Label>Joined on</Label><Input type="date" value={editing.joined_on ?? ""} onChange={(e) => set("joined_on", e.target.value)} /></div>
            <div><Label>Display order</Label><Input type="number" value={editing.display_order ?? 0} onChange={(e) => set("display_order", Number(e.target.value))} /></div>
            <div><Label>LinkedIn URL</Label><Input value={editing.linkedin_url ?? ""} onChange={(e) => set("linkedin_url", e.target.value)} /></div>
            <div><Label>Instagram URL</Label><Input value={editing.instagram_url ?? ""} onChange={(e) => set("instagram_url", e.target.value)} /></div>
            <div className="sm:col-span-2"><Label>Bio (public)</Label><Textarea rows={4} value={editing.bio ?? ""} onChange={(e) => set("bio", e.target.value)} /></div>
            <div className="flex items-center gap-2"><Switch checked={editing.is_active ?? true} onCheckedChange={(v) => set("is_active", v)} /><Label>Active (employed)</Label></div>
            <div className="flex items-center gap-2"><Switch checked={editing.is_public ?? true} onCheckedChange={(v) => set("is_public", v)} /><Label>Show on public website</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={uploading}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
