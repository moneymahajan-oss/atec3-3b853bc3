CREATE POLICY "Site admins manage faculties"
ON public.crm_faculties
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));