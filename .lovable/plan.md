## Goal

Generate a single, clean SQL migration file that contains **everything** needed to recreate this project's backend (Lovable Cloud / Supabase) inside another Supabase project — without dropping or overwriting any data already in the target.

The output will be a downloadable file at `/mnt/documents/atec_full_migration.sql` plus an optional companion `atec_seed_data.sql` for reference data (settings, report columns, enquiry form fields, SEO meta, expense categories, etc.).

---

## What the migration file will include

1. **Extensions** — `pgcrypto`, `uuid-ossp` (idempotent `CREATE EXTENSION IF NOT EXISTS`).
2. **Custom enum types** — every `USER-DEFINED` type used by the schema (`crm_role`, `crm_enquiry_status`, `crm_enquiry_source`, `crm_enquiry_priority`, `crm_attendance_status`, `crm_batch_status`, `crm_campaign_audience`, `crm_campaign_status`, `crm_course_mode`, `crm_enrolment_status`, `crm_fee_status`, `crm_fee_plan_type`, `crm_payment_mode`, `admin_role`, `announcement_type`, etc.) wrapped in `DO $$ ... EXCEPTION WHEN duplicate_object` blocks so they don't error if they already exist.
3. **Tables** — all `public.*` tables from this project, using `CREATE TABLE IF NOT EXISTS` with full column definitions, defaults, primary keys, unique constraints, and foreign keys. Includes:
   - All `crm_*` tables (students, enrolments, fee_plans, payments, attendance, batches, courses, faculties, certificates, campaigns, enquiries, expenses, audit logs, report-column tables, settings, etc.)
   - Public site tables (`courses`, `announcements`, `ai_use_cases`, `contact_submissions`, `admin_users`)
4. **Indexes** — non-PK indexes used by the app, with `CREATE INDEX IF NOT EXISTS`.
5. **Functions** — every `SECURITY DEFINER` and trigger function listed in this project (e.g. `has_crm_role`, `has_any_crm_role`, `is_admin`, `crm_normalise_phone_value`, `crm_compute_net_payable`, `crm_apply_payment_to_plan`, `generate_crm_*_no`, `crm_flag_overdue_fee_plans`, `crm_get_student_enrolments`, `crm_find_by_phone`, `crm_auto_create_enquiry_for_student`, `update_updated_at_column`, etc.) using `CREATE OR REPLACE FUNCTION`.
6. **Triggers** — all triggers that should fire on insert/update (phone normalisation, net-payable computation, enrolment/receipt/certificate number generation, payment → fee plan sync, auto-enquiry creation, `updated_at` touch). Wrapped with `DROP TRIGGER IF EXISTS … ; CREATE TRIGGER …` so re-runs stay clean.
7. **Row-Level Security** — `ALTER TABLE … ENABLE ROW LEVEL SECURITY` for every table, then each policy recreated via `DROP POLICY IF EXISTS … ; CREATE POLICY …`. Mirrors the exact policies currently in the project.
8. **Storage buckets** — `INSERT … ON CONFLICT (id) DO NOTHING` for: `course-documents`, `gallery`, `crm-course-media`, `crm-student-docs`, `crm-receipts`, `crm-certificates`, `crm-faculty-photos` (with correct `public` flag).
9. **Seed reference data (optional, in companion file)** — default rows that the app expects to exist:
   - `crm_institute_settings` singleton
   - `crm_enquiry_form_fields`
   - `crm_*_report_columns` (student, fee, enquiry, batch, attendance, certificate)
   - `crm_expense_categories`
   - `crm_seo_meta`
   All inserts use `ON CONFLICT DO NOTHING` so existing target data is preserved.

---

## Non-destructive guarantees

- **No `DROP TABLE`, no `TRUNCATE`, no `DELETE`** anywhere in the file.
- All object creation uses `IF NOT EXISTS` / `CREATE OR REPLACE` / `ON CONFLICT DO NOTHING`.
- Enum creation guarded by `DO $$ ... EXCEPTION` blocks.
- Policies dropped-then-recreated only by name on tables we own — safe because policy names are namespaced to this project's tables.
- `auth.*`, `storage.*`, `realtime.*` schemas are **not** modified (only `storage.buckets` rows inserted, which is safe).

---

## What is NOT included (and why)

- **`auth.users` rows** — Supabase manages auth users; they cannot be cloned via SQL across projects. The target project's admins must sign up in the new project, then you insert matching rows into `crm_user_roles` / `admin_users` using their new `auth.uid()`.
- **Existing business data** (students, payments, enquiries, etc.) — the user asked for schema cloning without disturbing the target's existing data. If a data dump is also wanted later, that's a separate `pg_dump --data-only` export.
- **Storage object files** — only bucket definitions are migrated. Actual files in buckets must be copied separately if needed.

---

## How I'll build it (technical)

1. Use `supabase--read_query` (read-only DB access) to dump exact definitions from `information_schema` and `pg_catalog`:
   - `pg_type` + `pg_enum` for enums
   - `information_schema.columns` + `pg_attribute` for table DDL
   - `pg_indexes` for indexes
   - `pg_proc` for function bodies (already partially shown in context)
   - `pg_trigger` for trigger definitions
   - `pg_policies` for RLS policies
   - `storage.buckets` for bucket list
2. Stitch the results into one ordered SQL file in this sequence: extensions → enums → tables → indexes → functions → triggers → RLS enable → policies → storage buckets → (companion) seed data.
3. Write to `/mnt/documents/atec_full_migration.sql` and `/mnt/documents/atec_seed_data.sql`.
4. QA: run the file through `psql --dry-run`-style parsing (load into a scratch schema check) and verify line count + table coverage matches the live schema.

---

## Deliverables

- `atec_full_migration.sql` — schema, functions, triggers, RLS, policies, storage buckets (idempotent, non-destructive).
- `atec_seed_data.sql` — optional reference rows the app expects, all `ON CONFLICT DO NOTHING`.
- Short `README` in the chat reply explaining the run order and the post-import step (creating an admin user in the new project and inserting their `crm_user_roles` row).

---

## Steps for you after import

1. Create a new Supabase project (or use the existing one).
2. Run `atec_full_migration.sql` in the SQL editor.
3. Run `atec_seed_data.sql` if you want default settings / form fields / report columns.
4. Sign up your admin email in the new project's Auth, then run:
   ```sql
   INSERT INTO public.crm_user_roles (user_id, role)
   VALUES ('<new-auth-user-id>', 'admin');
   ```
5. Re-create storage objects (file uploads) manually if you need the old files.

Approve this plan and I'll generate both SQL files and attach them for download.