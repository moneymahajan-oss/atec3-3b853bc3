-- Notes: ensure ON DELETE CASCADE
ALTER TABLE public.crm_enquiry_notes
  DROP CONSTRAINT IF EXISTS crm_enquiry_notes_enquiry_id_fkey;
ALTER TABLE public.crm_enquiry_notes
  ADD CONSTRAINT crm_enquiry_notes_enquiry_id_fkey
  FOREIGN KEY (enquiry_id) REFERENCES public.crm_enquiries(id) ON DELETE CASCADE;

-- Students: ensure ON DELETE SET NULL on the back-pointer
ALTER TABLE public.crm_students
  DROP CONSTRAINT IF EXISTS crm_students_source_enquiry_id_fkey;
ALTER TABLE public.crm_students
  ADD CONSTRAINT crm_students_source_enquiry_id_fkey
  FOREIGN KEY (source_enquiry_id) REFERENCES public.crm_enquiries(id) ON DELETE SET NULL;

-- WhatsApp logs: polymorphic, use a trigger
CREATE OR REPLACE FUNCTION public.crm_cleanup_enquiry_wa_logs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.crm_whatsapp_logs
   WHERE entity_type = 'enquiry'
     AND entity_id = OLD.id::text;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_cleanup_enquiry_wa_logs ON public.crm_enquiries;
CREATE TRIGGER trg_crm_cleanup_enquiry_wa_logs
BEFORE DELETE ON public.crm_enquiries
FOR EACH ROW EXECUTE FUNCTION public.crm_cleanup_enquiry_wa_logs();