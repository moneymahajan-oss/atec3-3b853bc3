## Goal

1. Guarantee that **every** student created in the CRM (direct entry, import, or any other path) also appears in the Enquiry panel.
2. Make the **photo upload** in the Student form clearly visible, with preview, replace, and remove controls.

## Current state (what already exists)

- DB trigger `trg_crm_students_auto_enquiry` already auto-creates a `crm_enquiries` row (source = `crm_walk_in`, status = `converted`) whenever a student is inserted without a `source_enquiry_id`. ✅
- A photo file input already exists in `CrmStudentForm.tsx` (Documents card, right column). ⚠ Functional but minimal.

## Gaps to fix

### A. Enquiry sync — make it bullet-proof and visible

1. **Migration — harden the trigger** in `crm_auto_create_enquiry_for_student()`:
   - Run `BEFORE INSERT` (already) AND also handle `UPDATE` when a student gets created without `source_enquiry_id` later.
   - Catch exceptions so a failure to create the enquiry never blocks the student insert (log a warning instead).
   - Ensure `phone` is normalized to last 10 digits before insert (matches the public-form RLS regex pattern used elsewhere).

2. **Backfill** any existing students missing `source_enquiry_id`:
   ```sql
   -- run in migration: for each student with NULL source_enquiry_id, insert a matching enquiry and link it
   ```

3. **Enquiry list filter** (`src/crm/pages/CrmEnquiries.tsx`):
   - Add `crm_walk_in` to the Source filter dropdown options so direct-entry enquiries are easy to find.
   - Add a small "Auto from student" badge next to the source icon when `source = 'crm_walk_in'` and `converted_student_id IS NOT NULL`.

4. **CSV/Excel import path** (`src/crm/pages/CrmImportExport.tsx`): no code change needed — the DB trigger covers it automatically. Add a one-line note in the import success toast: "Enquiry records auto-created for each student."

### B. Photo upload — better UX

In `src/crm/pages/CrmStudentForm.tsx` Documents card:

- Move the **Photo** block to the **top** of the right column and make it more prominent (rounded avatar preview ~ 128px, dashed drop area, camera icon).
- Add three controls:
  - **Upload / Replace** (file input, also accepts camera capture on mobile via `capture="user"`).
  - **Remove photo** button (clears `photo_url`).
  - File-size guard: reject > 5 MB, accept only `image/jpeg`, `image/png`, `image/webp`.
- Show inline error if upload fails; show success toast.
- Use the public bucket `crm-course-media` under path `students/photos/<studentId-or-uuid>/<timestamp>.<ext>` (already public, so the URL works in lists, certificates, receipts).
- Display the photo thumbnail in the **Students list** (`CrmStudents.tsx`) next to the name (small avatar, falls back to initials).

## Technical details

**Files to edit**
- `supabase/migrations/<new>.sql` — update trigger function + backfill.
- `src/crm/pages/CrmStudentForm.tsx` — refined Photo card with preview, validation, replace, remove, mobile camera capture.
- `src/crm/pages/CrmEnquiries.tsx` — add `crm_walk_in` to Source filter; "Auto from student" hint.
- `src/crm/pages/CrmStudents.tsx` — small avatar column using `photo_url`.

**No new tables, no new buckets.** Uses existing `crm-course-media` (public) and existing schema columns (`crm_students.photo_url`, `crm_students.source_enquiry_id`, `crm_enquiries.converted_student_id`).

## Out of scope

- Cropping / image editing (kept simple — replace to change).
- Changing the existing trigger's enquiry source value (`crm_walk_in`) — it stays so historical filters keep working.

Approve to implement.