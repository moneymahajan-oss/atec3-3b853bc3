import { useEffect, useState, MouseEvent } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  StudentCtx, StudentWaSection, STUDENT_TEMPLATES_BY_SECTION,
  InstituteCtx, getInstitute, sendWhatsAppForStudent,
} from "../lib/studentWa";

interface Props {
  student: StudentCtx;
  section: StudentWaSection;
  extraVars?: Record<string, string | number | null | undefined>;
  size?: "icon" | "sm" | "default";
  variant?: "ghost" | "outline" | "default" | "secondary";
  label?: string;
  triggeredFrom?: string;
}

export function StudentWhatsAppButton({
  student, section, extraVars, size = "icon", variant = "ghost",
  label, triggeredFrom = `crm_${section}`,
}: Props) {
  const [open, setOpen] = useState(false);
  const [institute, setInstitute] = useState<InstituteCtx>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (open) getInstitute().then(setInstitute);
  }, [open]);

  const choices = STUDENT_TEMPLATES_BY_SECTION[section];
  const hasPhone = Boolean((student.phone || "").replace(/\D/g, ""));

  const handleSend = async (templateKey: string) => {
    setBusy(templateKey);
    const res = await sendWhatsAppForStudent({
      templateKey, student, institute, extraVars, triggeredFrom,
    });
    setBusy(null);
    if (!res.ok) { toast.error(res.error || "Could not send"); return; }
    window.open(res.url!, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  const stop = (e: MouseEvent) => { e.stopPropagation(); e.preventDefault(); };

  return (
    <>
      <Button
        size={size}
        variant={variant}
        title={hasPhone ? "Send WhatsApp" : "No phone on file"}
        disabled={!hasPhone}
        onClick={(e) => { stop(e); setOpen(true); }}
        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
      >
        <MessageCircle className="w-4 h-4" />
        {label && size !== "icon" ? <span className="ml-2">{label}</span> : null}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClick={stop}>
          <DialogHeader>
            <DialogTitle>WhatsApp · {student.full_name}</DialogTitle>
          </DialogHeader>
          <div className="text-xs text-muted-foreground -mt-2">
            To: {student.phone}{student.course_name_snapshot ? ` · ${student.course_name_snapshot}` : ""}
          </div>
          <div className="space-y-2 py-2">
            {choices.map((c) => (
              <Button
                key={c.key}
                variant="outline"
                className="w-full justify-start"
                disabled={!!busy}
                onClick={() => handleSend(c.key)}
              >
                <MessageCircle className="w-4 h-4 mr-2 text-emerald-600" />
                {busy === c.key ? "Opening…" : c.label}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
