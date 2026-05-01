## Two bugs to fix together

### Bug A — Students list "Total Fee" shows only one course
For multi-course students (e.g. manav: Tally ₹24,000 + Python ₹5,500), the row shows ₹24,000 instead of ₹29,500. The `paid` and `balance` columns suffer the same issue. Same defect on the `/crm/fees` list and stat cards.

### Bug B — Clicking a student doesn't surface both courses
On the Students list, clicking the row opens the student profile (`CrmStudentForm`) which already has an `EnrolmentsCard`. The user expects both courses to be immediately visible. We need to confirm the profile renders all enrolments (not just the primary `course_name_snapshot`) and make the row click obviously land on the profile with the enrolments section in view.

## Root cause

- `CrmStudents.tsx` reads `total_fee` / `net_payable_fee` straight off `crm_students` (single-course snapshot). It already loads `crm_student_enrolments` into `enrolMap` for the course chips but never aggregates fees from it.
- `CrmFees.tsx` reads `crm_students.total_fee` only — never queries `crm_student_enrolments` at all.
- `CrmStudentForm.tsx` mounts `EnrolmentsCard` (which queries `crm_student_enrolments` correctly), but the page also shows a single "Course / Fee" block at the top sourced from `crm_students` — which can read as "only one course".

## Fix — data/logic only, no redesign

### 1. `src/crm/pages/CrmStudents.tsx`
Add helpers using the existing `enrolMap`:
- `effectiveTotal(s)` = if `enrolMap[s.id]?.length` → sum of `total_fee` across enrolments; else `s.total_fee`.
- `effectiveNet(s)`   = if `enrolMap[s.id]?.length` → sum of `net_payable_fee ?? total_fee`; else `s.net_payable_fee ?? s.total_fee`.

Use these in:
- `valueOf("total_fee" | "net_payable_fee" | "balance")`
- `renderCell("total_fee" | "net_payable_fee" | "balance")`

`paidMap` already aggregates all non-void payments per student → leave as is.

Result: manav row Total Fee = ₹29,500, Balance recomputes correctly.

### 2. `src/crm/pages/CrmFees.tsx`
- Add a 4th parallel fetch of `crm_student_enrolments` (`student_id, total_fee, net_payable_fee`).
- Group by `student_id` into `enrolByStudent`.
- When building each `Row`: `total_fee = enrolByStudent[s.id]?.length ? sum(net_payable_fee ?? total_fee) : s.total_fee`.
- Also concatenate course names: `course_name_snapshot = enrolByStudent[s.id]?.length ? names.join(", ") : s.course_name_snapshot`, so the Course cell shows both names.

This automatically fixes the top stat cards (Total billed, Outstanding) and per-row Total/Due.

### 3. `src/crm/pages/CrmStudentForm.tsx` — make both courses visible on student profile
- Confirm `EnrolmentsCard` is mounted near the top (above the single-course "Course & Fee" block), so the user lands on the profile and immediately sees both course rows.
- In the legacy "Course & Fee" header section, when `enrolMap.length > 1`, replace the single course label with a small "+N courses — see Enrolments below" hint AND render all course names as Badges (re-use `Badge`). Don't remove the section (it still drives the registration/initial enrolment UI), just stop misleading the eye.
- Total Fee shown at the top of the profile must use the same `effectiveTotal` formula (sum of enrolment net fees) when multiple enrolments exist.

(`CrmStudentFees.tsx` is already correct from the previous pass — leave alone.)

### 4. Row click behaviour (Bug B explicit)
The row is already clickable to `/crm/students/:id`. Verify `navigate(\`/crm/students/${s.id}\`)` is wired to the row (not just the action buttons). If not, add an `onClick` on the `<TableRow>` that navigates to the profile, with `cursor-pointer` styling on the row only. Inline action buttons (`StudentWhatsAppButton`, message icon) keep `e.stopPropagation()`.

## Files touched
- `src/crm/pages/CrmStudents.tsx`
- `src/crm/pages/CrmFees.tsx`
- `src/crm/pages/CrmStudentForm.tsx`

## Out of scope
- No SQL or RLS changes — `crm_student_enrolments` already holds everything.
- No layout / colour / typography changes.
- `CrmStudentFees.tsx` already aggregates correctly; not touched.

## Manual verification
1. `/crm/students` → manav row Total Fee = ₹29,500; both course chips visible (already working); single-course students unchanged.
2. Click manav row → profile opens; both courses shown in Enrolments section; header total = ₹29,500.
3. `/crm/fees` → top "Total billed" includes both courses; manav row Total = ₹29,500, Course cell shows "Tally Prime, Python Programming".
4. Export XLSX from Students → Total Fee / Net Payable / Balance reflect summed values.
