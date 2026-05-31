// src/hooks/useFavicon.tsx
// Always sets ATEC favicon — falls back to /favicon.ico if no URL given
import { useEffect } from "react";

const ATEC_FAVICON = "/favicon.ico";

export function useFavicon(url?: string) {
  useEffect(() => {
    const href = url || ATEC_FAVICON;

    // Main icon
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = href;
    link.type = href.endsWith(".png") ? "image/png" : "image/x-icon";

    // Apple touch icon
    let apple = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
    if (!apple) {
      apple = document.createElement("link");
      apple.rel = "apple-touch-icon";
      document.head.appendChild(apple);
    }
    apple.href = href;

    // Shortcut icon (IE legacy)
    let shortcut = document.querySelector<HTMLLinkElement>("link[rel='shortcut icon']");
    if (!shortcut) {
      shortcut = document.createElement("link");
      shortcut.rel = "shortcut icon";
      document.head.appendChild(shortcut);
    }
    shortcut.href = href;
  }, [url]);
}
