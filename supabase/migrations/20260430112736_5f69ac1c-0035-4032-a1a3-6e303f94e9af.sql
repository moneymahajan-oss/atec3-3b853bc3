-- 1. Backfill: reconcile crm_fee_plans.status with actual amount_paid
UPDATE public.crm_fee_plans
SET status = CASE
  WHEN amount_paid >= amount AND amount > 0 THEN 'paid'::crm_fee_status
  WHEN amount_paid > 0 AND amount_paid < amount THEN 'partial'::crm_fee_status
  WHEN due_date IS NOT NULL AND due_date < CURRENT_DATE THEN 'overdue'::crm_fee_status
  ELSE 'pending'::crm_fee_status
END,
updated_at = now()
WHERE COALESCE(is_void, false) = false;

-- 2. Update trigger function to demote status when payments are voided
CREATE OR REPLACE FUNCTION public.crm_apply_payment_to_plan()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  total_paid int;
  plan_amt int;
  plan_due date;
BEGIN
  IF NEW.fee_plan_id IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(SUM(amount),0) INTO total_paid
    FROM public.crm_payments
   WHERE fee_plan_id = NEW.fee_plan_id
     AND COALESCE(is_void,false) = false;
  SELECT amount, due_date INTO plan_amt, plan_due
    FROM public.crm_fee_plans WHERE id = NEW.fee_plan_id;
  UPDATE public.crm_fee_plans
     SET amount_paid = total_paid,
         status = CASE
           WHEN total_paid >= plan_amt AND plan_amt > 0 THEN 'paid'::crm_fee_status
           WHEN total_paid > 0 AND total_paid < plan_amt THEN 'partial'::crm_fee_status
           WHEN plan_due IS NOT NULL AND plan_due < CURRENT_DATE THEN 'overdue'::crm_fee_status
           ELSE 'pending'::crm_fee_status
         END,
         updated_at = now()
   WHERE id = NEW.fee_plan_id;
  RETURN NEW;
END;
$function$;