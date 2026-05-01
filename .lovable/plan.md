# CRM Bug-Fix Audit — 6 fixes, no UI redesign

## Root causes found during audit

### Bug 3 — Budget range (CONFIRMED enum mismatch)
- DB enum `crm_budget_range` = `under_5k, 5k_10k, 10k_20k, 20k_plus, flexible`
- Code `BUDGETS` in `CrmEnquiryForm.tsx` = `under_10k, 10k_25k, 25k_50k, 50k_plus, flexible`
- Only `flexible` matches → every other value is silently rejected by Postgres enum cast → field shows blank after save. Exactly matches the reported symptom.

### Bug 4 — Qualification (CONFIRMED enum mismatch)
- DB enum `crm_qualification` = `class_10, class_12, graduation, post_graduation, diploma, other`
- Code `QUALIFICATIONS` in both `CrmEnquiryForm.tsx` and `CrmStudentForm.tsx` = `below_10th, 10th, 12th, diploma, graduate, post_graduate, other`
- Only `diploma` and `other` match. Same symptom.
- Public `/enquire` page lowercases/strips spaces — also produces values that don't match the enum.

### Bug 1 — Course-section enquiry sync
- `CoursesSection.tsx` already inserts into `crm_enquiries`, but: (a) no error handling, (b) no dedupe, (c) phone not normalised to last-10. RLS public policy requires `phone ~ '^[0-9]{10,15}$'` and a whitelisted source — both already satisfied, but if the user types `+91 …` it becomes 12 digits and may not match what the Enquiries list filters on. Fix by normalising and surfacing failures.

### Bug 2 — WhatsApp on enquiry-form share
- `CrmEnquiries.shareFormViaWhatsApp` opens `wa.me/...` but never calls `logWaSend` so no log row is created and the message body isn't recorded against the contact. `CrmEnquiryForm.tsx` has a "Share form" button at line 279 that does the same.

### Bug 5 — Student profile not showing combined courses
- `EnrolmentsCard` already queries `crm_student_enrolments` correctly and is mounted in `CrmStudentForm`. However on the **Students list** (`CrmStudents.tsx`) the row only reads `course_name_snapshot` from `crm_students` — so a student with 2 enrolments shows only the original course. We will fetch enrolments in bulk and render all course chips per row.

### Bug 6 — Fees view with 2 courses
- `CrmStudentFees.tsx` uses `student.total_fee` for the headline (single course) and the per-course filter is opt-in. With 2 enrolments we must compute totals from `crm_student_enrolments` (sum of `net_payable_fee`) and add a per-course breakdown table.

---

## Fixes

### 1. `src/crm/pages/CrmEnquiryForm.tsx`
- Replace `BUDGETS` array with DB enum values: `["under_5k","5k_10k","10k_20k","20k_plus","flexible"]`
- Replace `QUALIFICATIONS` array with DB enum values: `["class_10","class_12","graduation","post_graduation","diploma","other"]`
- Update display labels via a small `LABELS` map so UI still reads "Below ₹5k", "Class 10", etc. (no layout change).
- Wire the "Share form" button (line ~279) to also call `logWaSend({ template_key: "enquiry_form_share", contact_number, contact_name, message_snapshot, entity_type: "enquiry", entity_id })` after opening `wa.me`.

### 2. `src/crm/pages/CrmStudentForm.tsx`
- Replace `QUALIFICATIONS` with the same DB enum values + labels map.
- Migrate any existing student rows whose `qualification` is one of the legacy strings to the new enum value (data migration below).

### 3. `src/pages/Enquire.tsx`
- Map UI option text to enum values explicitly instead of `lowercase().replace(/\s+/g,"_")`. Provide value→enum lookup tables for `qualification`, `budget_range`, `current_status`, `preferred_timing`, `preferred_mode`. Reject/clear any unknown value before insert.

### 4. `src/components/CoursesSection.tsx` (Bug 1 hardening)
- Normalise phone with `.replace(/\D/g,"").slice(-10)` before insert.
- Wrap insert with error toast so silent RLS rejections are visible.
- Add 30-day same-phone+same-course dedupe (mirrors `Enquire.tsx`) so reshares update an existing row instead of creating duplicates.
- Confirm `source: "website_course_page"` (already whitelisted in RLS).

### 5. `src/crm/pages/CrmEnquiries.tsx` (Bug 2)
- In `shareFormViaWhatsApp`, after `window.open`, call `logWaSend({ template_key: "enquiry_form_share", contact_number: phone, contact_name: greetName, message_snapshot: buildFormMessage(greetName), entity_type: "enquiry", entity_id })`. Validate phone is ≥10 digits before sending; toast on failure.

### 6. `src/crm/pages/CrmStudents.tsx` (Bug 5 — list shows all courses)
- After fetching students, fetch `crm_student_enrolments` for the visible student ids in one query and group by `student_id`.
- In the row's "Course" cell, render all `course_name_snapshot` values as small chips (existing Badge component, no new styling). When only 1, behave as today.
- `valueOf("course")` returns a comma-joined list so exports include all courses.

### 7. `src/crm/pages/CrmStudentFees.tsx` (Bug 6 — combined fees breakdown)
- Compute headline totals from enrolments, not `crm_students.total_fee`:
  - `totalBilled = sum(enrolments.net_payable_fee ?? total_fee)`
  - `totalPaid = sum(non-void payments) + sum(enrolments.registration_fee_paid)`
  - `due = totalBilled − totalPaid`
- Add a new "Per-course breakdown" card above the installment plan, only shown when `enrolments.length > 1`. Columns: Course | Fee | Paid | Balance, with a TOTAL row. Paid per-course = sum of non-void payments where `enrolment_id` matches.
- Keep the existing course filter and installment/payment tables unchanged.

### 8. Data migration (one-shot UPDATEs)
Convert any historical mis-typed text values that were saved before the enum cast started rejecting them. Because Postgres rejected unknown enum values these columns are mostly NULL, but normalize `crm_students.qualification` legacy text values:
```sql
UPDATE public.crm_students SET qualification = 'class_10'        WHERE qualification IN ('10th','below_10th');
UPDATE public.crm_students SET qualification = 'class_12'        WHERE qualification = '12th';
UPDATE public.crm_students SET qualification = 'graduation'      WHERE qualification = 'graduate';
UPDATE public.crm_students SET qualification = 'post_graduation' WHERE qualification = 'post_graduate';
```
(`crm_students.qualification` is a free-text column today, so no enum cast issue — only label normalisation.)

### 9. Silent audit pass
- Grep every `<Select>` in `src/crm` and verify `value={form.x}` matches an enum allowed value. Flag any other mismatches found during the pass; fix in same commit.
- Add a tiny shared helper `src/crm/lib/sendForm.ts` exporting `sendEnquiryFormViaWhatsApp(phone, name?)` so both `CrmEnquiries.tsx` and `CrmEnquiryForm.tsx` use one implementation (validates phone, opens wa.me, logs via `logWaSend`).

---

## Files touched

- `src/crm/pages/CrmEnquiryForm.tsx`
- `src/crm/pages/CrmStudentForm.tsx`
- `src/crm/pages/CrmEnquiries.tsx`
- `src/crm/pages/CrmStudents.tsx`
- `src/crm/pages/CrmStudentFees.tsx`
- `src/pages/Enquire.tsx`
- `src/components/CoursesSection.tsx`
- `src/crm/lib/sendForm.ts` (new)
- one data migration for legacy `qualification` text

## Out of scope
- No visual redesign, no color/layout/typography changes.
- No new tables; existing `crm_student_enrolments`, `crm_fee_plans`, `crm_payments`, `crm_whatsapp_logs` are sufficient.

## Manual verification checklist
1. Save an enquiry with Budget = "₹10k–20k" and Qualification = "Graduation"; reopen — values stay.
2. Submit `/enquire` form with same fields — row in `crm_enquiries` has the enum values.
3. Submit Course-section enquiry — appears in `/crm/enquiries` within seconds; toast on any RLS error.
4. Click "Share Form on WhatsApp" — `crm_whatsapp_logs` gets a row with `template_key='enquiry_form_share'`.
5. Add a 2nd course to a student via "Add another course" — Students list row shows both course chips; Fees page shows breakdown card with two rows + TOTAL matching headline.
