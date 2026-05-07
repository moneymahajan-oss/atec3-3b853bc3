UPDATE public.site_settings
SET value = ''
WHERE key IN ('about_section_heading', 'about_section_subheading')
  AND value IN ('About ATEC', 'Watch our story unfold');