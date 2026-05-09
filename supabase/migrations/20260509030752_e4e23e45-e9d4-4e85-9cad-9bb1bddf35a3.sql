
-- ============================================================
-- 1) crm_institute_settings: drop public anon read
-- ============================================================
DROP POLICY IF EXISTS "Public can read settings" ON public.crm_institute_settings;

-- Safe public function returning only non-sensitive fields
CREATE OR REPLACE FUNCTION public.get_public_institute_settings()
RETURNS TABLE (
  name text,
  logo_url text,
  favicon_url text,
  whatsapp_number text,
  phone text,
  website text,
  collection_timings text,
  self_fill_form_title text,
  self_fill_form_subtitle text,
  self_fill_thank_you_message text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT name, logo_url, favicon_url, whatsapp_number, phone, website,
         collection_timings, self_fill_form_title, self_fill_form_subtitle,
         self_fill_thank_you_message
    FROM public.crm_institute_settings
   LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_public_institute_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_institute_settings() TO anon, authenticated;

-- ============================================================
-- 2) crm_certificates: drop blanket anon SELECT
-- (CRM staff still see them via has_any_crm_role policy)
-- ============================================================
DROP POLICY IF EXISTS "Public can verify certificates" ON public.crm_certificates;

-- ============================================================
-- 3) app_settings: admin-only writes
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Authenticated users can update app settings" ON public.app_settings;

CREATE POLICY "Admins can insert app settings"
  ON public.app_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update app settings"
  ON public.app_settings
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete app settings"
  ON public.app_settings
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================================
-- 4) verification_certificates: admin-only writes
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert certificates" ON public.verification_certificates;
DROP POLICY IF EXISTS "Authenticated users can update certificates" ON public.verification_certificates;
DROP POLICY IF EXISTS "Authenticated users can delete certificates" ON public.verification_certificates;

CREATE POLICY "Admins can insert verification certificates"
  ON public.verification_certificates
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update verification certificates"
  ON public.verification_certificates
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete verification certificates"
  ON public.verification_certificates
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================================
-- 5) crm_faculties: drop blanket public read, expose via safe functions
-- ============================================================
DROP POLICY IF EXISTS "Public can view public faculties" ON public.crm_faculties;

CREATE OR REPLACE FUNCTION public.get_public_faculties()
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  designation text,
  specialization text,
  qualifications text,
  bio text,
  photo_url text,
  experience_years integer,
  linkedin_url text,
  instagram_url text,
  display_order integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, slug, designation, specialization, qualifications, bio,
         photo_url, experience_years, linkedin_url, instagram_url, display_order
    FROM public.crm_faculties
   WHERE is_active = true AND is_public = true
   ORDER BY display_order, name;
$$;
REVOKE ALL ON FUNCTION public.get_public_faculties() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_faculties() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_faculty_by_slug(_slug text)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  designation text,
  specialization text,
  qualifications text,
  bio text,
  photo_url text,
  experience_years integer,
  linkedin_url text,
  instagram_url text,
  joined_on date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, slug, designation, specialization, qualifications, bio,
         photo_url, experience_years, linkedin_url, instagram_url, joined_on
    FROM public.crm_faculties
   WHERE is_active = true AND is_public = true AND slug = _slug
   LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_public_faculty_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_faculty_by_slug(text) TO anon, authenticated;

-- ============================================================
-- 6) mock_tests: drop public SELECT, expose via safe functions that
--    strip the 'correct' field. Add server-side scoring function.
-- ============================================================
DROP POLICY IF EXISTS "Public can view mock tests" ON public.mock_tests;
DROP POLICY IF EXISTS "Public can view active mock tests" ON public.mock_tests;
DROP POLICY IF EXISTS "Anyone can view mock tests" ON public.mock_tests;

CREATE OR REPLACE FUNCTION public.get_public_mock_tests()
RETURNS TABLE (
  id uuid,
  course text,
  title text,
  questions jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, course, title,
         COALESCE(
           (SELECT jsonb_agg(q - 'correct') FROM jsonb_array_elements(questions) q),
           '[]'::jsonb
         ) AS questions
    FROM public.mock_tests
   WHERE is_active = true;
$$;
REVOKE ALL ON FUNCTION public.get_public_mock_tests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_mock_tests() TO anon, authenticated;

-- Server-side scorer: client sends {questionIndex: chosenOptionIndex} map
-- and we return the count of correct answers + total. The 'correct' values
-- never leave the server.
CREATE OR REPLACE FUNCTION public.grade_mock_test(_test_id uuid, _answers jsonb)
RETURNS TABLE (score integer, total integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  qs jsonb;
  q jsonb;
  i int := 0;
  s int := 0;
  t int := 0;
  chosen text;
  correct_idx int;
BEGIN
  SELECT questions INTO qs FROM public.mock_tests WHERE id = _test_id AND is_active = true;
  IF qs IS NULL THEN
    RETURN QUERY SELECT 0, 0;
    RETURN;
  END IF;
  FOR q IN SELECT jsonb_array_elements(qs) LOOP
    t := t + 1;
    correct_idx := (q->>'correct')::int;
    chosen := _answers->>(i::text);
    IF chosen IS NOT NULL AND chosen::int = correct_idx THEN
      s := s + 1;
    END IF;
    i := i + 1;
  END LOOP;
  RETURN QUERY SELECT s, t;
END;
$$;
REVOKE ALL ON FUNCTION public.grade_mock_test(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grade_mock_test(uuid, jsonb) TO anon, authenticated;
