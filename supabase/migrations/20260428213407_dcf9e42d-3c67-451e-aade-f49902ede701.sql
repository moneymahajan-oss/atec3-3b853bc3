-- ============ ENUMS ============
CREATE TYPE public.crm_batch_status AS ENUM ('planned','running','completed','cancelled');
CREATE TYPE public.crm_fee_status AS ENUM ('pending','partial','paid','overdue','waived');
CREATE TYPE public.crm_payment_mode AS ENUM ('cash','upi','bank_transfer','card','cheque','other');
CREATE TYPE public.crm_attendance_status AS ENUM ('present','absent','late','excused');

-- ============ BATCHES ============
CREATE TABLE public.crm_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  course_id uuid REFERENCES public.crm_courses(id) ON DELETE SET NULL,
  course_name_snapshot text,
  start_date date,
  end_date date,
  schedule text,
  timing text,
  capacity integer NOT NULL DEFAULT 30,
  status crm_batch_status NOT NULL DEFAULT 'planned',
  faculty_name text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_batches_course ON public.crm_batches(course_id);
CREATE INDEX idx_crm_batches_status ON public.crm_batches(status);

ALTER TABLE public.crm_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CRM staff view batches" ON public.crm_batches
  FOR SELECT TO authenticated USING (has_any_crm_role(auth.uid()));
CREATE POLICY "CRM staff insert batches" ON public.crm_batches
  FOR INSERT TO authenticated WITH CHECK (has_any_crm_role(auth.uid()));
CREATE POLICY "CRM staff update batches" ON public.crm_batches
  FOR UPDATE TO authenticated USING (has_any_crm_role(auth.uid())) WITH CHECK (has_any_crm_role(auth.uid()));
CREATE POLICY "CRM admins delete batches" ON public.crm_batches
  FOR DELETE TO authenticated USING (has_crm_role(auth.uid(), 'admin'::crm_role));

CREATE TRIGGER trg_crm_batches_updated BEFORE UPDATE ON public.crm_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ FEE PLANS (Installments) ============
CREATE TABLE public.crm_fee_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.crm_students(id) ON DELETE CASCADE,
  installment_no integer NOT NULL DEFAULT 1,
  label text,
  due_date date,
  amount integer NOT NULL DEFAULT 0,
  amount_paid integer NOT NULL DEFAULT 0,
  status crm_fee_status NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_fee_plans_student ON public.crm_fee_plans(student_id);
CREATE INDEX idx_crm_fee_plans_due ON public.crm_fee_plans(due_date);
CREATE INDEX idx_crm_fee_plans_status ON public.crm_fee_plans(status);

ALTER TABLE public.crm_fee_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CRM staff view fee plans" ON public.crm_fee_plans
  FOR SELECT TO authenticated USING (has_any_crm_role(auth.uid()));
CREATE POLICY "CRM staff insert fee plans" ON public.crm_fee_plans
  FOR INSERT TO authenticated WITH CHECK (has_any_crm_role(auth.uid()));
CREATE POLICY "CRM staff update fee plans" ON public.crm_fee_plans
  FOR UPDATE TO authenticated USING (has_any_crm_role(auth.uid())) WITH CHECK (has_any_crm_role(auth.uid()));
CREATE POLICY "CRM admins delete fee plans" ON public.crm_fee_plans
  FOR DELETE TO authenticated USING (has_crm_role(auth.uid(), 'admin'::crm_role));

CREATE TRIGGER trg_crm_fee_plans_updated BEFORE UPDATE ON public.crm_fee_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PAYMENTS ============
CREATE TABLE public.crm_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no text UNIQUE,
  student_id uuid NOT NULL REFERENCES public.crm_students(id) ON DELETE RESTRICT,
  fee_plan_id uuid REFERENCES public.crm_fee_plans(id) ON DELETE SET NULL,
  amount integer NOT NULL,
  mode crm_payment_mode NOT NULL DEFAULT 'cash',
  reference text,
  paid_on date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  receipt_pdf_url text,
  collected_by uuid,
  collected_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_payments_student ON public.crm_payments(student_id);
CREATE INDEX idx_crm_payments_plan ON public.crm_payments(fee_plan_id);
CREATE INDEX idx_crm_payments_date ON public.crm_payments(paid_on);

ALTER TABLE public.crm_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CRM staff view payments" ON public.crm_payments
  FOR SELECT TO authenticated USING (has_any_crm_role(auth.uid()));
CREATE POLICY "CRM staff insert payments" ON public.crm_payments
  FOR INSERT TO authenticated WITH CHECK (has_any_crm_role(auth.uid()));
CREATE POLICY "CRM staff update payments" ON public.crm_payments
  FOR UPDATE TO authenticated USING (has_any_crm_role(auth.uid())) WITH CHECK (has_any_crm_role(auth.uid()));
CREATE POLICY "CRM admins delete payments" ON public.crm_payments
  FOR DELETE TO authenticated USING (has_crm_role(auth.uid(), 'admin'::crm_role));

-- Receipt number generator
CREATE OR REPLACE FUNCTION public.generate_crm_receipt_no()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  yr text;
  next_seq int;
BEGIN
  IF NEW.receipt_no IS NOT NULL AND NEW.receipt_no <> '' THEN RETURN NEW; END IF;
  yr := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(NULLIF(regexp_replace(receipt_no, '^ATEC/RC/' || yr || '/', ''), '')::int), 0) + 1
    INTO next_seq
    FROM public.crm_payments
   WHERE receipt_no LIKE 'ATEC/RC/' || yr || '/%';
  NEW.receipt_no := 'ATEC/RC/' || yr || '/' || lpad(next_seq::text, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_crm_payments_receipt_no
  BEFORE INSERT ON public.crm_payments
  FOR EACH ROW EXECUTE FUNCTION public.generate_crm_receipt_no();

-- Auto-update fee plan amount_paid + status when payment is recorded
CREATE OR REPLACE FUNCTION public.crm_apply_payment_to_plan()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  total_paid int;
  plan_amt int;
BEGIN
  IF NEW.fee_plan_id IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(SUM(amount),0) INTO total_paid FROM public.crm_payments WHERE fee_plan_id = NEW.fee_plan_id;
  SELECT amount INTO plan_amt FROM public.crm_fee_plans WHERE id = NEW.fee_plan_id;
  UPDATE public.crm_fee_plans
     SET amount_paid = total_paid,
         status = CASE
           WHEN total_paid >= plan_amt THEN 'paid'::crm_fee_status
           WHEN total_paid > 0 THEN 'partial'::crm_fee_status
           ELSE status
         END
   WHERE id = NEW.fee_plan_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_crm_payments_apply
  AFTER INSERT OR UPDATE OF amount, fee_plan_id ON public.crm_payments
  FOR EACH ROW EXECUTE FUNCTION public.crm_apply_payment_to_plan();

-- ============ ATTENDANCE ============
CREATE TABLE public.crm_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.crm_batches(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.crm_students(id) ON DELETE CASCADE,
  attended_on date NOT NULL,
  status crm_attendance_status NOT NULL DEFAULT 'present',
  notes text,
  marked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, student_id, attended_on)
);
CREATE INDEX idx_crm_attendance_batch_date ON public.crm_attendance(batch_id, attended_on);
CREATE INDEX idx_crm_attendance_student ON public.crm_attendance(student_id);

ALTER TABLE public.crm_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CRM staff view attendance" ON public.crm_attendance
  FOR SELECT TO authenticated USING (has_any_crm_role(auth.uid()));
CREATE POLICY "CRM staff insert attendance" ON public.crm_attendance
  FOR INSERT TO authenticated WITH CHECK (has_any_crm_role(auth.uid()));
CREATE POLICY "CRM staff update attendance" ON public.crm_attendance
  FOR UPDATE TO authenticated USING (has_any_crm_role(auth.uid())) WITH CHECK (has_any_crm_role(auth.uid()));
CREATE POLICY "CRM admins delete attendance" ON public.crm_attendance
  FOR DELETE TO authenticated USING (has_crm_role(auth.uid(), 'admin'::crm_role));

-- ============ Add batch_id FK link from students (was uuid only) ============
-- Already exists as uuid column; add FK now
ALTER TABLE public.crm_students
  ADD CONSTRAINT crm_students_batch_id_fkey
  FOREIGN KEY (batch_id) REFERENCES public.crm_batches(id) ON DELETE SET NULL;