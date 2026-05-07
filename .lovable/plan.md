
## Problem

CRM pages (Enquiries, Students, Batches, Courses, Fees, Attendance, etc.) fire Supabase queries immediately on mount via `useEffect(() => { load(); }, [])`. However, the auth session may not be fully restored yet at that point.

All CRM tables have RLS policies requiring `has_any_crm_role(auth.uid())`. When `auth.uid()` is `null` (session not yet restored), every query returns 0 rows — making it look like data is permanently "loading" or empty.

## Root Cause

The `CrmLayout` component checks `useCrmAuth().loading` and shows a spinner until auth is ready. But the child CRM pages mount their `useEffect` hooks immediately once `loading` becomes `false`, which can still race with the Supabase client's internal session restoration.

More critically, many pages use `useEffect(() => { load(); }, [])` with no dependency on the auth state, so if the component mounts before the session token is attached to requests, RLS blocks everything.

## Fix

1. **Create a `useAuthReady` hook** that exposes `{ user, isReady }` — it waits for `supabase.auth.getSession()` to complete before setting `isReady = true`.

2. **Update all CRM pages** that fetch data on mount to:
   - Import `useCrmAuth` (most already do) or `useAuthReady`
   - Add `hasAccess` (or `user`) as a dependency in their `useEffect`
   - Guard the `load()` call with `if (!hasAccess) return`
   - This ensures queries only run after auth is confirmed

Affected pages (at minimum):
- `CrmEnquiries.tsx` — `useEffect` line 177, add `hasAccess` dep
- `CrmStudents.tsx` — `useEffect` line 77, add `hasAccess` dep  
- `CrmBatches.tsx` — `useEffect` line 80, add `hasAccess` dep
- `CrmCourses.tsx` — `useEffect` line 41, add `hasAccess` dep
- `CrmFees.tsx` — `useEffect` line 36, add `hasAccess` dep
- `CrmAttendance.tsx` — `useEffect` lines 45/50, add `hasAccess` dep
- `CrmDashboard.tsx` — already guards with `hasAccess` (good)
- Any other CRM pages with similar patterns

3. **Pattern for each fix:**
```typescript
const { hasAccess } = useCrmAuth();

useEffect(() => {
  if (!hasAccess) return;
  load();
}, [hasAccess]);
```

This is a minimal, non-breaking change — no UI or styling modifications, just ensuring data fetches wait for authentication.
