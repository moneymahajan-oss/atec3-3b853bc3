
DROP POLICY "Anyone can submit contact form" ON public.contact_submissions;
CREATE POLICY "Anyone can submit contact form" ON public.contact_submissions FOR INSERT WITH CHECK (
  name IS NOT NULL AND length(name) > 0
);
