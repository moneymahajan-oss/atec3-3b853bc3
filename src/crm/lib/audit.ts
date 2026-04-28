import { supabase } from "@/integrations/supabase/client";

export async function logAudit(
  action: string,
  entity: string,
  entity_id: string | null,
  diff?: Record<string, unknown> | null
) {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return;
  await supabase.from("crm_audit_logs").insert({
    user_id: user.id,
    action,
    entity,
    entity_id: entity_id ?? null,
    diff: (diff as never) ?? null,
  });
}
