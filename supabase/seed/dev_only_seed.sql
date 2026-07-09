-- DEV/TEST DATA ONLY. NEVER RUN THIS AGAINST THE REAL EGYPRO PRODUCTION DATABASE.
-- This file creates fabricated employee and UX-testing rows for local or staging use only.
-- Run manually only when intentionally testing with fake data.

-- ── 1. INSERT UNLINKED TESTING EMPLOYEES ─────────────────────
INSERT INTO public.employees (
  user_id, full_name, email, phone, position, department, start_date, status, gross_salary, currency, gender, dob, tax_category
)
VALUES 
  (null, 'Sarah Namono', 'sarah@egypro.com', '+256770000000', 'Project Coordinator', 'Operations', '2026-01-01', 'active', 2200000, 'UGX', 'female', '1995-04-12', 'standard'),
  (null, 'Joseph Okello', 'joseph@egypro.com', '+256780000000', 'Warehouse Assistant', 'Logistics', '2026-02-15', 'active', 1500000, 'UGX', 'male', '1992-09-22', 'standard')
ON CONFLICT DO NOTHING;

-- ── 2. GUIDANCE FOR TEST LOGINS & PORTAL TESTING ────────────
-- To run self-service leave requests or workspace testing on these profiles:
-- 1. Create a fake test user manually in Supabase Auth (e.g. test_sarah@egypro.com, UUID: '00000000-0000-0000-0000-000000000001').
-- 2. Link the employee profile to the new test user:
--    UPDATE public.employees 
--    SET user_id = '00000000-0000-0000-0000-000000000001' 
--    WHERE full_name = 'Sarah Namono';
-- 3. Insert fake leave requests if needed:
--    INSERT INTO public.leave_requests (employee_id, user_id, leave_type_id, start_date, end_date, days_requested, reason, status)
--    VALUES (
--      (SELECT id FROM public.employees WHERE full_name = 'Sarah Namono' LIMIT 1),
--      '00000000-0000-0000-0000-000000000001',
--      (SELECT id FROM public.leave_types WHERE code = 'annual' LIMIT 1),
--      '2026-07-20', '2026-07-21', 2.0, 'Personal errands', 'pending'
--    );
