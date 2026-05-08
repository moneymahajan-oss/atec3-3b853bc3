## Problem

The Faculty tile on the admin dashboard currently links to `/crm/faculties`, which lives in the CRM and requires a separate CRM login. From the admin panel itself there is no way to add/edit a faculty profile.

## Fix

Wire the `crm_faculties` table into the existing AdminTable generic editor so faculty profiles can be managed from `/admin/faculties` just like Testimonials, Courses, etc.

### Changes

1. **`src/pages/AdminTable.tsx`**
   - Add `"crm_faculties"` to the `TableName` union.
   - Add a `crm_faculties` entry in the table config with these editable fields:
     - Name (text, required)
     - Designation (text)
     - Specialization (text)
     - Qualifications (textarea)
     - Bio (textarea)
     - Photo URL (text)
     - Experience Years (number)
     - Email (text)
     - Phone (text)
     - LinkedIn URL (text)
     - Instagram URL (text)
     - Joined On (date)
     - Active (boolean)
     - Public on website (boolean)
     - Display Order (number)
   - Slug auto-generates via existing DB trigger, so no field needed.

2. **`src/pages/AdminDashboard.tsx`**
   - Change the Faculty tile to point to `/admin/crm_faculties` (remove the `custom`/CRM redirect) so it opens inside the admin panel.

### Why this works

- RLS on `crm_faculties` allows admins (CRM admin role) to insert/update/delete. The admin panel uses `supabaseAdmin` client with the logged-in admin session — same auth used elsewhere in AdminTable.
- No DB schema change needed; all fields already exist on the table.

### Out of scope

- No changes to the public Faculty section or the existing CRM Faculties page (it stays available for CRM users).
