# Install Google Tag Manager

Add GTM container `GTM-MDV2DRNT` to the site so it fires on every page (including future custom domain `ateceducation.in`).

## Changes

**`index.html`** — two snippets per Google's official install guide:

1. **`<head>` (as high as possible)** — the GTM script loader:
   ```html
   <!-- Google Tag Manager -->
   <script>(function(w,d,s,l,i){...})(window,document,'script','dataLayer','GTM-MDV2DRNT');</script>
   <!-- End Google Tag Manager -->
   ```

2. **Immediately after `<body>`** — the `<noscript>` iframe fallback:
   ```html
   <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-MDV2DRNT"
   height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
   ```

(Per project rules, the `<noscript>` pixel goes in `<body>`, never in `<head>`.)

No other files change. No npm packages needed. No backend changes.

## Will it work on ateceducation.in?

**Yes.** GTM is loaded purely client-side from `googletagmanager.com` and is domain-agnostic — the same container fires on:
- `id-preview--…lovable.app` (preview)
- `atec3.lovable.app` (current published URL)
- `ateceducation.in` (once you connect the custom domain)

No reconfiguration is required after switching domains. Two optional follow-ups you may want once `ateceducation.in` is live:

1. **In GTM UI** → add a trigger condition or environment if you want to *exclude* preview/staging hostnames from firing tags.
2. **If you add Google Analytics 4 via GTM** → add `ateceducation.in` to the GA4 property's data stream so traffic is attributed correctly.

## Verification after deploy

- Open the site → DevTools → Network → filter `gtm.js` → should return 200.
- In GTM UI → **Preview** mode → enter the site URL → Tag Assistant should connect.

## Out of scope

- Creating tags inside the GTM container (GA4, Ads, Pixel, etc.) — done in the GTM web UI, not in code.
- Cookie consent / GDPR banner gating for GTM — ask if you want this added.
