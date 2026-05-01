## Goal

Bring the **same column-picker + admin-managed columns** experience from Enquiries to **Students** (primary ask), and extend the same pattern to other relevant list pages so all sections feel consistent. Also add the missing **Batch + Faculty filters** and a **WhatsApp message button** on every row in the Students list, matching what is shown in the screenshot.

## Where the pattern is reused

Apply the same Enquiries-style "Columns" popover + persistent admin config to:

1. **Students** (`/crm/students`) — primary ask in this message
2. **Batches** (`/crm/batches`)
3. **Fees** (`/crm/fees`)
4. **Attendance** (`/crm/attendance`) — column-picker for the roster table
5. **Certificates** (`/crm/certificates`)

(Faculties, Reports, Dashboard stay as-is — they are aggregate dashboards, not row tables.)

## 1. Students page — full redesign of filters + table

### New filters (above the table)

- Search (existing)
- **Batch** dropdown (new) — all batches, grouped: Running first, then Planned, then Completed
- **Faculty** dropdown (new) — distinct `faculty_name` from `crm_batches` (joined via student.batch_id)
- **Course** dropdown (new) — distinct active courses
- Status (existing, incl. 🟢 Live)
- Joined-date preset + custom range (existing)
- Reset (existing)
- **Columns** popover (new) — same UI as Enquiries
- **Export** button (new) — XLSX of currently-filtered rows using export-flagged columns

### Per-row WhatsApp button

Already present via `StudentWhatsAppButton`. We will:
- Keep it as the right-most action.
- Also add a **direct "Send" icon** that opens `wa.me/<phone>` with a default greeting (mirrors the green ✈ icon shown for enquiries in the screenshot).
- Add a **bulk "Send WhatsApp"** action when multiple students are selected (using existing `SendAllModal`).

### Selectable column set (stored in DB)

Default columns shown out of the box: Photo, Enrolment №, Name, Phone, Course, Batch, Faculty, Joined, Status, Fee.

Full pickable set (toggleable in popover, persisted to DB so it applies team-wide — same model as enquiries):

| key | label | default in list | default in export |
|---|---|---|---|
| photo | Photo | yes | no |
| enrolment_no | Enrolment № | yes | yes |
| full_name | Name | yes | yes |
| phone | Phone | yes | yes |
| alt_phone | Alt Phone | no | yes |
| email | Email | no | yes |
| course | Course | yes | yes |
| batch | Batch | yes | yes |
| faculty | Faculty | yes | yes |
| enrolment_date | Joined | yes | yes |
| status | Status | yes | yes |
| total_fee | Total Fee | yes | yes |
| net_payable_fee | Net Payable | no | yes |
| paid_amount | Paid | no | yes |
| balance | Balance | no | yes |
| city | City | no | yes |
| state | State | no | yes |
| qualification | Qualification | no | yes |
| college_name | College | no | yes |
| referred_by | Referred By | no | yes |
| hear_about_us | How Did You Hear | no | yes |
| father_name | Father Name | no | yes |
| father_phone | Father Phone | no | yes |
| created_at | Created At | no | yes |

## 2. Batches page columns

Pickable: Name, Course, Faculty, Schedule, Timing, Start Date, End Date, Capacity, Enrolled, Seats Left, Status, Created.

## 3. Fees page columns

Pickable: Receipt №, Date, Student, Enrolment №, Course, Batch, Mode, Amount, Discount, Net, Status, Collected By.

## 4. Attendance roster columns

Pickable per-day grid: Photo, Enrolment №, Name, Phone, Present/Absent toggle, Notes, % attendance to date.

## 5. Certificates columns

Pickable: Certificate №, Student, Enrolment №, Course, Batch, Issue Date, Grade, Issued By, Status.

## Technical design

### Database (one shared pattern)

Create one config table per section, mirroring `crm_enquiry_report_columns`:

- `crm_student_report_columns`
- `crm_batch_report_columns`
- `crm_fee_report_columns`
- `crm_attendance_report_columns`
- `crm_certificate_report_columns`

All share the same columns: `id, column_key (unique), label, show_in_list, show_in_export, sort_order, created_at, updated_at`, the same `update_updated_at_column` trigger, and the same RLS policies (admins write, any CRM role reads).

Each table is seeded in the migration with the column rows listed above (sort_order in tens, e.g. 10, 20, 30 so reordering is easy later).

### Shared UI helper

Create `src/crm/components/ColumnPickerPopover.tsx` — the popover already inlined in `CrmEnquiries.tsx`. Refactor `CrmEnquiries.tsx` to use it, then reuse in Students/Batches/Fees/Attendance/Certificates. Props: `cols`, `onToggle(col, next)`.

Create a `useReportColumns(table, defaultCols)` hook that loads + caches columns and exposes `{ cols, visibleCols, exportCols, toggleVisible }`.

### Students page changes (`src/crm/pages/CrmStudents.tsx`)

- Fetch `crm_batches` (id, name, faculty_name, status) once and build a `Map<batchId, {name, faculty_name}>`.
- Pull payment totals via a join/aggregate from `crm_payments` (sum where not void) keyed by `student_id` to compute Paid/Balance only when those columns are visible.
- Add Course/Batch/Faculty filter state; apply in `filtered`.
- Replace hard-coded `<TableHead>`/`<TableCell>` with a `renderCell(key, student)` switch like `CrmEnquiries.renderCell`.
- Add Columns popover, Export button, bulk WhatsApp.
- Keep existing KPIs and 🟢 Live filter.

### Files to create

- `supabase/migrations/<ts>_section_report_columns.sql` — 5 tables + seeds + RLS + trigger.
- `src/crm/components/ColumnPickerPopover.tsx`
- `src/crm/hooks/useReportColumns.ts`

### Files to edit

- `src/crm/pages/CrmStudents.tsx` (major rewrite — filters, picker, dynamic columns, export, bulk WA)
- `src/crm/pages/CrmEnquiries.tsx` (swap inline popover for shared component — no behavior change)
- `src/crm/pages/CrmBatches.tsx` (add picker + dynamic table + faculty filter)
- `src/crm/pages/CrmFees.tsx` (add picker + dynamic table)
- `src/crm/pages/CrmAttendance.tsx` (add picker for roster columns)
- `src/crm/pages/CrmCertificates.tsx` (add picker + dynamic table)

### Out of scope

- No changes to the public website.
- Column **reordering** via drag is not included (sort_order is admin-editable in DB only for now); we can add a UI in a follow-up.
- Per-user column preferences are not included — the picker writes the team-wide default, identical to how Enquiries works today.
