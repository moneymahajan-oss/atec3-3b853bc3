import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

let cache: Record<string, string> | null = null;
const listeners = new Set<(s: Record<string, string>) => void>();

async function loadSettings() {
  const { data } = await supabase.from("site_settings").select("key, value");
  const map: Record<string, string> = {};
  (data || []).forEach((row: any) => {
    if (row.value) map[row.key] = row.value;
  });
  cache = map;
  listeners.forEach((l) => l(map));
  return map;
}

export function useSiteSettings() {
  const [settings, setSettings] = useState<Record<string, string>>(cache || {});

  useEffect(() => {
    if (!cache) {
      loadSettings().then(setSettings);
    }
    listeners.add(setSettings);
    return () => {
      listeners.delete(setSettings);
    };
  }, []);

  return settings;
}

export function getCachedSetting(key: string, fallback = ""): string {
  return cache?.[key] || fallback;
}

export function refreshSiteSettings() {
  cache = null;
  return loadSettings();
}
