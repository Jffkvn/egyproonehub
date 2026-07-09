-- ============================================================
-- Egypro Onehub — Milestone 2 Database Migration & Seeds
-- ============================================================

-- ── 1. ALTER EMPLOYEES TABLE ────────────────────────────────
ALTER TABLE public.employees 
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  ADD COLUMN IF NOT EXISTS dob DATE,
  ADD COLUMN IF NOT EXISTS personal_email TEXT,
  ADD COLUMN IF NOT EXISTS tax_category TEXT DEFAULT 'standard' CHECK (tax_category IN ('standard', 'special', 'exempt')),
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- ── 2. CREATE LEAVE TYPES TABLE ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  default_days INTEGER NOT NULL DEFAULT 0 CHECK (default_days >= 0),
  is_paid BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_timestamp_leave_types
  BEFORE UPDATE ON public.leave_types
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- Seed Default Leave Types
INSERT INTO public.leave_types (name, code, default_days, is_paid, is_active) VALUES
  ('Annual Leave', 'annual', 21, true, true),
  ('Sick Leave', 'sick', 30, true, true),
  ('Maternity Leave', 'maternity', 60, true, true),
  ('Paternity Leave', 'paternity', 4, true, true),
  ('Compassionate Leave', 'compassionate', 5, true, true),
  ('Unpaid Leave', 'unpaid', 0, false, true)
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name,
    default_days = EXCLUDED.default_days,
    is_paid = EXCLUDED.is_paid;

-- ── 3. CREATE LEAVE REQUESTS TABLE ───────────────────────────
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES public.leave_types(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_requested NUMERIC(5, 1) NOT NULL CHECK (days_requested > 0),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approver_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approver_notes TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_leave_dates CHECK (end_date >= start_date)
);

CREATE TRIGGER set_timestamp_leave_requests
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON public.leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_user ON public.leave_requests(user_id);

-- ── 4. CREATE ANNOUNCEMENTS TABLE ────────────────────────────
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_announcements_active_created ON public.announcements(is_active, created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR MILESTONE 2
-- ============================================================

ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- ── Leave Types Policies ────────────────────────────────────
CREATE POLICY leave_types_select ON public.leave_types
  FOR SELECT USING (true);

CREATE POLICY leave_types_write_admin ON public.leave_types
  FOR ALL USING (public.get_current_user_role() = 'hr_admin')
  WITH CHECK (public.get_current_user_role() = 'hr_admin');

-- ── Leave Requests Policies (Strict Ownership Verification) ──
CREATE POLICY leave_requests_select_self ON public.leave_requests
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY leave_requests_select_admin ON public.leave_requests
  FOR SELECT USING (public.get_current_user_role() IN ('hr_admin', 'cfo', 'md'));

CREATE POLICY leave_requests_insert_self ON public.leave_requests
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND 
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

CREATE POLICY leave_requests_update_cancel ON public.leave_requests
  FOR UPDATE USING (
    user_id = auth.uid() AND 
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) AND 
    status = 'pending'
  ) WITH CHECK (
    status = 'cancelled'
  );

CREATE POLICY leave_requests_update_admin ON public.leave_requests
  FOR UPDATE USING (
    public.get_current_user_role() = 'hr_admin'
  ) WITH CHECK (
    public.get_current_user_role() = 'hr_admin'
  );

-- ── Announcements Policies ──────────────────────────────────
CREATE POLICY announcements_select_active ON public.announcements
  FOR SELECT USING (is_active = true OR public.get_current_user_role() = 'hr_admin');

CREATE POLICY announcements_write_admin ON public.announcements
  FOR ALL USING (public.get_current_user_role() = 'hr_admin')
  WITH CHECK (public.get_current_user_role() = 'hr_admin');


-- ============================================================
-- DEV & TESTING SEED DATASET
-- ============================================================

DO $$
DECLARE
  v_user_id UUID;
  v_emp_id UUID;
  v_annual_type_id UUID;
BEGIN
  -- Grab the first available profile user
  SELECT id INTO v_user_id FROM public.users LIMIT 1;
  
  -- Insert linked employee Sarah Namono
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.employees (
      user_id, full_name, email, phone, position, department, start_date, status, gross_salary, currency, gender, dob, tax_category
    )
    VALUES (
      v_user_id, 'Sarah Namono', 'sarah@egypro.com', '+256770000000', 'Project Coordinator', 'Operations', '2026-01-01', 'active', 2200000, 'UGX', 'female', '1995-04-12', 'standard'
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Insert unlinked employee Joseph Okello
  INSERT INTO public.employees (
    user_id, full_name, email, phone, position, department, start_date, status, gross_salary, currency, gender, dob, tax_category
  )
  VALUES (
    null, 'Joseph Okello', 'joseph@egypro.com', '+256780000000', 'Warehouse Assistant', 'Logistics', '2026-02-15', 'active', 1500000, 'UGX', 'male', '1992-09-22', 'standard'
  )
  ON CONFLICT DO NOTHING;

  -- Fetch Sarah's employee id
  SELECT id INTO v_emp_id FROM public.employees WHERE full_name = 'Sarah Namono' LIMIT 1;
  
  -- Fetch Annual leave type id
  SELECT id INTO v_annual_type_id FROM public.leave_types WHERE code = 'annual' LIMIT 1;

  -- Seed Leave Requests
  IF v_emp_id IS NOT NULL AND v_annual_type_id IS NOT NULL AND v_user_id IS NOT NULL THEN
    -- Approved request: 3 days in June
    INSERT INTO public.leave_requests (
      employee_id, user_id, leave_type_id, start_date, end_date, days_requested, reason, status, decided_at, approver_id, approver_notes
    )
    VALUES (
      v_emp_id, v_user_id, v_annual_type_id, '2026-06-10', '2026-06-12', 3.0, 'Medical review and rest', 'approved', now(), v_user_id, 'Approved'
    )
    ON CONFLICT DO NOTHING;

    -- Pending request: 2 days in July
    INSERT INTO public.leave_requests (
      employee_id, user_id, leave_type_id, start_date, end_date, days_requested, reason, status
    )
    VALUES (
      v_emp_id, v_user_id, v_annual_type_id, '2026-07-20', '2026-07-21', 2.0, 'Personal errands', 'pending'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Seed Active Announcement
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.announcements (title, body, is_active, created_by)
    VALUES (
      'Welcome to the new Egypro Onehub!', 
      'We are excited to launch Milestone 2 of Onehub. You can now request leaves, view corporate profiles, and check company announcements here.', 
      true, 
      v_user_id
    )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
