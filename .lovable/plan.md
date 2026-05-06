## Goal
Isolate the admin panel's auth session from the CRM's by giving it a separate Supabase client with a distinct `localStorage` key, so signing in/out of one doesn't affect the other.

## Changes

### 1. New file: `src/integrations/supabase/adminClient.ts`
Mirror of `src/integrations/supabase/client.ts` with two differences:
- Exported name: `supabaseAdmin` (instead of `supabase`)
- `storageKey: 'admin-auth-token'` (instead of `'crm-auth-token'`)

All other options (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `persistSession: true`, `autoRefreshToken: true`, `Database` type) stay identical.

### 2. Update Admin pages in `src/pages/` that directly import the supabase client
Files that currently `import { supabase } from "@/integrations/supabase/client"`:
- `src/pages/AdminDashboard.tsx`
- `src/pages/AdminSiteContent.tsx`
- `src/pages/AdminTable.tsx`

In each, replace:
```ts
import { supabase } from "@/integrations/supabase/client";
```
with:
```ts
import { supabaseAdmin as supabase } from "@/integrations/supabase/adminClient";
```

Aliasing `supabaseAdmin as supabase` keeps every `supabase.from(...)` / `supabase.storage...` call inside the file unchanged — minimal diff, zero behavior change beyond the auth session source.

### 3. Files intentionally NOT changed
- `src/pages/AdminLogin.tsx` — does not import the supabase client directly; it uses `useAuth()`. See note below.
- `src/hooks/useAuth.tsx` — shared hook; changing it would affect non-admin code. Out of scope for this request.

## Caveat to flag
`AdminLogin.tsx` signs in via `useAuth()`, which uses the original `supabase` client (storageKey `crm-auth-token`). After this change, `AdminDashboard` / `AdminSiteContent` / `AdminTable` will read data using a *different* client (`admin-auth-token`) that has no session, so their RLS-protected queries will run unauthenticated and likely return nothing.

If the intent is true session isolation between admin and CRM, `useAuth` (or at least the admin login/session logic) also needs to use `supabaseAdmin`. I'll proceed with exactly what was requested, but recommend a follow-up to route admin auth through `adminClient` as well.