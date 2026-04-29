## Goal
Fix WhatsApp messages sent from the Enquiry panel so the website (and other institute/course fields you've saved in Settings) actually appear in the message.

## Root cause
The active templates in `crm_whatsapp_templates` use placeholders like `{website_link}`, `{phone}`, `{institute_address}`, `{duration}`, `{mode}`, `{concise_syllabus}`, `{brochure_link}`, `{video_link}`.

But `buildVars` in `src/crm/lib/enquiryWa.ts` produces a different set of keys: `institute_website`, `institute_phone`, `course_duration`, `course_mode`, `course_short_syllabus`, `brochure_url`, `video_url` — and never produces `institute_address` at all.

Unknown placeholders are not replaced, then the "strip empty `Label:` lines" pass in `fillTemplate` deletes lines like `🌐 {website_link}` entirely. That's why your website disappears.

## Fix (two parts)

### 1. Extend `buildVars` to provide both old and new aliases
In `src/crm/lib/enquiryWa.ts`, add alias keys so existing templates keep working without manual rewrites:
- `website_link` = institute website
- `phone` = institute phone (fallback to whatsapp_number)
- `institute_address` = institute address (new — load from settings)
- `duration`, `mode`, `concise_syllabus` = course fields
- `brochure_link` = `brochure_url`
- `video_link` = `video_url`

Keep all existing keys (`institute_website`, `course_duration`, etc.) so nothing else breaks.

### 2. Load address from settings
Update `src/crm/pages/CrmEnquiryForm.tsx` (line ~125) to also `select` the `address` column from `crm_institute_settings`, and extend the `InstituteCtx` type in `enquiryWa.ts` to include `address`.

### 3. Improve `fillTemplate` resilience (small safety net)
In `src/crm/lib/whatsapp.ts`'s `fillTemplate`, after variable substitution, also strip any `{...}` placeholders that remain unfilled — and only then run the empty-line cleanup. This prevents future mismatches from leaving raw `{foo}` tokens in messages.

## Files to edit
- `src/crm/lib/enquiryWa.ts` — extend `InstituteCtx` with `address`; add alias keys in `buildVars`.
- `src/crm/pages/CrmEnquiryForm.tsx` — include `address` in the settings select and pass it to `institute`.
- `src/crm/lib/whatsapp.ts` — strip leftover `{placeholders}` before the empty-line cleanup.

## Out of scope
Not rewriting the templates themselves — the alias approach fixes the issue without touching your saved template bodies. You can clean up template wording later from the WhatsApp Templates page if you want.
