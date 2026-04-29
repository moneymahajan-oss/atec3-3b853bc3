import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  enquiryId: string;
  createdAt: string;
  source: string;
  createdByName: string | null;
}

interface TimelineEntry {
  ts: string;
  icon: string;
  text: string;
  by: string | null;
}

export function EnquiryTimeline({ enquiryId, createdAt, source, createdByName }: Props) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);

  useEffect(() => {
    (async () => {
      const [logsRes, notesRes] = await Promise.all([
        supabase
          .from("crm_whatsapp_logs")
          .select("template_key, created_at, staff_name, triggered_from")
          .eq("entity_type", "enquiry")
          .eq("entity_id", enquiryId)
          .order("created_at", { ascending: false }),
        supabase
          .from("crm_enquiry_notes")
          .select("body, note_type, staff_name, created_at")
          .eq("enquiry_id", enquiryId)
          .order("created_at", { ascending: false }),
      ]);

      const out: TimelineEntry[] = [];

      out.push({
        ts: createdAt,
        icon: "🌐",
        text: `Enquiry submitted via ${source.replace(/_/g, " ")}`,
        by: createdByName,
      });

      (logsRes.data ?? []).forEach((l: { template_key: string; created_at: string; staff_name: string | null; triggered_from: string | null }) => {
        out.push({
          ts: l.created_at,
          icon: "📱",
          text: `${l.template_key} sent${l.triggered_from ? ` via ${l.triggered_from}` : ""}`,
          by: l.staff_name,
        });
      });

      (notesRes.data ?? []).forEach((n: { body: string; note_type: string; staff_name: string | null; created_at: string }) => {
        const isStage = n.note_type === "stage_change";
        out.push({
          ts: n.created_at,
          icon: isStage ? "🔄" : "📝",
          text: isStage ? n.body : `Note added: ${n.body.slice(0, 100)}${n.body.length > 100 ? "…" : ""}`,
          by: n.staff_name,
        });
      });

      out.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
      setEntries(out);
    })();
  }, [enquiryId, createdAt, source, createdByName]);

  return (
    <Card>
      <CardHeader><CardTitle>Activity timeline</CardTitle></CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ol className="space-y-3 relative border-l border-border pl-4">
            {entries.map((e, i) => (
              <li key={i} className="text-sm">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-base leading-none">{e.icon}</span>
                  <span>{e.text}</span>
                  {e.by && <span className="text-xs text-muted-foreground">— by {e.by}</span>}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(e.ts).toLocaleString()}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
