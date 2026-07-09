-- ============================================================
-- Egypro Onehub — Milestone 3 Database Migration (Payroll & HR Hardening)
-- ============================================================

-- ── 1. PAYROLL PERIODS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'locked', 'processed', 'closed')),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (year, month)
);

CREATE TRIGGER set_timestamp_payroll_periods
  BEFORE UPDATE ON public.payroll_periods
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE INDEX IF NOT EXISTS idx_payroll_periods_status ON public.payroll_periods(status);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_year_month ON public.payroll_periods(year, month);

-- ── 2. PAYROLL RUNS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  gross_salary NUMERIC(14,2) NOT NULL DEFAULT 0,
  taxable_pay NUMERIC(14,2) NOT NULL DEFAULT 0,
  paye_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  nssf_employee NUMERIC(14,2) NOT NULL DEFAULT 0,
  nssf_employer NUMERIC(14,2) NOT NULL DEFAULT 0,
  leave_deduction_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  other_deductions NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_pay NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'UGX',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (period_id, employee_id)
);

CREATE TRIGGER set_timestamp_payroll_runs
  BEFORE UPDATE ON public.payroll_runs
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE INDEX IF NOT EXISTS idx_payroll_runs_period_employee ON public.payroll_runs(period_id, employee_id);

-- ── 3. PAYROLL ADJUSTMENTS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payroll_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('allowance', 'deduction', 'bonus', 'reimbursement', 'penalty')),
  label TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  is_taxable BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_timestamp_payroll_adjustments
  BEFORE UPDATE ON public.payroll_adjustments
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE INDEX IF NOT EXISTS idx_payroll_adjustments_period_employee ON public.payroll_adjustments(period_id, employee_id);

-- ── 4. PUBLIC HOLIDAYS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.public_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date DATE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_recurring_annual BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_timestamp_public_holidays
  BEFORE UPDATE ON public.public_holidays
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE INDEX IF NOT EXISTS idx_public_holidays_date ON public.public_holidays(holiday_date);

-- ── 5. LEAVE BALANCES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employee_leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
  balance_year INTEGER NOT NULL,
  opening_balance NUMERIC(6,1) NOT NULL DEFAULT 0,
  days_earned NUMERIC(6,1) NOT NULL DEFAULT 0,
  days_taken NUMERIC(6,1) NOT NULL DEFAULT 0,
  days_carried_forward NUMERIC(6,1) NOT NULL DEFAULT 0,
  closing_balance NUMERIC(6,1) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, leave_type_id, balance_year)
);

CREATE TRIGGER set_timestamp_employee_leave_balances
  BEFORE UPDATE ON public.employee_leave_balances
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE INDEX IF NOT EXISTS idx_leave_balances_employee_year ON public.employee_leave_balances(employee_id, balance_year);

-- ── 6. EMPLOYEE ATTACHMENTS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employee_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('medical', 'contract', 'disciplinary', 'leave_support', 'identity', 'other')),
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES public.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_attachments_employee ON public.employee_attachments(employee_id);

-- ── 7. ENABLE ROW LEVEL SECURITY ───────────────────────────
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_attachments ENABLE ROW LEVEL SECURITY;

-- ── 8. RLS POLICIES ─────────────────────────────────────────

-- Payroll Periods
CREATE POLICY payroll_periods_select ON public.payroll_periods
  FOR SELECT USING (public.get_current_user_role() IN ('hr_admin', 'cfo', 'md'));

CREATE POLICY payroll_periods_write ON public.payroll_periods
  FOR ALL USING (public.get_current_user_role() IN ('hr_admin', 'cfo'));

-- Payroll Runs
CREATE POLICY payroll_runs_select_self ON public.payroll_runs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE employees.id = payroll_runs.employee_id AND employees.user_id = auth.uid()
    )
  );

CREATE POLICY payroll_runs_select_admin ON public.payroll_runs
  FOR SELECT USING (public.get_current_user_role() IN ('hr_admin', 'cfo', 'md'));

CREATE POLICY payroll_runs_write ON public.payroll_runs
  FOR ALL USING (public.get_current_user_role() IN ('hr_admin', 'cfo'));

-- Payroll Adjustments
CREATE POLICY payroll_adjustments_select ON public.payroll_adjustments
  FOR SELECT USING (public.get_current_user_role() IN ('hr_admin', 'cfo', 'md'));

CREATE POLICY payroll_adjustments_write ON public.payroll_adjustments
  FOR ALL USING (public.get_current_user_role() IN ('hr_admin', 'cfo'));

-- Public Holidays
CREATE POLICY public_holidays_select ON public.public_holidays
  FOR SELECT USING (true);

CREATE POLICY public_holidays_write ON public.public_holidays
  FOR ALL USING (public.get_current_user_role() = 'hr_admin');

-- Leave Balances
CREATE POLICY leave_balances_select_self ON public.employee_leave_balances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE employees.id = employee_leave_balances.employee_id AND employees.user_id = auth.uid()
    )
  );

CREATE POLICY leave_balances_select_admin ON public.employee_leave_balances
  FOR SELECT USING (public.get_current_user_role() IN ('hr_admin', 'cfo', 'md'));

CREATE POLICY leave_balances_write ON public.employee_leave_balances
  FOR ALL USING (public.get_current_user_role() IN ('hr_admin', 'cfo'));

-- Employee Attachments
CREATE POLICY employee_attachments_select_self ON public.employee_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE employees.id = employee_attachments.employee_id AND employees.user_id = auth.uid()
    )
  );

CREATE POLICY employee_attachments_select_admin ON public.employee_attachments
  FOR SELECT USING (public.get_current_user_role() IN ('hr_admin', 'cfo', 'md'));

CREATE POLICY employee_attachments_insert ON public.employee_attachments
  FOR INSERT WITH CHECK (
    public.get_current_user_role() IN ('hr_admin', 'cfo') OR 
    (
      -- employees can upload their own leave_support documents
      category = 'leave_support' AND
      EXISTS (
        SELECT 1 FROM public.employees 
        WHERE employees.id = employee_attachments.employee_id AND employees.user_id = auth.uid()
      )
    )
  );

CREATE POLICY employee_attachments_delete ON public.employee_attachments
  FOR DELETE USING (public.get_current_user_role() IN ('hr_admin', 'cfo'));

-- ── 9. STORAGE BUCKET CONFIGURATION ──────────────────────────

-- Ensure the storage.buckets row exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('employee-attachments', 'employee-attachments', false, 52428800, NULL) -- 50MB limit
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage bucket
CREATE POLICY employee_attachments_storage_select ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'employee-attachments' AND (
      public.get_current_user_role() IN ('hr_admin', 'cfo', 'md') OR
      EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.user_id = auth.uid()
          AND (storage.foldername(name))[1] = employees.id::text
      )
    )
  );

CREATE POLICY employee_attachments_storage_insert ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'employee-attachments' AND (
      public.get_current_user_role() IN ('hr_admin', 'cfo') OR
      EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.user_id = auth.uid()
          AND (storage.foldername(name))[1] = employees.id::text
      )
    )
  );

CREATE POLICY employee_attachments_storage_delete ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'employee-attachments' AND (
      public.get_current_user_role() IN ('hr_admin', 'cfo')
    )
  );
