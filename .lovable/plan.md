## Problem

The current `lovable_full_schema.sql` uses Postgres `COPY ... FROM stdin` blocks for table data (e.g. line 1729). Supabase's web SQL editor (and most non-`psql` runners) cannot process `stdin` data — it parses the first stdin row (`f6e147da-...`) as SQL, producing the `syntax error at or near "f6e147da"` you saw.

## Fix

Regenerate the file so all data is emitted as plain `INSERT` statements (runnable in the Supabase SQL editor), and keep the schema + RLS + storage buckets in one idempotent file.

### Steps

1. Re-run `pg_dump` against the Lovable database with:
   - Schema: `--schema-only --no-owner --no-privileges --schema=public`
   - Data: `--data-only --no-owner --inserts --rows-per-insert=100 --schema=public` (produces `INSERT INTO ... VALUES (...)` — no `COPY/stdin`)
2. Strip non-portable directives: `\restrict`, `\unrestrict`, `SET transaction_timeout`, ownership lines, extension `CREATE` (already handled by Supabase).
3. Prepend a guarded reset block (drop existing `public` objects safely) so the file is re-runnable on the target DB.
4. Append idempotent `storage.buckets` upserts (already in current file — keep).
5. Order: extensions check → enums/types → tables → functions → triggers → RLS enable → policies → indexes → data INSERTs → storage buckets.
6. Write the new file to `/mnt/documents/lovable_full_schema_v2.sql` (keeps v1 for comparison).
7. Quick lint: `grep -nE '^(COPY|\\\\\.|\\\\restrict)' lovable_full_schema_v2.sql` must return nothing.

### Notes

- `auth.users` rows are still excluded (Supabase-managed). After import you'll re-create the admin/CRM users via the Auth UI and update `admin_users.user_id` / `crm_user_roles.user_id` to match.
- Dual login (admin + CRM simultaneously) is already wired via separate `localStorage` keys and unaffected by this migration.
- File will be larger than v1 (INSERTs are more verbose than COPY) but will run cleanly in the Supabase SQL editor.

Approve and I'll generate `lovable_full_schema_v2.sql`.