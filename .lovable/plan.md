
# ATEC Website Full Upgrade Plan

A big-bang rewrite is risky. I'll deliver this in **5 phases** so each part is testable. You approve once — then I execute phase by phase in the same run.

---

## ⚠️ Important clarifications before we start

1. **You currently have TWO databases** — Lovable Cloud (what the live site reads/writes) and your personal Supabase (where you ran the `site_settings` migration). Everything below will be built into **Lovable Cloud** because that's what your app is wired to. Your personal Supabase will continue to drift unless you fully switch the connection (separate decision).
2. **Some tables you asked me to create already exist** in Lovable Cloud:
   - `site_settings` ✅ exists
   - `gallery` → exists as `gallery_items` (will reuse, not duplicate)
   - `testimonials` ✅ exists (but currently has `student_name/photo_url/review_text/rating` — not `youtube_url`. I will **add** `youtube_url` column rather than break existing data.)
   - `youtube_videos` exists → I'll repurpose as `about_videos` OR add a `section` column to differentiate. **Recommendation:** add `section` column (`'about' | 'testimonial'`) so one table covers both.
3. **`leads` table doesn't exist yet** — your prompt references it for syllabus & contact submissions. You currently have `contact_submissions`. I'll create a unified `leads` table with a `source` column and migrate the contact form to it.
4. **Auth currently uses `admin_users` + `is_admin()`** — I'll keep that pattern for all new RLS policies.

---

## Phase 1 — Database schema (1 migration)

Create / alter:

- ✅ `offer_belt` (new)
- ✅ `whatsapp_templates` (new) — seed with `enroll_button`, `syllabus_share`, `contact_form`, `mock_test_result`
- ✅ `mock_tests` (new)
- ✅ `mock_test_results` (new) — public INSERT only
- ✅ `ai_use_cases` (new) — seeded with 6 cards from your prompt
- ✅ `leads` (new, unified) — public INSERT only, admin SELECT
- ✅ `gallery_items` — reuse existing (already has `image_url`, `caption`, `category`, `is_active`)
- ✅ `testimonials` — **ADD** `youtube_url` column (keep existing columns for backward compat)
- ✅ `youtube_videos` — **ADD** `section text default 'about'` column
- ✅ `courses` — **ADD** `syllabus_pdf_url`, `brochure_pdf_url`, `whatsapp_template_key`
- ✅ `site_settings` — **INSERT** all new keys you listed (hero_heading, logo_url, logo_width, whatsapp_number, etc.) — won't overwrite existing keys
- ✅ Storage bucket: `course-documents` (public read) for PDFs
- ✅ Storage bucket: `gallery` (public read) for gallery uploads — already may exist, will check

RLS: public SELECT on content tables, public INSERT on `leads` + `mock_test_results`, admin-only writes everywhere else.

---

## Phase 2 — Public site updates

| Component | Change |
|---|---|
| `index.html` + new `useFavicon` hook | Dynamic favicon from `site_settings.logo_url` |
| **NEW** `OfferBelt.tsx` | Top marquee strip, scrolling messages, color from DB |
| `Navbar.tsx` | Logo image (width/height from DB), institute name from DB, all nav buttons → WhatsApp |
| `HeroSection.tsx` | Heading/subheading/CTA text from `site_settings` |
| `CoursesSection.tsx` | "Enroll" → WhatsApp template; new **"Share Course Details"** button → modal collecting WhatsApp number → saves lead → opens WhatsApp with `syllabus_share` template |
| `AboutSection.tsx` | 4 YouTube embeds from `youtube_videos` where `section='about'` |
| `GallerySection.tsx` | Add **diagonal ribbon caption overlay** (slanted, semi-transparent dark bg, white bold) |
| `TestimonialsSection.tsx` | Switch to YouTube embed grid (uses new `youtube_url` column; falls back to old text testimonials if no URL) |
| **NEW** `AIUseCasesSection.tsx` | 6 cards with icon/title/description/earning badge + "Learn AI at ATEC" WhatsApp CTA |
| **NEW** `MockTestSection.tsx` | Course tabs → name+WhatsApp form → 30-Q timed test → score screen → "Get Result on WhatsApp" |
| `ContactSection.tsx` | Course dropdown from `courses` table; submit saves to `leads` AND opens WhatsApp with `contact_form` template |
| **NEW** `lib/whatsapp.ts` | Helper: `buildWhatsAppLink(templateKey, vars)` — fetches template, substitutes `{course_name}` etc., returns `wa.me` URL |
| `Index.tsx` | New section order: OfferBelt → Navbar → Hero → Stats → Ticker → Courses → About → Life → Testimonials → AI Use Cases → Mock Test → Contact → Footer |

---

## Phase 3 — Admin panel additions

Extend `AdminDashboard.tsx` with new tiles for each new table. The existing `AdminTable.tsx` is generic, so most new tables get free CRUD. Custom editors needed for:

- **Site Content Editor** — friendly key/value form (groups keys: Branding, Hero, Sections, Contact, WhatsApp)
- **WhatsApp Templates Editor** — textarea with variable hint chips
- **Mock Test Manager** — JSON questions builder (form-based, not raw JSON) with add/remove question rows
- **Course editor** — add file upload fields for syllabus & brochure PDFs + dropdown to pick WhatsApp template
- **Gallery Manager** — image upload to storage bucket + caption + category

---

## Phase 4 — SEO & polish

- Install `react-helmet-async`, wrap app, add `<SEO>` component used on each section/page with course-specific meta
- Add `public/robots.txt` with `Disallow: /admin`
- Mobile responsiveness pass on new sections
- Color tokens: ensure `#1E3A8A` (deep blue) and `#F59E0B` (gold) exist in `index.css` design tokens

---

## Phase 5 — Seed data

After tables are created, insert:
- 6 AI use cases
- 4 default WhatsApp templates
- All new `site_settings` keys with sensible defaults (hero_heading = "Avenue To Excellent Careers", whatsapp_number = "917009933289", logo_width = "120", etc.)
- 1 sample offer belt message: "🎉 New Batch Starting Soon — Enroll Today!"

---

## Decisions I need from you (just 2)

1. **Testimonials migration** — keep old text testimonials visible alongside new YouTube ones, OR hide old ones and only show videos going forward?
2. **Mock test questions** — seed with placeholder questions for AI/Tally/Busy/Python/Digital Marketing (5 each so the section isn't empty), OR leave empty and you'll add them yourself via admin?

I'll assume **(1) keep both** and **(2) seed 5 placeholder questions per course** unless you say otherwise — this keeps the site looking complete on day one.

---

## What I will NOT do

- ❌ Touch your personal Supabase account — only Lovable Cloud
- ❌ Delete any existing data
- ❌ Drop existing columns (only ADD new ones)
- ❌ Build a new login system — reuse existing `admin_users` + `is_admin()`

---

**Approve this plan and I'll execute all 5 phases in one continuous run.** Estimated ~15-20 file changes + 1 large migration.
