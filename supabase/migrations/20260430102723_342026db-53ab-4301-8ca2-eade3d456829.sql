-- Allow public website forms (Contact form + Course Share/Enroll) to create enquiries
DROP POLICY IF EXISTS "Public can submit self-fill enquiries" ON public.crm_enquiries;

CREATE POLICY "Public can submit website enquiries"
ON public.crm_enquiries
FOR INSERT
TO anon
WITH CHECK (
  source IN (
    'student_self_fill'::crm_enquiry_source,
    'website_form'::crm_enquiry_source,
    'website_course_page'::crm_enquiry_source,
    'website_homepage'::crm_enquiry_source,
    'website_enquiry_form'::crm_enquiry_source,
    'website'::crm_enquiry_source
  )
  AND length(COALESCE(name, '')) > 0
  AND phone ~ '^[0-9]{10,15}$'
);