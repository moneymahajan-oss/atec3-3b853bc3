// Helpers to support YouTube, Instagram, Facebook (and generic) video links

export type VideoPlatform = "youtube" | "instagram" | "facebook" | "vimeo" | "other";

export function detectPlatform(url: string): VideoPlatform {
  if (!url) return "other";
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("instagram.com")) return "instagram";
  if (u.includes("facebook.com") || u.includes("fb.watch")) return "facebook";
  if (u.includes("vimeo.com")) return "vimeo";
  return "other";
}

export function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[A-Za-z0-9_-]{6,15}$/.test(trimmed)) return trimmed;
  const m = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]+)/
  );
  return m ? m[1] : null;
}

export function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

/** Returns a normalized video id used for storage (best effort). */
export function extractVideoId(url: string, platform: VideoPlatform): string {
  if (!url) return "";
  if (platform === "youtube") return extractYouTubeId(url) || "";
  if (platform === "vimeo") return extractVimeoId(url) || "";
  // For IG/FB/other, store the URL itself as the id reference.
  return url;
}

/** Best-effort thumbnail derivation when admin leaves it blank. */
export function deriveThumbnail(
  url: string,
  platform: VideoPlatform,
  existing?: string | null
): string {
  if (existing && existing.trim()) return existing;
  if (platform === "youtube") {
    const id = extractYouTubeId(url);
    if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  }
  if (platform === "vimeo") {
    const id = extractVimeoId(url);
    if (id) return `https://vumbnail.com/${id}.jpg`;
  }
  if (platform === "instagram") {
    // Instagram doesn't allow direct thumbnail extraction without auth.
    // Append /media/?size=l works for legacy public posts.
    const m = url.match(/instagram\.com\/(?:p|reel|tv)\/([^/?#]+)/);
    if (m) return `https://www.instagram.com/p/${m[1]}/media/?size=l`;
  }
  return "/placeholder.svg";
}

/** Embed URL for in-page playback. Returns null when we should just open externally. */
export function getEmbedUrl(url: string, platform: VideoPlatform): string | null {
  if (platform === "youtube") {
    const id = extractYouTubeId(url);
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : null;
  }
  if (platform === "vimeo") {
    const id = extractVimeoId(url);
    return id ? `https://player.vimeo.com/video/${id}?autoplay=1` : null;
  }
  if (platform === "facebook") {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
      url
    )}&show_text=false&autoplay=1`;
  }
  if (platform === "instagram") {
    // Instagram embed iframe
    const clean = url.split("?")[0].replace(/\/$/, "");
    return `${clean}/embed`;
  }
  return null;
}
export function getDialogSize(platform: VideoPlatform): {
  dialogClass: string;
  containerClass: string;
} {
  switch (platform) {
    case "youtube":
    case "vimeo":
      return {
        dialogClass: "max-w-4xl w-full p-0 bg-black border-0",
        containerClass: "aspect-video w-full",
      };
    case "instagram":
      return {
        dialogClass: "max-w-sm w-full p-0 bg-black border-0",
        containerClass: "w-full",
      };
    case "facebook":
      return {
        dialogClass: "max-w-2xl w-full p-0 bg-black border-0",
        containerClass: "aspect-video w-full",
      };
    default:
      return {
        dialogClass: "max-w-3xl w-full p-0 bg-black border-0",
        containerClass: "aspect-video w-full",
      };
  }
}

