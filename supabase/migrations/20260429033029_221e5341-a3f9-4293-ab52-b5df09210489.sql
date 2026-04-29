-- Void tracking on fee plans
ALTER TABLE public.crm_fee_plans
  ADD COLUMN IF NOT EXISTS is_void boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS void_reason text,
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS voided_by uuid,
  ADD COLUMN IF NOT EXISTS voided_by_name text;

-- Void tracking on payments
ALTER TABLE public.crm_payments
  ADD COLUMN IF NOT EXISTS is_void boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS void_reason text,
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS voided_by uuid,
  ADD COLUMN IF NOT EXISTS voided_by_name text;

-- Void tracking on expenses
ALTER TABLE public.crm_expenses
  ADD COLUMN IF NOT EXISTS is_void boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS void_reason text,
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS voided_by uuid,
  ADD COLUMN IF NOT EXISTS voided_by_name text;

-- Reminder settings JSON on institute settings
ALTER TABLE public.crm_institute_settings
  ADD COLUMN IF NOT EXISTS reminder_settings jsonb NOT NULL DEFAULT
    '{"feeOverdueDaysOffset":0,"feeDueSoonWindow":3,"batchEndingWindow":14,"attendanceThreshold":75}'::jsonb;

-- Indexes to skip voided rows quickly
CREATE INDEX IF NOT EXISTS idx_crm_fee_plans_is_void ON public.crm_fee_plans(is_void);
CREATE INDEX IF NOT EXISTS idx_crm_payments_is_void ON public.crm_payments(is_void);
CREATE INDEX IF NOT EXISTS idx_crm_expenses_is_void ON public.crm_expenses(is_void);

-- Update payment-apply trigger so voided payments don't count toward fee_plan amount_paid
CREATE OR REPLACE FUNCTION public.crm_apply_payment_to_plan()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  total_paid int;
  plan_amt int;
BEGIN
  IF NEW.fee_plan_id IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(SUM(amount),0) INTO total_paid
    FROM public.crm_payments
   WHERE fee_plan_id = NEW.fee_plan_id
     AND COALESCE(is_void,false) = false;
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
$function$;

-- Make sure trigger fires on insert AND update (so voiding recomputes)
DROP TRIGGER IF EXISTS trg_crm_apply_payment_to_plan ON public.crm_payments;
CREATE TRIGGER trg_crm_apply_payment_to_plan
AFTER INSERT OR UPDATE ON public.crm_payments
FOR EACH ROW EXECUTE FUNCTION public.crm_apply_payment_to_plan();