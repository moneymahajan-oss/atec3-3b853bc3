import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Pencil, Trash2, Upload, Download, Loader2, Save } from "lucide-react";
import * as XLSX from "xlsx";

const GRADES = ["A+", "A", "B+", "B", "C"];

type Cert = {
  certificate_id: string;
  student_id: string;
  student_name: string;
  father_name: string;
  course_name: string;
  start_date: string;
  end_date: string;
  duration_hours: number;
  grade: string;
  issued_date: string;
  is_active: boolean;
  created_at: string;
};

const empty: Omit<Cert, "created_at"> = {
  certificate_id: "", student_id: "", student_name: "", father_name: "",
  course_name: "", start_date: "", end_date: "", duration_hours: 0,
  grade: "A", issued_date: new Date().toISOString().slice(0, 10), is_active: true,
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminCertificates() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate("/admin/login");
  }, [user, isAdmin, authLoading]);

  const [tab, setTab] = useState("all");

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Admin
      </Button>
      <h1 className="text-2xl font-bold mb-6">Certificate Verification — Admin</h1>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="all">All Certificates</TabsTrigger>
          <TabsTrigger value="add">Add Certificate</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="all"><AllCerts /></TabsContent>
        <TabsContent value="add"><AddCert onAdded={() => setTab("all")} /></TabsContent>
        <TabsContent value="bulk"><BulkUpload onDone={() => setTab("all")} goSettings={() => setTab("settings")} /></TabsContent>
        <TabsContent value="logs"><AuditLogs /></TabsContent>
        <TabsContent value="settings"><SettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ── Tab 1: All Certificates ── */
function AllCerts() {
  const { toast } = useToast();
  const [certs, setCerts] = useState<Cert[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editCert, setEditCert] = useState<Cert | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("verification_certificates")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setCerts((data as Cert[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = certs.filter(c => {
    const q = search.toLowerCase();
    return !q || c.certificate_id.toLowerCase().includes(q) || c.student_id.toLowerCase().includes(q) || c.student_name.toLowerCase().includes(q);
  });

  const logAction = async (action: string, certId: string, diff?: any) => {
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("verification_certificate_logs").insert({
      action, certificate_id: certId, user_id: u?.user?.id ?? null,
      user_email: u?.user?.email ?? null, diff: diff ?? null,
    });
  };

  const toggleActive = async (c: Cert) => {
    await supabase.from("verification_certificates").update({ is_active: !c.is_active }).eq("certificate_id", c.certificate_id);
    await logAction("toggle_active", c.certificate_id, { from: c.is_active, to: !c.is_active });
    load();
  };

  const deleteCert = async (id: string) => {
    if (!confirm("Delete this certificate?")) return;
    const cert = certs.find(c => c.certificate_id === id);
    await supabase.from("verification_certificates").delete().eq("certificate_id", id);
    await logAction("delete", id, cert ?? null);
    toast({ title: "Deleted" });
    load();
  };

  const saveEdit = async () => {
    if (!editCert) return;
    const original = certs.find(c => c.certificate_id === editCert.certificate_id);
    const { created_at, ...rest } = editCert;
    await supabase.from("verification_certificates").update(rest).eq("certificate_id", editCert.certificate_id);
    const changes: Record<string, { from: any; to: any }> = {};
    if (original) {
      for (const k of Object.keys(rest) as (keyof typeof rest)[]) {
        if ((rest as any)[k] !== (original as any)[k]) changes[k] = { from: (original as any)[k], to: (rest as any)[k] };
      }
    }
    await logAction("edit", editCert.certificate_id, changes);
    toast({ title: "Updated" });
    setEditCert(null);
    load();
  };

  return (
    <>
      <Input placeholder="Search by ID, name, or certificate..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm mb-4" />
      {loading ? <p>Loading...</p> : (
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cert ID</TableHead><TableHead>Student ID</TableHead><TableHead>Name</TableHead>
                <TableHead>Father</TableHead><TableHead>Course</TableHead><TableHead>Grade</TableHead>
                <TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Hours</TableHead>
                <TableHead>Issued</TableHead><TableHead>Active</TableHead><TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.certificate_id}>
                  <TableCell className="font-mono text-xs">{c.certificate_id}</TableCell>
                  <TableCell>{c.student_id}</TableCell>
                  <TableCell>{c.student_name}</TableCell>
                  <TableCell>{c.father_name}</TableCell>
                  <TableCell>{c.course_name}</TableCell>
                  <TableCell>{c.grade}</TableCell>
                  <TableCell>{fmtDate(c.start_date)}</TableCell>
                  <TableCell>{fmtDate(c.end_date)}</TableCell>
                  <TableCell>{c.duration_hours}</TableCell>
                  <TableCell>{fmtDate(c.issued_date)}</TableCell>
                  <TableCell><Switch checked={c.is_active} onCheckedChange={() => toggleActive(c)} /></TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setEditCert({ ...c })}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteCert(c.certificate_id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">No certificates found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editCert} onOpenChange={o => !o && setEditCert(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Certificate</DialogTitle></DialogHeader>
          {editCert && <CertForm value={editCert} onChange={setEditCert as any} />}
          <DialogFooter><Button onClick={saveEdit}>Save Changes</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Tab 2: Add Certificate ── */
function AddCert({ onAdded }: { onAdded: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState<Omit<Cert, "created_at">>({ ...empty });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("verification_certificates").insert([form]);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Certificate added" });
      setForm({ ...empty });
      onAdded();
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader><CardTitle>Add New Certificate</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <CertForm value={form} onChange={setForm} />
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Add Certificate
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/* ── Shared Form Fields ── */
function CertForm({ value, onChange }: { value: Omit<Cert, "created_at">; onChange: (v: any) => void }) {
  const set = (k: string, v: any) => onChange((prev: any) => ({ ...prev, [k]: v }));
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div><Label>Certificate ID</Label><Input required value={value.certificate_id} onChange={e => set("certificate_id", e.target.value)} /></div>
      <div><Label>Student ID</Label><Input required value={value.student_id} onChange={e => set("student_id", e.target.value)} /></div>
      <div><Label>Student Name</Label><Input required value={value.student_name} onChange={e => set("student_name", e.target.value)} /></div>
      <div><Label>Father's Name</Label><Input required value={value.father_name} onChange={e => set("father_name", e.target.value)} /></div>
      <div><Label>Course Name</Label><Input required value={value.course_name} onChange={e => set("course_name", e.target.value)} /></div>
      <div><Label>Grade</Label>
        <Select value={value.grade} onValueChange={v => set("grade", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>Start Date</Label><Input type="date" required value={value.start_date} onChange={e => set("start_date", e.target.value)} /></div>
      <div><Label>End Date</Label><Input type="date" required value={value.end_date} onChange={e => set("end_date", e.target.value)} /></div>
      <div><Label>Duration (Hours)</Label><Input type="number" required value={value.duration_hours} onChange={e => set("duration_hours", parseInt(e.target.value) || 0)} /></div>
      <div><Label>Issued Date</Label><Input type="date" required value={value.issued_date} onChange={e => set("issued_date", e.target.value)} /></div>
    </div>
  );
}

/* ── Tab 3: Bulk Upload ── */
function BulkUpload({ onDone, goSettings }: { onDone: () => void; goSettings: () => void }) {
  return (
    <div className="space-y-8 max-w-3xl">
      <UploadSection title="Excel Upload" description="Upload .xlsx, .xls, or .csv with certificate data." onDone={onDone} />
      <Card className="border-amber-300">
        <CardHeader>
          <CardTitle className="text-lg">Import Old Certificate Database</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Use this after all previously printed certificates (pointing to atecedu.com/verification) have been fully distributed.
            Export certificate data from atecedu.com as Excel or CSV and upload here. Once imported, go to Settings and update the
            Verification URL to https://ateceducation.in/verification
          </p>
          <UploadSection title="" description="" onDone={() => {}} isImport />
          <Button variant="outline" onClick={goSettings}>Go to Settings → Update URL</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function UploadSection({ title, description, onDone, isImport }: { title: string; description: string; onDone: () => void; isImport?: boolean }) {
  const { toast } = useToast();
  const [preview, setPreview] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);

  const HEADERS = ["certificate_id","student_id","student_name","father_name","course_name","start_date","end_date","duration_hours","grade","issued_date"];

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      HEADERS,
      ["CERT-001","STU-001","John Doe","Richard Doe","Advanced Excel","2025-01-01","2025-03-01",120,"A","2025-03-05"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Certificates");
    XLSX.writeFile(wb, "certificate_template.xlsx");
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(ws, { raw: false });
      setPreview(rows);
      setResult(null);
    };
    reader.readAsBinaryString(file);
  };

  const confirmUpload = async () => {
    setUploading(true);
    let inserted = 0, skipped = 0;
    for (const row of preview) {
      const rec = {
        certificate_id: String(row.certificate_id || "").trim(),
        student_id: String(row.student_id || "").trim(),
        student_name: String(row.student_name || "").trim(),
        father_name: String(row.father_name || "").trim(),
        course_name: String(row.course_name || "").trim(),
        start_date: String(row.start_date || "").trim(),
        end_date: String(row.end_date || "").trim(),
        duration_hours: parseInt(row.duration_hours) || 0,
        grade: String(row.grade || "A").trim(),
        issued_date: String(row.issued_date || new Date().toISOString().slice(0, 10)).trim(),
        is_active: true,
      };
      if (!rec.certificate_id || !rec.student_id) { skipped++; continue; }
      const { error } = await supabase.from("verification_certificates").insert([rec]);
      if (error) { skipped++; } else { inserted++; }
    }
    setUploading(false);
    setResult({ inserted, skipped });
    setPreview([]);
    toast({ title: `Upload complete: ${inserted} inserted, ${skipped} skipped` });
    if (!isImport) onDone();
  };

  return (
    <div className="space-y-3">
      {title && <h3 className="font-semibold">{title}</h3>}
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      <div className="flex items-center gap-3 flex-wrap">
        <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="max-w-xs" />
        <Button variant="outline" size="sm" onClick={downloadTemplate}><Download className="h-4 w-4 mr-1" /> Download Template</Button>
      </div>
      {preview.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">{preview.length} rows ready to upload</p>
          <div className="overflow-auto max-h-64 border rounded">
            <Table>
              <TableHeader><TableRow>{HEADERS.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                {preview.slice(0, 20).map((r, i) => (
                  <TableRow key={i}>{HEADERS.map(h => <TableCell key={h} className="text-xs">{r[h]}</TableCell>)}</TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {preview.length > 20 && <p className="text-xs text-muted-foreground">Showing first 20 of {preview.length} rows</p>}
          <Button onClick={confirmUpload} disabled={uploading}>
            {uploading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Uploading...</> : <><Upload className="h-4 w-4 mr-1" /> Confirm Upload</>}
          </Button>
        </div>
      )}
      {result && (
        <div className="p-3 bg-green-50 border border-green-200 rounded text-sm">
          ✅ {result.inserted} certificates inserted, {result.skipped} skipped/duplicates.
          {isImport && <p className="mt-1 text-amber-700">Import complete. Update the QR &amp; Verification URL in Settings to point to ateceducation.in/verification</p>}
        </div>
      )}
    </div>
  );
}

/* ── Tab 4: Settings ── */
function SettingsTab() {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("app_settings").select("*").eq("key", "verification_url").single().then(({ data }) => {
      if (data) { setUrl(data.value || ""); setUpdatedAt(data.updated_at || ""); }
      setLoading(false);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("app_settings").update({ value: url, updated_at: new Date().toISOString() }).eq("key", "verification_url");
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else {
      setUpdatedAt(new Date().toISOString());
      toast({ title: "Saved" });
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <Card className="max-w-xl">
      <CardHeader><CardTitle>QR Code &amp; Verification Redirect URL</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Verification URL</Label>
          <Input value={url} onChange={e => setUrl(e.target.value)} />
          <p className="text-xs text-muted-foreground mt-1">
            This URL is encoded in every QR code shown on verification cards.
            Currently pointing to atecedu.com/verification for already-printed certificates.
            Once all old certificates are distributed, change this to https://ateceducation.in/verification
          </p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-1" />} Save
        </Button>
        {updatedAt && <p className="text-xs text-muted-foreground">Last updated: {new Date(updatedAt).toLocaleString()}</p>}
      </CardContent>
    </Card>
  );
}

/* ── Tab: Audit Logs ── */
function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("verification_certificate_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => { setLogs(data || []); setLoading(false); });
  }, []);

  const actionColor = (a: string) => {
    if (a === "delete") return "text-red-600 font-semibold";
    if (a === "edit") return "text-amber-600 font-semibold";
    return "text-blue-600";
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead><TableHead>Action</TableHead><TableHead>Certificate ID</TableHead>
            <TableHead>User</TableHead><TableHead>Changes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map(l => (
            <TableRow key={l.id}>
              <TableCell className="text-xs whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</TableCell>
              <TableCell className={actionColor(l.action)}>{l.action}</TableCell>
              <TableCell className="font-mono text-xs">{l.certificate_id}</TableCell>
              <TableCell className="text-xs">{l.user_email || "—"}</TableCell>
              <TableCell className="text-xs max-w-xs truncate">{l.diff ? JSON.stringify(l.diff) : "—"}</TableCell>
            </TableRow>
          ))}
          {logs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No logs yet</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );
}
