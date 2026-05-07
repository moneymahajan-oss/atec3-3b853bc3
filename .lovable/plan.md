
## Problem

The admin login at `/admin/login` shows **"Database error querying schema"** (500 error). The auth logs confirm:

```
error finding user: sql: Scan error on column index 8, name "email_change": converting NULL to string is unsupported
```

The previous fix addressed `confirmation_token` and other token columns, but missed `email_change`, `phone_change`, and `phone` columns which are also NULL and cause the same crash.

## Fix

Run a single database migration to set ALL potentially NULL string columns on auth.users to empty strings:

```sql
UPDATE auth.users
SET
  email_change = COALESCE(email_change, ''),
  phone_change = COALESCE(phone_change, ''),
  phone = COALESCE(phone, '');
```

This will fix login for both admin (`moneymahajan@gmail.com`) and CRM (`crm@moneymahajan.com`) users.

## Root Cause

The users were created via a raw SQL INSERT into `auth.users` which left several string columns as NULL. GoTrue's Go code expects these to be non-null strings and crashes when scanning NULL values.

## No code changes needed

Only a database migration is required. No frontend or component changes.
