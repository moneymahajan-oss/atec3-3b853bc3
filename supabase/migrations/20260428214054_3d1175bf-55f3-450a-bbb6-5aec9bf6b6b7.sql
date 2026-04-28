CREATE TABLE public.crm_expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text DEFAULT '#64748b',
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CRM staff view expense categories" ON public.crm_expense_categories
  FOR SELECT TO authenticated USING (has_any_crm_role(auth.uid()));
CREATE POLICY "CRM admins manage expense categories" ON public.crm_expense_categories
  FOR ALL TO authenticated
  USING (has_crm_role(auth.uid(), 'admin'::crm_role))
  WITH CHECK (has_crm_role(auth.uid(), 'admin'::crm_role));

INSERT INTO public.crm_expense_categories (name, color, display_order) VALUES
  ('Rent', '#ef4444', 1),
  ('Salary', '#3b82f6', 2),
  ('Utilities', '#f59e0b', 3),
  ('Marketing', '#a855f7', 4),
  ('Supplies', '#14b8a6', 5),
  ('Maintenance', '#8b5cf6', 6),
  ('Travel', '#06b6d4', 7),
  ('Miscellaneous', '#64748b', 99);

CREATE TABLE public.crm_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spent_on date NOT NULL DEFAULT CURRENT_DATE,
  category_id uuid REFERENCES public.crm_expense_categories(id) ON DELETE SET NULL,
  category_name_snapshot text,
  vendor text,
  description text NOT NULL,
  amount integer NOT NULL,
  mode crm_payment_mode NOT NULL DEFAULT 'cash',
  reference text,
  notes text,
  receipt_url text,
  recorded_by uuid,
  recorded_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_expenses_date ON public.crm_expenses(spent_on);
CREATE INDEX idx_crm_expenses_category ON public.crm_expenses(category_id);

ALTER TABLE public.crm_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CRM admins manage expenses" ON public.crm_expenses
  FOR ALL TO authenticated
  USING (has_crm_role(auth.uid(), 'admin'::crm_role))
  WITH CHECK (has_crm_role(auth.uid(), 'admin'::crm_role));

CREATE TRIGGER trg_crm_expenses_updated BEFORE UPDATE ON public.crm_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();