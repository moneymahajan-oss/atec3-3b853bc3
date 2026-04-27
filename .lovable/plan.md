# Shrink About ATEC video cards to Gallery-style grid

Match the About ATEC video cards to the compact "Life at ATEC" gallery layout.

### File: `src/components/AboutSection.tsx`

**Change the videos grid (lines ~67–98):**
- Replace `grid-cols-1 md:grid-cols-2 gap-6 mb-10` with `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-10` (same as Gallery).
- Remove the large `aspect-video` container and the separate title/description block beneath each card.
- Each card becomes a square (`aspect-square`), `rounded-2xl overflow-hidden`, containing the YouTube iframe filling the full tile (`w-full h-full`).
- Overlay the video title as a small diagonal ribbon at the bottom (same style as Gallery captions: `bg-black/70 text-white font-bold text-xs px-8 py-1.5`, rotated `-20deg`), shown only when `v.title` exists. Use `pointer-events-none` so the iframe stays clickable.
- Keep the existing `getYouTubeId` logic and motion/stagger animation.

No data, schema, or other component changes required. Result: About ATEC videos render as a tight 2-col (mobile) / 3-col (md) / 4-col (lg) grid of small square video tiles visually consistent with the Life at ATEC section.