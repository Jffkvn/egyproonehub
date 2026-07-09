-- ============================================================
-- Egypro Onehub — Milestone 1 Database Schema & Seeds
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 0. TIMESTAMP SETTER TRIGGER FUNCTION ───────────────────
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 1. ROLES SCHEMA ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.roles (
  role_name TEXT PRIMARY KEY,
  default_modules TEXT[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed Default Roles & Module mappings
INSERT INTO public.roles (role_name, default_modules) VALUES
  ('employee', ARRAY['my']),
  ('coordinator', ARRAY['my', 'inventory', 'cash', 'tracker']),
  ('pm', ARRAY['my', 'inventory', 'cash', 'tracker', 'reports']),
  ('warehouse_manager', ARRAY['my', 'inventory', 'reports']),
  ('cfo', ARRAY['my', 'inventory', 'cash', 'tracker', 'reports', 'admin']),
  ('hr_admin', ARRAY['my', 'hr', 'reports', 'admin']),
  ('md', ARRAY['my', 'hr', 'inventory', 'cash', 'tracker', 'reports'])
ON CONFLICT (role_name) DO UPDATE 
SET default_modules = EXCLUDED.default_modules;

-- ── 2. USERS PROFILE TABLE (auth.users extension) ───────────
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL REFERENCES public.roles(role_name) ON UPDATE CASCADE,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_timestamp_users
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON public.users(is_active);

-- ── 3. EMPLOYEES RECORD TABLE ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  national_id TEXT,
  position TEXT,
  department TEXT,
  employment_type TEXT NOT NULL DEFAULT 'permanent' CHECK (employment_type IN ('permanent', 'contract', 'casual', 'intern')),
  start_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  gross_salary NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'UGX',
  bank_name TEXT,
  account_number TEXT,
  mobile_money_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.users(id),
  updated_by UUID REFERENCES public.users(id)
);

CREATE TRIGGER set_timestamp_employees
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees(email);

-- ── 4. USER MODULE OVERRIDES ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_module_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL CHECK (module_key IN ('my', 'hr', 'inventory', 'cash', 'tracker', 'reports', 'admin')),
  access_type TEXT NOT NULL CHECK (access_type IN ('grant', 'deny')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.users(id),
  UNIQUE (user_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_module_overrides_lookup ON public.user_module_overrides(user_id);

-- ── 5. PROJECTS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'on_hold')),
  description TEXT,
  estimated_budget NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'UGX',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.users(id)
);

CREATE TRIGGER set_timestamp_projects
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);

-- ── 6. PROJECT ASSIGNMENTS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_on_project TEXT NOT NULL CHECK (role_on_project IN ('coordinator', 'pm')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unassigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.users(id)
);

-- Partial index to enforce exactly one active assignment per user per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_assignments_active_unique 
  ON public.project_assignments(project_id, user_id) 
  WHERE unassigned_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_assignments_lookup ON public.project_assignments(project_id, user_id);

-- ── 7. AUDIT LOGS (Immutable) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

-- ── 8. ORGANIZATION SETTINGS (Single Row) ─────────────────
CREATE TABLE IF NOT EXISTS public.organization_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true),
  company_name TEXT NOT NULL DEFAULT 'Egypro',
  logo_path TEXT NOT NULL DEFAULT '/logo.png',
  default_currency TEXT NOT NULL DEFAULT 'UGX',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.users(id)
);

CREATE TRIGGER set_timestamp_organization_settings
  BEFORE UPDATE ON public.organization_settings
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- Seed Single Row Organization Settings
INSERT INTO public.organization_settings (id, company_name, logo_path, default_currency)
VALUES (true, 'Egypro', '/logo.png', 'UGX')
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_module_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- ── Security helper functions ───────────────────────────────
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM public.users WHERE id = auth.uid() AND is_active = true;
$$;

-- ── Roles Policies ──────────────────────────────────────────
CREATE POLICY roles_select_all ON public.roles
  FOR SELECT USING (true);

-- ── Users Policies ──────────────────────────────────────────
CREATE POLICY users_select_self_or_admin ON public.users
  FOR SELECT USING (
    id = auth.uid() OR 
    public.get_current_user_role() IN ('hr_admin', 'cfo', 'md')
  );

CREATE POLICY users_insert_admin ON public.users
  FOR INSERT WITH CHECK (public.get_current_user_role() = 'hr_admin');

CREATE POLICY users_update_admin ON public.users
  FOR UPDATE USING (public.get_current_user_role() = 'hr_admin')
  WITH CHECK (public.get_current_user_role() = 'hr_admin');

-- ── Employees Policies ──────────────────────────────────────
CREATE POLICY employees_select_self_or_admin ON public.employees
  FOR SELECT USING (
    user_id = auth.uid() OR
    public.get_current_user_role() IN ('hr_admin', 'cfo', 'md')
  );

CREATE POLICY employees_insert_admin ON public.employees
  FOR INSERT WITH CHECK (public.get_current_user_role() = 'hr_admin');

CREATE POLICY employees_update_admin ON public.employees
  FOR UPDATE USING (public.get_current_user_role() = 'hr_admin')
  WITH CHECK (public.get_current_user_role() = 'hr_admin');

-- ── User Module Overrides Policies ──────────────────────────
CREATE POLICY overrides_select_self_or_admin ON public.user_module_overrides
  FOR SELECT USING (
    user_id = auth.uid() OR
    public.get_current_user_role() IN ('hr_admin', 'cfo', 'md')
  );

CREATE POLICY overrides_write_admin ON public.user_module_overrides
  FOR ALL USING (public.get_current_user_role() = 'hr_admin')
  WITH CHECK (public.get_current_user_role() = 'hr_admin');

-- ── Projects Policies (Least-Privilege) ─────────────────────
CREATE POLICY projects_select_least_privilege ON public.projects
  FOR SELECT USING (
    public.get_current_user_role() IN ('pm', 'cfo', 'md', 'hr_admin') OR
    id IN (
      SELECT project_id 
      FROM public.project_assignments 
      WHERE user_id = auth.uid() AND unassigned_at IS NULL
    )
  );

CREATE POLICY projects_write_pm_cfo ON public.projects
  FOR ALL USING (public.get_current_user_role() IN ('pm', 'cfo', 'md'))
  WITH CHECK (public.get_current_user_role() IN ('pm', 'cfo', 'md'));

-- ── Project Assignments Policies ────────────────────────────
CREATE POLICY assignments_select_all ON public.project_assignments
  FOR SELECT USING (
    public.get_current_user_role() IN ('pm', 'cfo', 'md', 'hr_admin') OR
    user_id = auth.uid()
  );

CREATE POLICY assignments_write_pm_cfo ON public.project_assignments
  FOR ALL USING (public.get_current_user_role() IN ('pm', 'cfo', 'md'))
  WITH CHECK (public.get_current_user_role() IN ('pm', 'cfo', 'md'));

-- ── Audit Logs Policies (Append-Only) ───────────────────────
CREATE POLICY audit_logs_select_admin ON public.audit_logs
  FOR SELECT USING (public.get_current_user_role() IN ('hr_admin', 'cfo', 'md'));

CREATE POLICY audit_logs_insert_secure ON public.audit_logs
  FOR INSERT WITH CHECK (actor_id = auth.uid());

-- No UPDATE or DELETE policies -> enforces absolute immutability of audit trails.

-- ── Organization Settings Policies ──────────────────────────
CREATE POLICY settings_select_all ON public.organization_settings
  FOR SELECT USING (true);

CREATE POLICY settings_update_admin ON public.organization_settings
  FOR UPDATE USING (public.get_current_user_role() IN ('hr_admin', 'cfo', 'md'))
  WITH CHECK (public.get_current_user_role() IN ('hr_admin', 'cfo', 'md'));


-- ============================================================
-- PRODUCTION BOOTSTRAP IDENTITY-TO-PROFILE TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_first_user BOOLEAN;
  assigned_role TEXT;
BEGIN
  -- Automatically discover first user to assign administrative access
  SELECT NOT EXISTS (SELECT 1 FROM public.users) INTO is_first_user;
  
  IF is_first_user THEN
    assigned_role := 'hr_admin';
  ELSE
    assigned_role := 'employee';
  END IF;

  INSERT INTO public.users (id, full_name, email, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    assigned_role,
    true
  );
  
  -- Create audit entry
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, description)
  VALUES (
    NEW.id,
    'USER_CREATE',
    'users',
    NEW.id,
    'Profile created for user ' || NEW.email || ' with role: ' || assigned_role || ' during signup bootstrap.'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind the trigger function to execute AFTER new user registration in auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
