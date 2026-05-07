import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

let cache: Record<string, string> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 60 seconds
const listeners = new Set<(s: Record<string, string>) => void>();

async function loadSettings() {
  const { data } = await supabase.from("site_settings").select("key, value");
  const map: Record<string, string> = {};
  (data || []).forEach((row: any) => {
    if (row.value) map[row.key] = row.value;
  });
  cache = map;
  cacheTimestamp = Date.now();
  listeners.forEach((l) => l(map));
  return map;
}

export function useSiteSettings() {
  const [settings, setSettings] = useState<Record<string, string>>(cache || {});

  useEffect(() => {
    const isStale = !cache || Date.now() - cacheTimestamp > CACHE_TTL;
    if (isStale) {
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
  cacheTimestamp = 0;
  return loadSettings();
}
