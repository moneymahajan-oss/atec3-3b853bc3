# Enquiry Module v2 — Public Form, Configurable Fields, WhatsApp Console & Favicon

Scope is strictly: enquiry list, enquiry detail, public `/enquire`, admin enquiry settings, brand favicon. **Students, fees, batches, attendance, courses, certificates, reports, expenses are not touched.**

---

## Part 1 — Database migration

New tables and columns (additive — existing data preserved):

**`crm_enquiry_form_fields`** — drives both public form & CRM form
- `id uuid pk`, `field_key text unique`, `field_label text`
- `show_on_public bool default true`, `required_on_public bool default false`
- `show_in_crm_form bool default true`
- `show_in_list bool default true`, `show_in_export bool default true`
- `dropdown_options jsonb` (null for free text), `sort_order int default 0`
- `is_locked bool default false` (for `lead_stage`, `counsellor`, `internal_notes` rows that can't be turned off public-side)
- Seeded with the 19 rows from your spec (full_name, mobile, whatsapp, email, city, qualification, college_name, class_year, stream, current_status, company_name, designation, course_interested, preferred_mode, preferred_timing, budget_range, how_heard, any_message, lead_stage, counsellor, internal_notes)
- RLS: anon SELECT (needed by public `/enquire`); CRM-admin manage

**`crm_enquiry_report_columns`** — drives list view and Excel export column set/order
- `id uuid pk`, `column_key text unique`, `label text`, `show_in_list bool`, `show_in_export bool`, `sort_order int`
- Seeded with the 26 columns from your spec
- RLS: CRM staff SELECT, admin manage

**`crm_whatsapp_logs`** — already exists, but add columns to support the new flow:
- `triggered_from text` (already covered by existing `entity_type`? — we'll add a dedicated `triggered_from text` column with values `enquiry_panel | catalogue | student_form | website | send_all`)
- Already has `template_key`, `message_snapshot`, `staff_id`, `staff_name`, `entity_type`, `entity_id`, `created_at`, `status` — all reusable. The "WA Sent" column on the list reads from this table filtered by `entity_type='enquiry'`.

**`crm_enquiries`** — add the few missing columns from your spec:
- `whatsapp text` (separate from `phone`), `any_message text`
- All other fields (college_name, class_year, stream, current_status, company_name, designation, preferred_mode, preferred_timing, budget_range, hear_about_us) already exist.
- Add new enum values for `crm_enquiry_source`: `website_enquiry_form`, `website_course_page`, `student_self_fill`, `crm_manual`, `crm_from_catalogue`. Existing `walk_in`, `referral`, `crm_walk_in` stay.

**`crm_institute_settings`** — add columns:
- `favicon_url text`
- `self_fill_form_title text` default `'Enquire Now'`
- `self_fill_form_subtitle text`
- `self_fill_thank_you_message text` default `'Thank you! Our team will contact you shortly.'`

**RLS for public form**: add policy on `crm_enquiries` allowing `anon` INSERT only when `source = 'student_self_fill'` and `name`/`phone` are non-empty. Anon SELECT on `crm_enquiry_form_fields` and `crm_courses` (active only — already present) so the public form can render.

---

## Part 2 — Public `/enquire` page

New file `src/pages/Enquire.tsx`, route added in `App.tsx` (sits outside `/crm`, no auth).

- Loads `crm_institute_settings` (logo, title, subtitle, thank-you, favicon)
- Loads `crm_enquiry_form_fields` where `show_on_public=true`, ordered by `sort_order`
- Loads active `crm_courses` for the Course Interested dropdown
- Renders fields dynamically; required attribute driven by `required_on_public`
- Phone validated to 10 digits, email validated if present (zod schema)
- Submits with `source='student_self_fill'`, `status='new'`, `priority='medium'`
- Shows configurable thank-you screen after success with a "Submit another" button
- Mobile-first layout, branded with institute primary color and logo

---

## Part 3 — Enquiry list page (`CrmEnquiries.tsx`)

Top action bar reflow:
```
[+ New Enquiry] [↑ Import] [↓ Export] [Search] [From date] [To date] [Stage▼] [Source▼] [Course▼] [Counsellor▼] [Reset]
```

- Import/Export buttons inline, always visible. Export uses SheetJS (`xlsx`, already used by CrmImportExport). Export honours both filters AND the `show_in_export` toggle from `crm_enquiry_report_columns`, in the saved column order.
- Date range filters `created_at`. All filters compound.
- Course filter: dropdown of active courses. Counsellor: distinct values from `assigned_to_name`.

New columns inserted between existing ones:
1. **Days Since Enquiry** — computed `Math.floor((now - created_at)/86400000)`. Display "Today" / "1 day ago" / "N days". Badge color: 0–2 green, 3–7 yellow, 8+ red. Sortable.
2. **WA Sent** — left-join most recent `crm_whatsapp_logs` row where `entity_type='enquiry'` AND `entity_id=enquiry.id`. Display `{template_key} · {timeAgo}`; em-dash if none. Color: green today, blue <7 days, grey older.

Source column: prefix each value with the emoji map you provided (🌐 📄 📝 👤 📋 🚶 🎁).

Visible columns and column order are read from `crm_enquiry_report_columns` (only `show_in_list=true`, ordered by `sort_order`).

---

## Part 4 — Enquiry detail page (`CrmEnquiryForm.tsx`)

Below header: subtle grey "Enquiry received N days ago".

**Send via WhatsApp card** (replaces current ad-hoc WA usage) with 8 buttons in a responsive grid. Each button shows emoji, label, and "Last sent: …" derived from `crm_whatsapp_logs` for this enquiry + that template_key.

Behaviour per button:
- Fetch active template from `crm_whatsapp_templates` by `template_key`
- Fill `{variables}` from the enquiry + linked course (name, phone, course name, fee, duration, brochure_url, video_url, instagram_url, institute name/phone/website) using existing `fillTemplate()` from `src/crm/lib/whatsapp.ts`
- Build `https://wa.me/{number}?text=${encodeURIComponent(...)}`, open in new tab
- Insert `crm_whatsapp_logs` row with `template_key`, `message_snapshot`, `entity_type='enquiry'`, `entity_id`, `triggered_from='enquiry_panel'`, `staff_id/name`
- Refresh "last sent" indicator

**Send All Course Info** opens a modal with a numbered list (buttons 2–5). Each row has its own "Open WhatsApp" button — clicking opens that link, logs with `triggered_from='send_all'`, and ticks a green check on that row.

**Course Catalogue Picture** button — beside the Open link, a "Copy Image" button copies the linked course's brochure/thumbnail URL to clipboard (`navigator.clipboard.writeText`) with toast "Image copied — paste in WhatsApp after opening the link".

**Activity Timeline** card under notes: merges 3 sources, sorted by timestamp desc:
- Enquiry creation (🌐 with source label) — from `crm_enquiries.created_at` + `source` + `created_by_name`
- WA sends (📱) — from `crm_whatsapp_logs` filtered by entity
- Notes (📝) — from `crm_enquiry_notes`

Stage-change history requires a tiny addition: when status changes on save, write a `crm_enquiry_notes` row with `note_type='stage_change'` and body `"Stage: {old} → {new}"`. Timeline renders these with the 🔄 icon.

---

## Part 5 — Admin → Enquiry Configuration

New page `src/crm/pages/CrmEnquirySettings.tsx`, route `/crm/enquiry-settings`, sidebar link under Settings group. Admin-only (uses `useCrmAuth`).

Four tabs (shadcn `Tabs`):

1. **Form Fields** — table from `crm_enquiry_form_fields`. Inline editable label (saves on blur). Switches for Public, Required, CRM. "Edit options" button on rows where `dropdown_options` is non-null opens a modal to add/remove/reorder option strings. Locked rows (`is_locked=true`) show greyed switches with a 🔒 icon.

2. **Report Columns** — list from `crm_enquiry_report_columns`. Two switches per row (Show in List, Show in Export). Drag handles (`@dnd-kit/core` if present, else simple up/down arrows) reorder rows; saves `sort_order`.

3. **Self-Fill Form Settings** — fields from `crm_institute_settings`:
   - Public Form URL: read-only `{origin}/enquire` with copy button
   - Form Title, Form Subtitle (textarea), Thank-You Message (textarea)
   - "Preview" button opens `/enquire` in new tab

4. **WhatsApp Templates (Enquiry)** — filtered view of `crm_whatsapp_templates` showing only the 7 enquiry-related keys (`ENQUIRY_WELCOME`, `SEND_BROCHURE_IMAGE`, `COURSE_INFO`, `COURSE_LONG_DETAIL`, `COURSE_MEDIA`, `ENQUIRY_FOLLOWUP_1`, `ENQUIRY_FOLLOWUP_2`). Each has body textarea, variables hint, active toggle, Save, and Preview (renders with sample data). Auto-seed any missing templates with sensible defaults on first visit.

Existing global `CrmWhatsAppTemplates` page remains untouched; this tab is a focused subset for enquiry workflow.

---

## Part 6 — Favicon upload (Brand)

In `CrmSettings.tsx` add a "Brand" section:
- Favicon upload (file input, accept `.ico,.png,.svg`, max 512KB), uploads to existing `crm-course-media` bucket under `branding/favicon-{ts}.{ext}`, stores public URL in `crm_institute_settings.favicon_url`.
- A new hook `useFaviconFromSettings()` reads `favicon_url` and applies via existing `useFavicon()` hook. Mounted once in `App.tsx` so it covers `/`, `/crm/*`, `/enquire`, and any cert verify pages.

---

## Files

**New**:
- `supabase/migrations/<ts>_enquiry_v2.sql` — tables, columns, enum values, RLS, seeds
- `src/pages/Enquire.tsx`
- `src/crm/pages/CrmEnquirySettings.tsx`
- `src/crm/components/SendWhatsAppCard.tsx` (used by enquiry detail)
- `src/crm/components/SendAllModal.tsx`
- `src/crm/components/EnquiryTimeline.tsx`
- `src/hooks/useFaviconFromSettings.tsx`

**Edited**:
- `src/App.tsx` — add `/enquire` and `/crm/enquiry-settings` routes; mount favicon hook
- `src/crm/components/CrmSidebar.tsx` — add "Enquiry Settings" link
- `src/crm/pages/CrmEnquiries.tsx` — new top bar, date filters, Days Since + WA Sent columns, source emojis, Excel export honoring report columns, dynamic columns
- `src/crm/pages/CrmEnquiryForm.tsx` — "received N days ago" line, WhatsApp card, timeline, stage-change note on save
- `src/crm/pages/CrmSettings.tsx` — Brand section with favicon upload

**Untouched**: every student, fee, batch, attendance, course-catalogue, certificate, expense, report file.

---

## Validation

- Phone normalized to 10 digits (zod).
- Public form name ≤ 100 chars, message ≤ 1000.
- All wa.me message text passed through `encodeURIComponent` (handles ₹, *, newlines, emojis — verified in existing `buildWaLink`).
- WA log insert is non-blocking (failure toasts but doesn't block link open).
- New `anon` INSERT policy on `crm_enquiries` is narrow: `source='student_self_fill'` AND `length(name)>0` AND `phone ~ '^\d{10}$'`.

After approval I'll run the migration first, then build the UI in the order: public form → list changes → detail changes → admin settings → favicon.