You are executing Milestone 1 for a new unified internal business platform called:

EGYPRO ONEHUB

Branding instructions:

\- The app name must appear as “Egypro Onehub”.

\- Use the provided logo file from the new project workspace as the primary brand asset.

\- Use the visual colors from the logo as the initial brand palette for the product UI.

\- Keep the UI professional, modern, calm, and enterprise-friendly.

\- Do not overdesign. Prioritize clarity, operational usability, and a premium internal product feel.

Logo instruction:

A logo file named something like \`logo.jpg\` will be placed in the new project workspace.

Use it in:

\- login screen

\- sidebar/app shell branding

\- top-level app identity where appropriate

\- favicon/app icon preparation if practical in milestone 1

Color direction from the logo:

\- Primary brand family should come from the teal/green tones in the logo.

\- Secondary/supporting neutral tones should come from the gray/silver tones in the logo.

\- Use the blue tone from the wordmark selectively for emphasis, links, active states, or accents if it fits well.

\- Keep colors consistent and tokenized in the design system.

\- Create semantic tokens, not one-off hardcoded colors.

Important context:

This is a NEW product brand and NEW codebase, not a direct merge of the older apps.

However, you MUST study and reuse architecture patterns, domain logic references, and proven UX ideas from the three existing products on local disk.

Local reference projects:

1\. EquipTrack / Warehouse Management:

'/Users/jeffadhaya/Documents/Anti gravity Projects/Warehouse Management'

2\. JantaHR App:

'/Users/jeffadhaya/Documents/Anti gravity Projects/egypro'

3\. Employee Portal:

'/Users/jeffadhaya/Documents/Anti gravity Projects/egypro-portal'

GitHub references for awareness only:

\- https://github.com/Jffkvn/egyprowarehousemanagement

\- https://github.com/Jffkvn/janthr-egypro-payroll

\- https://github.com/Jffkvn/jantahr-egypro-employee-portal

The new unified product should be created in the new target project directory provided by the user.

Do NOT write changes into the old repositories.

PRIMARY OBJECTIVE:

Build Milestone 1 only.

Do NOT jump ahead into full payroll, inventory operations, project cash workflows, QR scanning, or detailed reports.

Milestone 1 is the secure platform foundation for the future unified system.

OVERALL PRODUCT DIRECTION:

Egypro Onehub will eventually unify:

\- HR / employee management

\- payroll

\- employee self-service

\- inventory / warehouse operations

\- project cash accountability

\- daily project tracking

\- notifications

\- exports

\- auditability

But in this milestone, your job is ONLY to establish:

\- the app shell

\- auth/session foundation

\- role-based navigation

\- user <-> employee linking foundation

\- core Supabase schema foundation

\- projects and project assignment foundation

\- permission resolution foundation

\- baseline RLS-ready backend structure

\- shared component foundation

\- audit scaffolding

\- initial design tokens and branded shell using the logo palette

NON-NEGOTIABLE EXECUTION RULES:

1\. Create a new clean codebase structure for Egypro Onehub. Do not entangle old project routing structures directly.

2\. Reuse proven ideas and selected utilities only where appropriate.

3\. Preserve clean architecture and modular boundaries.

4\. Do not implement fake demo shortcuts unless clearly isolated.

5\. Do not silently fallback to insecure local logic where backend security matters.

6\. Think and build like a senior full-stack engineer creating a product-grade foundation.

7\. Use the existing products as reference systems, not as copy-paste junkyards.

8\. Produce clean, readable, production-minded code.

9\. Keep a running implementation log in markdown inside the project root documenting decisions and files created/changed.

10\. At the end, provide a concise build summary, open issues, and what is ready for review.

11\. Brand the shell as Egypro Onehub using the provided logo and a tokenized palette extracted from or visually matched to the logo.

12\. Do not let branding choices make the interface heavy, flashy, or hard to read.

MILESTONE 1 DELIVERABLES:

A. NEW PRODUCT FOUNDATION

\- A clean Next.js app structure for Egypro Onehub

\- Shared layout shell

\- Role-aware sidebar

\- Top navigation shell

\- Home/dashboard shell

\- Module route placeholders:

/home

/my

/hr

/inventory

/cash

/tracker

/reports

/admin

B. AUTH + IDENTITY FOUNDATION

\- Authentication/session flow foundation

\- User profile model linked to auth user

\- Employee model with optional link to user account

\- Safe user-role bootstrap pattern

\- Clear separation between:

\- auth identity

\- system user

\- employee record

C. ROLE + ACCESS FOUNDATION

Define and seed these default roles:

\- employee

\- coordinator

\- pm

\- warehouse\_manager

\- cfo

\- hr\_admin

\- md

Use roles as default access templates, not the final authority.

Implement per-user module override support.

Core module keys:

\- my

\- hr

\- inventory

\- cash

\- tracker

\- reports

\- admin

Minimum default role-module mapping:

\- employee => my

\- coordinator => my, inventory, cash, tracker

\- pm => my, inventory, cash, tracker, reports

\- warehouse\_manager => my, inventory, reports

\- cfo => my, inventory, cash, tracker, reports, admin

\- hr\_admin => my, hr, reports, admin

\- md => my, hr, inventory, cash, tracker, reports

D. CORE DATA MODEL

Create the core Supabase/Postgres schema foundation for:

\- users

\- employees

\- roles

\- user\_module\_overrides

\- projects

\- project\_assignments

\- audit\_logs

Include:

\- foreign keys

\- timestamps

\- created\_by / updated\_by where appropriate

\- soft-deletion or active/inactive approach where it makes sense

\- enum strategy where appropriate and clean

\- indexes for expected access patterns

E. PROJECT ASSIGNMENT FOUNDATION

Support these assignment concepts:

\- PM assigned to project

\- Coordinator assigned to project

\- project status active/inactive

\- future extensibility for other assignment types

F. PERMISSION RESOLUTION LAYER

Implement a clean server-side utility that resolves effective user access as:

role defaults + user overrides = effective modules

Important:

\- route protection must not rely only on client-side hiding

\- unauthorized route access must redirect or deny safely

\- sidebar rendering must consume effective module permissions

G. RLS-READY STRUCTURE

Set up the schema and code in a way ready for Supabase RLS.

You do not need to finish every final production policy in this milestone, but you must:

\- enable RLS on core tables

\- add baseline sensible policies

\- ensure design supports auth.uid() anchoring

\- avoid insecure tenant/company shortcuts

H. SHARED UI FOUNDATION

Create a shared component base for:

\- App shell

\- Sidebar

\- Topbar

\- Page header

\- Dashboard card

\- Empty state

\- Table shell

\- Drawer/modal shell

\- Role badge

\- Access denied state

\- Loading state

I. HOME/DASHBOARD PLACEHOLDERS BY ROLE

When a user logs in, they should land on a role-aware home view.

It can be placeholder content for now, but it must be role-aware and clean.

Examples:

\- employee: self-service centered

\- coordinator: requests / updates centered

\- pm: team/project visibility centered

\- warehouse\_manager: fulfillment/stock centered

\- cfo: approvals/risk centered

\- hr\_admin: people/payroll centered

\- md: executive oversight centered

J. AUDIT SCAFFOLDING

Implement a basic audit log utility and table writes for:

\- user creation

\- employee creation

\- role assignment

\- module override changes

\- project assignment creation

K. BRAND FOUNDATION

Create a basic design token system for Egypro Onehub:

\- brand primary

\- brand secondary

\- accent

\- background

\- surface

\- border

\- text primary

\- text secondary

\- success

\- warning

\- danger

\- muted

Requirements:

\- base token choices on the provided logo colors

\- keep contrast readable

\- avoid overly saturated dashboards

\- use the palette in sidebar, buttons, active navigation, login screen, badges, and page accents

\- store tokens centrally, not inline across components

L. IMPLEMENTATION LOG

Create a markdown file in the root, e.g.:

MILESTONE\_1\_IMPLEMENTATION\_LOG.md

This file must contain:

\- architecture decisions

\- branding decisions

\- palette decisions

\- references reused from old systems

\- schema created

\- folders created

\- security decisions

\- deferred items for later milestones

QR / SCANNING STATUS FOR NOW

\- QR labels, QR printing, and scan-based workflows are deferred.

\- Show QR-related capability only as disabled/greyed future functionality where relevant.

\- Do not make QR part of the active milestone scope, runtime core, or required dependency path.

\- Do not implement active scanner flows.

\- Do not add QR libraries to the runtime bundle unless isolated and clearly disabled.

\- If referenced in the UI, show them as “Coming later” or a disabled future capability.

REFERENCE ANALYSIS TASK FIRST

Before building, inspect the three local projects and extract:

1\. Auth/session patterns

2\. Supabase structure

3\. Route structure

4\. Role handling

5\. Employee-to-user linking patterns

6\. Shared component patterns worth reusing

7\. Risky patterns that should NOT be carried into the new product

8\. Branding/layout ideas worth learning from, if any

Then document findings briefly in the implementation log before coding major features.

ARCHITECTURE REQUIREMENTS

Use a clean modular structure similar to:

src/

app/

(auth)/

(dashboard)/

home/

my/

hr/

inventory/

cash/

tracker/

reports/

admin/

components/

shell/

shared/

states/

data-display/

modules/

auth/

access/

employees/

projects/

audit/

branding/

lib/

db/

permissions/

supabase/

utils/

config/

types/

You can adapt this if you have a better structure, but keep it modular and scalable.

IMPLEMENTATION CONSTRAINTS

\- Do NOT implement full payroll flows yet.

\- Do NOT implement inventory request lifecycle yet.

\- Do NOT implement QR logic yet.

\- Do NOT implement project cash workflows yet.

\- Do NOT implement daily tracker workflows yet.

\- Do NOT overbuild reports.

\- Do NOT create fake backend behavior that will later be hard to replace.

\- Do NOT hardcode role access deep in components; centralize it.

\- Do NOT mix employee portal assumptions blindly; adapt them into the new unified architecture.

\- Do NOT copy old visual styles blindly; create a cleaner new shell for Egypro Onehub.

SUPABASE / DATABASE EXPECTATIONS

Produce:

\- SQL migration(s) for the new schema

\- seed data for roles and maybe sample minimal dev records

\- helper functions for current user resolution

\- permission utility functions

\- baseline policy notes in implementation log

If RPCs are not yet needed in milestone 1, note where they will later be used.

UX EXPECTATIONS

\- The app shell should already feel like a serious internal product.

\- Navigation should be clean and minimal.

\- Access denied states should be graceful.

\- Placeholder pages should explain the intended future role purpose, not just say “coming soon”.

\- Login and shell branding should visibly feel like Egypro Onehub, without becoming noisy.

\- The logo should be crisp and correctly sized; do not stretch it.

\- Use the logo colors tastefully, not aggressively.

PERFORMANCE AND STABILITY GUARDRAILS

1\. Build for modular loading.

\- Do not load heavy feature code globally.

\- Use route-level and component-level lazy loading where appropriate.

\- Keep dashboard widgets independently loaded instead of one giant blocking query.

2\. Keep critical workflows thin in the frontend.

\- Do not orchestrate sensitive multi-step business operations purely in client code.

\- Design with future RPC / server-side transaction boundaries in mind for payroll finalization, approvals, stock mutations, disbursements, and similar flows.

3\. Avoid over-fetching.

\- Only fetch data needed for the current route and current role.

\- Do not load module data for workspaces the user cannot access.

4\. Keep the app shell light.

\- Shared shell components should be small and reusable.

\- Heavy libraries must not be imported into the global layout unless absolutely required.

5\. Defer hardware-dependent QR functionality.

\- QR generation, label printing, and camera scanning are NOT part of active Milestone 1 implementation.

\- Treat QR as a future feature inspired by the later EquipTrack phase, but disabled for now because the business is not yet ready with scanning/printing equipment.

\- Do not implement active scanner flows.

\- Do not add QR libraries to the runtime bundle yet unless isolated and clearly disabled.

\- If referenced in the UI, show them as disabled/greyed future capabilities with a clear “Coming later” treatment.

6\. Prefer fail-fast behavior over silent fallback.

\- Do not hide backend/data integrity problems with quiet client fallback logic.

\- Surface meaningful errors and keep architecture ready for production-grade enforcement.

7\. Optimize for maintainability first.

\- A stable modular foundation is preferred over premature feature completeness.

\- Avoid patterns that will make Milestones 2-6 harder to scale or debug.

8\. Self-check before finishing.

Ask:

\- Will this architecture still be clean when payroll, inventory, cash, and tracker are added?

\- Are we accidentally making the shell heavy with future-only dependencies?

\- Is any current code likely to become a breaking bottleneck under normal internal usage?

QUALITY BAR

Before finishing, self-check:

\- Is the new product truly separate from the old products?

\- Are we reusing the best ideas without inheriting clutter?

\- Are role defaults and overrides implemented cleanly?

\- Is the foundation secure enough to support later RLS and RPC hardening?

\- Can Milestone 2 start without reworking Milestone 1?

\- Does the shell already feel like Egypro Onehub?

\- Are the logo and color tokens applied tastefully and consistently?

OUTPUT FORMAT AT THE END

Provide:

1\. Summary of what was completed

2\. Files/folders created or changed

3\. Schema summary

4\. Branding summary, including palette decisions

5\. What was reused from the 3 existing apps

6\. What was intentionally NOT reused

7\. Known gaps / deferred items

8\. Exact steps for me to run and review locally

Proceed now.