# Make the Danger Zone actually findable

## What you're seeing

In your screenshot of `/crm/settings`, the top-right shows only **"Save changes"** — the **"↓ Danger Zone"** shortcut button that was added last round is not visible. The code is in place (`src/crm/pages/CrmSettings.tsx` lines 107–116), so this is most likely a stale preview / browser cache. A hard refresh (Ctrl+Shift+R) should bring it back.

But the bigger issue is the design itself: a small outline button next to "Save changes" is easy to miss, and the actual Danger Zone card sits far below the fold on a 879px-tall viewport. Let's fix it properly so you never have to hunt for it again.

## Plan

Three changes, all in the CRM settings area:

### 1. Add a permanent "Danger Zone" entry in the sidebar (admin only)

In `src/crm/components/CrmSidebar.tsx`, add a new item at the bottom of the sidebar (under a "System" group) labeled **"Danger Zone"** with a red `AlertTriangle` icon. It links to `/crm/settings#danger-zone`. Only renders when `isAdmin` is true.

This means: from anywhere in the CRM, one click jumps straight to the wipe button.

### 2. Make the in-page shortcut a bold, unmissable pill

Replace the small outline button in `CrmSettings.tsx` header with a solid red destructive button labeled **"Danger Zone ↓"** with the `AlertTriangle` icon. Keep it next to "Save changes" but make it visually loud (solid red, not outlined).

### 3. Auto-scroll when arriving via hash

In `CrmSettings.tsx`, add a `useEffect` that reads `window.location.hash` and, if it equals `#danger-zone`, scrolls the section into view after settings load. This makes the sidebar link land you directly on the red card.

## Files touched

- `src/crm/components/CrmSidebar.tsx` — add admin-only "Danger Zone" sidebar item under a "System" group, linking to `/crm/settings#danger-zone`.
- `src/crm/pages/CrmSettings.tsx` — swap the outline shortcut for a solid destructive button with icon; add `useEffect` to auto-scroll on `#danger-zone` hash.

## Not changed

- `DangerZone.tsx` — already correct (red border, two-step confirm with checkbox + "DELETE EVERYTHING" phrase).
- The wipe logic, audit logging, and confirmation flow stay exactly as they are.
- Permissions stay admin-only.

## Verification

After approval and a hard refresh:
1. Sidebar shows a red **"Danger Zone"** item under a "System" group (admin only).
2. Clicking it navigates to `/crm/settings` and auto-scrolls to the red Danger Zone card.
3. On the settings page itself, the top-right now has a bold red **"Danger Zone ↓"** button next to "Save changes".
4. The "Wipe all CRM data" button is one click away from any CRM page.
