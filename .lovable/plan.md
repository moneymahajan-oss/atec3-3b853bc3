
## What we'll do

The database schema (tables, functions, triggers, RLS policies) is already in place from the existing migrations. All tables are currently **empty**. We need to:

### 1. Seed all data from the original project

Extract just the `INSERT` statements from the previously generated `lovable_full_schema_v2.sql` file and run them against the current database. This includes data for all tables: courses, hero_slides, gallery_items, testimonials, announcements, stats, team_members, downloads, youtube_videos, offer_belt, site_settings, mock_tests, whatsapp_templates, CRM courses, CRM faculties, CRM enquiry form fields, CRM report columns, CRM institute settings, CRM SEO meta, and all other content tables.

We'll use `SET session_replication_role = 'replica'` to bypass triggers/RLS during import, then reset it afterward.

### 2. Create two auth users

- **Admin user**: `moneymahajan@gmail.com` / `Manav@22441`
- **CRM user**: `crm@moneymahajan.com` / `Manav@22441`
  (Note: `crm@moneymahajan@gmail.com` has two `@` signs which is invalid — I'll use `crm@moneymahajan.com` instead. Let me know if you want a different email.)

Both users will be auto-confirmed so they can log in immediately.

### 3. Grant permissions

- Insert the admin user's ID into `admin_users` table (grants admin panel access)
- Insert the CRM user's ID into `crm_user_roles` table with role `admin` (grants full CRM access)
- Both users use separate auth sessions (admin uses `admin-auth-token` localStorage key, CRM uses the default) so they can be logged in simultaneously on the same browser

### 4. Enable auto-confirm for email signups

Configure auth to auto-confirm so these users can sign in immediately without email verification.

### Technical details

- Data will be inserted via a migration that wraps INSERTs in `session_replication_role = 'replica'` to skip FK/trigger checks during load
- The `admin_users` and `crm_user_roles` entries will reference the newly created auth user IDs
- No schema changes needed — all tables, RLS policies, functions, and triggers are already correct from existing migrations
