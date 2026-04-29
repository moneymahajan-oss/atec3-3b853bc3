import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  ENQUIRY_BUTTONS, EnquiryCtx, CourseCtx, InstituteCtx,
  EnquiryTemplateKey, sendWhatsAppForEnquiry,
} from "../lib/enquiryWa";
import { SendAllModal } from "./SendAllModal";

interface Props {
  enquiry: EnquiryCtx;
  course: CourseCtx | null;
  institute: InstituteCtx;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) {
    const hrs = Math.floor(diff / 3600000);
    if (hrs <= 0) return "just now";
    return `${hrs}h ago`;
  }
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function ageColor(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "text-emerald-600 dark:text-emerald-400";
  if (days < 7) return "text-blue-600 dark:text-blue-400";
  return "text-muted-foreground";
}

export function SendWhatsAppCard({ enquiry, course, institute }: Props) {
  const [lastSent, setLastSent] = useState<Record<string, string>>({});
  const [sendAllOpen, setSendAllOpen] = useState(false);

  const loadLastSent = async () => {
    const { data } = await supabase
      .from("crm_whatsapp_logs")
      .select("template_key, created_at")
      .eq("entity_type", "enquiry")
      .eq("entity_id", enquiry.enquiryId)
      .order("created_at", { ascending: false })
      .limit(50);
    const map: Record<string, string> = {};
    (data ?? []).forEach((row: { template_key: string; created_at: string }) => {
      if (!map[row.template_key]) map[row.template_key] = row.created_at;
    });
    setLastSent(map);
  };

  useEffect(() => { loadLastSent(); }, [enquiry.enquiryId]);

  const handleClick = async (key: EnquiryTemplateKey) => {
    const res = await sendWhatsAppForEnquiry({
      templateKey: key, enquiry, course, institute, triggeredFrom: "enquiry_panel",
    });
    if (!res.ok) { toast.error(res.error || "Could not send"); return; }
    window.open(res.url!, "_blank", "noopener,noreferrer");
    loadLastSent();
  };

  const copyBrochureImage = async () => {
    const url = course?.brochure_url;
    if (!url) { toast.error("No catalogue image set on this course"); return; }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Image copied — paste in WhatsApp after opening the link");
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Send via WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ENQUIRY_BUTTONS.map((b) => {
              const last = b.key !== "SEND_ALL" ? lastSent[b.key] : undefined;
              const isAll = b.key === "SEND_ALL";
              return (
                <div
                  key={b.key}
                  className="border rounded-lg p-3 hover:bg-muted/30 transition-colors"
                >
                  <Button
                    variant={isAll ? "default" : "outline"}
                    className="w-full justify-start h-auto py-2"
                    onClick={() => isAll ? setSendAllOpen(true) : handleClick(b.key as EnquiryTemplateKey)}
                  >
                    <span className="text-lg mr-2">{b.emoji}</span>
                    <span className="text-sm">{b.label}</span>
                  </Button>
                  <div className="flex items-center justify-between mt-2 px-1">
                    <span className={`text-[11px] ${last ? ageColor(last) : "text-muted-foreground"}`}>
                      {last ? `Last sent: ${timeAgo(last)}` : "Not sent yet"}
                    </span>
                    {b.key === "SEND_BROCHURE_IMAGE" && (
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={copyBrochureImage}>
                        <Copy className="w-3 h-3 mr-1" /> Copy Image
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <SendAllModal
        open={sendAllOpen}
        onOpenChange={setSendAllOpen}
        enquiry={enquiry}
        course={course}
        institute={institute}
        onSent={loadLastSent}
      />
    </>
  );
}
