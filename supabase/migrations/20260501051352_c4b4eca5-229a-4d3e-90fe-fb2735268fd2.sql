
-- Generic helper to create a report-columns table
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'crm_student_report_columns',
    'crm_batch_report_columns',
    'crm_fee_report_columns',
    'crm_attendance_report_columns',
    'crm_certificate_report_columns'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format($f$
      CREATE TABLE IF NOT EXISTS public.%I (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        column_key text NOT NULL UNIQUE,
        label text NOT NULL,
        show_in_list boolean NOT NULL DEFAULT true,
        show_in_export boolean NOT NULL DEFAULT true,
        sort_order integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    $f$, tbl);

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);

    EXECUTE format($f$
      DROP POLICY IF EXISTS "CRM admins manage cols" ON public.%I;
      CREATE POLICY "CRM admins manage cols" ON public.%I
        FOR ALL TO authenticated
        USING (has_crm_role(auth.uid(), 'admin'::crm_role))
        WITH CHECK (has_crm_role(auth.uid(), 'admin'::crm_role));
    $f$, tbl, tbl);

    EXECUTE format($f$
      DROP POLICY IF EXISTS "CRM staff view cols" ON public.%I;
      CREATE POLICY "CRM staff view cols" ON public.%I
        FOR SELECT TO authenticated
        USING (has_any_crm_role(auth.uid()));
    $f$, tbl, tbl);

    EXECUTE format($f$
      DROP TRIGGER IF EXISTS trg_%I_updated ON public.%I;
      CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    $f$, tbl, tbl, tbl, tbl);
  END LOOP;
END $$;

-- Seed: students
INSERT INTO public.crm_student_report_columns (column_key, label, show_in_list, show_in_export, sort_order) VALUES
  ('photo','Photo',true,false,10),
  ('enrolment_no','Enrolment №',true,true,20),
  ('full_name','Name',true,true,30),
  ('phone','Phone',true,true,40),
  ('alt_phone','Alt Phone',false,true,50),
  ('email','Email',false,true,60),
  ('course','Course',true,true,70),
  ('batch','Batch',true,true,80),
  ('faculty','Faculty',true,true,90),
  ('enrolment_date','Joined',true,true,100),
  ('status','Status',true,true,110),
  ('total_fee','Total Fee',true,true,120),
  ('net_payable_fee','Net Payable',false,true,130),
  ('paid_amount','Paid',false,true,140),
  ('balance','Balance',false,true,150),
  ('city','City',false,true,160),
  ('state','State',false,true,170),
  ('qualification','Qualification',false,true,180),
  ('college_name','College',false,true,190),
  ('referred_by','Referred By',false,true,200),
  ('hear_about_us','How Did You Hear',false,true,210),
  ('father_name','Father Name',false,true,220),
  ('father_phone','Father Phone',false,true,230),
  ('created_at','Created At',false,true,240)
ON CONFLICT (column_key) DO NOTHING;

-- Seed: batches
INSERT INTO public.crm_batch_report_columns (column_key, label, show_in_list, show_in_export, sort_order) VALUES
  ('name','Name',true,true,10),
  ('course','Course',true,true,20),
  ('faculty','Faculty',true,true,30),
  ('schedule','Schedule',true,true,40),
  ('timing','Timing',true,true,50),
  ('start_date','Start Date',true,true,60),
  ('end_date','End Date',true,true,70),
  ('capacity','Capacity',true,true,80),
  ('enrolled','Enrolled',true,true,90),
  ('seats_left','Seats Left',false,true,100),
  ('status','Status',true,true,110),
  ('created_at','Created',false,true,120)
ON CONFLICT (column_key) DO NOTHING;

-- Seed: fees (payments)
INSERT INTO public.crm_fee_report_columns (column_key, label, show_in_list, show_in_export, sort_order) VALUES
  ('receipt_no','Receipt №',true,true,10),
  ('paid_on','Date',true,true,20),
  ('student','Student',true,true,30),
  ('enrolment_no','Enrolment №',true,true,40),
  ('course','Course',true,true,50),
  ('batch','Batch',false,true,60),
  ('mode','Mode',true,true,70),
  ('amount','Amount',true,true,80),
  ('reference','Reference',false,true,90),
  ('collected_by','Collected By',false,true,100),
  ('status','Status',true,true,110)
ON CONFLICT (column_key) DO NOTHING;

-- Seed: attendance
INSERT INTO public.crm_attendance_report_columns (column_key, label, show_in_list, show_in_export, sort_order) VALUES
  ('photo','Photo',true,false,10),
  ('enrolment_no','Enrolment №',true,true,20),
  ('full_name','Name',true,true,30),
  ('phone','Phone',false,true,40),
  ('mark','Present/Absent',true,false,50),
  ('notes','Notes',false,true,60),
  ('attendance_pct','Attendance %',true,true,70)
ON CONFLICT (column_key) DO NOTHING;

-- Seed: certificates
INSERT INTO public.crm_certificate_report_columns (column_key, label, show_in_list, show_in_export, sort_order) VALUES
  ('certificate_no','Certificate №',true,true,10),
  ('student','Student',true,true,20),
  ('enrolment_no','Enrolment №',true,true,30),
  ('course','Course',true,true,40),
  ('grade','Grade',true,true,50),
  ('issued_on','Issue Date',true,true,60),
  ('issued_by','Issued By',false,true,70),
  ('template_kind','Type',false,true,80)
ON CONFLICT (column_key) DO NOTHING;
