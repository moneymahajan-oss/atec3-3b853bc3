UPDATE public.crm_whatsapp_templates
SET body = E'Hi {name}, here are some glimpses of our {course_name} 🎬\n\n🎥 Video: {video_share_link}\n📸 Instagram: {instagram_url}\n\nReady to start? Reply YES.',
    updated_at = now()
WHERE template_key = 'COURSE_MEDIA';