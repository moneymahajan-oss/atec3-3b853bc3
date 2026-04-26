import { supabase } from "@/integrations/supabase/client";

const FALLBACK_WA = "917009933289";

let cachedNumber: string | null = null;
let cachedTemplates: Record<string, string> | null = null;

export async function getWhatsAppNumber(): Promise<string> {
  if (cachedNumber) return cachedNumber;
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "whatsapp_number")
    .maybeSingle();
  cachedNumber = (data?.value || FALLBACK_WA).replace(/\D/g, "");
  return cachedNumber;
}

export async function getTemplate(templateKey: string): Promise<string> {
  if (cachedTemplates && cachedTemplates[templateKey]) return cachedTemplates[templateKey];
  const { data } = await supabase
    .from("whatsapp_templates")
    .select("template_key, message_body")
    .eq("is_active", true);
  cachedTemplates = {};
  (data || []).forEach((t: any) => {
    cachedTemplates![t.template_key] = t.message_body;
  });
  return cachedTemplates[templateKey] || "";
}

function fillVars(message: string, vars: Record<string, string | number | undefined>): string {
  let result = message;
  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`\\{${key}\\}`, "g");
    result = result.replace(regex, value !== undefined ? String(value) : "");
  }
  // strip empty lines that resulted from missing optional vars
  return result
    .split("\n")
    .filter((line) => !/^[A-Za-z]+:\s*$/.test(line.trim()))
    .join("\n");
}

export async function buildWhatsAppLink(
  templateKey: string,
  vars: Record<string, string | number | undefined> = {},
  overrideNumber?: string
): Promise<string> {
  const number = overrideNumber ? overrideNumber.replace(/\D/g, "") : await getWhatsAppNumber();
  const template = await getTemplate(templateKey);
  const message = fillVars(template, vars);
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function whatsAppLinkSync(number: string, message: string): string {
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}
