import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { fillTemplate, buildWaLink, logWaSend } from "../lib/whatsapp";
import { coursePublicUrl, brochureShareUrl, videoShareUrl } from "@/lib/courseLinks";
import { Send } from "lucide-react";
import { toast } from "sonner";

interface Course {
  id: string;
  name: string;
  slug?: string | null;
  category: string;
  duration: string | null;
  mode: string;
  total_fee: number;
  brochure_url: string | null;
  youtube_url: string | null;
  video_url: string | null;
  concise_syllabus: string | null;
  next_batch_date: string | null;
}

export default function SendCourseDrawer({ course, onClose }: { course: Course | null; onClose: () => void }) {
  const [contactName, setContactName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [preview, setPreview] = useState("");
  const [settings, setSettings] = useState<{ phone?: string; address?: string; website?: string } | null>(null);

  useEffect(() => {
    if (!course) return;
    setContactName("");
    setContactNumber("");
    (async () => {
      const [{ data: tpl }, { data: cfg }] = await Promise.all([
        supabase.from("crm_whatsapp_templates").select("body").eq("template_key", "COURSE_INFO").maybeSingle(),
        supabase.from("crm_institute_settings").select("phone, address, website").maybeSingle(),
      ]);
      setSettings(cfg ?? {});
      if (tpl?.body) {
        setPreview(buildPreview(tpl.body, course, cfg ?? {}, ""));
      }
    })();
  }, [course]);

  function buildPreview(body: string, c: Course, cfg: { phone?: string; address?: string; website?: string }, name: string) {
    const shareLink = coursePublicUrl(c.slug, c.name);
    return fillTemplate(body, {
      name: name || "there",
      course_name: c.name,
      concise_syllabus: c.concise_syllabus ?? "",
      duration: c.duration ?? "",
      course_fee: c.total_fee?.toLocaleString("en-IN") ?? "",
      next_batch_date: c.next_batch_date ?? "Coming soon",
      mode: c.mode,
      // Short, course-named links — WhatsApp will render image preview
      brochure_link: brochureShareUrl(c.slug, c.name),
      video_link: videoShareUrl(c.slug, c.name),
      course_share_link: shareLink,
      brochure_share_link: brochureShareUrl(c.slug, c.name),
      video_share_link: videoShareUrl(c.slug, c.name),
      phone: cfg.phone ?? "",
      website_link: cfg.website ?? "",
      institute_address: cfg.address ?? "",
    });
  }

  useEffect(() => {
    if (!course) return;
    (async () => {
      const { data: tpl } = await supabase.from("crm_whatsapp_templates").select("body").eq("template_key", "COURSE_INFO").maybeSingle();
      if (tpl?.body && settings) setPreview(buildPreview(tpl.body, course, settings, contactName));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactName]);

  const send = async () => {
    const cleaned = contactNumber.replace(/\D/g, "");
    if (cleaned.length < 10) {
      toast.error("Enter a valid mobile number with country code");
      return;
    }
    if (!course) return;
    const link = buildWaLink(cleaned, preview);
    await logWaSend({
      template_key: "COURSE_INFO",
      contact_number: cleaned,
      contact_name: contactName || undefined,
      message_snapshot: preview,
      entity_type: "course",
      entity_id: course.id,
    });
    window.open(link, "_blank", "noopener,noreferrer");
    toast.success("WhatsApp link opened — review and send");
    onClose();
  };

  return (
    <Sheet open={!!course} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Send course info</SheetTitle>
          <SheetDescription>{course?.name}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Recipient name (optional)</Label>
            <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Rahul" />
          </div>
          <div className="space-y-1.5">
            <Label>WhatsApp number *</Label>
            <Input value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="91XXXXXXXXXX (digits only with country code)" />
            <p className="text-[10px] text-muted-foreground">Enquiry search comes in Phase 2 — for now, type the number directly.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Message preview (editable)</Label>
            <Textarea rows={14} className="font-mono text-xs" value={preview} onChange={(e) => setPreview(e.target.value)} />
          </div>
          <Button onClick={send} className="w-full" size="lg">
            <Send className="w-4 h-4 mr-2" /> Open WhatsApp
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            This generates a wa.me link logged in the system. Counsellor reviews &amp; presses Send in WhatsApp.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
