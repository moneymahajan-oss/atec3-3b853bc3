
CREATE TABLE public.verification_certificate_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  certificate_id text NOT NULL,
  user_id uuid,
  user_email text,
  diff jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.verification_certificate_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view certificate logs"
ON public.verification_certificate_logs FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert certificate logs"
ON public.verification_certificate_logs FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));
