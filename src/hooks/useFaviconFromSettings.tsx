// src/hooks/useFaviconFromSettings.tsx
// Reads favicon_url from DB — immediately sets /favicon.ico as fallback
// so admin/CRM pages never show Lovable favicon even before DB loads

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFavicon } from "./useFavicon";

const ATEC_FAVICON = "/favicon.ico";

let cached: string | null = null;
let inflight: Promise<string | null> | null = null;

async function loadFavicon(): Promise<string | null> {
  if (cached !== null) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data } = await supabase.rpc("get_public_institute_settings");
      const row = Array.isArray(data) ? data[0] : null;
      const url = (row as { favicon_url?: string | null } | null)?.favicon_url;
      cached = url || ATEC_FAVICON;
      return cached;
    } catch {
      cached = ATEC_FAVICON;
      return cached;
    }
  })();
  return inflight;
}

export function useFaviconFromSettings() {
  // Start with ATEC favicon immediately — no blank/Lovable flash
  const [url, setUrl] = useState<string>(ATEC_FAVICON);

  useEffect(() => {
    loadFavicon().then((u) => { if (u) setUrl(u); });
  }, []);

  useFavicon(url);
}

export function refreshFaviconCache() {
  cached = null;
  inflight = null;
}
