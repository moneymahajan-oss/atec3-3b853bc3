
## Problem

All 13 public-facing section components (HeroSection, GallerySection, CoursesSection, etc.) fetch data using `useEffect([], [])` + `useState`. This means:
- Data is fetched once on mount and never refetched on re-navigation
- No proper loading/error states — components return `null` while data loads, causing whitespace flashes
- After admin edits, the public site shows stale data until a hard refresh

## What's already fine (no changes needed)

- **RLS policies**: All public tables already have correct `SELECT` policies for the `public` role
- **Storage URLs**: No `getSignedUrl()` calls found — all media uses direct public URLs
- **Admin mutations**: AdminTable.tsx already calls `fetchData()` after save/delete (the admin panel itself refreshes correctly)

## Plan: Convert to React Query

Replace the `useEffect + useState` data-fetching pattern with `useQuery` in all 13 section components. Each component gets:
- `useQuery` with `staleTime: 0` so it refetches on every mount
- Proper `isLoading` handling (skeleton or graceful null) instead of rendering empty containers
- Consistent query keys for future cache invalidation

### Files to change (13 components)

| Component | Table | Query Key |
|-----------|-------|-----------|
| `src/components/HeroSection.tsx` | `hero_slides` | `['hero_slides']` |
| `src/components/GallerySection.tsx` | `gallery_items` | `['gallery_items']` |
| `src/components/CoursesSection.tsx` | `courses` | `['courses']` |
| `src/components/FacultySection.tsx` | `crm_faculties` | `['public_faculties']` |
| `src/components/TestimonialsSection.tsx` | `testimonials` | `['testimonials']` |
| `src/components/AIUseCasesSection.tsx` | `ai_use_cases` | `['ai_use_cases']` |
| `src/components/VideosSection.tsx` | `youtube_videos` | `['learn_videos']` |
| `src/components/AboutSection.tsx` | `youtube_videos` | `['about_videos']` |
| `src/components/LifeAtAtecSection.tsx` | `youtube_videos` | `['life_videos']` |
| `src/components/StatsStrip.tsx` | `stats` | `['stats']` |
| `src/components/AnnouncementTicker.tsx` | `announcements` | `['announcements']` |
| `src/components/OfferBelt.tsx` | `offer_belt` | `['offer_belt']` |
| `src/components/DownloadsSection.tsx` | `downloads` | `['downloads']` |

### Pattern for each component

**Before:**
```tsx
const [items, setItems] = useState([]);
useEffect(() => {
  supabase.from("table").select("*").eq("is_active", true)
    .then(({ data }) => setItems(data || []));
}, []);
if (items.length === 0) return null;
```

**After:**
```tsx
import { useQuery } from "@tanstack/react-query";

const { data: items = [], isLoading } = useQuery({
  queryKey: ['table'],
  queryFn: async () => {
    const { data } = await supabase.from("table").select("*").eq("is_active", true);
    return data || [];
  },
  staleTime: 0,
});
if (isLoading || items.length === 0) return null;
```

### MockTestSection special case
`MockTestSection.tsx` also fetches from `mock_tests` but has complex multi-step quiz state — it will also be converted but its additional `useEffect` for the timer will remain.

### What this fixes
1. **Whitespace on second load**: React Query caches data and refetches in background — no blank flash
2. **Stale data after admin edits**: `staleTime: 0` means every navigation triggers a fresh fetch
3. **Loading states**: Components hide gracefully during loading instead of rendering empty containers
