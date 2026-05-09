
DROP FUNCTION IF EXISTS public.grade_mock_test(uuid, jsonb);

CREATE OR REPLACE FUNCTION public.grade_mock_test(_test_id uuid, _answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  qs jsonb;
  q jsonb;
  i int := 0;
  s int := 0;
  t int := 0;
  chosen text;
  correct_idx int;
  correct_arr int[] := ARRAY[]::int[];
BEGIN
  SELECT questions INTO qs FROM public.mock_tests WHERE id = _test_id AND is_active = true;
  IF qs IS NULL THEN
    RETURN jsonb_build_object('score', 0, 'total', 0, 'correct', '[]'::jsonb);
  END IF;
  FOR q IN SELECT jsonb_array_elements(qs) LOOP
    t := t + 1;
    correct_idx := (q->>'correct')::int;
    correct_arr := array_append(correct_arr, correct_idx);
    chosen := _answers->>(i::text);
    IF chosen IS NOT NULL AND chosen::int = correct_idx THEN
      s := s + 1;
    END IF;
    i := i + 1;
  END LOOP;
  RETURN jsonb_build_object('score', s, 'total', t, 'correct', to_jsonb(correct_arr));
END;
$$;
REVOKE ALL ON FUNCTION public.grade_mock_test(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grade_mock_test(uuid, jsonb) TO anon, authenticated;
