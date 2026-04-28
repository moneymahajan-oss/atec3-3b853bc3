import { supabase } from "@/integrations/supabase/client";

export function fillTemplate(
  body: string,
  vars: Record<string, string | number | undefined | null>
): string {
  let result = body;
  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`\\{${key}\\}`, "g");
    const v = value === undefined || value === null || value === "" ? "" : String(value);
    result = result.replace(regex, v);
  }
  // Drop lines that became "Label:" with nothing after the colon (optional vars left empty)
  return result
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      // remove lines like "📄 Full Brochure:" or "Brochure:" with no value
      if (/^[^\s]*\s?[A-Za-z][A-Za-z &]*:\s*$/.test(trimmed)) return false;
      return true;
    })
    .join("\n");
}

export function buildWaLink(number: string, message: string): string {
  const cleaned = (number || "").replace(/\D/g, "");
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

export interface LogWaArgs {
  template_key: string;
  contact_number: string;
  contact_name?: string;
  message_snapshot: string;
  entity_type?: string;
  entity_id?: string;
}

export async function logWaSend(args: LogWaArgs) {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return;
  await supabase.from("crm_whatsapp_logs").insert({
    template_key: args.template_key,
    contact_number: args.contact_number.replace(/\D/g, ""),
    contact_name: args.contact_name ?? null,
    message_snapshot: args.message_snapshot,
    entity_type: args.entity_type ?? null,
    entity_id: args.entity_id ?? null,
    status: "link_generated",
    staff_id: user.id,
    staff_name: user.user_metadata?.full_name || user.email || null,
  });
}
