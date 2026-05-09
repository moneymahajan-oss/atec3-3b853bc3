import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Upload, Loader2, RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const FN_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/admin-restore`;

export default function AdminRestore() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [restoreDb, setRestoreDb] = useState(true);
  const [restoreStorage, setRestoreStorage] = useState(true);
  const [restoreAuth, setRestoreAuth] = useState(false);
  const [truncateFirst, setTruncateFirst] = useState(false);
  const [upsertMode, setUpsertMode] = useState(true);
  const [overwriteFiles, setOverwriteFiles] = useState(true);
  const [confirm, setConfirm] = useState("");
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<any>(null);

  if (!loading && (!user || !isAdmin)) {
    navigate("/admin/login");
    return null;
  }

  const run = async () => {
    if (!file) { toast.error("Pick a backup .zip first"); return; }
    if (confirm !== "RESTORE") { toast.error('Type RESTORE to confirm'); return; }

    setRunning(true);
    setReport(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Not signed in");

      const fd = new FormData();
      fd.append("file", file);
      fd.append("restoreDb", String(restoreDb));
      fd.append("restoreStorage", String(restoreStorage));
      fd.append("restoreAuth", String(restoreAuth));
      fd.append("truncateFirst", String(truncateFirst));
      fd.append("upsertMode", String(upsertMode));
      fd.append("overwriteFiles", String(overwriteFiles));

      toast.info("Restore started — please wait, do not close this tab.");
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: fd,
      });
      const text = await res.text();
      let parsed: any = text;
      try { parsed = JSON.parse(text); } catch { /* keep as text */ }
      setReport(parsed);
      if (!res.ok) throw new Error(parsed?.error || `HTTP ${res.status}`);
      toast.success("Restore finished — review report below");
    } catch (e: any) {
      console.error(e);
      toast.error(`Restore failed: ${e?.message ?? e}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin"><ArrowLeft className="w-4 h-4 mr-1" /> Dashboard</Link>
            </Button>
            <span className="font-heading font-bold text-lg text-foreground flex items-center gap-2">
              <RotateCcw className="w-5 h-5" /> Restore
            </span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="p-6 space-y-6">
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground mb-1">
              Restore From Backup
            </h1>
            <p className="text-sm text-muted-foreground">
              Upload a ZIP produced by the Backup tool. Restores database tables
              (JSON), storage files, and optionally auth users.
            </p>
          </div>

          <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-900 flex gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <strong>Destructive operation.</strong> Run on a fresh project, or
              with care. "Truncate first" deletes existing rows in tables present
              in the backup before inserting. Schema/RLS/triggers are NOT touched
              — they must already exist (run your migrations first).
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Backup zip file</label>
            <input
              type="file"
              accept=".zip,application/zip"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm file:mr-3 file:px-4 file:py-2 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground"
            />
            {file && (
              <div className="text-xs text-muted-foreground mt-1">
                {file.name} — {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox checked={restoreDb} onCheckedChange={(v) => setRestoreDb(!!v)} />
              <div>
                <div className="font-medium">Database tables</div>
                <div className="text-xs text-muted-foreground">Insert rows from /database/*.json</div>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox checked={restoreStorage} onCheckedChange={(v) => setRestoreStorage(!!v)} />
              <div>
                <div className="font-medium">Storage files</div>
                <div className="text-xs text-muted-foreground">Upload all 7 buckets from /storage/</div>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox checked={restoreAuth} onCheckedChange={(v) => setRestoreAuth(!!v)} />
              <div>
                <div className="font-medium">Auth users (no passwords)</div>
                <div className="text-xs text-muted-foreground">
                  Recreates user accounts. Users must reset their password.
                </div>
              </div>
            </label>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="text-sm font-medium">Advanced</div>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox checked={upsertMode} onCheckedChange={(v) => setUpsertMode(!!v)} />
              <div>
                <div className="font-medium text-sm">Upsert by id (recommended)</div>
                <div className="text-xs text-muted-foreground">Skip duplicate-key errors when re-running</div>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox checked={overwriteFiles} onCheckedChange={(v) => setOverwriteFiles(!!v)} />
              <div>
                <div className="font-medium text-sm">Overwrite existing storage files</div>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox checked={truncateFirst} onCheckedChange={(v) => setTruncateFirst(!!v)} />
              <div>
                <div className="font-medium text-sm text-rose-700">Truncate tables first (DANGEROUS)</div>
                <div className="text-xs text-muted-foreground">
                  Deletes all existing rows from tables present in the backup before inserting.
                </div>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Type <code className="px-1 py-0.5 bg-muted rounded">RESTORE</code> to confirm
            </label>
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              placeholder="RESTORE"
            />
          </div>

          <Button onClick={run} disabled={running || !file || confirm !== "RESTORE"} size="lg">
            {running ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Restoring…</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" /> Start restore</>
            )}
          </Button>
        </Card>

        {report && (
          <Card className="p-4 mt-6">
            <div className="font-heading font-semibold mb-2">Report</div>
            <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-[60vh]">
              {typeof report === "string" ? report : JSON.stringify(report, null, 2)}
            </pre>
          </Card>
        )}
      </div>
    </div>
  );
}
