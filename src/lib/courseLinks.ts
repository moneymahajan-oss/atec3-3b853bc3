/**
 * Helpers for building short, course-named share links + media thumbnails.
 *
 * Goal: WhatsApp messages should contain a short link like
 *   https://atec.../c/tally-prime
 * which renders a rich preview card (image + title + description) sourced
 * from the public CoursePublic page's Open Graph meta tags.
 */

export function slugifyCourseName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function getPublicOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "https://ateceducationinnew.lovable.app";
}

export function coursePublicUrl(slugOrName: string | null | undefined, fallbackName?: string): string {
  const slug = (slugOrName && slugOrName.trim()) || (fallbackName ? slugifyCourseName(fallbackName) : "");
  if (!slug) return getPublicOrigin();
  return `${getPublicOrigin()}/c/${slug}`;
}

export function brochureShareUrl(slug: string | null | undefined, name?: string): string {
  return `${coursePublicUrl(slug, name)}#brochure`;
}

export function videoShareUrl(slug: string | null | undefined, name?: string): string {
  return `${coursePublicUrl(slug, name)}#video`;
}

/** Extract a YouTube video id from any common YouTube URL format. */
export function youtubeId(url?: string | null): string | null {
  if (!url) return null;
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

export function youtubeThumb(url?: string | null): string | null {
  const id = youtubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

/**
 * Resolve the best preview image for a course in this priority:
 * 1. og_image_url (curated)
 * 2. YouTube thumbnail derived from youtube_url / video_url
 * 3. fallback brand banner
 */
export function resolveCourseOgImage(course: {
  og_image_url?: string | null;
  youtube_url?: string | null;
  video_url?: string | null;
  thumbnail_url?: string | null;
}): string {
  if (course.og_image_url) return course.og_image_url;
  const yt = youtubeThumb(course.youtube_url) || youtubeThumb(course.video_url);
  if (yt) return yt;
  if (course.thumbnail_url) return course.thumbnail_url;
  return `${getPublicOrigin()}/og-course-default.png`;
}
