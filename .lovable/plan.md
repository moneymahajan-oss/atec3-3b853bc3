# Make Enquiries Columns Configurable (incl. Referred By)

## The Problem

The Enquiries page (`/crm/enquiries`) currently renders a **hardcoded** list of columns: Name, Phone, Days, Course, Source, Stage, WA Sent, Follow-up, Actions. The database table `crm_enquiry_report_columns` already has a `show_in_list` flag (and `referred_by` is already set to `show_in_list = true`), but `CrmEnquiries.tsx` ignores it for the on-screen table — it only uses it for Excel export.

That's why "Referred By" doesn't appear even though it's enabled in settings.

## What Will Change

### 1. Render the table from `crm_enquiry_report_columns`
In `src/crm/pages/CrmEnquiries.tsx`:
- Build the `<TableHeader>` columns dynamically from `reportCols.filter(c => c.show_in_list)` ordered by `sort_order`.
- Build each `<TableRow>` cell using a `renderCell(columnKey, enquiry)` helper that maps every `column_key` (name, mobile, whatsapp, email, city, state, qualification, college_name, class_year, stream, current_status, company_name, course, category, preferred_timing, budget_range, source, stage, counsellor, follow_up_date, how_heard, wa_sent, **referred_by**, created_at, days_since, enquiry_id) to the right value with the existing badge/formatting styles.
- Keep the Actions column (Call / WhatsApp / Share Form) pinned at the right — it's not part of the configurable list.

### 2. Add a "Columns" picker on the Enquiries toolbar
- New `<Button variant="outline">` with a Columns icon next to Import/Export.
- Opens a `Popover` (or `DropdownMenu`) listing every row from `crm_enquiry_report_columns` with a checkbox bound to `show_in_list`.
- Toggling a checkbox updates that row in Supabase (`update crm_enquiry_report_columns set show_in_list = ? where id = ?`) and refreshes local state so the table re-renders immediately.
- Includes a small "Reorder hint" link to the full settings page if we add one later.

### 3. Confirm Referred By appears
After the change, since `referred_by` already has `show_in_list = true` and `show_in_export = true` in the DB, it will show up in the table automatically with no further action.

## Files Touched
- `src/crm/pages/CrmEnquiries.tsx` — dynamic header/cells, Columns popover, helper `renderCell`.

## Out of Scope
- Drag-to-reorder columns (sort order stays as-is in DB).
- Per-user column preferences (settings remain global to the institute).
- Changes to the Excel export logic (already honors `show_in_export`).

After this lands you can open Enquiries → click **Columns** → tick/untick anything (Referred By, City, Counsellor, etc.) and the table updates instantly.
