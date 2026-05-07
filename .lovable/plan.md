## Problem

The published site breaks because components fire Supabase queries before the auth client has fully initialized. In preview (dev mode with HMR), this timing issue is masked.

## Plan

### 1. Add auth-ready gate in App.tsx

Convert `App` from an arrow-function component to a stateful component that calls `supabase.auth.getSession()` once on mount. Until it resolves, render a loading indicator. This ensures no child component mounts or fires queries before the Supabase client is initialized.

```tsx
const [ready, setReady] = useState(false);
useEffect(() => {
  supabase.auth.getSession().then(() => setReady(true));
}, []);
if (!ready) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
```

This uses the **main** supabase client (not adminClient).

### 2. Add retry + retryDelay to all 14 public-data useQuery hooks

In each of these components, add `retry: 2` and `retryDelay: 1000` to the useQuery options so transient failures on first load are retried:

- HeroSection, CoursesSection, GallerySection, FacultySection
- TestimonialsSection, VideosSection, DownloadsSection, MockTestSection
- AIUseCasesSection, AboutSection, AnnouncementTicker
- LifeAtAtecSection, OfferBelt, StatsStrip

### 3. Verify no `enabled: !!user` on public queries

Confirmed: none of these 14 components gate queries on auth state. No changes needed here.

### 4. No React.lazy usage found

No `React.lazy` or dynamic `import()` patterns exist in the codebase, so no Suspense boundaries are needed.

## Files changed

- `src/App.tsx` — add auth-ready gate
- 14 component files — add `retry: 2, retryDelay: 1000` to useQuery
