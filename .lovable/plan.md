
## Goal

When sharing a course (from CRM Enquiry panel, CRM Courses page, or website), the WhatsApp message should:

1. **Show a preview image** for the brochure (PDF) — not just a raw PDF URL.
2. **Show a video thumbnail** instead of a bare YouTube/video URL.
3. **Use short, course-named links** (e.g. `https://atec.../c/tally-prime`) instead of long Supabase storage URLs.

WhatsApp auto-renders a rich preview card (image + title + description) for any link whose page returns proper Open Graph meta tags. We'll use that mechanism rather than uploading raw images/PDFs.

---

## What will change

### 1. New public course landing page — `src/pages/CoursePublic.tsx`
- Route: `/c/:slug` (added in `src/App.tsx`).
- Loads course from `crm_courses` by `slug`.
- Renders course name, image (`og_image_url` or generated thumbnail), short syllabus, fee, duration, "Download Brochure" (links to `brochure_url`), "Watch Video" (embeds YouTube), and an Enquire button → `/enquire?course=<slug>`.
- **Outputs OG meta tags** via `SEO` component:
  - `og:title` = course name
  - `og:description` = concise syllabus (first 160 chars)
  - `og:image` = `og_image_url` OR auto-derived YouTube thumbnail (`https://img.youtube.com/vi/<id>/maxresdefault.jpg`) OR a default course banner.
  - `og:type` = website
- This is what makes WhatsApp render an image card when the link is shared.

### 2. New helper — `src/lib/courseLinks.ts`
- `coursePublicUrl(slug)` → `${origin}/c/${slug}` (short, human-readable).
- `youtubeThumb(url)` → extracts video ID, returns `https://img.youtube.com/vi/<id>/hqdefault.jpg`.
- `brochureShareUrl(slug)` → uses `/c/${slug}#brochure` so WhatsApp shows the OG image card; the brochure PDF is downloadable from that page.
- `videoShareUrl(slug)` → `/c/${slug}#video`.

### 3. Update WhatsApp templates (DB migration)
Replace raw `{brochure_url}` / `{video_url}` placeholders with new short-link placeholders that point to the public course page so WhatsApp generates a rich preview:

- `SEND_BROCHURE_IMAGE.body` → use `{brochure_share_link}` (which is `/c/<slug>`) so the message shows a card with the course image + title.
- `COURSE_MEDIA.body` → use `{video_share_link}` (also `/c/<slug>`) — WhatsApp will render the YouTube thumbnail via OG tags.
- `COURSE_INFO.body` → replace `{brochure_link}` and `{video_link}` with the short `{course_share_link}` so a single image-card preview is shown.

Migration also adds an alias on the templates so old keys still resolve.

### 4. Wire new vars into builders
- `src/crm/lib/enquiryWa.ts` → in `buildVars`, add:
  - `course_share_link` = `coursePublicUrl(course.slug)`
  - `brochure_share_link` = same (anchor `#brochure`)
  - `video_share_link` = same (anchor `#video`)
  - Keep old `brochure_url` / `video_url` working for backward compat.
- Update `CourseCtx` to include `slug`, and update the SELECT in `SendWhatsAppCard` / `SendAllModal` / `CrmEnquiryForm` queries to fetch `slug`.
- `src/crm/components/SendCourseDrawer.tsx` → fetch `slug`, add `course_share_link` to template vars.
- `src/components/CoursesSection.tsx` (website "Share Course Details") → use `coursePublicUrl(course.slug)` in the `syllabus_share` template vars instead of raw `syllabus_pdf_url` / `brochure_pdf_url`. Also update the public `whatsapp_templates.syllabus_share` body.

### 5. Backfill `og_image_url` where missing
- For courses with a `youtube_url` but no `og_image_url`, the public page falls back to the YouTube thumbnail at runtime (no migration needed).
- For PDF-only courses, `og_image_url` is used as-is; if empty we fall back to a default `/og-course-default.png` (added to `public/`).

---

## Result for the user

A WhatsApp message will look like:

```text
Hi Rahul, here is *Tally Prime* 📘
https://ateceducationinnew.lovable.app/c/tally-prime
Fee: ₹6,000 • Duration: 2 months
```

…and WhatsApp will display below it a rich card with the course image/video thumbnail, course name, and short description — exactly what you asked for. The link itself shows just the course name (`/c/tally-prime`), not the long PDF/storage path.

---

## Files to create / edit

- **create** `src/pages/CoursePublic.tsx`
- **create** `src/lib/courseLinks.ts`
- **create** `public/og-course-default.png` (simple fallback banner)
- **edit** `src/App.tsx` (add route `/c/:slug`)
- **edit** `src/crm/lib/enquiryWa.ts` (new vars, slug in CourseCtx)
- **edit** `src/crm/components/SendWhatsAppCard.tsx`, `SendAllModal.tsx`, `SendCourseDrawer.tsx` (fetch slug, pass new vars)
- **edit** `src/components/CoursesSection.tsx` (use short link in share)
- **edit** `src/components/SEO.tsx` if needed to support per-page OG image override
- **migration**: update `crm_whatsapp_templates` bodies for `SEND_BROCHURE_IMAGE`, `COURSE_MEDIA`, `COURSE_INFO`; update `whatsapp_templates.syllabus_share` body.

No schema changes required (slug + og_image_url already exist on `crm_courses`).
