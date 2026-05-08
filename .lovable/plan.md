# 5-Fix Implementation Plan

## Audit findings (so we don't duplicate)
- `youtube_videos` exists with `section` ('about' | 'life'), `thumbnail_url`, `video_id`. No `platform` column.
- `mock_tests` exists but stores **questions as JSONB** inside the same row (no separate `mock_questions` table).
- Headings live in `site_settings` table (not `app_settings`). Currently both `GallerySection` and `LifeAtAtecSection` read the same key `life_section_heading` → that's the duplicate heading bug.
- No `site_sections`, `social_links`, or `nav_items` tables exist.
- Social URLs already exist as `site_settings` keys (`social_instagram_url`, etc.) — will reuse, not duplicate.
- Navbar is hardcoded in `src/components/Navbar.tsx`.

---

## FIX 1 — Independent Life@ATEC headings
- Add 2 new keys to existing `site_settings`: `life_gallery_heading`, `life_videos_heading` (no new table needed — `site_settings` already serves this purpose).
- `GallerySection.tsx` → read `life_gallery_heading` (fallback to old key).
- `LifeAtAtecSection.tsx` → read `life_videos_heading` (fallback to old key).
- Add both fields in `AdminSiteContent.tsx` under "Section Headings" group.

## FIX 2 — Video cards with thumbnails + platform
- Migration: add `platform text default 'youtube'`, `video_url text` columns to `youtube_videos`.
- `LifeAtAtecSection.tsx`: render thumbnail (`thumbnail_url` if set, else auto YouTube `hqdefault`) with play overlay; click opens in modal (YouTube embed) or new tab (FB/IG).
- New admin page `AdminVideos.tsx`: form with Title, Platform dropdown (YouTube/Facebook/Instagram), Video URL, Thumbnail URL (optional for YouTube), Section (about/life), is_active. Auto-extract YouTube ID for thumbnail when blank.

## FIX 3 — Social QR codes in Connect With Us
- Reuse existing `site_settings` social keys + `whatsapp_number`. No new table needed.
- Add `social_<x>_visible` boolean keys (stored as 'true'/'false' strings).
- Update `SocialConnectSection.tsx`: each card shows logo on top, QR code (qrcode.react) center, label below; click opens link. WhatsApp card encodes `https://wa.me/<number>`.
- Admin: add show/hide toggle for each platform alongside existing URL fields in `AdminSiteContent.tsx`.

## FIX 4 — Manual mock-test question editor
- Keep existing JSONB `questions` column on `mock_tests` (no schema change → no breaking refactor of mock test runner).
- New admin page `AdminMockTests.tsx`:
  - List tests; Add/Edit test (title, course).
  - Per-test: question form (Question, Option A-D, Correct A/B/C/D) → appends to JSONB `questions` array via update.
  - List existing questions with Edit/Delete (numbered).
  - Keep "Import JSON" as secondary button.
- Seed 4 tests with 10 real questions each (AI Tools, Busy Accounting, Python, Digital Marketing) via `INSERT … ON CONFLICT (title) DO NOTHING`. Will add unique index on `title` first.

## FIX 5 — Admin-configurable navbar
- New table `nav_items` (id serial, label, section_key, order_index, is_visible, external_url nullable).
- Seed with current 9 items.
- `Navbar.tsx`: fetch from `nav_items` where `is_visible`, ordered by `order_index`. Fallback to hardcoded list while loading.
- New admin page `AdminNav.tsx`: list items with label edit, visibility toggle, up/down reorder buttons, add new (label + section_key).
- Add `Site Settings` group on `AdminDashboard` linking to: Site Content, Videos, Mock Tests, Navigation.

---

## Migration (single SQL block)
```sql
-- Fix 2
ALTER TABLE youtube_videos
  ADD COLUMN IF NOT EXISTS platform text DEFAULT 'youtube',
  ADD COLUMN IF NOT EXISTS video_url text;

-- Fix 4 prep
CREATE UNIQUE INDEX IF NOT EXISTS mock_tests_title_unique ON mock_tests(title);

-- Fix 5
CREATE TABLE IF NOT EXISTS nav_items (
  id serial PRIMARY KEY,
  label text NOT NULL,
  section_key text NOT NULL,
  external_url text,
  order_index int NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE nav_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read nav" ON nav_items FOR SELECT USING (true);
CREATE POLICY "Admins manage nav" ON nav_items FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
-- + seed 9 nav items, 4 mock tests with 10 questions each, default site_settings keys
```

---

## Files touched
**Created:** `src/pages/AdminVideos.tsx`, `src/pages/AdminMockTests.tsx`, `src/pages/AdminNav.tsx`, migration SQL.
**Edited:** `GallerySection.tsx`, `LifeAtAtecSection.tsx`, `SocialConnectSection.tsx`, `Navbar.tsx`, `AdminSiteContent.tsx`, `AdminDashboard.tsx`, `App.tsx` (routes).
**Untouched:** auth, courses, certificates, WhatsApp templates, CRM.

## Notes / decisions
- Keep `mock_tests.questions` as JSONB (avoids breaking the public test runner). Editor manipulates the array.
- Reuse `site_settings` for headings & social toggles instead of adding `site_sections` / `social_links` tables — cleaner, avoids duplication, same admin surface already exists.
- Navbar falls back to hardcoded list during the first paint to avoid layout flash.

Confirm and I'll ship all 5 in one pass.
