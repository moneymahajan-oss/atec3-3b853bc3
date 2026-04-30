import { supabase } from "@/integrations/supabase/client";
import { fillTemplate, buildWaLink, logWaSend } from "./whatsapp";

export interface AttendanceReportArgs {
  studentId: string;
  studentName: string;
  phone: string;
  batchName: string;
  from: string;
  to: string;
  workingDays: number;
  present: number;
  absent: number;
}

export async function sendAttendanceReportWa(args: AttendanceReportArgs) {
  const number = (args.phone || "").replace(/\D/g, "");
  if (!number) return { ok: false, error: "No phone" };

  const { data: tpl } = await supabase
    .from("crm_whatsapp_templates")
    .select("body")
    .eq("template_key", "attendance_report")
    .eq("is_active", true)
    .maybeSingle();
  if (!tpl) return { ok: false, error: "Template attendance_report not found" };

  const percent = args.workingDays > 0 ? Math.round((args.present / args.workingDays) * 100) : 0;
  const message = fillTemplate(tpl.body, {
    name: args.studentName,
    batch: args.batchName,
    from: args.from,
    to: args.to,
    working_days: args.workingDays,
    present: args.present,
    absent: args.absent,
    percent,
  });
  const url = buildWaLink(number, message);
  await logWaSend({
    template_key: "attendance_report",
    contact_number: number,
    contact_name: args.studentName,
    message_snapshot: message,
    entity_type: "student",
    entity_id: args.studentId,
  });
  return { ok: true, url, message };
}
