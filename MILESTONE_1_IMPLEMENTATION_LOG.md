# Egypro Onehub — Milestone 1 Implementation Log

This log documents the architecture, database schema, branding decisions, and security constraints implemented for Milestone 1 of the **Egypro Onehub** platform.

---

## 1. Architectural Decisions

1. **Single-Company, Isolated Deployments**:
   - The product is designed as a single-company instance. Every client will receive their own isolated Supabase project and Postgres database, rather than running inside a shared multi-tenant SaaS architecture.
   - All tables exclude `company_id` columns, simplifying RLS policies and querying.
2. **Explicit Profile-to-Employee Separation**:
   - We maintain a strict boundary between:
     - `auth.users`: Core authentication identity managed by Supabase Auth.
     - `public.users`: System user profile defining role access and permissions.
     - `public.employees`: Optional HR employee records containing contract information, positions, banking details, and gross salary parameters.
   - A one-to-one reference links `employees.user_id` to `users.id`, which allows users to see their own payroll/contract metadata.
3. **Database-Enforced Configuration (Single Row)**:
   - Global organization parameters (e.g. name, logo asset path, default currency) are stored in a single-row table named `organization_settings`, secured via a primary key constraint checking `id = true`.
4. **Dynamic Overrides Permission Resolution**:
   - Modules are enabled based on:
     $$\text{effective\_modules} = ( \text{default\_modules} \setminus \{ \text{denied overrides} \} ) \cup \{ \text{granted overrides} \} \cup \{ \text{`'my'`} \}$$
   - Resolves dynamically on both client-side sidebar filters and server-side route guards.

---

## 2. Branding & Palette Choices

Tokens are mapped centrally via CSS variables in [globals.css](file:///Users/jeffadhaya/Documents/Anti%20gravity%20Projects/Egypro%20Onehub/src/app/globals.css):

- **Primary Teal green**: `#0E7C5A` (used in navigation elements, primary buttons, status badges)
- **Secondary Teal accent**: `#4FBFA0` (used for soft highlights and border focus states)
- **Wordmark Steel Navy Blue**: `#17325C` (used for titles, headers, brand texts)
- **Background neutral**: `#FAFAF8` (calm, enterprise-friendly surface tint)
- **Border tint**: `#E4E2DC` (neutral separation lines)

---

## 3. Database Schema Migration

The SQL schema is located at [20260708000000_milestone1_schema.sql](file:///Users/jeffadhaya/Documents/Anti%20gravity%20Projects/Egypro%20Onehub/supabase/migrations/20260708000000_milestone1_schema.sql):

- **Timestamp Updates**: A trigger function `trigger_set_timestamp()` automatically overrides the `updated_at` column to `now()` on every `UPDATE` operation.
- **Active Assignment Uniqueness**: To support historical project assignment records while preventing concurrent active assignments, we enforce uniqueness via a partial unique index:
  ```sql
  CREATE UNIQUE INDEX idx_project_assignments_active_unique 
  ON project_assignments(project_id, user_id) 
  WHERE unassigned_at IS NULL;
  ```
- **Append-Only Auditing**: `public.audit_logs` has no `UPDATE` or `DELETE` policies defined. The `INSERT` policy requires `actor_id = auth.uid()` to prevent identity spoofing.
- **Least-Privilege Projects**: Users can only see projects they are actively assigned to, unless they have administrative oversight roles (`pm`, `cfo`, `md`, `hr_admin`).

---

## 4. Auth & Production Bootstrap

- **Signup Auto-Linking Profile**: A trigger on `auth.users` (`on_auth_user_created`) executes `public.handle_new_user()`, automatically inserting a profile record in `public.users`.
- **First-Time Admin Bootstrap**:
  - When the first user registers, the database detects that `public.users` is empty and automatically promotes them to the `hr_admin` role.
  - Subsequent users default to the `'employee'` role.
  - This allows zero-touch initial setups in production environments without hardcoded seed credentials.

---

## 5. References Reused from Existing Apps

- **AuthContext**: Recycled layout shell check patterns from the older Warehouse Management project, but refactored to check linked employee profiles and resolve overrides.
- **Brand System CSS**: Used colors extracted from the brand logo file (`logo.png`).
- **RLS Anchors**: Reused `auth.uid()` checks in database design for user isolation.

---

## 6. What Was Intentionally NOT Reused

- **Insecure Client Fallbacks**: The old mock fallback database used when Supabase credentials were missing was **completely removed**. The app now fails-fast with a configuration error screen.
- **Multi-Tenant Models**: Any company grouping or shared tenant variables were removed, simplifying database design.
- **Heavy QR/Scanner Libraries**: No external libraries (like `html5-qrcode` or custom camera bindings) were imported to keep the app bundle size optimal.

---

## 7. Known Gaps & Deferred Items

- **Petty Cash Disbursement & Retirement**: Logged as placeholders; logic is deferred to cash flow milestones.
- **Daily Site Progress Reports**: Layout forms exist, but actual backend schema updates are deferred.
- **QR Scanning**: Labeled as "Coming later".
