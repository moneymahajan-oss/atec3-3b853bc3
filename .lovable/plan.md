## Backup Button in Admin Panel

Add a one-click "Backup" action in the Admin Dashboard that produces a downloadable archive of the entire project's data and storage.

### UI

- New tile/button on `src/pages/AdminDashboard.tsx` labeled **"Backup"** (slate color, `Database` icon), placed alongside existing tiles.
- Clicking opens a dialog with:
  - Checkboxes: ☑ Database (all tables as JSON) ☑ Storage files (all 7 buckets) ☑ Auth users list
  - "Start backup" button → shows live progress (table-by-table, bucket-by-bucket counts)
  - On completion: "Download backup.zip" button + last-backup timestamp

### What the backup contains

A single `atec-backup-YYYY-MM-DD-HHmm.zip` containing:

```text
/database/
   <table>.json        ← one file per public table (full rows)
   _manifest.json      ← table list + row counts + schema version
/storage/
   course-documents/...
   gallery/...
   crm-course-media/...
   crm-student-docs/...
   crm-receipts/...
   crm-certificates/...
   crm-faculty-photos/...
   _manifest.json      ← every object: bucket, path, size, mime, public flag
/auth/
   users.json          ← id, email, phone, metadata, created_at (no password hashes — Supabase limitation)
/README.md             ← restore instructions
```

Schema (DDL, RLS, functions, triggers) is **already versioned** in `supabase/migrations/*.sql` in the repo, so the backup focuses on data + files. The README points at the migrations folder for schema restore.

### Technical approach

1. **Edge function** `supabase/functions/admin-backup/index.ts` (admin-only, verify_jwt + `is_admin` check):
   - Uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS
   - Lists all `public.*` tables via `information_schema.tables`
   - Streams each table as JSON (paginated, 1000 rows at a time)
   - Lists every storage object across the 7 buckets
   - Calls `auth.admin.listUsers()` paginated
   - Builds the zip in-memory using `jszip` (or streams via Deno's `compress` if the dataset is large)
   - Returns a signed URL to a temporary `crm-backups` bucket OR streams the zip directly in the response

2. **New private bucket** `crm-backups` (admin-only RLS) to hold the generated archive for 7 days, so large backups don't time out the browser request.

3. **Frontend** calls the edge function, polls progress, then triggers download from the signed URL.

### Caveats shown in the dialog

- Auth password hashes can't be exported (Supabase restriction) — users will need to reset passwords on a restored project.
- Edge-function secrets (`LOVABLE_API_KEY` etc.) must be re-added manually.
- For very large storage buckets (>500 MB), backup may take a few minutes.

### Files to create / modify

- **New:** `supabase/functions/admin-backup/index.ts`
- **New:** `src/pages/AdminBackup.tsx` (dialog + progress UI), or inline modal in dashboard
- **Modified:** `src/pages/AdminDashboard.tsx` — add Backup tile
- **Modified:** `src/App.tsx` — route `/admin/backup` (if separate page)
- **Migration:** create private `crm-backups` bucket + RLS (admins only)

Approve and I'll implement.
