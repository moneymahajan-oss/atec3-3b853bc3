## Goal

Add two new sections to `src/crm/pages/CrmReports.tsx`:

1. **Total students handled by faculty** — aggregated across all batches (lifetime + active counts per faculty).
2. **Total students studying batch-wise** — live (active) student count per running batch.

## Data sources (no schema changes)

- `crm_batches`: `id, name, faculty_name, status, capacity, course_name_snapshot, start_date, end_date`
- `crm_students`: `id, batch_id, status`

Both queries are aggregations done client-side in JS after one fetch each. Reuses the existing `useEffect` pattern in `CrmReports.tsx`.

## Section 1: Faculty-wise students

Group all `crm_students` by their batch's `faculty_name`. For each faculty:
- **Faculty name**
- **Total batches handled** (distinct batch_ids assigned to that faculty)
- **Total students (lifetime)** — all students ever placed in any of their batches
- **Active students** — `status = 'active'` only
- **Running batches** — count of their batches with `status = 'running'`

Rendered as a sortable table (sorted desc by active students). Skips rows where faculty_name is null/empty (grouped under "Unassigned").

## Section 2: Batch-wise live students

For every batch with `status = 'running'`:
- **Batch name** + course
- **Faculty**
- **Live (active) students** — count where `student.batch_id = batch.id AND status = 'active'`
- **Capacity** with `Live / Capacity` ratio
- **Fill %** with color (amber ≥80%, rose =100%)
- **Schedule/timing** (small text)

Rendered as a table sorted by fill % desc. Click row → navigate to `/crm/batches/:id/report` (already exists).

Both sections are added after the existing "Multi-course students" card, before the expense breakdown.

## Technical details

**File to edit**
- `src/crm/pages/CrmReports.tsx`

**Changes:**
- Add two new state arrays: `batches` and `studentBatchMap` (id → batch_id + status).
- Extend the `useEffect` to fetch `crm_batches` (id, name, faculty_name, status, capacity, course_name_snapshot, schedule, timing) and re-use the existing `allStuds` fetch but include `batch_id` in the select.
- Add `facultyStats` and `liveBatchStats` `useMemo` blocks.
- Add two new `<Card>` blocks rendering the tables (matching existing `Multi-course students` card style).
- Include both sheets in the `exportFullReport` XLSX export ("Faculty load", "Live batches").

**No new files, no migrations, no route changes.**

Approve to implement.