
# Multiple Courses Per Student — Re-enrolment Without Re-typing

## The problem today
`crm_students` is a **person + one course** record. Mary takes "Tally" today; six months later she wants "Advanced Excel". Right now staff have to either:
- Create a second student row and re-type name, phone, address, parents, photo, ID proof — and she now appears as two "students" (inflating counts, breaking dedupe).
- Overwrite her course → her Tally history (fees, certificate, attendance) gets orphaned or confusing.

The fix: keep **one student per person** (identified by phone, as we just built), and store **each course they take as a separate enrolment**.

## Approach

### 1. New table `crm_student_enrolments`
One row per (student × course). This becomes the unit of truth for fees, batch, attendance, certificate.

```text
crm_student_enrolments
  id, student_id, course_id, course_name_snapshot,
  batch_id, enrolment_no (ATEC-2026-0007),
  enrolment_date, status (active|completed|dropped|on_hold),
  total_fee, discount_amount, discount_reason,
  registration_fee_paid, net_payable_fee (computed),
  source_enquiry_id, notes,
  created_by, created_at, updated_at
```

- Unique enrolment_no per row (the existing trigger moves here).
- The existing fee/attendance/certificate tables get an optional `enrolment_id` column added; old rows keep working via student_id + course_id fallback.

### 2. Migrate existing data (one-off, in the migration)
For every current `crm_students` row with a `course_id`, create a matching `crm_student_enrolments` row carrying over: course, batch, enrolment_no, enrolment_date, total_fee, discount, registration_fee_paid, source_enquiry_id, status. Backfill `enrolment_id` on existing fee_plans / payments / attendance / certificates by matching student_id + course_id. Nothing visible breaks.

### 3. `crm_students` becomes the **person record**
Keep: name, phone, alt_phone, email, dob, gender, address, photo, ID proof, father/mother, emergency contact, qualification, college, hear_about_us, referred_by — all the personal fields.
Deprecate (but keep readable for back-compat): course_id, batch_id, enrolment_no, total_fee, discount_amount, enrolment_date on the student row. New code reads from enrolments; the columns stay so old reports don't break.

### 4. Student form (`CrmStudentForm.tsx`) — two modes
- **New student**: same form as today, but on save it creates 1 student row + 1 enrolment row.
- **Phone already exists** (caught by the `DuplicateAlert` we just built): banner gets a new button **"Add another course for this person"** → opens a slim "Add enrolment" sheet pre-filled with the existing student. Only course, batch, fees, discount, registration paid are asked. Personal fields are not re-entered.

### 5. Student detail page — new "Enrolments" tab
Every student profile gets a tab listing all their courses, each with: course name, batch, enrolment no, dates, fee status, attendance %, certificate. Click an enrolment → drills into fees/attendance for **that** course only. "Add another course" button at the top.

### 6. Where else this shows up
- **Students list** (`CrmStudents.tsx`): one row per **enrolment** by default (so a person who took 2 courses appears twice, once per course — which is correct for batch/course filters). Add a "Group by person" toggle that collapses to one row per phone with course count badge.
- **Fees page**: pick the enrolment (not just the student) when adding a fee plan. If student has only one active enrolment, auto-select it.
- **Attendance**: already batch-driven, so no change needed — batch still maps to one enrolment.
- **Certificates**: issued against an enrolment (so a student can have a Tally cert and an Excel cert separately).
- **Reports / column picker**: existing column keys keep working; add new keys `enrolment_no`, `enrolment_status`, `enrolment_date_per_course`.
- **Auto-link enquiry → student** (built last step): now creates an **enrolment** when the enquiry's course matches a new course; if the person already exists with that exact course already enrolled and active, it just attaches the enquiry as a note instead of duplicating.

### 7. Re-enrolment flow (the main scenario)
1. Staff types phone `9815122441`.
2. `DuplicateAlert` shows: *"Mary Sharma — Student — already enrolled in Tally (active)."*
3. Two buttons: **[Open Mary's profile]** **[Add another course for Mary]**.
4. Clicking the second button opens a 6-field sheet (course, batch, total fee, discount, registration paid, notes) — all personal fields pre-filled & locked.
5. On save: a new `crm_student_enrolments` row is created, a fresh enrolment_no is issued, fees/attendance/certificate now hang off this new enrolment. Mary stays one person.

## Technical bits

**Migration file** creates the table + indexes + RLS (mirror of `crm_students` policies — staff insert/update/select, admin delete) + the enrolment_no trigger moved over + the data backfill + the optional `enrolment_id` columns on the four child tables.

**New / edited files**
- `src/crm/pages/CrmStudentForm.tsx` — split into person form + enrolment form; "Add another course" mode.
- `src/crm/pages/CrmStudents.tsx` — query joins enrolments; add "Group by person" toggle.
- `src/crm/pages/CrmStudentDetail.tsx` *(new — currently we don't have a dedicated detail page, profile lives inside the form; we'll add a proper detail page with tabs: Profile · Enrolments · Fees · Attendance · Documents)*.
- `src/crm/components/DuplicateAlert.tsx` — add the "Add another course for this person" CTA.
- `src/crm/pages/CrmFees.tsx` & `CrmStudentFees.tsx` — let user pick the enrolment.
- `src/crm/pages/CrmCertificates.tsx` — issue against enrolment.
- `src/crm/lib/enrolments.ts` *(new)* — helpers `getActiveEnrolments(studentId)`, `addEnrolment(studentId, payload)`, `getEnrolmentSummary()`.

## What stays the same
- Phone is still the person's identity.
- All existing data keeps working — the migration backfills enrolments so no UI breaks on day one.
- The column-picker / WhatsApp / export systems we just built carry over; they get one new column "Enrolment #".

## What I'll build first vs later
Phase 1 (this round): table + migration + backfill + "Add another course for this person" button on the duplicate alert + student form split + Enrolments tab on the student detail.
Phase 2 (follow-up): wiring fees, certificates, attendance to enrolment_id; "Group by person" toggle on the students list.
