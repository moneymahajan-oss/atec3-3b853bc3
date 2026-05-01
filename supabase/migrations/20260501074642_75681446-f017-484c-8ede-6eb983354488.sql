
-- 1. Status enum
DO $$ BEGIN
  CREATE TYPE public.crm_enrolment_status AS ENUM ('active','completed','dropped','on_hold');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Enrolments table
CREATE TABLE IF NOT EXISTS public.crm_student_enrolments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  course_id uuid,
  course_name_snapshot text,
  batch_id uuid,
  enrolment_no text UNIQUE,
  enrolment_date date NOT NULL DEFAULT CURRENT_DATE,
  status public.crm_enrolment_status NOT NULL DEFAULT 'active',
  total_fee integer NOT NULL DEFAULT 0,
  discount_amount integer NOT NULL DEFAULT 0,
  discount_reason text,
  registration_fee_paid integer NOT NULL DEFAULT 0,
  net_payable_fee integer,
  source_enquiry_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_enrolments_student ON public.crm_student_enrolments(student_id);
CREATE INDEX IF NOT EXISTS idx_crm_enrolments_course ON public.crm_student_enrolments(course_id);
CREATE INDEX IF NOT EXISTS idx_crm_enrolments_batch ON public.crm_student_enrolments(batch_id);
CREATE INDEX IF NOT EXISTS idx_crm_enrolments_status ON public.crm_student_enrolments(status);

-- 3. RLS
ALTER TABLE public.crm_student_enrolments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CRM staff view enrolments" ON public.crm_student_enrolments
  FOR SELECT TO authenticated USING (public.has_any_crm_role(auth.uid()));
CREATE POLICY "CRM staff insert enrolments" ON public.crm_student_enrolments
  FOR INSERT TO authenticated WITH CHECK (public.has_any_crm_role(auth.uid()));
CREATE POLICY "CRM staff update enrolments" ON public.crm_student_enrolments
  FOR UPDATE TO authenticated USING (public.has_any_crm_role(auth.uid())) WITH CHECK (public.has_any_crm_role(auth.uid()));
CREATE POLICY "CRM admins delete enrolments" ON public.crm_student_enrolments
  FOR DELETE TO authenticated USING (public.has_crm_role(auth.uid(), 'admin'::crm_role));

-- 4. Auto enrolment number
CREATE OR REPLACE FUNCTION public.generate_crm_enrolment_no_v2()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn$
DECLARE yr text; next_seq int;
BEGIN
  IF NEW.enrolment_no IS NOT NULL AND NEW.enrolment_no <> '' THEN RETURN NEW; END IF;
  yr := to_char(now(),'YYYY');
  SELECT COALESCE(MAX(NULLIF(regexp_replace(enrolment_no,'^ATEC-'||yr||'-',''),'')::int),0)+1
    INTO next_seq
    FROM (
      SELECT enrolment_no FROM public.crm_student_enrolments WHERE enrolment_no LIKE 'ATEC-'||yr||'-%'
      UNION ALL
      SELECT enrolment_no FROM public.crm_students WHERE enrolment_no LIKE 'ATEC-'||yr||'-%'
    ) all_nos;
  NEW.enrolment_no := 'ATEC-'||yr||'-'||lpad(next_seq::text,4,'0');
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_crm_enrolment_no ON public.crm_student_enrolments;
CREATE TRIGGER trg_crm_enrolment_no BEFORE INSERT ON public.crm_student_enrolments
  FOR EACH ROW EXECUTE FUNCTION public.generate_crm_enrolment_no_v2();

-- 5. Compute net_payable
CREATE OR REPLACE FUNCTION public.crm_enrolment_compute_net()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn$
BEGIN
  NEW.net_payable_fee := COALESCE(NEW.total_fee,0) - COALESCE(NEW.discount_amount,0);
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_crm_enrolment_net ON public.crm_student_enrolments;
CREATE TRIGGER trg_crm_enrolment_net BEFORE INSERT OR UPDATE ON public.crm_student_enrolments
  FOR EACH ROW EXECUTE FUNCTION public.crm_enrolment_compute_net();

-- 6. updated_at
DROP TRIGGER IF EXISTS trg_crm_enrolment_updated ON public.crm_student_enrolments;
CREATE TRIGGER trg_crm_enrolment_updated BEFORE UPDATE ON public.crm_student_enrolments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Add optional enrolment_id to child tables
ALTER TABLE public.crm_fee_plans   ADD COLUMN IF NOT EXISTS enrolment_id uuid;
ALTER TABLE public.crm_payments    ADD COLUMN IF NOT EXISTS enrolment_id uuid;
ALTER TABLE public.crm_attendance  ADD COLUMN IF NOT EXISTS enrolment_id uuid;
ALTER TABLE public.crm_certificates ADD COLUMN IF NOT EXISTS enrolment_id uuid;

CREATE INDEX IF NOT EXISTS idx_crm_fee_plans_enrolment ON public.crm_fee_plans(enrolment_id);
CREATE INDEX IF NOT EXISTS idx_crm_payments_enrolment ON public.crm_payments(enrolment_id);
CREATE INDEX IF NOT EXISTS idx_crm_attendance_enrolment ON public.crm_attendance(enrolment_id);
CREATE INDEX IF NOT EXISTS idx_crm_certificates_enrolment ON public.crm_certificates(enrolment_id);

-- 8. Backfill: one enrolment per existing student
INSERT INTO public.crm_student_enrolments (
  student_id, course_id, course_name_snapshot, batch_id, enrolment_no,
  enrolment_date, status, total_fee, discount_amount, discount_reason,
  registration_fee_paid, source_enquiry_id, notes, created_by, created_at, updated_at
)
SELECT
  s.id, s.course_id, s.course_name_snapshot, s.batch_id, s.enrolment_no,
  s.enrolment_date,
  CASE s.status::text
    WHEN 'active' THEN 'active'::crm_enrolment_status
    WHEN 'completed' THEN 'completed'::crm_enrolment_status
    WHEN 'dropped' THEN 'dropped'::crm_enrolment_status
    WHEN 'on_hold' THEN 'on_hold'::crm_enrolment_status
    ELSE 'active'::crm_enrolment_status END,
  COALESCE(s.total_fee,0), COALESCE(s.discount_amount,0), s.discount_reason,
  COALESCE(s.registration_fee_paid,0), s.source_enquiry_id, s.notes,
  s.created_by, s.created_at, s.updated_at
FROM public.crm_students s
WHERE NOT EXISTS (
  SELECT 1 FROM public.crm_student_enrolments e WHERE e.student_id = s.id
);

-- 9. Backfill enrolment_id on child tables (match by student + course)
UPDATE public.crm_fee_plans fp SET enrolment_id = e.id
  FROM public.crm_student_enrolments e
 WHERE fp.enrolment_id IS NULL AND fp.student_id = e.student_id;

UPDATE public.crm_payments p SET enrolment_id = e.id
  FROM public.crm_student_enrolments e
 WHERE p.enrolment_id IS NULL AND p.student_id = e.student_id;

UPDATE public.crm_attendance a SET enrolment_id = e.id
  FROM public.crm_student_enrolments e
 WHERE a.enrolment_id IS NULL AND a.student_id = e.student_id
   AND (e.batch_id IS NULL OR e.batch_id = a.batch_id);

UPDATE public.crm_certificates c SET enrolment_id = e.id
  FROM public.crm_student_enrolments e
 WHERE c.enrolment_id IS NULL AND c.student_id = e.student_id
   AND (e.course_id IS NULL OR e.course_id = c.course_id);

-- 10. Helper function: list active enrolments for a student
CREATE OR REPLACE FUNCTION public.crm_get_student_enrolments(_student_id uuid)
RETURNS SETOF public.crm_student_enrolments
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.crm_student_enrolments
   WHERE student_id = _student_id
   ORDER BY created_at DESC;
$$;
