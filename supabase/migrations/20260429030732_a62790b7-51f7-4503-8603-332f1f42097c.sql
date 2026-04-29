
-- ENUMS
DO $$ BEGIN
  CREATE TYPE public.crm_qualification AS ENUM ('class_10','class_12','graduation','post_graduation','diploma','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.crm_current_status AS ENUM ('student','working_professional','fresher','business_owner','homemaker','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.crm_preferred_timing AS ENUM ('morning','afternoon','evening','weekend','flexible');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.crm_budget_range AS ENUM ('under_5k','5k_10k','10k_20k','20k_plus','flexible');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.crm_fee_plan_type AS ENUM ('full','two_emi','three_emi','four_emi','custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TYPE public.crm_enquiry_source ADD VALUE IF NOT EXISTS 'website_homepage';
ALTER TYPE public.crm_enquiry_source ADD VALUE IF NOT EXISTS 'website_course_page';
ALTER TYPE public.crm_enquiry_source ADD VALUE IF NOT EXISTS 'website_form';
ALTER TYPE public.crm_enquiry_source ADD VALUE IF NOT EXISTS 'crm_walk_in';
ALTER TYPE public.crm_enquiry_source ADD VALUE IF NOT EXISTS 'crm_from_catalogue';
ALTER TYPE public.crm_enquiry_source ADD VALUE IF NOT EXISTS 'crm_manual';

ALTER TABLE public.crm_enquiries
  ADD COLUMN IF NOT EXISTS qualification public.crm_qualification,
  ADD COLUMN IF NOT EXISTS college_name text,
  ADD COLUMN IF NOT EXISTS class_year text,
  ADD COLUMN IF NOT EXISTS stream text,
  ADD COLUMN IF NOT EXISTS current_status public.crm_current_status,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS designation text,
  ADD COLUMN IF NOT EXISTS preferred_mode text,
  ADD COLUMN IF NOT EXISTS preferred_timing public.crm_preferred_timing,
  ADD COLUMN IF NOT EXISTS budget_range public.crm_budget_range,
  ADD COLUMN IF NOT EXISTS referred_by text,
  ADD COLUMN IF NOT EXISTS hear_about_us text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text;

ALTER TABLE public.crm_students
  ADD COLUMN IF NOT EXISTS father_name text,
  ADD COLUMN IF NOT EXISTS father_occupation text,
  ADD COLUMN IF NOT EXISTS father_phone text,
  ADD COLUMN IF NOT EXISTS mother_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS pin text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS qualification public.crm_qualification,
  ADD COLUMN IF NOT EXISTS college_name text,
  ADD COLUMN IF NOT EXISTS class_year text,
  ADD COLUMN IF NOT EXISTS stream text,
  ADD COLUMN IF NOT EXISTS current_status public.crm_current_status,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS designation text,
  ADD COLUMN IF NOT EXISTS referred_by text,
  ADD COLUMN IF NOT EXISTS hear_about_us text,
  ADD COLUMN IF NOT EXISTS discount_amount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_reason text,
  ADD COLUMN IF NOT EXISTS net_payable_fee integer,
  ADD COLUMN IF NOT EXISTS address_proof_url text;

CREATE OR REPLACE FUNCTION public.crm_compute_net_payable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.net_payable_fee IS NULL
     OR TG_OP = 'INSERT'
     OR (NEW.total_fee IS DISTINCT FROM OLD.total_fee)
     OR (NEW.discount_amount IS DISTINCT FROM OLD.discount_amount) THEN
    NEW.net_payable_fee := COALESCE(NEW.total_fee,0) - COALESCE(NEW.discount_amount,0);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_students_net_payable ON public.crm_students;
CREATE TRIGGER trg_crm_students_net_payable
BEFORE INSERT OR UPDATE ON public.crm_students
FOR EACH ROW EXECUTE FUNCTION public.crm_compute_net_payable();

ALTER TABLE public.crm_fee_plans
  ADD COLUMN IF NOT EXISTS plan_type public.crm_fee_plan_type NOT NULL DEFAULT 'custom';

CREATE TABLE IF NOT EXISTS public.crm_admission_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  note_type text NOT NULL DEFAULT 'note',
  body text NOT NULL,
  staff_id uuid,
  staff_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_admission_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CRM staff view admission notes" ON public.crm_admission_notes;
CREATE POLICY "CRM staff view admission notes" ON public.crm_admission_notes
  FOR SELECT TO authenticated USING (public.has_any_crm_role(auth.uid()));

DROP POLICY IF EXISTS "CRM staff insert admission notes" ON public.crm_admission_notes;
CREATE POLICY "CRM staff insert admission notes" ON public.crm_admission_notes
  FOR INSERT TO authenticated WITH CHECK (public.has_any_crm_role(auth.uid()));

DROP POLICY IF EXISTS "CRM admins delete admission notes" ON public.crm_admission_notes;
CREATE POLICY "CRM admins delete admission notes" ON public.crm_admission_notes
  FOR DELETE TO authenticated USING (public.has_crm_role(auth.uid(), 'admin'::crm_role));

CREATE OR REPLACE FUNCTION public.crm_auto_create_enquiry_for_student()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_enq_id uuid;
BEGIN
  IF NEW.source_enquiry_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.crm_enquiries (
    name, phone, email, course_id, course_name_snapshot,
    source, status, priority,
    converted_student_id, created_by,
    notes
  ) VALUES (
    NEW.full_name, NEW.phone, NEW.email, NEW.course_id, NEW.course_name_snapshot,
    'crm_walk_in'::crm_enquiry_source,
    'converted'::crm_enquiry_status,
    'medium'::crm_enquiry_priority,
    NEW.id, NEW.created_by,
    'Auto-created from direct student entry'
  )
  RETURNING id INTO new_enq_id;

  NEW.source_enquiry_id := new_enq_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_students_auto_enquiry ON public.crm_students;
CREATE TRIGGER trg_crm_students_auto_enquiry
BEFORE INSERT ON public.crm_students
FOR EACH ROW EXECUTE FUNCTION public.crm_auto_create_enquiry_for_student();

CREATE OR REPLACE FUNCTION public.crm_flag_overdue_fee_plans()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.crm_fee_plans
     SET status = 'overdue'::crm_fee_status,
         updated_at = now()
   WHERE due_date IS NOT NULL
     AND due_date < CURRENT_DATE
     AND status = 'pending'::crm_fee_status;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_crm_fee_plans_due_status ON public.crm_fee_plans (due_date, status);
CREATE INDEX IF NOT EXISTS idx_crm_enquiries_followup ON public.crm_enquiries (follow_up_date, status);
CREATE INDEX IF NOT EXISTS idx_crm_admission_notes_student ON public.crm_admission_notes (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_students_dob ON public.crm_students (dob);
