
# ATEC Education CRM — Master Build Plan

## 1. Adapted stack (vs original prompt)

The original prompt specified Next.js 14 + Prisma + PostgreSQL + Cloudinary + Vercel. Lovable cannot build Next.js apps, so we adapt:

| Original | What we'll use |
|---|---|
| Next.js 14 App Router | React 18 + Vite + React Router (already in project) |
| PostgreSQL + Prisma | Lovable Cloud (Supabase Postgres) |
| Cloudinary (docs/images/PDFs/videos) | Supabase Storage buckets |
| NextAuth.js | Supabase Auth (email/password + Google) |
| Resend | Lovable transactional email (built-in) |
| next-seo + next-sitemap | react-helmet-async (already used) + dynamic sitemap edge function |
| Vercel | Lovable hosting |
| SheetJS | `xlsx` package (same library) |
| @react-pdf/renderer | `@react-pdf/renderer` (works in browser) |
| Puppeteer | Not available — PDFs rendered client-side via `@react-pdf/renderer` |
| WhatsApp wa.me links | Same — pure click-to-chat, no API |

Everything else in the spec (modules, fields, templates, workflows, business rules) stays as written.

## 2. Project location

CRM lives inside this same project at the `/crm/*` route prefix:

```
/                        → existing public ATEC website (untouched)
/admin/*                 → existing simple admin (kept as-is for now)
/crm/login               → CRM login
/crm                     → CRM dashboard
/crm/courses             → Course catalogue
/crm/enquiries           → Enquiry / lead management
/crm/students            → Student master
/crm/fees                → Fee collection & reports
/crm/batches             → Batch management
/crm/attendance          → Attendance
/crm/certificates        → Certificate generation
/crm/expenses            → Expenses
/crm/reports             → Reports
/crm/import-export       → Bulk import/export
/crm/whatsapp            → WhatsApp template editor + bulk campaign
/crm/settings            → Institute settings, staff, SEO, etc.
```

The CRM gets its own layout (sidebar + top bar + dark/light), independent of the public site's navbar/footer. The existing Lovable Cloud database is shared.

## 3. Simplified roles (phase 1)

Per your decision, we start with **2 roles only** and grow later:

- `admin` — full access (your owner/manager)
- `counsellor` — enquiries, students, fees collection, send WhatsApp; no settings, no expenses, no delete

Roles are stored in a `crm_user_roles` table (separate from any `profiles` table) with an enum `crm_role`, plus a `has_crm_role()` security-definer function used in all RLS policies. This avoids the recursive-RLS trap and makes adding `super_admin`, `branch_admin`, `accounts`, `faculty`, multi-branch, and 2FA later a non-breaking change.

A basic `crm_audit_logs` table records: who, what action, on which record, when, and a JSON diff snapshot. No IP capture in phase 1 (would need an edge function).

## 4. Build phases (18-week plan compressed into Lovable iterations)

Each phase = one large user-approved build. We do not start the next phase until you've tested the previous one in preview.

### Phase 1 — Foundation (Week 1-2 in your plan)
**Build target: 1 large iteration**
1. CRM auth (email/password + Google), role table, `has_crm_role()` RPC, route guards
2. CRM shell: sidebar nav, top bar, dark/light toggle, global search stub, notifications bell stub, mobile responsive
3. Institute settings table (name, logo, address, phone, WhatsApp number, email, website, GST, UPI ID, fee reminder threshold, referral reward amount) — single row, editable from Settings page
4. **Course Catalogue module** with all fields from spec section 2:
   - Course CRUD with category (Finance/Computer), duration, mode, fee, registration fee, EMI options, concise + detailed syllabus (rich text via Tiptap), brochure PDF upload, promo media (Instagram URL, YouTube URL, fallback video upload), certificate title, active toggle, SEO fields (slug, meta title, meta description, OG image)
   - Pre-populate Finance + Computer courses
   - **"Send to Enquiry" drawer** on every course card → search existing enquiry or enter new mobile → generates COURSE_INFO wa.me link
5. WhatsApp template engine (DB-driven) + `wa.me` link generator helper (with `encodeURIComponent`, conditional line removal for empty optional vars), seeded with COURSE_INFO + ENQUIRY_WELCOME templates
6. Audit log table + helper, used on course writes
7. Storage buckets: `crm-course-media` (public), `crm-student-docs` (private), `crm-receipts` (private), `crm-certificates` (public for QR verification)

### Phase 2 — Enquiry & Student Master + WhatsApp library (Week 3-4)
1. Full WhatsApp template editor at `/crm/whatsapp` — admin can edit/toggle/add all templates from spec
2. Seed all 16 templates from the spec
3. **Enquiry module** with all fields, lead stages, follow-up dates, **internal notes (append-only, lock-icon styling, never sent)**, action panel (welcome / course info / follow-up / convert / schedule), enquiry timeline
4. **Student master** — Student ID auto (ATEC-YYYY-XXXXX), all profile fields, photo upload (passport crop), document uploads to `/atec/{student_id}/{doc_type}/`, multi-document support, referral link, **internal admission notes (same lock-icon treatment)**, multi-course enrollment with discount + reason + EMI schedule
5. WhatsApp message log (`crm_whatsapp_logs`) — every wa.me link generation is logged with template, contact, staff, timestamp, status (`link_generated` → `marked_sent`)
6. Student timeline view aggregating WA logs + notes + enrollments

### Phase 3 — Fees + Batches + Attendance (Week 5-6)
1. Fee payment recording, mode tracking, auto receipt number (`ATEC-RCP-YYYYMM-XXXX`), receipt PDF generation client-side via `@react-pdf/renderer`, share-via-WA button
2. Outstanding balance auto-calc, overdue flag (configurable threshold), void payment with reason (audit trail)
3. **Batch management** — batch CRUD, faculty assignment, seats, students list, attendance %, batch-wise collection summary, promote student, mark-complete trigger
4. **Attendance** — daily marking per batch, % auto-calc, low-attendance flag (<75%), manual LOW_ATTENDANCE_ALERT button per student
5. Daily/monthly collection reports, outstanding dues, payment-mode breakup

### Phase 4 — Import/Export + Reports + Expenses (Week 7-8)
1. **Excel import** for: Students, Enquiries, Fee Payments, Attendance, Expenses, Courses
   - Use `xlsx` npm package, all parsing client-side, validate row-by-row (Zod schemas), show error list with row numbers, allow partial commit, download error rows as separate Excel
   - Duplicate detection by mobile (10-digit normalize)
   - Downloadable template files (pre-formatted, header rows, sample data, dropdowns where supported)
2. **Excel export** on every list view with current filters applied (timestamp in filename)
3. **Expenses module** — full CRUD, category management (admin-configurable), bill scan upload, monthly summary, P&L view (collection − expenses)
4. **Reports module** — all 16 reports from spec section 12, with date range / course / category filters, PDF + Excel export

### Phase 5 — Certificates + SEO + Alumni/Campaign + Polish (Week 9-10)
1. **Certificate module** — Certificate ID auto (`ATEC-CERT-[FIN/COM]-YYYY-XXXXX`), per-category template (Finance/Computer) with director signature image + institute seal, generate PDF, QR code linking to `/verify/{cert_id}` public route showing only name + course + date
2. Public certificate verification page (no auth)
3. **Alumni/Campaign module** — bulk WA campaign mode: select template + segment (course / category / batch / completed / enquiry stage / city) → paginated list of pre-filled wa.me links → "Open WhatsApp" + "Mark as Sent" per row → export campaign list as Excel
4. Referral code auto-generation (first 4 letters of name uppercase + last 4 digits of mobile), referral reward tracking (Pending / Paid / N/A)
5. **SEO module** — per-page meta editor (for the public website pages), dynamic sitemap.xml via edge function, robots.txt editor (stored in DB, served by edge function), 301 redirect manager, JSON-LD Course schema injection
6. Notifications bell (in-app) for: overdue fees, low attendance, upcoming batches, new enquiries
7. Global search across Student ID / name / mobile / certificate ID
8. Dark/light mode finalization, keyboard shortcuts, mobile field-counsellor view polish
9. Daily DB export (manual download from settings; true automated S3/Drive backup is out of Lovable's scope and will be documented for the user)

## 5. Database schema (phase-by-phase)

### Phase 1 tables
- `crm_user_roles` (id, user_id, role enum, created_at) — RLS via `has_crm_role()`
- `crm_audit_logs` (id, user_id, action, entity, entity_id, diff jsonb, created_at)
- `crm_institute_settings` (single row: name, logo_url, address, phone, whatsapp_number, email, website, gst, upi_id, fee_reminder_days, referral_reward, receipt_header, receipt_footer, certificate_template_finance, certificate_template_computer)
- `crm_courses` (id, name, category enum [finance|computer], duration, mode enum, total_fee, registration_fee, emi_options jsonb, concise_syllabus, detailed_syllabus_html, brochure_url, instagram_url, youtube_url, video_url, certificate_title, is_active, slug, meta_title, meta_description, og_image_url, created_at, updated_at)
- `crm_whatsapp_templates` (id, key, name, body, variables jsonb, is_active, created_at, updated_at) — note: project already has a `whatsapp_templates` table for the public site; we'll keep these separate under a `crm_` prefix to avoid collisions
- `crm_whatsapp_logs` (id, template_key, contact_number, contact_name, message_snapshot, entity_type, entity_id, status enum [link_generated|marked_sent], staff_id, created_at)

### Phase 2-5 tables (planned, built when each phase starts)
`crm_enquiries`, `crm_enquiry_notes`, `crm_students`, `crm_admission_notes`, `crm_student_documents`, `crm_enrollments`, `crm_fee_payments`, `crm_fee_installments`, `crm_batches`, `crm_batch_students`, `crm_attendance`, `crm_certificates`, `crm_expenses`, `crm_expense_categories`, `crm_referrals`, `crm_seo_pages`, `crm_redirects`, `crm_import_logs`, `crm_export_logs`, `crm_notifications`, `crm_staff` (extends `crm_user_roles` with display name, branch placeholder for future).

**Critical security rule (carried from your spec rule #1):** `crm_enquiry_notes` and `crm_admission_notes` have RLS that only allows `admin` or `counsellor` roles to SELECT, and they are never joined into any RPC or view that builds WhatsApp messages. The wa.me link builder is a frontend helper that only ever sees `crm_whatsapp_templates` + the entity record — notes are fetched via a separate query on the notes page only.

## 6. Technical decisions to flag

- **PDF generation**: Puppeteer is not available in Lovable's edge runtime. Receipts and certificates render client-side with `@react-pdf/renderer`, which is well-supported and produces professional output. The certificate QR is generated with `qrcode` npm package and embedded in the PDF.
- **Rich text editor for detailed syllabus**: Tiptap (already commonly used with shadcn). Stored as HTML.
- **Excel**: `xlsx` (SheetJS community edition) for both import and export, all client-side.
- **Image cropping (passport photos)**: `react-easy-crop` + canvas, output uploaded to Storage.
- **Bulk WA campaign**: paginated list view; for very large lists (>500 contacts) we paginate to avoid browser hangs. Each row is a button that opens `wa.me/...` in a new tab.
- **Daily DB backup automation**: Lovable doesn't run cron jobs to S3. We provide a one-click "Download full DB export" in Settings (uses Supabase functions to dump key tables as a single zip of CSVs). Scheduled off-site backup is documented as a future Supabase pg_cron + edge function setup.
- **2FA, multi-branch, full 5-role matrix, IP logging**: deferred to a later phase; the schema has placeholders so it's an additive change.
- **Lovable AI**: not used in phase 1. Could be added later (e.g. summarize enquiry history, draft custom WA message), but not in spec.

## 7. What we'll build right now if you approve

Approving this plan switches Lovable into build mode. The **first build** will deliver Phase 1 only:

1. Two-role CRM auth at `/crm/login` with Google + email/password
2. CRM layout shell with sidebar (Dashboard, Courses, Enquiries [stub], Students [stub], Fees [stub], Batches [stub], WhatsApp Templates, Settings) and dark/light toggle
3. Institute Settings page (fully functional)
4. Course Catalogue page (fully functional CRUD + media + Send-to-Enquiry drawer + 17 pre-seeded courses)
5. WhatsApp Templates page seeded with COURSE_INFO + ENQUIRY_WELCOME, with editor
6. Storage buckets, RLS policies, audit logging on course writes
7. Public CRM separation: existing `/`, `/admin/*` routes untouched

Stub pages will say "Coming in Phase 2" with a link to this plan, so the sidebar already shows the full IA.

After you test Phase 1 in preview, send "build phase 2" (or similar) and we move on. Each subsequent phase is a fresh, focused build — that's how we keep changes reviewable and avoid breaking what already works.
