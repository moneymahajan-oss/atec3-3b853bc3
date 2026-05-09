import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Database, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

const FN_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/admin-backup`;

export default function AdminBackup() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [includeDb, setIncludeDb] = useState(true);
  const [includeStorage, setIncludeStorage] = useState(true);
  const [includeAuth, setIncludeAuth] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  if (!loading && (!user || !isAdmin)) {
    navigate("/admin/login");
    return null;
  }

  const runBackup = async () => {
    setRunning(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Not signed in");

      toast.info("Backup started — this can take a few minutes for large datasets.");

      const res = await fetch(FN_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ includeDb, includeStorage, includeAuth }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const name =
        res.headers
          .get("Content-Disposition")
          ?.match(/filename="?([^"]+)"?/)?.[1] ||
        `atec-backup-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-")}.zip`;
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setLastRun(new Date().toLocaleString());
      toast.success("Backup downloaded");
    } catch (e: any) {
      console.error(e);
      toast.error(`Backup failed: ${e?.message ?? e}`);
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
              <Database className="w-5 h-5" /> Backup
            </span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="p-6 space-y-6">
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground mb-1">
              Full Project Backup
            </h1>
            <p className="text-sm text-muted-foreground">
              Download a single ZIP with your database tables (JSON), all storage
              files, and the auth user list. Schema (tables, RLS, functions,
              triggers) is already versioned in the project's migrations.
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={includeDb}
                onCheckedChange={(v) => setIncludeDb(!!v)}
              />
              <div>
                <div className="font-medium">Database tables</div>
                <div className="text-xs text-muted-foreground">
                  All public tables (CMS + CRM) exported as JSON.
                </div>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={includeStorage}
                onCheckedChange={(v) => setIncludeStorage(!!v)}
              />
              <div>
                <div className="font-medium">Storage files</div>
                <div className="text-xs text-muted-foreground">
                  All 7 buckets: gallery, course docs, certificates, faculty
                  photos, student docs, receipts, course media.
                </div>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={includeAuth}
                onCheckedChange={(v) => setIncludeAuth(!!v)}
              />
              <div>
                <div className="font-medium">Auth users</div>
                <div className="text-xs text-muted-foreground">
                  Email, phone, metadata. Password hashes can't be exported —
                  users will reset on the new project.
                </div>
              </div>
            </label>
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
            <strong>Note:</strong> Large storage buckets may take several minutes.
            Don't close this tab while the backup is running.
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={runBackup} disabled={running} size="lg">
              {running ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Building backup…</>
              ) : (
                <><Download className="w-4 h-4 mr-2" /> Start backup</>
              )}
            </Button>
            {lastRun && (
              <span className="text-xs text-muted-foreground">
                Last: {lastRun}
              </span>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
