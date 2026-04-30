## Goal

Add 6 attendance & student-tracking enhancements across the CRM Batches, Attendance, Students and Reports pages.

## Features

### 1. Student-by-student attendance (history view)
- On the Student profile page (`CrmStudentForm`), add an **Attendance** card/tab.
- Lists every `attended_on` row from `crm_attendance` for that student across all batches.
- Shows: Date, Batch, Status badge (present/absent/late/excused), Notes.
- Summary chips: total classes, present, absent, % attendance.
- Filterable by date range and batch.

### 2. Batch working days
- A "working day" = any date for which at least one attendance row exists for that batch (so cancelled/holidays don't count).
- On `CrmBatches` table add a **Working Days** column (count of `DISTINCT attended_on`).
- On `CrmAttendance` page, when a batch is selected show: "Working days so far: N" next to the date picker.
- Add an **"Add holiday / off day"** small action that opens a date input — but instead of a new table, we simply skip; working days remain attendance-driven. (No schema change needed.)

### 3. Batch date-range attendance report
- New page `/crm/batches/:id/report` (linked from the Batches row "Report" button next to Attendance).
- Inputs: From date, To date (defaults: batch start → today).
- Renders a matrix table: rows = students of the batch, columns = each working day in range, cell = P/A/L/E with color.
- Footer row: per-day totals.
- Right side panel per student: total working days, present count, %.
- Export to XLSX button (uses existing `xlsx` lib pattern from `CrmEnquiries`).

### 4. Live number of students in each batch
- On `CrmBatches` page: replace the static "Capacity" column with `Live / Capacity` (e.g. `18 / 30`), where Live = count of `crm_students` where `batch_id = b.id` AND `status = 'active'`.
- Color the cell amber when ≥ 80% full, rose when full.
- On `CrmDashboard`, add a small "Live batches" widget listing running batches with their live count.

### 5. Share attendance report on WhatsApp to students
- On the new Batch Report page, an **"Send to students"** button.
- For each student in the batch with a phone: build a personalized WhatsApp link using a new template `attendance_report` with vars: `{name}`, `{batch}`, `{from}`, `{to}`, `{working_days}`, `{present}`, `{absent}`, `{percent}`.
- Reuse existing `crm/lib/whatsapp.ts` + `crm_whatsapp_logs` logging pattern (same as enquiry/student WA flows already in `enquiryWa.ts` / `studentWa.ts`).
- Two modes: **single student** (button on the student row in the matrix) and **bulk** (sequential `wa.me` link generator with progress, same UX as `SendAllModal`).
- Seed the new template via migration insert.

### 6. List of currently studying (live) students
- On `CrmStudents` page add a quick filter chip "Live only" (filters `status = active` AND `batch.status = 'running'`).
- Add a stat card at the top: **Live students: N** (across all running batches).

### 7. Students who joined more than one course
- New section on `CrmReports` page: **"Multi-course students"**.
- Computed by grouping `crm_students` by normalized phone (last 10 digits) and listing rows where the same phone appears with ≥ 2 distinct `course_id` values.
- Table: Name, Phone, Courses (comma list), Total fees, Total paid, Outstanding.
- Click row → opens first student profile.

## Technical details

**No schema changes required.** All features can be derived from existing tables (`crm_attendance`, `crm_batches`, `crm_students`, `crm_payments`, `crm_whatsapp_logs`, `crm_whatsapp_templates`).

**Files to create**
- `src/crm/pages/CrmBatchReport.tsx` — date-range matrix + WA share
- `src/crm/components/StudentAttendanceCard.tsx` — used in `CrmStudentForm`
- `src/crm/lib/attendanceWa.ts` — builds attendance-report WA links + logs

**Files to edit**
- `src/App.tsx` — add `/crm/batches/:id/report` route
- `src/crm/pages/CrmBatches.tsx` — Live/Capacity column, "Report" button, working days column
- `src/crm/pages/CrmAttendance.tsx` — show working-days count for selected batch
- `src/crm/pages/CrmStudents.tsx` — Live filter + Live stat card
- `src/crm/pages/CrmStudentForm.tsx` — mount `StudentAttendanceCard`
- `src/crm/pages/CrmReports.tsx` — "Multi-course students" section
- `src/crm/pages/CrmDashboard.tsx` — Live batches widget

**Migration (insert-only via insert tool)**
- Insert `attendance_report` row into `crm_whatsapp_templates` with body:
  ```
  Hi {name}, here is your attendance for {batch} ({from} to {to}):
  Working days: {working_days}
  Present: {present}
  Absent: {absent}
  Attendance: {percent}%
  — ATEC Education
  ```

**Performance**
- Batch report: single query `select student_id, attended_on, status from crm_attendance where batch_id=? and attended_on between ? and ?` then build matrix client-side.
- Live counts on Batches list: one aggregate query `select batch_id, count(*) from crm_students where status='active' group by batch_id`.
- Multi-course report: load all `crm_students(id, full_name, phone, course_id, course_name_snapshot, total_fee, net_payable_fee, registration_fee_paid)` and all non-void payments, group in JS by normalized phone.

Approve to implement.