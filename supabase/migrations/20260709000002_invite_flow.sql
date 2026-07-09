-- ============================================================
-- Egypro Onehub — Secure Onboarding & Invite Flow Migration
-- ============================================================

-- ── 1. ADD invite_sent_at TO employees TABLE ─────────────────
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS invite_sent_at TIMESTAMPTZ NULL;

-- ── 2. REFACTOR handle_new_user TRIGGER FUNCTION ────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_first_user BOOLEAN;
  assigned_role TEXT;
  v_emp_id UUID;
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
  
  -- Create audit entry for user profile creation
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, description)
  VALUES (
    NEW.id,
    'USER_CREATE',
    'users',
    NEW.id,
    'Profile created for user ' || NEW.email || ' with role: ' || assigned_role || ' during signup bootstrap.'
  );

  -- Link unlinked employee profile dynamically by email match
  UPDATE public.employees
  SET user_id = NEW.id, updated_at = now()
  WHERE email = NEW.email AND user_id IS NULL
  RETURNING id INTO v_emp_id;

  -- Create audit entry for employee profile link if matched
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, description)
    VALUES (
      NEW.id,
      'EMPLOYEE_LINK',
      'employees',
      v_emp_id,
      'Portal access activated and linked for employee ' || NEW.email || ' via verified email signup/invite callback.'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
