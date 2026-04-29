import { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { logAudit } from "../lib/audit";

const CONFIRM_PHRASE = "DELETE EVERYTHING";

// Order matters: children before parents to avoid FK conflicts.
// Each table is wiped using a "delete all" filter (id is not null).
const WIPE_TABLES = [
  "crm_attendance",
  "crm_payments",
  "crm_fee_plans",
  "crm_certificates",
  "crm_admission_notes",
  "crm_enquiry_notes",
  "crm_whatsapp_logs",
  "crm_campaign_recipients",
  "crm_campaigns",
  "crm_expenses",
  "crm_students",
  "crm_enquiries",
  "crm_batches",
  "crm_audit_logs",
] as const;

export function DangerZone() {
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [ack, setAck] = useState(false);
  const [running, setRunning] = useState(false);

  const canConfirm = phrase.trim() === CONFIRM_PHRASE && ack && !running;

  const wipeAll = async () => {
    if (!canConfirm) return;
    setRunning(true);
    const failed: string[] = [];
    let totalDeleted = 0;

    for (const table of WIPE_TABLES) {
      const { error, count } = await supabase
        .from(table)
        // @ts-expect-error generic delete on dynamic table name
        .delete({ count: "exact" })
        .not("id", "is", null);
      if (error) {
        failed.push(`${table}: ${error.message}`);
      } else if (typeof count === "number") {
        totalDeleted += count;
      }
    }

    await logAudit("crm_settings", "wipe_all", "danger-zone", {
      tables: WIPE_TABLES,
      failed,
      totalDeleted,
    });

    setRunning(false);
    setPhrase("");
    setAck(false);
    setOpen(false);

    if (failed.length === 0) {
      toast.success(`All CRM data wiped (${totalDeleted} rows deleted).`);
    } else {
      toast.error(
        `Wipe completed with ${failed.length} error(s). First: ${failed[0]}`
      );
    }
  };

  return (
    <div className="border-2 border-destructive/40 bg-destructive/5 rounded-2xl p-5 space-y-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h2 className="font-heading font-bold text-lg text-destructive">Danger Zone</h2>
          <p className="text-sm text-muted-foreground">
            Permanently delete <strong>all operational data</strong> from this CRM. This wipes
            enquiries, students, fees, payments, attendance, batches, certificates, expenses,
            campaigns, notes, WhatsApp logs, and audit history.
          </p>
          <p className="text-xs text-muted-foreground">
            Preserved: institute settings, courses, WhatsApp templates, enquiry form/report
            configuration, user roles, and uploaded files in storage.
          </p>
        </div>
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm">
            <Trash2 className="w-4 h-4 mr-2" /> Wipe all CRM data
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> This cannot be undone
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  You are about to permanently delete every record from the following tables:
                </p>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs font-mono bg-muted rounded p-2">
                  {WIPE_TABLES.map((t) => <li key={t}>• {t}</li>)}
                </ul>
                <p className="text-destructive font-medium">
                  There is no backup and no recovery. Make sure you have exported anything you need.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-start gap-2">
              <Checkbox id="ack" checked={ack} onCheckedChange={(v) => setAck(v === true)} />
              <Label htmlFor="ack" className="text-sm leading-snug cursor-pointer">
                I understand this will permanently delete all enquiries, students, payments, and
                related history.
              </Label>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Type <span className="font-mono font-bold text-destructive">{CONFIRM_PHRASE}</span> to confirm
              </Label>
              <Input
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                placeholder={CONFIRM_PHRASE}
                autoComplete="off"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={running}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); wipeAll(); }}
              disabled={!canConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {running ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Wiping…</>
              ) : (
                <><Trash2 className="w-4 h-4 mr-2" /> Delete everything</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
