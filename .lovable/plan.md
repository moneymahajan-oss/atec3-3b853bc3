# Make the Danger Zone visible & easy to find

## Problem

The "Wipe all CRM data" button exists and is wired correctly in `src/crm/pages/CrmSettings.tsx` (line 172, inside the admin-only Institute Settings page). But it's the **last** item on a long, two-column settings page — below Identity, Contact, Payments, Receipt, and Reminders dashboard sections. On the current viewport (879×672) it's completely below the fold, so users think it's missing.

It also requires admin role (`isAdmin` check at the top of `CrmSettings.tsx`) — non-admins are redirected away and will never see it.

## Fix

Three small changes to surface the Danger Zone:

1. **Add a "Jump to Danger Zone" shortcut** at the top of `CrmSettings.tsx`, next to the "Save changes" button in the `PageHeader` actions. Clicking it scrolls smoothly to the Danger Zone section.

2. **Promote Danger Zone to its own full-width section** below the two-column grid (instead of floating loose). Wrap it under a clear `<h2>System</h2>` heading with a red accent so it's visually unmissable when the user does scroll down. Add `id="danger-zone"` for the anchor.

3. **Add an "Admin only — Danger Zone" hint** in the page description so admins know it exists before scrolling.

### Files touched

- `src/crm/pages/CrmSettings.tsx` — add anchor button in header actions, wrap `<DangerZone />` in a labelled section with `id="danger-zone"`, update page description.

### Not changed

- `DangerZone.tsx` itself — already correct (red border, AlertTriangle icon, two-step confirm).
- Sidebar — Danger Zone stays inside Settings (it's a destructive admin action, not a top-level nav item).
- Permissions — remains admin-only.

## Verification

After changes: open `/crm/settings` as an admin → see "↓ Danger Zone" button in top-right header → click it → page scrolls to the red-bordered Danger Zone card with the "Wipe all CRM data" button.
