import { supabase } from "@/integrations/supabase/client";
import { fillTemplate, buildWaLink } from "./whatsapp";

export type StudentWaSection = "students" | "fees" | "plan" | "payment";

export interface StudentCtx {
  id: string;
  full_name: string;
  phone: string;
  enrolment_no?: string | null;
  course_name_snapshot?: string | null;
  total_fee?: number | null;
  total_paid?: number | null;
  next_due_date?: string | null;
  next_due_amount?: number | null;
}

export interface InstituteCtx {
  name?: string | null;
  phone?: string | null;
  whatsapp_number?: string | null;
  website?: string | null;
  address?: string | null;
}

export const STUDENT_TEMPLATES_BY_SECTION: Record<
  StudentWaSection,
  { key: string; label: string }[]
> = {
  students: [
    { key: "STUDENT_WELCOME", label: "Welcome / Onboarding" },
    { key: "STUDENT_CLASS_SCHEDULE", label: "Class Schedule" },
    { key: "STUDENT_DOC_REMINDER", label: "Document Reminder" },
    { key: "STUDENT_GENERIC_FOLLOWUP", label: "Generic Follow-up" },
    { key: "FEE_CUSTOM_BALANCE", label: "Fee Balance Summary" },
  ],
  fees: [
    { key: "FEE_REMINDER_DUE", label: "Fee Reminder (Due)" },
    { key: "FEE_OVERDUE_NOTICE", label: "Overdue Notice" },
    { key: "FEE_CUSTOM_BALANCE", label: "Balance Summary" },
    { key: "FEE_PAYMENT_THANKS", label: "Payment Thanks" },
  ],
  plan: [
    { key: "FEE_REMINDER_DUE", label: "Send Installment Reminder" },
    { key: "FEE_OVERDUE_NOTICE", label: "Send Overdue Notice" },
  ],
  payment: [
    { key: "FEE_PAYMENT_THANKS", label: "Send Payment Receipt" },
  ],
};

export function buildStudentVars(
  s: StudentCtx,
  inst: InstituteCtx,
  extra: Record<string, string | number | null | undefined> = {},
) {
  const total = s.total_fee ?? 0;
  const paid = s.total_paid ?? 0;
  const due = Math.max(total - paid, 0);
  const fmt = (n: number) => n.toLocaleString("en-IN");
  return {
    name: s.full_name,
    enrolment_no: s.enrolment_no ?? "",
    course_name: s.course_name_snapshot ?? "your course",
    total_fee: fmt(total),
    total_paid: fmt(paid),
    due_amount: fmt(due),
    next_due_amount: s.next_due_amount ? fmt(s.next_due_amount) : "",
    next_due_date: s.next_due_date ?? "",
    institute_name: inst.name || "ATEC Education",
    institute_phone: inst.phone || inst.whatsapp_number || "",
    institute_website: inst.website || "",
    institute_address: inst.address || "",
    ...extra,
  };
}

let cachedInstitute: InstituteCtx | null = null;
export async function getInstitute(): Promise<InstituteCtx> {
  if (cachedInstitute) return cachedInstitute;
  const { data } = await supabase
    .from("crm_institute_settings")
    .select("name,phone,whatsapp_number,website,address")
    .maybeSingle();
  cachedInstitute = (data ?? {}) as InstituteCtx;
  return cachedInstitute;
}

export interface SendStudentArgs {
  templateKey: string;
  student: StudentCtx;
  institute: InstituteCtx;
  extraVars?: Record<string, string | number | null | undefined>;
  triggeredFrom: string;
}

export async function sendWhatsAppForStudent({
  templateKey, student, institute, extraVars, triggeredFrom,
}: SendStudentArgs): Promise<{ ok: boolean; url?: string; error?: string }> {
  const number = (student.phone || "").replace(/\D/g, "");
  if (!number) return { ok: false, error: "No phone number" };

  const { data: tpl } = await supabase
    .from("crm_whatsapp_templates")
    .select("body, template_key")
    .eq("template_key", templateKey)
    .eq("is_active", true)
    .maybeSingle();
  if (!tpl) return { ok: false, error: `Template ${templateKey} not found` };

  const vars = buildStudentVars(student, institute, extraVars);
  const message = fillTemplate(tpl.body, vars as Record<string, string | number>);
  const url = buildWaLink(number, message);

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (user) {
    await supabase.from("crm_whatsapp_logs").insert({
      template_key: templateKey,
      contact_number: number,
      contact_name: student.full_name,
      message_snapshot: message,
      entity_type: "student",
      entity_id: student.id,
      status: "link_generated",
      staff_id: user.id,
      staff_name: user.user_metadata?.full_name || user.email || null,
      triggered_from: triggeredFrom,
    } as never);
  }
  return { ok: true, url };
}
