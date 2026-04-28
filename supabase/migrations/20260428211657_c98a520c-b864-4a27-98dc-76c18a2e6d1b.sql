
-- ============ ENUMS ============
CREATE TYPE public.crm_role AS ENUM ('admin', 'counsellor');
CREATE TYPE public.crm_course_category AS ENUM ('finance', 'computer');
CREATE TYPE public.crm_course_mode AS ENUM ('offline', 'online', 'hybrid');
CREATE TYPE public.crm_wa_log_status AS ENUM ('link_generated', 'marked_sent');

-- ============ ROLES ============
CREATE TABLE public.crm_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.crm_role NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.crm_user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_crm_role(_user_id UUID, _role public.crm_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.crm_user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.has_any_crm_role(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.crm_user_roles WHERE user_id = _user_id
  )
$$;

CREATE POLICY "Users can view their own CRM role"
  ON public.crm_user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "CRM admins can view all roles"
  ON public.crm_user_roles FOR SELECT TO authenticated
  USING (public.has_crm_role(auth.uid(), 'admin'));

CREATE POLICY "CRM admins can manage roles"
  ON public.crm_user_roles FOR ALL TO authenticated
  USING (public.has_crm_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_crm_role(auth.uid(), 'admin'));

-- ============ AUDIT LOGS ============
CREATE TABLE public.crm_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  diff JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CRM admins can view audit logs"
  ON public.crm_audit_logs FOR SELECT TO authenticated
  USING (public.has_crm_role(auth.uid(), 'admin'));

CREATE POLICY "CRM staff can insert audit logs"
  ON public.crm_audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_any_crm_role(auth.uid()));

CREATE INDEX crm_audit_logs_entity_idx ON public.crm_audit_logs (entity, entity_id);
CREATE INDEX crm_audit_logs_created_idx ON public.crm_audit_logs (created_at DESC);

-- ============ INSTITUTE SETTINGS ============
CREATE TABLE public.crm_institute_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'ATEC Education',
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  whatsapp_number TEXT,
  email TEXT,
  website TEXT DEFAULT 'https://ateceducation.in',
  gst TEXT,
  upi_id TEXT,
  fee_reminder_days INTEGER NOT NULL DEFAULT 3,
  referral_reward INTEGER NOT NULL DEFAULT 500,
  receipt_header TEXT,
  receipt_footer TEXT,
  certificate_template_finance TEXT,
  certificate_template_computer TEXT,
  director_signature_url TEXT,
  institute_seal_url TEXT,
  collection_timings TEXT DEFAULT 'Mon-Sat, 10 AM - 7 PM',
  is_singleton BOOLEAN NOT NULL DEFAULT TRUE UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_institute_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated CRM staff can read settings"
  ON public.crm_institute_settings FOR SELECT TO authenticated
  USING (public.has_any_crm_role(auth.uid()));

CREATE POLICY "Public can read settings"
  ON public.crm_institute_settings FOR SELECT TO anon
  USING (TRUE);

CREATE POLICY "CRM admins can update settings"
  ON public.crm_institute_settings FOR UPDATE TO authenticated
  USING (public.has_crm_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_crm_role(auth.uid(), 'admin'));

CREATE POLICY "CRM admins can insert settings"
  ON public.crm_institute_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_crm_role(auth.uid(), 'admin'));

CREATE TRIGGER crm_institute_settings_updated_at
  BEFORE UPDATE ON public.crm_institute_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.crm_institute_settings (name, address, phone, whatsapp_number, email, website)
VALUES ('ATEC Education', 'ATEC Education, India', '+91 7009933289', '917009933289', 'info@ateceducation.in', 'https://ateceducation.in');

-- ============ COURSES ============
CREATE TABLE public.crm_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category public.crm_course_category NOT NULL,
  duration TEXT,
  mode public.crm_course_mode NOT NULL DEFAULT 'offline',
  total_fee INTEGER NOT NULL DEFAULT 0,
  registration_fee INTEGER NOT NULL DEFAULT 0,
  emi_options JSONB NOT NULL DEFAULT '[]'::jsonb,
  concise_syllabus TEXT,
  detailed_syllabus_html TEXT,
  brochure_url TEXT,
  instagram_url TEXT,
  youtube_url TEXT,
  video_url TEXT,
  certificate_title TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  slug TEXT UNIQUE,
  meta_title TEXT,
  meta_description TEXT,
  og_image_url TEXT,
  next_batch_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active CRM courses"
  ON public.crm_courses FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "CRM staff can view all courses"
  ON public.crm_courses FOR SELECT TO authenticated
  USING (public.has_any_crm_role(auth.uid()));

CREATE POLICY "CRM admins can insert courses"
  ON public.crm_courses FOR INSERT TO authenticated
  WITH CHECK (public.has_crm_role(auth.uid(), 'admin'));

CREATE POLICY "CRM admins can update courses"
  ON public.crm_courses FOR UPDATE TO authenticated
  USING (public.has_crm_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_crm_role(auth.uid(), 'admin'));

CREATE POLICY "CRM admins can delete courses"
  ON public.crm_courses FOR DELETE TO authenticated
  USING (public.has_crm_role(auth.uid(), 'admin'));

CREATE TRIGGER crm_courses_updated_at
  BEFORE UPDATE ON public.crm_courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX crm_courses_category_idx ON public.crm_courses (category);
CREATE INDEX crm_courses_active_idx ON public.crm_courses (is_active);

-- Seed Finance courses
INSERT INTO public.crm_courses (name, category, duration, mode, total_fee, concise_syllabus, certificate_title, slug, display_order) VALUES
('Tally Prime', 'finance', '2 Months', 'offline', 8000, 'Complete Tally Prime training: company creation, ledgers, vouchers, inventory, GST, payroll, banking and finalization of accounts. Hands-on practice on real accounting scenarios.', 'Diploma in Tally Prime', 'tally-prime', 1),
('GST & Taxation', 'finance', '1.5 Months', 'offline', 7000, 'GST registration, returns (GSTR-1, 3B, 9), e-invoicing, TDS, TCS, income tax basics, return filing and reconciliation. Practical training with portal demos.', 'Certificate in GST & Taxation', 'gst-taxation', 2),
('Accounting', 'finance', '3 Months', 'offline', 10000, 'Manual + computerized accounting from journal entries to final accounts. Covers double entry, balance sheet, P&L, bank reconciliation and Tally integration.', 'Diploma in Accounting', 'accounting', 3),
('Banking & Finance', 'finance', '2 Months', 'offline', 7500, 'Banking operations, NEFT/RTGS/UPI, KYC, loan processing, financial markets basics, mutual funds and personal finance fundamentals.', 'Certificate in Banking & Finance', 'banking-finance', 4),
('Stock Market Trading', 'finance', '2 Months', 'offline', 9000, 'Stock market basics, technical & fundamental analysis, intraday vs delivery, F&O introduction, demat account, charting tools and risk management.', 'Certificate in Stock Market Trading', 'stock-market-trading', 5),
('Financial Accounting', 'finance', '3 Months', 'offline', 9500, 'Advanced financial accounting: standards (Ind-AS basics), depreciation, inventory valuation, partnership accounts, company accounts and audit basics.', 'Diploma in Financial Accounting', 'financial-accounting', 6),
('Insurance', 'finance', '1 Month', 'offline', 5000, 'Life, health and general insurance fundamentals, IRDAI regulations, claim process, policy comparison and insurance advisor preparation.', 'Certificate in Insurance', 'insurance', 7);

-- Seed Computer courses
INSERT INTO public.crm_courses (name, category, duration, mode, total_fee, concise_syllabus, certificate_title, slug, display_order) VALUES
('MS Office', 'computer', '2 Months', 'offline', 5000, 'Microsoft Word, Excel, PowerPoint and Outlook with practical assignments. Covers formulas, charts, mail merge, presentations and email management.', 'Certificate in MS Office', 'ms-office', 10),
('DTP & Printing', 'computer', '2 Months', 'offline', 6000, 'PageMaker, CorelDraw, Photoshop basics for designing visiting cards, brochures, flex banners and print-ready files. Includes printing process overview.', 'Certificate in DTP & Printing', 'dtp-printing', 11),
('Web Design', 'computer', '3 Months', 'offline', 9000, 'HTML5, CSS3, JavaScript, Bootstrap and responsive design. Build live portfolio websites and learn deployment basics.', 'Diploma in Web Design', 'web-design', 12),
('Python Programming', 'computer', '3 Months', 'offline', 10000, 'Python fundamentals to OOP, file handling, modules, libraries (NumPy, Pandas), basic web scraping and intro to automation/AI scripts.', 'Diploma in Python Programming', 'python-programming', 13),
('Java Programming', 'computer', '3 Months', 'offline', 10000, 'Core Java: OOP, collections, exception handling, file I/O, JDBC and intro to Spring Boot. Build small console and web applications.', 'Diploma in Java Programming', 'java-programming', 14),
('Graphic Design', 'computer', '3 Months', 'offline', 9500, 'Photoshop, Illustrator, CorelDraw and Canva. Logo design, social media creatives, posters, branding kits and portfolio building.', 'Diploma in Graphic Design', 'graphic-design', 15),
('AutoCAD', 'computer', '2 Months', 'offline', 9000, '2D & 3D drafting in AutoCAD, floor plans, elevations, sections, dimensioning, layers and printing. Practical drawings of real projects.', 'Certificate in AutoCAD', 'autocad', 16),
('Cyber Security', 'computer', '3 Months', 'offline', 12000, 'Networking basics, ethical hacking introduction, Linux fundamentals, web security (OWASP Top 10), Kali tools overview and safe browsing.', 'Diploma in Cyber Security', 'cyber-security', 17),
('Digital Marketing', 'computer', '3 Months', 'offline', 11000, 'SEO, SEM, social media marketing, Google Ads, Facebook/Instagram Ads, email marketing, content marketing and Google Analytics.', 'Diploma in Digital Marketing', 'digital-marketing', 18),
('Video Editing', 'computer', '2 Months', 'offline', 8500, 'Adobe Premiere Pro & After Effects basics. Cuts, transitions, color grading, motion graphics, YouTube and reels editing workflows.', 'Certificate in Video Editing', 'video-editing', 19);

-- ============ WHATSAPP TEMPLATES ============
CREATE TABLE public.crm_whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  body TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CRM staff can view templates"
  ON public.crm_whatsapp_templates FOR SELECT TO authenticated
  USING (public.has_any_crm_role(auth.uid()));

CREATE POLICY "CRM admins can manage templates"
  ON public.crm_whatsapp_templates FOR ALL TO authenticated
  USING (public.has_crm_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_crm_role(auth.uid(), 'admin'));

CREATE TRIGGER crm_whatsapp_templates_updated_at
  BEFORE UPDATE ON public.crm_whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.crm_whatsapp_templates (template_key, name, category, body, variables) VALUES
('ENQUIRY_WELCOME', 'Enquiry Welcome', 'enquiry',
'Hello {name}! 👋 Thank you for your interest in *ATEC Education*.

We offer expert training in:
🖥️ Computer Courses — MS Office, Web Design, Programming & more
💰 Finance Courses — Tally, GST, Accounting, Stock Market & more

📍 {institute_address}
📞 {phone}
🌐 {website_link}

Our counsellor will contact you shortly!',
'["name","institute_address","phone","website_link"]'::jsonb),
('COURSE_INFO', 'Course Information', 'enquiry',
'Hi {name}! 👋 Here are the details for *{course_name}* at ATEC Education:

📚 *About the Course:*
{concise_syllabus}

⏱️ Duration: {duration}
💰 Fee: ₹{course_fee} | EMI available
🗓️ Next batch: {next_batch_date}
📋 Mode: {mode}

📄 Full Brochure: {brochure_link}
🎬 Course Preview: {video_link}

📞 To enroll or know more: {phone}
🌐 {website_link}',
'["name","course_name","concise_syllabus","duration","course_fee","next_batch_date","mode","brochure_link","video_link","phone","website_link"]'::jsonb);

-- ============ WHATSAPP LOGS ============
CREATE TABLE public.crm_whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  contact_name TEXT,
  message_snapshot TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  status public.crm_wa_log_status NOT NULL DEFAULT 'link_generated',
  staff_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  staff_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

ALTER TABLE public.crm_whatsapp_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CRM staff can view WA logs"
  ON public.crm_whatsapp_logs FOR SELECT TO authenticated
  USING (public.has_any_crm_role(auth.uid()));

CREATE POLICY "CRM staff can insert WA logs"
  ON public.crm_whatsapp_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_any_crm_role(auth.uid()) AND staff_id = auth.uid());

CREATE POLICY "CRM staff can update their own WA logs"
  ON public.crm_whatsapp_logs FOR UPDATE TO authenticated
  USING (public.has_any_crm_role(auth.uid()) AND staff_id = auth.uid())
  WITH CHECK (public.has_any_crm_role(auth.uid()) AND staff_id = auth.uid());

CREATE INDEX crm_wa_logs_entity_idx ON public.crm_whatsapp_logs (entity_type, entity_id);
CREATE INDEX crm_wa_logs_created_idx ON public.crm_whatsapp_logs (created_at DESC);

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES
  ('crm-course-media', 'crm-course-media', TRUE),
  ('crm-student-docs', 'crm-student-docs', FALSE),
  ('crm-receipts', 'crm-receipts', FALSE),
  ('crm-certificates', 'crm-certificates', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Course media: public read, admin write
CREATE POLICY "Public can read course media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'crm-course-media');

CREATE POLICY "CRM admins can upload course media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'crm-course-media' AND public.has_crm_role(auth.uid(), 'admin'));

CREATE POLICY "CRM admins can update course media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'crm-course-media' AND public.has_crm_role(auth.uid(), 'admin'));

CREATE POLICY "CRM admins can delete course media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'crm-course-media' AND public.has_crm_role(auth.uid(), 'admin'));

-- Student docs: private, CRM staff only
CREATE POLICY "CRM staff can read student docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'crm-student-docs' AND public.has_any_crm_role(auth.uid()));

CREATE POLICY "CRM staff can upload student docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'crm-student-docs' AND public.has_any_crm_role(auth.uid()));

CREATE POLICY "CRM staff can update student docs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'crm-student-docs' AND public.has_any_crm_role(auth.uid()));

CREATE POLICY "CRM admins can delete student docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'crm-student-docs' AND public.has_crm_role(auth.uid(), 'admin'));

-- Receipts: private, CRM staff only
CREATE POLICY "CRM staff can read receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'crm-receipts' AND public.has_any_crm_role(auth.uid()));

CREATE POLICY "CRM staff can upload receipts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'crm-receipts' AND public.has_any_crm_role(auth.uid()));

-- Certificates: public read (for QR verification), CRM staff write
CREATE POLICY "Public can read certificates"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'crm-certificates');

CREATE POLICY "CRM staff can upload certificates"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'crm-certificates' AND public.has_any_crm_role(auth.uid()));

CREATE POLICY "CRM admins can update certificates"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'crm-certificates' AND public.has_crm_role(auth.uid(), 'admin'));

CREATE POLICY "CRM admins can delete certificates"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'crm-certificates' AND public.has_crm_role(auth.uid(), 'admin'));
