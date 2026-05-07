import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function fetchSettings(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from("site_settings").select("key, value");
  if (error) {
    console.error("[useSiteSettings] fetch error:", error.message);
    return {};
  }
  const map: Record<string, string> = {};
  (data || []).forEach((row: any) => {
    if (row.key) map[row.key] = row.value ?? "";
  });
  return map;
}

/**
 * React Query-backed site settings hook.
 * staleTime: 0 — always refetch on mount / window focus so admin edits
 * show up immediately on the public site.
 */
export function useSiteSettings(): Record<string, string> {
  const { data } = useQuery({
    queryKey: ["site_settings"],
    queryFn: fetchSettings,
    staleTime: 0,
  });
  return data ?? {};
}

/**
 * Force an immediate refetch of site_settings across every mounted component.
 * Called from admin pages after saving a setting.
 */
export function useRefreshSiteSettings() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["site_settings"] });
}

/**
 * @deprecated Use useRefreshSiteSettings() hook instead when inside a component.
 * This standalone version is kept for non-component callers that already have
 * access to a QueryClient.
 */
export function refreshSiteSettings() {
  // no-op — callers should migrate to the hook version
}
