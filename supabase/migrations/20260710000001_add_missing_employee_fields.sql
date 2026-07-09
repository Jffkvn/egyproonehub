-- ============================================================
-- Add Missing Legacy Employee Fields to Egypro Onehub Schema
-- ============================================================

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS employee_number TEXT,
  ADD COLUMN IF NOT EXISTS tin_number TEXT,
  ADD COLUMN IF NOT EXISTS nssf_number TEXT,
  ADD COLUMN IF NOT EXISTS sort_code TEXT,
  ADD COLUMN IF NOT EXISTS employee_type TEXT DEFAULT 'local' CHECK (employee_type IN ('local', 'global', 'contractor', 'exempt')),
  ADD COLUMN IF NOT EXISTS pct_month_worked NUMERIC DEFAULT 100,
  ADD COLUMN IF NOT EXISTS wht_rate NUMERIC DEFAULT 6,
  ADD COLUMN IF NOT EXISTS deactivation_date DATE,
  ADD COLUMN IF NOT EXISTS custom_overtime_rate NUMERIC;
