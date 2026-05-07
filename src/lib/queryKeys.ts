import type { QueryClient } from "@tanstack/react-query";

/**
 * Canonical React Query keys used by public-facing sections.
 * Admin pages import this map so invalidation always targets the right keys.
 */
export const PUBLIC_QUERY_KEYS: Record<string, string[][]> = {
  hero_slides:       [["hero_slides"]],
  courses:           [["courses"]],
  gallery_items:     [["gallery_items"]],
  testimonials:      [["testimonials"]],
  stats:             [["stats"]],
  youtube_videos:    [["learn_videos"], ["about_videos"], ["life_videos"]],
  announcements:     [["announcements"]],
  downloads:         [["downloads"]],
  offer_belt:        [["offer_belt"]],
  ai_use_cases:      [["ai_use_cases"]],
  mock_tests:        [["mock_tests"]],
  site_settings:     [["site_settings"]],
  whatsapp_templates:[],           // no public query
  mock_test_results: [],           // no public query
  contact_submissions: [],         // no public query
  leads:             [],           // no public query
  team_members:      [],           // no public query (section removed)
};

/**
 * Call after any admin create / update / delete to bust the public cache
 * for the given Supabase table name.
 */
export function invalidatePublicQueries(
  queryClient: QueryClient,
  tableName: string,
) {
  const keys = PUBLIC_QUERY_KEYS[tableName];
  if (!keys) return;
  for (const key of keys) {
    queryClient.invalidateQueries({ queryKey: key });
  }
  // Always bust site_settings too when any table is touched,
  // because headings/subheadings come from site_settings
  if (tableName !== "site_settings") {
    queryClient.invalidateQueries({ queryKey: ["site_settings"] });
  }
}
