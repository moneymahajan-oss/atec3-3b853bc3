
-- ============ NEW TABLES ============

-- offer_belt
CREATE TABLE IF NOT EXISTS public.offer_belt (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  bg_color TEXT DEFAULT '#F59E0B',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.offer_belt ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active offers" ON public.offer_belt FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage offers" ON public.offer_belt FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- whatsapp_templates
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  template_key TEXT NOT NULL UNIQUE,
  message_body TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active templates" ON public.whatsapp_templates FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage templates" ON public.whatsapp_templates FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER update_whatsapp_templates_updated_at BEFORE UPDATE ON public.whatsapp_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- mock_tests
CREATE TABLE IF NOT EXISTS public.mock_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course TEXT NOT NULL,
  title TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mock_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active mock tests" ON public.mock_tests FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage mock tests" ON public.mock_tests FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- mock_test_results
CREATE TABLE IF NOT EXISTS public.mock_test_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name TEXT NOT NULL,
  whatsapp_no TEXT NOT NULL,
  course TEXT NOT NULL,
  score INTEGER,
  total INTEGER,
  answers JSONB,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mock_test_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit results" ON public.mock_test_results FOR INSERT WITH CHECK (
  student_name IS NOT NULL AND length(student_name) > 0 AND whatsapp_no IS NOT NULL AND length(whatsapp_no) > 0
);
CREATE POLICY "Admins can view results" ON public.mock_test_results FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete results" ON public.mock_test_results FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- ai_use_cases
CREATE TABLE IF NOT EXISTS public.ai_use_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  earning_potential TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_use_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active use cases" ON public.ai_use_cases FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage use cases" ON public.ai_use_cases FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- leads (unified)
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'contact_form',
  student_name TEXT,
  phone TEXT,
  email TEXT,
  course_name TEXT,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit leads" ON public.leads FOR INSERT WITH CHECK (
  (student_name IS NOT NULL AND length(student_name) > 0) OR (phone IS NOT NULL AND length(phone) > 0)
);
CREATE POLICY "Admins can view leads" ON public.leads FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update leads" ON public.leads FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete leads" ON public.leads FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- ============ ALTER EXISTING TABLES ============
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS youtube_url TEXT;
ALTER TABLE public.youtube_videos ADD COLUMN IF NOT EXISTS section TEXT DEFAULT 'about';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS syllabus_pdf_url TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS brochure_pdf_url TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS whatsapp_template_key TEXT DEFAULT 'enroll_button';

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES ('course-documents', 'course-documents', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery', 'gallery', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for course-documents
CREATE POLICY "Public can view course docs" ON storage.objects FOR SELECT USING (bucket_id = 'course-documents');
CREATE POLICY "Admins can upload course docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'course-documents' AND public.is_admin(auth.uid()));
CREATE POLICY "Admins can update course docs" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'course-documents' AND public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete course docs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'course-documents' AND public.is_admin(auth.uid()));

-- Storage policies for gallery
CREATE POLICY "Public can view gallery files" ON storage.objects FOR SELECT USING (bucket_id = 'gallery');
CREATE POLICY "Admins can upload gallery files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'gallery' AND public.is_admin(auth.uid()));
CREATE POLICY "Admins can update gallery files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'gallery' AND public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete gallery files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'gallery' AND public.is_admin(auth.uid()));

-- ============ SEED DATA ============

-- WhatsApp templates
INSERT INTO public.whatsapp_templates (name, template_key, message_body) VALUES
('Enroll Button', 'enroll_button', 'Hi ATEC! I''m interested in {course_name}. Please share batch details and fee structure.'),
('Syllabus Share', 'syllabus_share', 'Hi {student_name}! Here are the details for {course_name} at ATEC Gurdaspur.\nSyllabus: {syllabus_pdf_url}\nBrochure: {brochure_pdf_url}\nFor admission call: 7009933289'),
('Contact Form', 'contact_form', 'New Enquiry from Website!\nName: {student_name}\nPhone: {phone}\nCourse: {course_name}\nMessage: {message}'),
('Mock Test Result', 'mock_test_result', '🎉 Your ATEC Mock Test Result!\nName: {student_name}\nCourse: {course_name}\nScore: {score}/{total} ({percentage}%)\nStatus: {pass_fail}\n\nJoin ATEC to master {course_name}. Call: 7009933289')
ON CONFLICT (template_key) DO NOTHING;

-- AI use cases
INSERT INTO public.ai_use_cases (title, description, earning_potential, icon, sort_order) VALUES
('AI Content Creator', 'Create blogs, reels scripts, ad copy using ChatGPT', '₹10,000–40,000/month', '✍️', 1),
('AI Video Editor', 'Use AI tools to edit and caption videos', '₹15,000–50,000/month', '🎬', 2),
('AI Data Analyst', 'Analyze business data with AI + Excel', '₹20,000–60,000/month', '📊', 3),
('AI Chatbot Builder', 'Build WhatsApp/website bots for local businesses', '₹25,000–80,000/month', '🤖', 4),
('Prompt Engineer', 'Write AI prompts for companies', '₹30,000–1,00,000/month', '💡', 5),
('AI Tutor / Trainer', 'Teach AI tools to schools and offices', '₹20,000–70,000/month', '🎓', 6);

-- Sample offer belt
INSERT INTO public.offer_belt (message, bg_color, sort_order) VALUES
('🎉 New Batch Starting Soon — Limited Seats! Call 7009933289', '#F59E0B', 1),
('🚀 AI Course Now Live — Earn ₹30,000+/month', '#1E3A8A', 2);

-- Site settings (only insert if key doesn't exist)
INSERT INTO public.site_settings (key, value) VALUES
('institute_name', 'ATEC - Avenue To Excellent Career'),
('logo_url', ''),
('logo_width', '120'),
('logo_height', '48'),
('whatsapp_number', '917009933289'),
('hero_heading', 'Avenue To Excellent Careers'),
('hero_subheading', 'Punjab''s premier destination for cutting-edge technology education'),
('hero_cta_text', 'Explore Courses'),
('courses_section_heading', 'Explore Our Courses'),
('courses_section_subheading', 'Industry-aligned curriculum designed for job-ready skills'),
('about_section_heading', 'About ATEC'),
('about_section_subheading', 'Watch our story unfold'),
('life_section_heading', 'Life at ATEC'),
('testimonials_section_heading', 'What Our Students Say'),
('ai_usecases_heading', 'AI Career Opportunities'),
('ai_usecases_subheading', 'Real careers you can build with AI skills from ATEC'),
('mocktest_section_heading', 'Test Your Knowledge'),
('mocktest_section_subheading', 'Take a free mock test and see where you stand'),
('contact_heading', 'Get in Touch'),
('contact_subheading', 'We''re here to help you choose the right course'),
('footer_address', 'ATEC Avenue, Hardo Channi Road, Gurdaspur, Punjab – 143521'),
('footer_phone', '+91 7009933289'),
('footer_email', 'atecgsp@gmail.com')
ON CONFLICT (key) DO NOTHING;
