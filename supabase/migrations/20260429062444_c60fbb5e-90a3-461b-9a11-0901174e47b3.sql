
-- crm_enquiries: extra columns
ALTER TABLE public.crm_enquiries
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS any_message text;

-- crm_whatsapp_logs: triggered_from
ALTER TABLE public.crm_whatsapp_logs
  ADD COLUMN IF NOT EXISTS triggered_from text;

-- crm_institute_settings: favicon + self-fill form copy
ALTER TABLE public.crm_institute_settings
  ADD COLUMN IF NOT EXISTS favicon_url text,
  ADD COLUMN IF NOT EXISTS self_fill_form_title text DEFAULT 'Enquire Now',
  ADD COLUMN IF NOT EXISTS self_fill_form_subtitle text,
  ADD COLUMN IF NOT EXISTS self_fill_thank_you_message text DEFAULT 'Thank you! Our team will contact you shortly.';

-- Form field config table
CREATE TABLE IF NOT EXISTS public.crm_enquiry_form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key text NOT NULL UNIQUE,
  field_label text NOT NULL,
  show_on_public boolean NOT NULL DEFAULT true,
  required_on_public boolean NOT NULL DEFAULT false,
  show_in_crm_form boolean NOT NULL DEFAULT true,
  dropdown_options jsonb,
  sort_order int NOT NULL DEFAULT 0,
  is_locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_enquiry_form_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read enquiry form fields"
  ON public.crm_enquiry_form_fields FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "CRM admins manage enquiry form fields"
  ON public.crm_enquiry_form_fields FOR ALL
  TO authenticated
  USING (has_crm_role(auth.uid(), 'admin'::crm_role))
  WITH CHECK (has_crm_role(auth.uid(), 'admin'::crm_role));
CREATE TRIGGER trg_enquiry_form_fields_updated
  BEFORE UPDATE ON public.crm_enquiry_form_fields
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Report columns table
CREATE TABLE IF NOT EXISTS public.crm_enquiry_report_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  column_key text NOT NULL UNIQUE,
  label text NOT NULL,
  show_in_list boolean NOT NULL DEFAULT true,
  show_in_export boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_enquiry_report_columns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CRM staff view report columns"
  ON public.crm_enquiry_report_columns FOR SELECT
  TO authenticated USING (has_any_crm_role(auth.uid()));
CREATE POLICY "CRM admins manage report columns"
  ON public.crm_enquiry_report_columns FOR ALL
  TO authenticated
  USING (has_crm_role(auth.uid(), 'admin'::crm_role))
  WITH CHECK (has_crm_role(auth.uid(), 'admin'::crm_role));
CREATE TRIGGER trg_enquiry_report_columns_updated
  BEFORE UPDATE ON public.crm_enquiry_report_columns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public anon INSERT on crm_enquiries (only for student self-fill)
CREATE POLICY "Public can submit self-fill enquiries"
  ON public.crm_enquiries FOR INSERT
  TO anon
  WITH CHECK (
    source = 'student_self_fill'::crm_enquiry_source
    AND length(coalesce(name,'')) > 0
    AND phone ~ '^[0-9]{10,15}$'
  );

-- Seed form fields
INSERT INTO public.crm_enquiry_form_fields (field_key, field_label, show_on_public, required_on_public, show_in_crm_form, dropdown_options, sort_order, is_locked) VALUES
  ('full_name','Full Name',true,true,true,NULL,10,false),
  ('mobile','Mobile',true,true,true,NULL,20,false),
  ('whatsapp','WhatsApp',true,false,true,NULL,30,false),
  ('email','Email',true,false,true,NULL,40,false),
  ('city','City',true,false,true,NULL,50,false),
  ('qualification','Qualification',true,false,true,'["Below 10th","10th","12th","Diploma","Graduate","Post Graduate","Other"]'::jsonb,60,false),
  ('college_name','College / School Name',true,false,true,NULL,70,false),
  ('class_year','Class / Year',true,false,true,NULL,80,false),
  ('stream','Stream',true,false,true,'["Science","Commerce","Arts","Engineering","Other"]'::jsonb,90,false),
  ('current_status','Current Status',true,false,true,'["Student","Working Professional","Job Seeker","Business Owner","Homemaker","Other"]'::jsonb,100,false),
  ('company_name','Company Name',true,false,true,NULL,110,false),
  ('designation','Designation',true,false,true,NULL,120,false),
  ('course_interested','Course Interested',true,true,true,NULL,130,false),
  ('preferred_mode','Preferred Mode',true,false,true,'["Offline","Online","Hybrid"]'::jsonb,140,false),
  ('preferred_timing','Preferred Timing',true,false,true,'["Morning","Afternoon","Evening","Weekend","Flexible"]'::jsonb,150,false),
  ('budget_range','Budget Range',true,false,true,'["Under 10k","10k-25k","25k-50k","50k+","Flexible"]'::jsonb,160,false),
  ('how_heard','How Did You Hear',true,false,true,'["Google","Instagram","Facebook","YouTube","Friend / Referral","Walk-in","Other"]'::jsonb,170,false),
  ('any_message','Any Message',true,false,true,NULL,180,false),
  ('lead_stage','Lead Stage',false,false,true,'["new","contacted","follow_up","converted","lost","junk"]'::jsonb,190,true),
  ('counsellor','Assigned Counsellor',false,false,true,NULL,200,true),
  ('internal_notes','Internal Notes',false,false,true,NULL,210,true)
ON CONFLICT (field_key) DO NOTHING;

-- Seed report columns
INSERT INTO public.crm_enquiry_report_columns (column_key, label, show_in_list, show_in_export, sort_order) VALUES
  ('enquiry_id','Enquiry ID',false,true,10),
  ('days_since','Days Since Enquiry',true,true,20),
  ('name','Name',true,true,30),
  ('mobile','Mobile',true,true,40),
  ('whatsapp','WhatsApp',false,true,50),
  ('email','Email',false,true,60),
  ('city','City',false,true,70),
  ('state','State',false,true,80),
  ('qualification','Qualification',false,true,90),
  ('college_name','College',false,true,100),
  ('class_year','Class',false,true,110),
  ('stream','Stream',false,true,120),
  ('current_status','Status',false,true,130),
  ('company_name','Company',false,true,140),
  ('course','Course',true,true,150),
  ('category','Category',false,true,160),
  ('preferred_timing','Preferred Timing',false,true,170),
  ('budget_range','Budget Range',false,true,180),
  ('source','Source',true,true,190),
  ('stage','Stage',true,true,200),
  ('counsellor','Counsellor',false,true,210),
  ('follow_up_date','Follow-up Date',true,true,220),
  ('how_heard','How Did You Hear',false,true,230),
  ('wa_sent','WA Sent',true,false,240),
  ('referred_by','Referred By',false,true,250),
  ('created_at','Created Date',false,true,260)
ON CONFLICT (column_key) DO NOTHING;

-- Seed enquiry WA templates if absent
INSERT INTO public.crm_whatsapp_templates (template_key, name, category, body, variables, is_active) VALUES
  ('ENQUIRY_WELCOME','Welcome Message','enquiry','Hi {name}! 👋

Thank you for your interest in {institute_name}. We''ve received your enquiry for {course_name}.

Our counsellor will call you shortly. For immediate help, reply here or call {institute_phone}.

— Team {institute_name}','["name","institute_name","course_name","institute_phone"]'::jsonb,true),
  ('SEND_BROCHURE_IMAGE','Course Catalogue (Picture)','enquiry','Hi {name}, here is the brochure for *{course_name}* 📘

{brochure_url}

Fee: ₹{course_fee} • Duration: {course_duration}

Reply YES to book a free demo.','["name","course_name","brochure_url","course_fee","course_duration"]'::jsonb,true),
  ('COURSE_INFO','Short Syllabus','enquiry','*{course_name}* — Short Overview

Duration: {course_duration}
Fee: ₹{course_fee}
Mode: {course_mode}

Key topics:
{course_short_syllabus}

Reply for full details.','["course_name","course_duration","course_fee","course_mode","course_short_syllabus"]'::jsonb,true),
  ('COURSE_LONG_DETAIL','Detailed Syllabus','enquiry','*{course_name}* — Full Syllabus

{course_long_syllabus}

Fee: ₹{course_fee} • Duration: {course_duration}

Next batch: {next_batch_date}','["course_name","course_long_syllabus","course_fee","course_duration","next_batch_date"]'::jsonb,true),
  ('COURSE_MEDIA','Video / Instagram','enquiry','Hi {name}, watch our {course_name} students in action 🎬

Video: {video_url}
Instagram: {instagram_url}

Ready to start? Reply YES.','["name","course_name","video_url","instagram_url"]'::jsonb,true),
  ('ENQUIRY_FOLLOWUP_1','Follow-up 1','enquiry','Hi {name}, just checking in about your {course_name} enquiry. 😊

Any questions we can help with? Demo seats are filling fast.

— {institute_name}','["name","course_name","institute_name"]'::jsonb,true),
  ('ENQUIRY_FOLLOWUP_2','Follow-up 2','enquiry','Hi {name}, last reminder — {course_name} batch starts {next_batch_date}.

Limited seats. Reply YES to confirm or CALL for help.

— {institute_name}','["name","course_name","next_batch_date","institute_name"]'::jsonb,true)
ON CONFLICT (template_key) DO NOTHING;
