REVOKE EXECUTE ON FUNCTION public.crm_find_by_phone(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_find_by_phone(text) TO authenticated;