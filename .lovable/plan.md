## Goal

Add a **Faculties** module that's the single source of truth for faculty info across both the CRM and the public website.

- **CRM** gets a new `/crm/faculties` page: list, filter, drill-down with batches & students they handle, date-range filter, KPIs and export.
- **Public website** gets a new "Our Faculty" section on the homepage and a dedicated `/faculty` page, both driven by the same data so any edit in CRM updates the website instantly.

## Data model — one new table

Currently faculty is just a free-text `faculty_name` on `crm_batches`. To synchronise CRM ↔ public site we need a real record per faculty.

**New table `public.crm_faculties`**
- `id uuid pk`
- `name text not null` (matches `crm_batches.faculty_name`)
- `slug text unique` (auto-generated from name, used for `/faculty/:slug`)
- `designation text` (e.g. "Senior Trainer — Tally & GST")
- `qualifications text`
- `specialization text` (short tagline)
- `bio text` (long description, public)
- `photo_url text`
- `email text`, `phone text` (private — CRM-only)
- `experience_years int`
- `joined_on date`
- `linkedin_url text`, `instagram_url text`
- `display_order int default 0`
- `is_active bool default true` (employed / not)
- `is_public bool default true` (show on website)
- `created_at`, `updated_at`

**RLS**
- CRM staff: full read; admins: full write (mirrors `crm_courses`).
- `anon` + `public`: SELECT where `is_active = true AND is_public = true` (mirrors `courses`).

**Linking to existing data**
- Keep `crm_batches.faculty_name` as the join key (no FK change). The CRM Faculties page joins on `name` (case-insensitive). Anything in batches with no matching faculty row is grouped under "Unassigned" — admin can click "Create faculty record" to promote it.
- A small migration-time helper INSERTs a row for each currently-distinct `faculty_name` so nothing disappears on day one.

## CRM page — `/crm/faculties`

**Filters (top bar)**
- Faculty selector (All / specific) — also accepts `?faculty=<slug>` from URL.
- Date range (start / end) — affects batch overlap, student enrolment, and attendance working days.
- Batch status: All / Running / Completed / Planned / Cancelled.
- Search (faculty name).

**View A — All faculties (summary table)**
Columns: Photo + Name • Designation • Total batches • Running batches • Total students (lifetime) • Active students • Working days (in range) • Public on website (toggle) • Actions (View / Edit / Delete).
Click row → switches filter to that faculty (View B).

**View B — Single faculty detail**
- **Header card**: photo, name, designation, specialization, contact (CRM-only), public toggle, "View public profile →" link to `/faculty/:slug`.
- **KPI strip**: Total batches • Running batches • Total students • Active students.
- **Batches table** (filtered by date + status): name, course, schedule/timing, dates, Live/Capacity (with amber ≥80%, rose =100%), working days, status, actions (Mark / Report / Edit).
- **Students table**: name, phone, course, batch, enrolment date, status, action → `/crm/students/:id`.

**Add / Edit faculty dialog** (admin-only): all fields above, photo upload to a new public bucket `crm-faculty-photos` (mirrors the `crm-course-media` pattern).

**Export XLSX**: three sheets — Faculties summary, Batches, Students — respecting current filters.

## Public website

**Homepage section** `<FacultySection />` (added to `src/pages/Index.tsx`):
- Heading "Meet Our Faculty" + subtitle.
- Responsive grid of cards (photo, name, designation, specialization, experience).
- Card click → `/faculty/:slug`.
- "View all faculty →" CTA to `/faculty`.

**Listing page** `/faculty` (`src/pages/FacultyList.tsx`):
- Full grid of all `is_public` faculties, search box, sorted by `display_order` then name.

**Detail page** `/faculty/:slug` (`src/pages/FacultyDetail.tsx`):
- Photo, name, designation, qualifications, experience, bio, specialization, social links.
- "Courses I teach" — derived from distinct `course_name_snapshot` of their batches (no private student/batch data exposed).
- "Enquire about this faculty" CTA → existing `/enquire?faculty=<name>` (prefills `referred_by` field).

**Navbar**: add "Faculty" link between "Courses" and "Gallery" in `src/components/Navbar.tsx`.

**SEO**: add a row to `crm_seo_meta` for `/faculty` so admins can edit title/description from the existing SEO page.

## Sync points with already built sections

- **CrmBatches** (`src/crm/pages/CrmBatches.tsx`): `faculty_name` cell becomes a clickable link → `/crm/faculties?faculty=<slug>`. The faculty dropdown in the batch dialog becomes a Select sourced from `crm_faculties` (free-text fallback preserved for backward compatibility).
- **CrmReports** (`src/crm/pages/CrmReports.tsx`): existing "Faculty workload" card gets a "View full Faculties page →" header link. Logic stays the same (still derived from batch joins) so the numbers stay identical between Reports and Faculties page.
- **CrmSidebar**: new "Faculties" entry under Operations group, icon `UserCog`, between "Batches" and "Attendance".
- **CrmStudents**: an optional "Taught by" column reading the student's batch's faculty_name (read-only).
- **App routes** (`src/App.tsx`): add `/crm/faculties`, `/faculty`, `/faculty/:slug`.

## Technical details

**Migration** (single SQL file):
- Create enum-free `crm_faculties` table + RLS policies + `updated_at` trigger.
- Create storage bucket `crm-faculty-photos` (public read, admin write).
- Seed one row per distinct existing `crm_batches.faculty_name` (auto-slug).

**New files**
- `src/crm/pages/CrmFaculties.tsx` — list + drill-down + filters + export.
- `src/crm/pages/CrmFacultyForm.tsx` — add/edit dialog form (or modal inside the list page; will use modal to match Batches style).
- `src/components/FacultySection.tsx` — homepage grid.
- `src/pages/FacultyList.tsx` — `/faculty` page.
- `src/pages/FacultyDetail.tsx` — `/faculty/:slug` page.

**Edited files**
- `src/App.tsx` — three new routes.
- `src/crm/components/CrmSidebar.tsx` — nav entry.
- `src/crm/pages/CrmBatches.tsx` — clickable faculty cell, faculty Select.
- `src/crm/pages/CrmReports.tsx` — header link.
- `src/pages/Index.tsx` — mount `<FacultySection />`.
- `src/components/Navbar.tsx` — "Faculty" link.

**No changes** to: `crm_batches` schema, existing RLS on other tables, edge functions, auth, or the `enquire` flow (just prefills an existing field).

Approve to implement.