-- 1. Phone normalisation function
CREATE OR REPLACE FUNCTION public.crm_normalise_phone_value(p text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p IS NULL OR p = '' THEN NULL
    ELSE right(regexp_replace(p, '\D', '', 'g'), 10)
  END;
$$;

-- 2. Trigger for crm_enquiries
CREATE OR REPLACE FUNCTION public.crm_enquiries_normalise_phone()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.phone := COALESCE(public.crm_normalise_phone_value(NEW.phone), NEW.phone);
  NEW.alt_phone := public.crm_normalise_phone_value(NEW.alt_phone);
  NEW.whatsapp := public.crm_normalise_phone_value(NEW.whatsapp);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_crm_enquiries_normalise_phone ON public.crm_enquiries;
CREATE TRIGGER trg_crm_enquiries_normalise_phone
BEFORE INSERT OR UPDATE OF phone, alt_phone, whatsapp ON public.crm_enquiries
FOR EACH ROW EXECUTE FUNCTION public.crm_enquiries_normalise_phone();

-- 3. Trigger for crm_students
CREATE OR REPLACE FUNCTION public.crm_students_normalise_phone()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.phone := COALESCE(public.crm_normalise_phone_value(NEW.phone), NEW.phone);
  NEW.alt_phone := public.crm_normalise_phone_value(NEW.alt_phone);
  NEW.father_phone := public.crm_normalise_phone_value(NEW.father_phone);
  NEW.emergency_contact_phone := public.crm_normalise_phone_value(NEW.emergency_contact_phone);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_crm_students_normalise_phone ON public.crm_students;
CREATE TRIGGER trg_crm_students_normalise_phone
BEFORE INSERT OR UPDATE OF phone, alt_phone, father_phone, emergency_contact_phone ON public.crm_students
FOR EACH ROW EXECUTE FUNCTION public.crm_students_normalise_phone();

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_crm_enquiries_phone ON public.crm_enquiries(phone);
CREATE INDEX IF NOT EXISTS idx_crm_students_phone ON public.crm_students(phone);

-- 5. Normalise existing data (one-time)
UPDATE public.crm_enquiries SET phone = public.crm_normalise_phone_value(phone) WHERE phone IS NOT NULL;
UPDATE public.crm_students  SET phone = public.crm_normalise_phone_value(phone) WHERE phone IS NOT NULL;

-- 6. Duplicate-exceptions table
CREATE TABLE IF NOT EXISTS public.crm_duplicate_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_type text NOT NULL,
  key_value text NOT NULL,
  related_ids uuid[] NOT NULL DEFAULT '{}',
  note text,
  created_by uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (key_type, key_value)
);
ALTER TABLE public.crm_duplicate_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CRM staff view dup exceptions" ON public.crm_duplicate_exceptions
  FOR SELECT TO authenticated USING (public.has_any_crm_role(auth.uid()));
CREATE POLICY "CRM admins manage dup exceptions" ON public.crm_duplicate_exceptions
  FOR ALL TO authenticated USING (public.has_crm_role(auth.uid(), 'admin'::crm_role))
  WITH CHECK (public.has_crm_role(auth.uid(), 'admin'::crm_role));

-- 7. Helper function for live lookup
CREATE OR REPLACE FUNCTION public.crm_find_by_phone(_phone text)
RETURNS TABLE (
  kind text, id uuid, name text, phone text,
  course_name text, status text, created_at timestamptz, extra text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 'enquiry'::text, e.id, e.name, e.phone,
         COALESCE(e.course_name_snapshot, ''),
         e.status::text, e.created_at,
         COALESCE(e.email, '')
    FROM public.crm_enquiries e
   WHERE e.phone = public.crm_normalise_phone_value(_phone)
  UNION ALL
  SELECT 'student'::text, s.id, s.full_name, s.phone,
         COALESCE(s.course_name_snapshot, ''),
         s.status::text, s.created_at,
         COALESCE(s.enrolment_no, '')
    FROM public.crm_students s
   WHERE s.phone = public.crm_normalise_phone_value(_phone)
   ORDER BY 7 DESC;
$$;