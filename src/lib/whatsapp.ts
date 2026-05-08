import { supabase } from "@/integrations/supabase/client";

const FALLBACK_WA = "917009933289";

let cachedNumber: string | null = null;
let cachedTemplates: Record<string, { body: string; wa_number: string | null }> | null = null;

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

async function loadTemplates() {
  if (cachedTemplates) return;
  const { data } = await supabase
    .from("whatsapp_templates")
    .select("template_key, message_body, wa_number")
    .eq("is_active", true);
  cachedTemplates = {};
  (data || []).forEach((t: any) => {
    cachedTemplates![t.template_key] = {
      body: t.message_body,
      wa_number: t.wa_number || null,
    };
  });
}

export async function getTemplate(templateKey: string): Promise<string> {
  await loadTemplates();
  return cachedTemplates?.[templateKey]?.body || "";
}

export async function getTemplateWaNumber(templateKey: string): Promise<string | null> {
  await loadTemplates();
  return cachedTemplates?.[templateKey]?.wa_number || null;
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
  let number: string;
  if (overrideNumber) {
    number = overrideNumber.replace(/\D/g, "");
  } else {
    // Check if the template has a specific wa_number configured
    const templateWa = await getTemplateWaNumber(templateKey);
    number = templateWa ? templateWa.replace(/\D/g, "") : await getWhatsAppNumber();
  }
  const template = await getTemplate(templateKey);
  const message = fillVars(template, vars);
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function whatsAppLinkSync(number: string, message: string): string {
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}

/** Clear cached templates so next call re-fetches from DB */
export function clearTemplateCache() {
  cachedTemplates = null;
}
