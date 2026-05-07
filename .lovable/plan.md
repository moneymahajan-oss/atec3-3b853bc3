## Root Cause Analysis

After auditing the entire data flow, RLS policies, auth clients, and component rendering, I found **three issues** that combine to cause the blank page problem:

### Issue 1: Stale `useSiteSettings` module cache (Primary cause)
`useSiteSettings` uses a **module-level `cache` variable** that persists across client-side navigations. When you:
1. Open the homepage (cache loads)
2. Navigate to `/admin` and edit settings (changes go to DB via `supabaseAdmin`)
3. Click "View Site" to return to `/` (client-side navigation)

The cache is **never refreshed** because it's still populated from step 1. The `loadSettings()` function is only called when `cache === null`, which only happens on a full page reload.

### Issue 2: No Error Boundary
There is **zero error boundary** in the app. If any component throws during rendering (e.g., accessing `.title` on undefined data after an admin deletes a record), the **entire React tree crashes to a white screen** with no recovery.

### Issue 3: Settings key mismatch
The admin panel saves `life_section_heading` but `LifeAtAtecSection` reads `life_at_atec_heading`. Similarly, there's no `life_at_atec_subheading` key - only `about_section_subheading`. These mismatches mean admin edits to these fields have no effect on the public site.

---

## Plan

### 1. Add global Error Boundary
Create an `ErrorBoundary` component wrapping the app in `App.tsx`. This prevents a single component error from crashing the entire page, and shows a friendly "Something went wrong" message with a reload button.

### 2. Fix `useSiteSettings` cache refresh
- Call `refreshSiteSettings()` (which resets cache to null and re-fetches) when navigating from admin to the public site
- Add automatic cache invalidation: set a short TTL (e.g., 60 seconds) on the cache so it re-fetches periodically
- This ensures admin changes are reflected without requiring a hard reload

### 3. Fix settings key mismatches in `LifeAtAtecSection`
- Change `settings.life_at_atec_heading` to `settings.life_section_heading`
- Add `life_at_atec_subheading` key support OR change the component to read `about_section_subheading`

### 4. Make data-fetching components resilient
Add null-safety guards in components like `HeroSection` to handle cases where data properties might be undefined (e.g., when an admin partially deletes or corrupts a record).

---

## Technical Details

**Files to modify:**
- `src/hooks/useSiteSettings.tsx` - Add TTL-based cache invalidation
- `src/components/LifeAtAtecSection.tsx` - Fix settings key names
- `src/App.tsx` - Wrap routes in ErrorBoundary
- `src/components/ErrorBoundary.tsx` - New file
- `src/pages/AdminSiteContent.tsx` - Call `refreshSiteSettings()` after save
- `src/components/HeroSection.tsx` - Add null guards
