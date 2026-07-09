# Safe QA & Feature Testing Workflow

This directory contains test seed files and workflow guidelines that are kept separate from the production database migrations.

---

## The Production Operating Model

1. **Owner / Support Login**:
   - The primary account `jffkvn@gmail.com` is linked to a real employee profile (`Jeff Adhaya`) with appropriate permissions to onboard employees and manage systems.
2. **Onboarding Real Employees**:
   - Real staff details and contract titles are added directly through the **HR Management** UI panel.
3. **Audit Log Safeguards**:
   - Live transitions are logged within atomic transaction scopes to prevent audit trail bypassing.

---

## How to Test Features with Fake Identities

To prevent data pollution in production, fake user-employee relationships must be set up manually and intentionally.

### Step 1: Create a Test User
Go to your **Supabase Console -> Authentication -> Users** and click **Add User**. Create a clearly designated test account (e.g. `test_user@egypro.com`). Copy the newly generated user **UUID**.

### Step 2: Load the Fake Employees
Apply [dev_only_seed.sql](file:///Users/jeffadhaya/Documents/Anti%20gravity%20Projects/Egypro%20Onehub/supabase/seed/dev_only_seed.sql) to your SQL Editor to insert the unlinked mock employees (`Sarah Namono`, `Joseph Okello`):

```sql
-- Inserts mock profiles unlinked to any user logins
INSERT INTO public.employees (
  user_id, full_name, email, phone, position, department, start_date, status, gross_salary, currency, gender, dob, tax_category
)
VALUES 
  (null, 'Sarah Namono', 'sarah@egypro.com', '+256770000000', 'Project Coordinator', 'Operations', '2026-01-01', 'active', 2200000, 'UGX', 'female', '1995-04-12', 'standard');
```

### Step 3: Link the Test Account
Link the test UUID to your fake employee using the UI (under the **HR Management** grid) or run this query:

```sql
UPDATE public.employees 
SET user_id = '<YOUR_TEST_USER_UUID>' 
WHERE full_name = 'Sarah Namono';
```

### Step 4: Login and Test
Log in to the application as the test user. You will immediately see the **My Workspace** dashboard populate with Sarah Namono's contract cards, leave entitlements, and historical rosters.
