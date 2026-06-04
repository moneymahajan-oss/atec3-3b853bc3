import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  EnquiryCtx, CourseCtx, InstituteCtx, sendWhatsAppForEnquiry, EnquiryTemplateKey,
} from "../lib/enquiryWa";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  enquiry: EnquiryCtx;
  course: CourseCtx | null;
  institute: InstituteCtx;
  onSent: () => void;
}

const SEQUENCE: { key: EnquiryTemplateKey; label: string }[] = [
  { key: "ENQUIRY_FIRST",       label: "Send Full Course Info (Enquiry First)" },
  { key: "SEND_BROCHURE_IMAGE", label: "Send Course Catalogue Picture" },
  { key: "COURSE_LONG_DETAIL",  label: "Send Detailed Syllabus + Bullets" },
  { key: "COURSE_MEDIA",        label: "Send Video / Instagram Link" },
];

export function SendAllModal({ open, onOpenChange, enquiry, course, institute, onSent }: Props) {
  const [done, setDone] = useState<Record<string, boolean>>({});

  const handle = async (key: EnquiryTemplateKey) => {
    const res = await sendWhatsAppForEnquiry({
      templateKey: key, enquiry, course, institute, triggeredFrom: "send_all",
    });
    if (!res.ok) { toast.error(res.error || "Could not send"); return; }
    window.open(res.url!, "_blank", "noopener,noreferrer");
    setDone((d) => ({ ...d, [key]: true }));
    onSent();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setDone({}); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send these messages one by one</DialogTitle>
        </DialogHeader>
        <ol className="space-y-3 py-2">
          {SEQUENCE.map((step, i) => (
            <li key={step.key} className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-muted text-xs font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 justify-start"
                onClick={() => handle(step.key)}
              >
                <ExternalLink className="w-3.5 h-3.5 mr-2" /> {step.label}
              </Button>
              {done[step.key] && <Check className="w-5 h-5 text-emerald-600" />}
            </li>
          ))}
        </ol>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
