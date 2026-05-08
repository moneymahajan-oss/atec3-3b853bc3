
-- Fix 2: video columns
ALTER TABLE public.youtube_videos
  ADD COLUMN IF NOT EXISTS platform text DEFAULT 'youtube',
  ADD COLUMN IF NOT EXISTS video_url text;

-- Fix 4 prep: unique title for upsert seeding
CREATE UNIQUE INDEX IF NOT EXISTS mock_tests_title_unique ON public.mock_tests(title);

-- Fix 5: nav_items table
CREATE TABLE IF NOT EXISTS public.nav_items (
  id serial PRIMARY KEY,
  label text NOT NULL,
  section_key text NOT NULL,
  external_url text,
  order_index int NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.nav_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read nav" ON public.nav_items;
CREATE POLICY "Public read nav" ON public.nav_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage nav" ON public.nav_items;
CREATE POLICY "Admins manage nav" ON public.nav_items FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
