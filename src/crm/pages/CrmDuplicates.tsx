import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ExternalLink, RefreshCw, ShieldCheck, Phone, User as UserIcon, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "../components/PageHeader";
import { useCrmAuth } from "../hooks/useCrmAuth";
import { levenshtein } from "../lib/dedupe";
import { logAudit } from "../lib/audit";
import { toast } from "sonner";

type Row = {
  kind: "enquiry" | "student";
  id: string;
  name: string;
  phone: string;
  course: string;
  status: string;
  created_at: string;
  extra: string;
};

type PhoneGroup = { phone: string; rows: Row[] };
type NameGroup = { canonical: string; rows: Row[] };

export default function CrmDuplicates() {
  const navigate = useNavigate();
  const { isAdmin, user } = useCrmAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [phoneGroups, setPhoneGroups] = useState<PhoneGroup[]>([]);
  const [nameGroups, setNameGroups] = useState<NameGroup[]>([]);
  const [exceptions, setExceptions] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [renameTarget, setRenameTarget] = useState<Row | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [exceptionTarget, setExceptionTarget] = useState<PhoneGroup | null>(null);
  const [exceptionNote, setExceptionNote] = useState("");

  const load = async () => {
    setRefreshing(true);
    const [eRes, sRes, exRes] = await Promise.all([
      supabase.from("crm_enquiries").select("id,name,phone,course_name_snapshot,status,created_at,email").not("phone", "is", null),
      supabase.from("crm_students").select("id,full_name,phone,course_name_snapshot,status,created_at,enrolment_no").not("phone", "is", null),
      supabase.from("crm_duplicate_exceptions").select("key_type,key_value"),
    ]);

    const all: Row[] = [];
    (eRes.data || []).forEach((r: { id: string; name: string; phone: string; course_name_snapshot: string | null; status: string; created_at: string; email: string | null }) => all.push({
      kind: "enquiry", id: r.id, name: r.name, phone: r.phone || "",
      course: r.course_name_snapshot || "", status: r.status,
      created_at: r.created_at, extra: r.email || "",
    }));
    (sRes.data || []).forEach((r: { id: string; full_name: string; phone: string; course_name_snapshot: string | null; status: string; created_at: string; enrolment_no: string | null }) => all.push({
      kind: "student", id: r.id, name: r.full_name, phone: r.phone || "",
      course: r.course_name_snapshot || "", status: r.status,
      created_at: r.created_at, extra: r.enrolment_no || "",
    }));

    const exSet = new Set((exRes.data || []).map((e: { key_type: string; key_value: string }) => `${e.key_type}:${e.key_value}`));
    setExceptions(exSet);

    // By phone
    const byPhone = new Map<string, Row[]>();
    all.forEach((r) => {
      if (!r.phone || r.phone.length < 10) return;
      if (!byPhone.has(r.phone)) byPhone.set(r.phone, []);
      byPhone.get(r.phone)!.push(r);
    });
    const pGroups: PhoneGroup[] = [];
    byPhone.forEach((rows, phone) => {
      if (rows.length < 2) return;
      if (exSet.has(`phone:${phone}`)) return;
      pGroups.push({ phone, rows: rows.sort((a, b) => b.created_at.localeCompare(a.created_at)) });
    });
    pGroups.sort((a, b) => b.rows.length - a.rows.length);
    setPhoneGroups(pGroups);

    // By name (fuzzy, different phones)
    const nGroups: NameGroup[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < all.length; i++) {
      if (seen.has(all[i].id)) continue;
      const a = all[i];
      const cluster: Row[] = [a];
      for (let j = i + 1; j < all.length; j++) {
        const b = all[j];
        if (a.phone === b.phone) continue; // handled by phone tab
        if (seen.has(b.id)) continue;
        const dist = levenshtein(a.name, b.name);
        if (dist <= 2 && Math.min(a.name.length, b.name.length) >= 4) {
          cluster.push(b);
        }
      }
      if (cluster.length >= 2) {
        cluster.forEach((r) => seen.add(r.id));
        const key = cluster.map((c) => c.id).sort().join("|");
        if (!exSet.has(`name:${key}`)) {
          nGroups.push({ canonical: a.name, rows: cluster });
        }
      }
    }
    setNameGroups(nGroups.slice(0, 100));

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const filteredPhone = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return phoneGroups;
    return phoneGroups.filter((g) =>
      g.phone.includes(q) || g.rows.some((r) => r.name.toLowerCase().includes(q))
    );
  }, [phoneGroups, search]);

  const open = (r: Row) => {
    if (r.kind === "enquiry") navigate(`/crm/enquiries/${r.id}`);
    else navigate(`/crm/students/${r.id}`);
  };

  const markDistinct = async () => {
    if (!exceptionTarget) return;
    const ids = exceptionTarget.rows.map((r) => r.id);
    const { error } = await supabase.from("crm_duplicate_exceptions").insert({
      key_type: "phone",
      key_value: exceptionTarget.phone,
      related_ids: ids as never,
      note: exceptionNote || null,
      created_by: user?.id,
      created_by_name: user?.user_metadata?.full_name || user?.email || null,
    } as never);
    if (error) { toast.error(error.message); return; }
    await logAudit("crm_duplicate_exceptions", "create", exceptionTarget.phone, { phone: exceptionTarget.phone, ids });
    toast.success("Marked as distinct — won't be flagged again");
    setExceptionTarget(null);
    setExceptionNote("");
    load();
  };

  const renameRow = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    const table = renameTarget.kind === "enquiry" ? "crm_enquiries" : "crm_students";
    const field = renameTarget.kind === "enquiry" ? "name" : "full_name";
    const { error } = await supabase.from(table).update({ [field]: renameValue.trim() } as never).eq("id", renameTarget.id);
    if (error) { toast.error(error.message); return; }
    await logAudit(table, "update", renameTarget.id, { [field]: renameValue.trim() });
    toast.success("Name updated");
    setRenameTarget(null);
    setRenameValue("");
    load();
  };

  const exportCsv = () => {
    const lines = ["Phone,Kind,Name,Course,Status,Created,Extra"];
    phoneGroups.forEach((g) => {
      g.rows.forEach((r) => {
        const safe = (s: string) => `"${(s || "").replace(/"/g, '""')}"`;
        lines.push([g.phone, r.kind, safe(r.name), safe(r.course), r.status, r.created_at.slice(0, 10), safe(r.extra)].join(","));
      });
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `duplicates-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="p-8 text-muted-foreground">Loading duplicates…</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Duplicates"
        description="Review and resolve enquiries / students that share the same mobile number or have very similar names."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCsv}><Download className="w-4 h-4 mr-2" />Export CSV</Button>
            <Button variant="outline" onClick={load} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />Refresh
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Phone duplicates</div><div className="text-2xl font-bold">{phoneGroups.length}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Similar-name groups</div><div className="text-2xl font-bold">{nameGroups.length}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Confirmed distinct</div><div className="text-2xl font-bold">{exceptions.size}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="phone" className="w-full">
        <TabsList>
          <TabsTrigger value="phone"><Phone className="w-4 h-4 mr-2" />By phone ({phoneGroups.length})</TabsTrigger>
          <TabsTrigger value="name"><UserIcon className="w-4 h-4 mr-2" />By name ({nameGroups.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="phone" className="space-y-3 mt-4">
          <Input placeholder="Search by phone or name…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
          {filteredPhone.length === 0 && (
            <Card><CardContent className="pt-6 text-center text-muted-foreground">No duplicate phone numbers 🎉</CardContent></Card>
          )}
          {filteredPhone.map((g) => (
            <Card key={g.phone}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  {g.phone}
                  <Badge variant="secondary">{g.rows.length} records</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {g.rows.map((r) => (
                  <div key={`${r.kind}-${r.id}`} className="flex items-center gap-2 p-2 rounded border bg-card text-sm">
                    <Badge variant={r.kind === "student" ? "default" : "secondary"} className="capitalize">{r.kind}</Badge>
                    <span className="font-medium">{r.name}</span>
                    {r.course && <span className="text-muted-foreground">· {r.course}</span>}
                    <span className="text-muted-foreground text-xs">· {r.status}</span>
                    <span className="text-muted-foreground text-xs ml-auto">{new Date(r.created_at).toLocaleDateString()}</span>
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => open(r)}>
                      Open <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => { setRenameTarget(r); setRenameValue(r.name); }}>
                      Rename
                    </Button>
                  </div>
                ))}
                {isAdmin && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => { setExceptionTarget(g); setExceptionNote(""); }}>
                      <ShieldCheck className="w-3 h-3 mr-1" />Mark as distinct (e.g. siblings)
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="name" className="space-y-3 mt-4">
          {nameGroups.length === 0 && (
            <Card><CardContent className="pt-6 text-center text-muted-foreground">No similar-name groups detected.</CardContent></Card>
          )}
          {nameGroups.map((g, idx) => (
            <Card key={idx}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Similar to: <span className="font-mono">{g.canonical}</span></CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {g.rows.map((r) => (
                  <div key={`${r.kind}-${r.id}`} className="flex items-center gap-2 p-2 rounded border bg-card text-sm">
                    <Badge variant={r.kind === "student" ? "default" : "secondary"} className="capitalize">{r.kind}</Badge>
                    <span className="font-medium">{r.name}</span>
                    <span className="text-muted-foreground text-xs">· {r.phone}</span>
                    {r.course && <span className="text-muted-foreground">· {r.course}</span>}
                    <Button size="sm" variant="ghost" className="h-7 ml-auto" onClick={() => open(r)}>
                      Open <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => { setRenameTarget(r); setRenameValue(r.name); }}>
                      Rename
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={!!renameTarget} onOpenChange={(o) => !o && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update name</DialogTitle></DialogHeader>
          <Label>Name</Label>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>Cancel</Button>
            <Button onClick={renameRow}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!exceptionTarget} onOpenChange={(o) => !o && setExceptionTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark these records as distinct people</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            They share the number <strong>{exceptionTarget?.phone}</strong> but are different people (e.g. siblings using a parent's number).
            They won't be flagged as duplicates again.
          </p>
          <Label>Reason (optional)</Label>
          <Textarea value={exceptionNote} onChange={(e) => setExceptionNote(e.target.value)} placeholder="Confirmed siblings sharing father's number" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setExceptionTarget(null)}>Cancel</Button>
            <Button onClick={markDistinct}><ShieldCheck className="w-4 h-4 mr-2" />Confirm distinct</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
