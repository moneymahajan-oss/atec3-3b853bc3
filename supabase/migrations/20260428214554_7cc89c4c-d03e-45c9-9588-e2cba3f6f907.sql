-- Certificates
CREATE TABLE public.crm_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_no text UNIQUE,
  student_id uuid NOT NULL,
  course_id uuid,
  course_name_snapshot text,
  student_name_snapshot text,
  enrolment_no_snapshot text,
  template_kind text NOT NULL DEFAULT 'computer',
  grade text,
  issued_on date NOT NULL DEFAULT CURRENT_DATE,
  pdf_url text,
  issued_by uuid,
  issued_by_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CRM staff view certificates" ON public.crm_certificates FOR SELECT TO authenticated USING (has_any_crm_role(auth.uid()));
CREATE POLICY "CRM staff insert certificates" ON public.crm_certificates FOR INSERT TO authenticated WITH CHECK (has_any_crm_role(auth.uid()));
CREATE POLICY "CRM staff update certificates" ON public.crm_certificates FOR UPDATE TO authenticated USING (has_any_crm_role(auth.uid())) WITH CHECK (has_any_crm_role(auth.uid()));
CREATE POLICY "CRM admins delete certificates" ON public.crm_certificates FOR DELETE TO authenticated USING (has_crm_role(auth.uid(), 'admin'::crm_role));
CREATE POLICY "Public can verify certificates" ON public.crm_certificates FOR SELECT TO anon USING (true);

CREATE TRIGGER update_crm_certificates_updated_at BEFORE UPDATE ON public.crm_certificates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Certificate number generator
CREATE OR REPLACE FUNCTION public.generate_crm_certificate_no()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE
  yr text; next_seq int;
BEGIN
  IF NEW.certificate_no IS NOT NULL AND NEW.certificate_no <> '' THEN RETURN NEW; END IF;
  yr := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(NULLIF(regexp_replace(certificate_no, '^ATEC/CT/' || yr || '/', ''), '')::int), 0) + 1
    INTO next_seq FROM public.crm_certificates WHERE certificate_no LIKE 'ATEC/CT/' || yr || '/%';
  NEW.certificate_no := 'ATEC/CT/' || yr || '/' || lpad(next_seq::text, 4, '0');
  RETURN NEW;
END; $$;

CREATE TRIGGER set_crm_certificate_no BEFORE INSERT ON public.crm_certificates FOR EACH ROW EXECUTE FUNCTION public.generate_crm_certificate_no();

-- SEO meta per page
CREATE TABLE public.crm_seo_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path text NOT NULL UNIQUE,
  title text,
  description text,
  keywords text,
  og_image_url text,
  canonical_url text,
  json_ld jsonb,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_seo_meta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active seo" ON public.crm_seo_meta FOR SELECT USING (is_active = true);
CREATE POLICY "CRM admins manage seo" ON public.crm_seo_meta FOR ALL TO authenticated USING (has_crm_role(auth.uid(), 'admin'::crm_role)) WITH CHECK (has_crm_role(auth.uid(), 'admin'::crm_role));

CREATE TRIGGER update_crm_seo_meta_updated_at BEFORE UPDATE ON public.crm_seo_meta FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Campaigns (bulk WhatsApp)
CREATE TYPE public.crm_campaign_status AS ENUM ('draft','scheduled','sending','completed','cancelled');
CREATE TYPE public.crm_campaign_audience AS ENUM ('all_enquiries','enquiries_by_status','all_students','students_by_course','students_by_batch','custom');

CREATE TABLE public.crm_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_key text,
  message_body text NOT NULL,
  audience crm_campaign_audience NOT NULL DEFAULT 'all_enquiries',
  audience_filter jsonb DEFAULT '{}'::jsonb,
  status crm_campaign_status NOT NULL DEFAULT 'draft',
  scheduled_at timestamptz,
  total_recipients int NOT NULL DEFAULT 0,
  sent_count int NOT NULL DEFAULT 0,
  created_by uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CRM staff view campaigns" ON public.crm_campaigns FOR SELECT TO authenticated USING (has_any_crm_role(auth.uid()));
CREATE POLICY "CRM staff insert campaigns" ON public.crm_campaigns FOR INSERT TO authenticated WITH CHECK (has_any_crm_role(auth.uid()));
CREATE POLICY "CRM staff update campaigns" ON public.crm_campaigns FOR UPDATE TO authenticated USING (has_any_crm_role(auth.uid())) WITH CHECK (has_any_crm_role(auth.uid()));
CREATE POLICY "CRM admins delete campaigns" ON public.crm_campaigns FOR DELETE TO authenticated USING (has_crm_role(auth.uid(), 'admin'::crm_role));

CREATE TRIGGER update_crm_campaigns_updated_at BEFORE UPDATE ON public.crm_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.crm_campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  contact_name text,
  contact_number text NOT NULL,
  message_snapshot text,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_campaign_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CRM staff view recipients" ON public.crm_campaign_recipients FOR SELECT TO authenticated USING (has_any_crm_role(auth.uid()));
CREATE POLICY "CRM staff insert recipients" ON public.crm_campaign_recipients FOR INSERT TO authenticated WITH CHECK (has_any_crm_role(auth.uid()));
CREATE POLICY "CRM staff update recipients" ON public.crm_campaign_recipients FOR UPDATE TO authenticated USING (has_any_crm_role(auth.uid())) WITH CHECK (has_any_crm_role(auth.uid()));
CREATE POLICY "CRM admins delete recipients" ON public.crm_campaign_recipients FOR DELETE TO authenticated USING (has_crm_role(auth.uid(), 'admin'::crm_role));

-- Seed common SEO pages
INSERT INTO public.crm_seo_meta (page_path, title, description) VALUES
  ('/', 'ATEC Education — Computer & Finance Courses in Patna', 'Job-oriented Computer, Tally, GST, Banking & Finance courses with placement support at ATEC Education.'),
  ('/courses', 'All Courses — ATEC Education', 'Browse our complete list of computer and finance courses with detailed syllabus and fee structure.'),
  ('/about', 'About ATEC Education', 'Learn about ATEC Education — our mission, faculty and 15+ years of training experience.'),
  ('/contact', 'Contact ATEC Education', 'Visit, call or WhatsApp ATEC Education for course enquiries and admissions.')
ON CONFLICT (page_path) DO NOTHING;