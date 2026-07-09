-- ============================================================
-- Egypro Onehub — Milestone 2 Security Patch Migration
-- ============================================================

-- ── 1. DROP DIRECT UPDATE POLICIES ON LEAVE REQUESTS ─────────
DROP POLICY IF EXISTS leave_requests_update_cancel ON public.leave_requests;
DROP POLICY IF EXISTS leave_requests_update_admin ON public.leave_requests;

-- ── 2. CREATE ATOMIC SECURITY DEFINER REVIEW RPC ────────────
CREATE OR REPLACE FUNCTION public.rpc_review_leave_request(
  p_request_id UUID,
  p_decision TEXT,
  p_approver_notes TEXT DEFAULT NULL
)
RETURNS public.leave_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.leave_requests;
  v_caller_role TEXT;
  v_caller_id UUID;
  v_emp_name TEXT;
  v_leave_name TEXT;
BEGIN
  -- Resolve caller identity
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller not authenticated';
  END IF;

  -- Resolve caller role
  SELECT role INTO v_caller_role FROM public.users WHERE id = v_caller_id AND is_active = true;
  IF v_caller_role IS NULL OR v_caller_role != 'hr_admin' THEN
    RAISE EXCEPTION 'Access Denied: Only HR Admins can review leave requests';
  END IF;

  -- Validate decision input
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid Decision: Must be approved or rejected';
  END IF;

  -- Lock request row with FOR UPDATE and verify existence
  SELECT * INTO v_request 
  FROM public.leave_requests 
  WHERE id = p_request_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave request not found';
  END IF;

  -- Verify the request is still pending
  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Conflict: Leave request is already decided or cancelled';
  END IF;

  -- Perform status mutation update
  UPDATE public.leave_requests
  SET 
    status = p_decision,
    approver_id = v_caller_id,
    approver_notes = p_approver_notes,
    decided_at = now(),
    updated_at = now()
  WHERE id = p_request_id
  RETURNING * INTO v_request;

  -- Resolve descriptors for audit logging
  SELECT full_name INTO v_emp_name FROM public.employees WHERE id = v_request.employee_id;
  SELECT name INTO v_leave_name FROM public.leave_types WHERE id = v_request.leave_type_id;

  -- Write to audit logs inside the same transaction
  INSERT INTO public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    description,
    metadata
  )
  VALUES (
    v_caller_id,
    CASE WHEN p_decision = 'approved' THEN 'LEAVE_REQUEST_APPROVE' ELSE 'LEAVE_REQUEST_REJECT' END,
    'leave_requests',
    p_request_id,
    initcap(p_decision) || ' leave request for employee: ' || COALESCE(v_emp_name, 'Sarah Namono') || ' (' || COALESCE(v_request.days_requested::text, '0') || ' Days of ' || COALESCE(v_leave_name, 'Leave') || ')',
    jsonb_build_object('approver_notes', p_approver_notes)
  );

  RETURN v_request;
END;
$$;

-- ── 3. CREATE ATOMIC SECURITY DEFINER CANCEL RPC ────────────
CREATE OR REPLACE FUNCTION public.rpc_cancel_leave_request(
  p_request_id UUID
)
RETURNS public.leave_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.leave_requests;
  v_caller_id UUID;
  v_has_linked_emp BOOLEAN;
  v_leave_name TEXT;
BEGIN
  -- Resolve caller identity
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller not authenticated';
  END IF;

  -- Lock request row with FOR UPDATE and verify existence
  SELECT * INTO v_request 
  FROM public.leave_requests 
  WHERE id = p_request_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave request not found';
  END IF;

  -- Verify self-service ownership (request belongs to caller)
  IF v_request.user_id != v_caller_id THEN
    RAISE EXCEPTION 'Access Denied: You do not own this leave request';
  END IF;

  -- Verify caller also owns the linked employee profile row
  SELECT EXISTS(
    SELECT 1 FROM public.employees 
    WHERE id = v_request.employee_id AND user_id = v_caller_id
  ) INTO v_has_linked_emp;

  IF NOT v_has_linked_emp THEN
    RAISE EXCEPTION 'Access Denied: The request employee record is not linked to your account';
  END IF;

  -- Verify the request is pending
  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Conflict: Only pending leave requests can be cancelled';
  END IF;

  -- Perform cancellation update
  UPDATE public.leave_requests
  SET 
    status = 'cancelled',
    updated_at = now()
  WHERE id = p_request_id
  RETURNING * INTO v_request;

  -- Resolve descriptor for audit logging
  SELECT name INTO v_leave_name FROM public.leave_types WHERE id = v_request.leave_type_id;

  -- Write to audit logs inside the same transaction
  INSERT INTO public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    description,
    metadata
  )
  VALUES (
    v_caller_id,
    'LEAVE_REQUEST_CREATE',
    'leave_requests',
    p_request_id,
    'Cancelled pending leave request for ' || COALESCE(v_request.days_requested::text, '0') || ' day(s) of ' || COALESCE(v_leave_name, 'Leave'),
    NULL
  );

  RETURN v_request;
END;
$$;

-- ── 4. WAREHOUSE MANAGER PROJECT VISIBILITY ──────────────────
DROP POLICY IF EXISTS projects_select_least_privilege ON public.projects;

CREATE POLICY projects_select_least_privilege ON public.projects
  FOR SELECT USING (
    public.get_current_user_role() IN ('pm', 'cfo', 'md', 'hr_admin', 'warehouse_manager') OR
    id IN (
      SELECT project_id 
      FROM public.project_assignments 
      WHERE user_id = auth.uid() AND unassigned_at IS NULL
    )
  );
