## Goal

Add a WhatsApp action against every student row in the Students list, the Fees list, and the Student Fees detail page, so staff can send a contextual WhatsApp message to that specific student in one click.

## What the user gets

On each row, a green WhatsApp icon button. Clicking it opens a small "Send WhatsApp" dialog showing the student's name + phone and a list of message templates relevant to that section. Picking a template:

1. Fills the template with that student's data (name, course, fee, dues, next due date, receipt no, institute name/phone, etc.)
2. Opens `https://wa.me/<student-phone>?text=...` in a new tab
3. Logs the send into `crm_whatsapp_logs` (entity_type = `student`, entity_id = student.id)

## Where buttons appear

1. **Students list** (`src/crm/pages/CrmStudents.tsx`) — new "Message" column with WhatsApp icon button per row. Templates offered: Welcome / Onboarding, Class Schedule, Generic Follow-up, Document Reminder.
2. **Fees list** (`src/crm/pages/CrmFees.tsx`) — WhatsApp icon next to the "Open" link per row. Templates offered: Fee Reminder (next due), Overdue Notice, Payment Receipt Thanks, Custom Fee Message. Disabled if `due = 0`, except "Thanks for payment".
3. **Student Fees detail** (`src/crm/pages/CrmStudentFees.tsx`) — header-level "WhatsApp" button (replaces/augments existing MessageSquare usage) plus a small WhatsApp icon on each payment row to send that specific receipt's "Payment Received" message, and on each fee plan row to send a reminder for that installment.

## Technical implementation

**New helper**: `src/crm/lib/studentWa.ts`
- `StudentCtx` type (id, full_name, phone, enrolment_no, course_name_snapshot, total_fee, total_paid, due, next_due_date, next_due_amount, last_receipt_no, last_payment_amount).
- `STUDENT_TEMPLATE_KEYS` constant + label map grouped by section (`students`, `fees`, `payment`, `plan`).
- `buildStudentVars(student, institute)` — produces variable dict for `fillTemplate`.
- `sendWhatsAppForStudent({ templateKey, student, institute, triggeredFrom })` — mirrors `sendWhatsAppForEnquiry` in `src/crm/lib/enquiryWa.ts`: loads template from `crm_whatsapp_templates`, fills vars, builds wa.me link, logs to `crm_whatsapp_logs` with `entity_type='student'`.

**New component**: `src/crm/components/StudentWhatsAppButton.tsx`
- Props: `student: StudentCtx`, `section: 'students' | 'fees' | 'plan' | 'payment'`, optional `extraVars`, optional `size/variant`.
- Renders an icon button (green WhatsApp). Clicking opens a `Dialog` listing the templates for that section. Clicking a template calls `sendWhatsAppForStudent` and `window.open(url)`.
- Loads `crm_institute_settings` once via React state.
- `e.stopPropagation()` on the button so it does not trigger the row's navigate-to-detail click.

**Database migration**: Seed new `crm_whatsapp_templates` rows (insert with `ON CONFLICT (template_key) DO NOTHING` so it is safe to re-run). Keys + bodies:

- `STUDENT_WELCOME` — "Hi {name}, welcome to {institute_name}! Your enrolment № is {enrolment_no} for {course_name}. …"
- `STUDENT_CLASS_SCHEDULE` — generic class schedule reminder.
- `STUDENT_DOC_REMINDER` — request pending documents.
- `STUDENT_GENERIC_FOLLOWUP` — "Hi {name}, hope your {course_name} classes are going well…"
- `FEE_REMINDER_DUE` — "Hi {name}, your next fee installment of ₹{next_due_amount} is due on {next_due_date}…"
- `FEE_OVERDUE_NOTICE` — "Hi {name}, your fee of ₹{due_amount} is overdue. Kindly clear at your earliest…"
- `FEE_PAYMENT_THANKS` — "Hi {name}, we have received ₹{last_payment_amount}. Receipt № {last_receipt_no}. Balance ₹{due_amount}."
- `FEE_CUSTOM_BALANCE` — short balance summary message.

Variables list in each template uses the keys produced by `buildStudentVars`. `fillTemplate` already strips unused placeholders/empty lines, so missing optional values stay clean.

**Wiring**:
- `CrmStudents.tsx` — add a final column "Message" rendering `<StudentWhatsAppButton section="students" student={…} />`. Build `StudentCtx` from existing row fields (no extra fetch needed for this page).
- `CrmFees.tsx` — extend the "Manage" cell with the button and pass `section="fees"`. The `Row` type already has `next_due_date`, `next_due_amount`, `total_fee`, `total_paid` → maps directly to `StudentCtx`.
- `CrmStudentFees.tsx` — header action: replace/augment the existing MessageSquare button with `StudentWhatsAppButton section="fees"`. On each payment row, add `section="payment"` button with `extraVars={{ last_receipt_no, last_payment_amount }}`. On each plan row, add `section="plan"` button with `extraVars={{ next_due_amount: plan.amount - plan.amount_paid, next_due_date: plan.due_date, installment_no }}`.

**No schema changes** beyond seeding template rows. RLS already permits CRM staff to read templates and insert WA logs.

## Files touched

- new: `src/crm/lib/studentWa.ts`
- new: `src/crm/components/StudentWhatsAppButton.tsx`
- new: `supabase/migrations/<timestamp>_seed_student_wa_templates.sql`
- edit: `src/crm/pages/CrmStudents.tsx`
- edit: `src/crm/pages/CrmFees.tsx`
- edit: `src/crm/pages/CrmStudentFees.tsx`

## Out of scope

- No bulk-send (one student at a time per click). Bulk is already handled by Campaigns.
- No editing of templates from these dialogs — admins continue to edit them in WhatsApp Templates settings.
