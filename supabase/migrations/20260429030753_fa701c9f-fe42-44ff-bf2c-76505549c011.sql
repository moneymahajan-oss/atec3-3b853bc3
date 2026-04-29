
REVOKE EXECUTE ON FUNCTION public.crm_flag_overdue_fee_plans() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_flag_overdue_fee_plans() TO service_role;
