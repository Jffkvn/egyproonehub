# Egypro Onehub — Milestone 2 Implementation Log (HR Core)

This document chronicles the architectural and implementation decisions for Milestone 2 of the Egypro Onehub platform.

---

## 1. Reference Findings (JantaHR & Employee Portal)

We analyzed the patterns in the pre-existing projects:
- **JantaHR (`egypro`)**: Leave requests management is based on a `leave_requests` model. Entitlement balances are adjusted dynamically on status decisions (approve/reject/cancel) through client-side functions and database triggers. We extracted the `countWorkingDays` utility looping between dates and skipping Saturdays and Sundays. We also adapted the employee account linking fields (`user_id` uuid column on `employees`) to establish clean portal mappings.
- **Employee Portal (`egypro-portal`)**: Verified that portal self-service is fully active only when an employee profile is linked to their Supabase user record. We adapted this rule by rendering empty states and guiding the user to contact their HR administrator when no link is present.

---

## 2. Schema Additions

Applied migration script `20260708000001_milestone2_schema.sql` adding:
1. **Employees Alteration**:
   - `gender` `TEXT` NULL CHECK (`gender` IN ('male', 'female', 'other'))
   - `dob` `DATE` NULL
   - `personal_email` `TEXT` NULL
   - `tax_category` `TEXT` DEFAULT `'standard'` CHECK (`tax_category` IN ('standard', 'special', 'exempt'))
   - `notes` `TEXT` NULL
2. **Leave Types Table (`leave_types`)**:
   - `id` `UUID` PRIMARY KEY DEFAULT `gen_random_uuid()`
   - `name` `TEXT` UNIQUE NOT NULL
   - `code` `TEXT` UNIQUE NOT NULL
   - `default_days` `INTEGER` DEFAULT 0 CHECK (`default_days` >= 0)
   - `is_paid` `BOOLEAN` DEFAULT true
   - `is_active` `BOOLEAN` DEFAULT true
3. **Leave Requests Table (`leave_requests`)**:
   - `id` `UUID` PRIMARY KEY DEFAULT `gen_random_uuid()`
   - `employee_id` `UUID` REFERENCES `employees(id)` ON DELETE CASCADE
   - `user_id` `UUID` REFERENCES `users(id)` ON DELETE CASCADE
   - `leave_type_id` `UUID` REFERENCES `leave_types(id)` ON DELETE RESTRICT
   - `start_date` `DATE`
   - `end_date` `DATE`
   - `days_requested` `NUMERIC(5,1)` CHECK (`days_requested` > 0)
   - `reason` `TEXT`
   - `status` `TEXT` DEFAULT `'pending'` CHECK (`status` IN ('pending', 'approved', 'rejected', 'cancelled'))
   - `approver_id` `UUID` REFERENCES `users(id)`
   - `approver_notes` `TEXT`
   - `decided_at` `TIMESTAMPTZ`
   - `chk_leave_dates` constraint ensuring `end_date >= start_date`.
4. **Announcements Table (`announcements`)**:
   - `id` `UUID` PRIMARY KEY
   - `title` `TEXT`
   - `body` `TEXT`
   - `is_active` `BOOLEAN` DEFAULT true
   - `created_by` `UUID` REFERENCES `users(id)`

---

## 3. RLS Security Model Additions

We applied strict RLS rules separating self-service options and administration controls:
- **`leave_types`**:
  - `SELECT`: Enabled for all authenticated users to allow request submissions.
  - `INSERT / UPDATE / DELETE`: Restricted to users carrying the `'hr_admin'` role in `public.users`.
- **`leave_requests`**:
  - `SELECT (Self)`: Users can read requests where `user_id = auth.uid()`.
  - `SELECT (Admin)`: HR admins, CFOs, and MDs can read all rows.
  - `INSERT (Self)`: Users can only submit requests where `user_id = auth.uid()` AND the target `employee_id` corresponds to the row linked to their `auth.uid()`.
  - `UPDATE (Cancel)`: Users can change status to `'cancelled'` only if the current status is `'pending'` and they own the row.
  - `UPDATE (Admin)`: HR admins can review requests, approve/reject them, and write notes.
- **`announcements`**:
  - `SELECT`: All authenticated users see active announcements (`is_active = true`). HR admins see inactive announcements as well.
  - `WRITE`: Only HR admins can manage announcements.

---

## 4. Business Rules

### A. Working Days Calculations
Our helper utility `countWorkingDays` in `src/lib/utils/leave.ts` loops from the start date to the end date, incrementing the duration count only if the day of week is not Sunday (0) or Saturday (6).

### B. Provisional Balance Rule
Calculated per active calendar year (Jan 1 to Dec 31):
$$\text{remaining\_balance} = \text{default\_days} - \sum \text{days\_requested} \text{ (where status = 'approved' and start\_date is in current year)}$$

### C. Safe Linking Behavior
- Admin links employees using the unlinked system users list. Uniqueness is enforced at database layer.
- Unlinking sets `user_id` to `null` to suspend portal self-service immediately without destroying accounts.
- Audit events: `EMPLOYEE_LINK`, `EMPLOYEE_UNLINK`, `EMPLOYEE_CREATE`, `EMPLOYEE_UPDATE`, `LEAVE_REQUEST_CREATE`, `LEAVE_REQUEST_APPROVE`, `LEAVE_REQUEST_REJECT`, `LEAVE_TYPE_UPDATE`.

---

## 5. Non-Negotiable Deferred Items for Milestone 3
- Full statutory payroll calculation and automated leave deductions.
- Leave carry-forward balances roll-over engine.
- Public holidays exceptions calendar list (currently only weekends are excluded from leave calculations).
- Overlapping request double-booking collision checking.
- Document management vault for medical/official attachments.
