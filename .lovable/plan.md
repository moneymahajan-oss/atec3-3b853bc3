# Mobile-Number-as-Identity: Duplicate Prevention & Cleanup

## Why
Today, names are free-text so "Manav Mahajan" and "VIJOHN" on the same number `9815122441` create two separate enquiries. There's no dedupe check on enquiry/student creation, and no way to merge. We'll make the **10-digit mobile number** the canonical identity, while keeping the name editable.

## Approach (3 layers)

### Layer 1 — Normalisation (database)
Both `crm_enquiries.phone` and `crm_students.phone` are already stored as 10-digit strings, but not enforced. Add:
- A normalisation trigger on insert/update for both tables that strips non-digits and keeps the **last 10 digits** (also for `whatsapp`, `alt_phone`).
- A non-unique **index** on `phone` for both tables (fast lookups).
- A new helper view `crm_contact_index` that unions enquiries + students by phone, so we can answer "what do we know about this number?" in one query.

We will **not** add a UNIQUE constraint — the same number can legitimately have multiple enquiries (re-enquiry months later, different course interests). Instead we surface duplicates to the user.

### Layer 2 — Live duplicate detection (UI, on entry)
**A) Enquiry form** (`CrmEnquiryForm.tsx`) and **Student form** (`CrmStudentForm.tsx`)
- When the user types a phone number (debounced, after 10 digits), query existing enquiries + students with that phone.
- Show a yellow alert banner above the form:
  > ⚠️ This number already exists:
  > • **Manav Mahajan** — Enquiry (new) — Diploma in Computer App. — created 12 Apr
  > • **Manav Mahajan** — Student (active) — Enrolment ATEC-2026-0007
  >
  > [Open existing] [Continue anyway — this is a different person] [Use this name & merge]

- "Open existing" navigates to that record.
- "Continue anyway" lets them save (genuine new person on shared number — e.g. parent's phone).
- "Use this name & merge" updates the existing record's name to the new one and cancels the new insert.

**B) Public enquiry form** (`Enquire.tsx`) and contact form (`ContactSection.tsx`)
- Silently dedupe: if a `crm_enquiries` row with the same phone exists in the last 30 days **and** same course, **update** it (refresh `updated_at`, append note "Re-submitted on website on …") instead of inserting. Otherwise insert a new enquiry as today. This stops accidental double-submits.

**C) Name fuzzy match warning**
- When a name is typed that closely matches an existing enquiry/student name (Levenshtein ≤ 2 OR same soundex) but on a *different* phone, warn:
  > Similar name exists: "Manav Mahajan" (9815122441) — same person?

### Layer 3 — Duplicates Manager (CRM page)
New page **`/crm/duplicates`** added to the sidebar under Operations.

- **Tab 1: By Phone** — lists every phone that appears in 2+ rows across `crm_enquiries` + `crm_students`. Shows all linked records side-by-side with: name, type (enquiry/student), course, status, created date.
- **Tab 2: By Name** — fuzzy-grouped names (Levenshtein on `lower(trim(name))`) where phones differ — for human review.
- Per group, three actions:
  1. **Merge into one** — pick the canonical record; others' notes/timeline are appended to it; the duplicates are soft-deleted (status `voided`, kept for audit).
  2. **Mark as distinct** — writes to a new `crm_duplicate_exceptions` table so this pair is never flagged again (e.g. confirmed two siblings on the same number).
  3. **Update name** — quick rename without merging.

- Export: "Duplicates report" XLSX.

### Auto-link enquiry → student
When a student is created and there's an existing enquiry with the same phone, auto-set `source_enquiry_id` to that enquiry and set the enquiry's `status='converted'`, `converted_student_id`. (Today this only happens if the staff manually picks the enquiry.)

## Technical details

**New migration:**
- Trigger `crm_normalise_phone()` on `crm_enquiries` and `crm_students` (BEFORE INSERT/UPDATE) — strips non-digits, takes last 10 chars.
- Indexes `idx_crm_enquiries_phone`, `idx_crm_students_phone`.
- New table `crm_duplicate_exceptions(id, key_type text, key_value text, related_ids uuid[], created_by, created_at)` with RLS for CRM admins.
- Helper SQL function `crm_find_contact_by_phone(_phone text)` returning enquiries + students arrays — used by the live dedupe banner.

**New files:**
- `src/crm/pages/CrmDuplicates.tsx` — the manager UI (tabs, merge dialog, export).
- `src/crm/lib/dedupe.ts` — `normalisePhone()`, `findByPhone()`, `mergeRecords()`, `levenshtein()`.
- `src/crm/components/DuplicateAlert.tsx` — reusable banner shown on the two forms.

**Edits:**
- `src/crm/pages/CrmEnquiryForm.tsx` — debounced phone lookup, render `DuplicateAlert`.
- `src/crm/pages/CrmStudentForm.tsx` — same; plus auto-link enquiry on save.
- `src/pages/Enquire.tsx` & `src/components/ContactSection.tsx` — 30-day same-course de-dupe upsert.
- `src/crm/components/CrmSidebar.tsx` — add "Duplicates" link.
- `src/App.tsx` — register `/crm/duplicates` route.

**Cleanup of existing data**
- Migration runs the normaliser once over existing rows (idempotent).
- The Duplicates page lets staff resolve the one current pair (`Manav Mahajan` vs `VIJOHN` on `9815122441`) interactively — no destructive auto-merge.

## What stays the same
- Name remains free-text and editable.
- No UNIQUE constraint on phone — siblings/parents on a shared number still allowed via "Continue anyway" + duplicate-exception entry.
- All existing reports, exports, WhatsApp templates and column-picker work unchanged.
