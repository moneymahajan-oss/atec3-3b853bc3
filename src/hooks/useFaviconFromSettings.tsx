import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFavicon } from "./useFavicon";
import { useState } from "react";

let cached: string | null = null;
let inflight: Promise<string | null> | null = null;

async function loadFavicon(): Promise<string | null> {
  if (cached !== null) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data } = await supabase
      .from("crm_institute_settings")
      .select("favicon_url")
      .maybeSingle();
    cached = (data as { favicon_url?: string | null } | null)?.favicon_url ?? "";
    return cached;
  })();
  return inflight;
}

export function useFaviconFromSettings() {
  const [url, setUrl] = useState<string | undefined>(cached || undefined);
  useEffect(() => {
    loadFavicon().then((u) => { if (u) setUrl(u); });
  }, []);
  useFavicon(url);
}

export function refreshFaviconCache() {
  cached = null;
  inflight = null;
}
