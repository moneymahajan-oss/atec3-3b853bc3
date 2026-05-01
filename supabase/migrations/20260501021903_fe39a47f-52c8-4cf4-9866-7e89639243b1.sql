-- ============== crm_faculties table ==============
CREATE TABLE public.crm_faculties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  designation text,
  qualifications text,
  specialization text,
  bio text,
  photo_url text,
  email text,
  phone text,
  experience_years integer,
  joined_on date,
  linkedin_url text,
  instagram_url text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX crm_faculties_name_lower_idx ON public.crm_faculties (lower(name));

ALTER TABLE public.crm_faculties ENABLE ROW LEVEL SECURITY;

-- CRM staff: view
CREATE POLICY "CRM staff view faculties"
  ON public.crm_faculties FOR SELECT
  TO authenticated
  USING (public.has_any_crm_role(auth.uid()));

-- CRM admins: full write
CREATE POLICY "CRM admins insert faculties"
  ON public.crm_faculties FOR INSERT
  TO authenticated
  WITH CHECK (public.has_crm_role(auth.uid(), 'admin'::crm_role));

CREATE POLICY "CRM admins update faculties"
  ON public.crm_faculties FOR UPDATE
  TO authenticated
  USING (public.has_crm_role(auth.uid(), 'admin'::crm_role))
  WITH CHECK (public.has_crm_role(auth.uid(), 'admin'::crm_role));

CREATE POLICY "CRM admins delete faculties"
  ON public.crm_faculties FOR DELETE
  TO authenticated
  USING (public.has_crm_role(auth.uid(), 'admin'::crm_role));

-- Public read of public+active rows
CREATE POLICY "Public can view public faculties"
  ON public.crm_faculties FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND is_public = true);

-- updated_at trigger
CREATE TRIGGER crm_faculties_updated_at
  BEFORE UPDATE ON public.crm_faculties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Slug auto-generator
CREATE OR REPLACE FUNCTION public.crm_faculty_set_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug text;
  candidate text;
  n int := 0;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
    RETURN NEW;
  END IF;
  base_slug := lower(regexp_replace(coalesce(NEW.name,''), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' THEN base_slug := 'faculty'; END IF;
  candidate := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.crm_faculties WHERE slug = candidate AND id <> coalesce(NEW.id, gen_random_uuid())) LOOP
    n := n + 1;
    candidate := base_slug || '-' || n;
  END LOOP;
  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

CREATE TRIGGER crm_faculties_set_slug
  BEFORE INSERT OR UPDATE ON public.crm_faculties
  FOR EACH ROW
  EXECUTE FUNCTION public.crm_faculty_set_slug();

-- ============== Storage bucket for faculty photos ==============
INSERT INTO storage.buckets (id, name, public)
VALUES ('crm-faculty-photos', 'crm-faculty-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Faculty photos are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'crm-faculty-photos');

CREATE POLICY "CRM admins upload faculty photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'crm-faculty-photos' AND public.has_crm_role(auth.uid(), 'admin'::crm_role));

CREATE POLICY "CRM admins update faculty photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'crm-faculty-photos' AND public.has_crm_role(auth.uid(), 'admin'::crm_role));

CREATE POLICY "CRM admins delete faculty photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'crm-faculty-photos' AND public.has_crm_role(auth.uid(), 'admin'::crm_role));

-- ============== Seed from existing batches ==============
INSERT INTO public.crm_faculties (name, is_active, is_public)
SELECT DISTINCT trim(faculty_name), true, false
FROM public.crm_batches
WHERE faculty_name IS NOT NULL
  AND trim(faculty_name) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.crm_faculties f
    WHERE lower(f.name) = lower(trim(public.crm_batches.faculty_name))
  );

-- ============== SEO row for /faculty ==============
INSERT INTO public.crm_seo_meta (page_path, title, description, is_active)
VALUES ('/faculty', 'Our Faculty | ATEC Education', 'Meet the experienced faculty at ATEC Education — trainers in Tally, GST, accounting, computer skills and more.', true)
ON CONFLICT DO NOTHING;