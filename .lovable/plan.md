# Why "Video / Instagram" doesn't work for Tally Prime

## Root cause

For the **Tally Prime** course in `crm_courses`:
- `video_url` = NULL
- `youtube_url` = NULL
- `instagram_url` = `https://www.instagram.com/p/DVOFj8Ik6rd/` ✅ (set)

The `COURSE_MEDIA` WhatsApp template body is:
```
Hi {name}, watch our {course_name} students in action 🎬
{video_share_link}
Ready to start? Reply YES.
```

It only uses `{video_share_link}` (which points to `/c/tally-prime#video`). Two problems:

1. **Template never references `{instagram_url}`** — so even though we set the variable, the Instagram link never appears in the message.
2. **The public course page (`CoursePublic.tsx`) only renders the `#video` button/embed when `youtube_url` or `video_url` exists.** Since Tally Prime has neither, the link opens a page with no video — making it look like "nothing was sent / nothing to watch."

So the WhatsApp link *is* generated and opens, but the recipient sees a page with no video and the message text has no Instagram link either.

## Fix (3 small changes)

### 1. Update the `COURSE_MEDIA` template body (DB)
Migration to seed/update the template so it includes Instagram when present:
```
Hi {name}, here are some glimpses of our {course_name} 🎬

🎥 Video: {video_share_link}
📸 Instagram: {instagram_url}

Ready to start? Reply YES.
```
The existing `fillTemplate` already strips lines that become empty if a variable is blank, so courses with only video or only Instagram still render cleanly.

### 2. `src/crm/lib/enquiryWa.ts` — make `video_share_link` smarter
If the course has no `video_url`/`youtube_url` but has `instagram_url`, fall back `video_share_link` to the Instagram URL directly (so the line still resolves to a clickable media link). Also keep `instagram_url` populated as today.

### 3. `src/pages/CoursePublic.tsx` — render Instagram on the public page
In the media buttons row and `#video-embed` block, also handle `instagram_url`:
- Add an "Watch on Instagram" button (anchor id `video` if no YouTube/video) so the existing `#video` deep-link from WhatsApp still scrolls to something useful.
- Fallback ordering: youtube_url → video_url → instagram_url.

## Files touched
- New SQL migration: update `crm_whatsapp_templates` body for `COURSE_MEDIA`.
- `src/crm/lib/enquiryWa.ts` — fallback for `video_share_link` / `video_link`.
- `src/pages/CoursePublic.tsx` — render Instagram when video is missing.

No schema changes, no breaking changes to other courses (they keep working as-is).
