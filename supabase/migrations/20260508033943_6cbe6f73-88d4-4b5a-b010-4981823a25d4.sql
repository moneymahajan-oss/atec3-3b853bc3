
-- Certificate verification table
CREATE TABLE public.verification_certificates (
  certificate_id text PRIMARY KEY,
  student_id text NOT NULL,
  student_name text NOT NULL,
  father_name text NOT NULL,
  course_name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  duration_hours integer NOT NULL,
  grade text NOT NULL CHECK (grade IN ('A+', 'A', 'B+', 'B', 'C')),
  issued_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.verification_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active certificates"
  ON public.verification_certificates FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert certificates"
  ON public.verification_certificates FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update certificates"
  ON public.verification_certificates FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete certificates"
  ON public.verification_certificates FOR DELETE
  TO authenticated
  USING (true);

-- App settings table
CREATE TABLE public.app_settings (
  id serial PRIMARY KEY,
  key text UNIQUE NOT NULL,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view app settings"
  ON public.app_settings FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert app settings"
  ON public.app_settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update app settings"
  ON public.app_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Seed default verification URL
INSERT INTO public.app_settings (key, value)
VALUES ('verification_url', 'https://atecedu.com/verification')
ON CONFLICT (key) DO NOTHING;
