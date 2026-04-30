## Problem

The public enquiry form share-on-WhatsApp action exists, but it is hidden inside individual enquiry detail pages (`/crm/enquiries/:id` → "Send Form Link" button) and inside Enquiry Settings → Self-Fill tab. From the main **Enquiries list page** (`/crm/enquiries`), there is no visible way to:

- Copy the public enquiry form URL (`/enquire`)
- Share the form link on WhatsApp to any number
- Open the public form for a quick preview

So when staff land on the Enquiries panel, the share option appears "missing".

## Fix

Add a **"Share Enquiry Form"** action group at the top of `src/crm/pages/CrmEnquiries.tsx`, right next to the existing `New Enquiry / Import / Export` buttons in the page header.

It will include three small buttons:

1. **Share on WhatsApp** (primary, green)  
   Prompts for a WhatsApp number (with country code) and opens `https://wa.me/<number>?text=...` with a friendly message containing the public form URL (`{origin}/enquire`) and the institute name pulled from `crm_institute_settings`.

2. **Copy Link**  
   Copies `{origin}/enquire` to clipboard with a toast confirmation.

3. **Open Form**  
   Opens `/enquire` in a new tab so staff can preview what the student sees.

Additionally, add the same **"Share on WhatsApp"** quick action to each row in the Enquiries table actions column, so staff can re-send the form link to an existing contact in one click (re-using the already-stored phone number, no prompt needed).

## Technical details

- File edited: `src/crm/pages/CrmEnquiries.tsx`
- Fetch institute name once on mount: `supabase.from("crm_institute_settings").select("name").maybeSingle()`
- Reuse the same message template already used in `CrmEnquiryForm.tsx` (lines 263–271) so wording stays consistent across the app
- Use `Send` and `Link` / `Copy` icons from `lucide-react`
- Use existing `toast` from `sonner` for copy confirmation
- No DB changes, no new routes, no new components needed

## Out of scope

- Changing the public form itself (`/enquire`) — already working
- Editing message text per-staff (already configurable via the message string; can be templated later if requested)
