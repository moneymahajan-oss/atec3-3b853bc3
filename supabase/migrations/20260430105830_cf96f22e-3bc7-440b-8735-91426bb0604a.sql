-- Harden auto-enquiry trigger and backfill
CREATE OR REPLACE FUNCTION public.crm_auto_create_enquiry_for_student()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  new_enq_id uuid;
  norm_phone text;
BEGIN
  IF NEW.source_enquiry_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  norm_phone := regexp_replace(COALESCE(NEW.phone,''), '\D', '', 'g');
  IF length(norm_phone) > 10 THEN
    norm_phone := right(norm_phone, 10);
  END IF;

  BEGIN
    INSERT INTO public.crm_enquiries (
      name, phone, email, course_id, course_name_snapshot,
      source, status, priority,
      converted_student_id, created_by,
      notes
    ) VALUES (
      NEW.full_name,
      CASE WHEN length(norm_phone) >= 10 THEN norm_phone ELSE COALESCE(NEW.phone,'') END,
      NEW.email, NEW.course_id, NEW.course_name_snapshot,
      'crm_walk_in'::crm_enquiry_source,
      'converted'::crm_enquiry_status,
      'medium'::crm_enquiry_priority,
      NEW.id, NEW.created_by,
      'Auto-created from direct student entry'
    )
    RETURNING id INTO new_enq_id;

    NEW.source_enquiry_id := new_enq_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Auto-enquiry creation failed for student %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

-- Also handle students who somehow got created without source_enquiry_id (e.g. earlier path) on UPDATE no-op safety:
-- (no-op AFTER UPDATE trigger to backfill is unnecessary; backfill below handles existing rows.)

-- Backfill: existing students with no linked enquiry
DO $$
DECLARE
  s RECORD;
  new_id uuid;
  np text;
BEGIN
  FOR s IN SELECT * FROM public.crm_students WHERE source_enquiry_id IS NULL LOOP
    np := regexp_replace(COALESCE(s.phone,''), '\D', '', 'g');
    IF length(np) > 10 THEN np := right(np, 10); END IF;

    INSERT INTO public.crm_enquiries (
      name, phone, email, course_id, course_name_snapshot,
      source, status, priority, converted_student_id, created_by, notes
    ) VALUES (
      s.full_name,
      CASE WHEN length(np) >= 10 THEN np ELSE COALESCE(s.phone,'') END,
      s.email, s.course_id, s.course_name_snapshot,
      'crm_walk_in'::crm_enquiry_source,
      'converted'::crm_enquiry_status,
      'medium'::crm_enquiry_priority,
      s.id, s.created_by,
      'Backfilled from existing student record'
    ) RETURNING id INTO new_id;

    UPDATE public.crm_students SET source_enquiry_id = new_id WHERE id = s.id;
  END LOOP;
END $$;