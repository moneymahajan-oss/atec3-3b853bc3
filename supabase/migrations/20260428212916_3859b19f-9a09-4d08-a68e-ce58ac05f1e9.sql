-- ============ ENUMS ============
CREATE TYPE public.crm_enquiry_status AS ENUM ('new','contacted','follow_up','converted','lost','junk');
CREATE TYPE public.crm_enquiry_priority AS ENUM ('low','medium','high');
CREATE TYPE public.crm_enquiry_source AS ENUM ('walk_in','phone','whatsapp','website','instagram','facebook','referral','other');
CREATE TYPE public.crm_student_status AS ENUM ('active','completed','dropped','on_hold');
CREATE TYPE public.crm_student_gender AS ENUM ('male','female','other');

-- ============ ENQUIRIES ============
CREATE TABLE public.crm_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  alt_phone text,
  email text,
  course_id uuid REFERENCES public.crm_courses(id) ON DELETE SET NULL,
  course_name_snapshot text,
  source crm_enquiry_source NOT NULL DEFAULT 'walk_in',
  status crm_enquiry_status NOT NULL DEFAULT 'new',
  priority crm_enquiry_priority NOT NULL DEFAULT 'medium',
  follow_up_date date,
  notes text,
  assigned_to uuid,
  assigned_to_name text,
  lost_reason text,
  converted_student_id uuid,
  created_by uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_enquiries_status ON public.crm_enquiries(status);
CREATE INDEX idx_crm_enquiries_phone ON public.crm_enquiries(phone);
CREATE INDEX idx_crm_enquiries_follow_up ON public.crm_enquiries(follow_up_date);
CREATE INDEX idx_crm_enquiries_assigned ON public.crm_enquiries(assigned_to);

ALTER TABLE public.crm_enquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CRM staff view enquiries" ON public.crm_enquiries
  FOR SELECT TO authenticated USING (has_any_crm_role(auth.uid()));
CREATE POLICY "CRM staff insert enquiries" ON public.crm_enquiries
  FOR INSERT TO authenticated WITH CHECK (has_any_crm_role(auth.uid()));
CREATE POLICY "CRM staff update enquiries" ON public.crm_enquiries
  FOR UPDATE TO authenticated USING (has_any_crm_role(auth.uid())) WITH CHECK (has_any_crm_role(auth.uid()));
CREATE POLICY "CRM admins delete enquiries" ON public.crm_enquiries
  FOR DELETE TO authenticated USING (has_crm_role(auth.uid(), 'admin'::crm_role));

CREATE TRIGGER trg_crm_enquiries_updated
  BEFORE UPDATE ON public.crm_enquiries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ENQUIRY NOTES (Timeline) ============
CREATE TABLE public.crm_enquiry_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id uuid NOT NULL REFERENCES public.crm_enquiries(id) ON DELETE CASCADE,
  note_type text NOT NULL DEFAULT 'note',
  body text NOT NULL,
  staff_id uuid,
  staff_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_enquiry_notes_enquiry ON public.crm_enquiry_notes(enquiry_id);

ALTER TABLE public.crm_enquiry_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CRM staff view notes" ON public.crm_enquiry_notes
  FOR SELECT TO authenticated USING (has_any_crm_role(auth.uid()));
CREATE POLICY "CRM staff insert notes" ON public.crm_enquiry_notes
  FOR INSERT TO authenticated WITH CHECK (has_any_crm_role(auth.uid()));
CREATE POLICY "CRM admins delete notes" ON public.crm_enquiry_notes
  FOR DELETE TO authenticated USING (has_crm_role(auth.uid(), 'admin'::crm_role));

-- ============ STUDENTS ============
CREATE TABLE public.crm_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrolment_no text UNIQUE,
  full_name text NOT NULL,
  phone text NOT NULL,
  alt_phone text,
  email text,
  dob date,
  gender crm_student_gender,
  address text,
  photo_url text,
  id_proof_url text,
  course_id uuid REFERENCES public.crm_courses(id) ON DELETE SET NULL,
  course_name_snapshot text,
  batch_id uuid,
  enrolment_date date NOT NULL DEFAULT CURRENT_DATE,
  status crm_student_status NOT NULL DEFAULT 'active',
  total_fee integer NOT NULL DEFAULT 0,
  registration_fee_paid integer NOT NULL DEFAULT 0,
  source_enquiry_id uuid REFERENCES public.crm_enquiries(id) ON DELETE SET NULL,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_students_enrolment ON public.crm_students(enrolment_no);
CREATE INDEX idx_crm_students_phone ON public.crm_students(phone);
CREATE INDEX idx_crm_students_status ON public.crm_students(status);
CREATE INDEX idx_crm_students_course ON public.crm_students(course_id);

ALTER TABLE public.crm_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CRM staff view students" ON public.crm_students
  FOR SELECT TO authenticated USING (has_any_crm_role(auth.uid()));
CREATE POLICY "CRM staff insert students" ON public.crm_students
  FOR INSERT TO authenticated WITH CHECK (has_any_crm_role(auth.uid()));
CREATE POLICY "CRM staff update students" ON public.crm_students
  FOR UPDATE TO authenticated USING (has_any_crm_role(auth.uid())) WITH CHECK (has_any_crm_role(auth.uid()));
CREATE POLICY "CRM admins delete students" ON public.crm_students
  FOR DELETE TO authenticated USING (has_crm_role(auth.uid(), 'admin'::crm_role));

CREATE TRIGGER trg_crm_students_updated
  BEFORE UPDATE ON public.crm_students
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ENROLMENT NUMBER GENERATOR ============
CREATE OR REPLACE FUNCTION public.generate_crm_enrolment_no()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  yr text;
  next_seq int;
  new_no text;
BEGIN
  IF NEW.enrolment_no IS NOT NULL AND NEW.enrolment_no <> '' THEN
    RETURN NEW;
  END IF;
  yr := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(NULLIF(regexp_replace(enrolment_no, '^ATEC-' || yr || '-', ''), '')::int), 0) + 1
    INTO next_seq
    FROM public.crm_students
   WHERE enrolment_no LIKE 'ATEC-' || yr || '-%';
  new_no := 'ATEC-' || yr || '-' || lpad(next_seq::text, 4, '0');
  NEW.enrolment_no := new_no;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_crm_students_enrolment_no
  BEFORE INSERT ON public.crm_students
  FOR EACH ROW EXECUTE FUNCTION public.generate_crm_enrolment_no();