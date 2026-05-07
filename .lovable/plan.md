I found the previous fix did not fully cover the live failure mode. The public page now fetches with React Query, but admin edits still do not invalidate the shared React Query cache, settings still use a separate 60-second custom cache, and several card sections still render image/card layouts without validating media URLs. That can create stale cards and visible blank/white media areas after returning from admin or reloading an already-mounted page.

Plan to fix it:

1. Create one shared query-key map for public content
   - Add a small helper module for public content query keys, including:
     - `hero_slides`
     - `courses`
     - `gallery_items`
     - `testimonials`
     - `stats`
     - `youtube_videos` variants
     - `announcements`
     - `downloads`
     - `offer_belt`
     - `ai_use_cases`
     - `mock_tests`
     - `crm_faculties`
     - `site_settings`
   - This avoids the current risk where admin invalidation uses a different string than the public `useQuery`.

2. Fix admin create/update/delete cache invalidation
   - Change `src/pages/AdminTable.tsx` to use `useQueryClient()`.
   - After every successful insert/update/delete, invalidate the exact public query keys for that edited table.
   - For shared tables, invalidate all affected variants. Example: editing `youtube_videos` invalidates `learn_videos`, `about_videos`, and `life_videos`; editing `courses` invalidates both `courses` and the contact course list if applicable.
   - Keep `fetchData()` for the admin table itself, but add React Query invalidation so returning to the website immediately refetches.

3. Convert site settings to React Query instead of the 60-second manual cache
   - Rewrite `src/hooks/useSiteSettings.tsx` to use React Query with query key `['site_settings']` and `staleTime: 0`.
   - Keep exported compatibility functions if needed, but make them invalidate/refetch the query instead of relying on a module-level timeout cache.
   - Update `src/pages/AdminSiteContent.tsx` so each successful settings save invalidates `['site_settings']` immediately.
   - This directly fixes database text/settings not appearing until later.

4. Normalize and validate public media URLs before rendering cards
   - Add a helper to trim media URLs and reject empty/null strings.
   - For public buckets/URLs, keep public URL usage only; no signed URLs.
   - Update card components so they only render media markup after data is loaded and the media URL is valid, or use a stable fallback/placeholder where appropriate.
   - Target files:
     - `src/components/HeroSection.tsx`
     - `src/components/CoursesSection.tsx`
     - `src/components/GallerySection.tsx`
     - `src/components/FacultySection.tsx`
     - `src/components/TestimonialsSection.tsx`
     - `src/components/VideosSection.tsx`
     - public faculty pages if they have the same media pattern.

5. Fix loading/empty render states to avoid white spaces
   - For sections that currently do `if (isLoading || items.length === 0) return null`, adjust behavior by section:
     - Critical hero: always render a valid fallback slide immediately.
     - Optional sections: render nothing until data is loaded, then only render when valid items exist.
     - Sections with headings/cards: do not render heading/container/card wrappers before valid data exists.
   - Remove card markup that can mount before its required image/media data exists.

6. Confirm database visibility/RLS and active data
   - RLS policies already show public/anon SELECT access for active public content tables.
   - I will keep this intact and only add a migration if I find a missing policy while implementing.

7. Verification after changes
   - Open the preview and confirm the homepage renders without blank/white card media spaces.
   - Simulate the second-load scenario by navigating away/back and/or refreshing.
   - Confirm network calls refetch after invalidation and public sections display database data.
   - Provide a concise before/after list of every changed file and the specific fix applied.