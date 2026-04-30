# Fix: Overdue Payments Not Showing in Reminders

## Root Cause

I queried the database and found this fee plan that **should** appear as overdue but doesn't:

| Amount | Paid | Due Date | Status |
|---|---|---|---|
| ₹3000 | ₹0 | 2026-04-29 (yesterday) | **paid** |

The installment is past due and unpaid (₹0 collected of ₹3000), but its `status` column is incorrectly set to `paid`. This appears to be stale/wrong data — likely a payment was recorded against it then voided, or the status was set manually, leaving `amount_paid = 0` but `status = 'paid'`.

The reminder loader in `src/crm/lib/reminders.ts` (`fetchPendingFeePlansWithStudent`) only fetches plans with `status IN ('pending','partial','overdue')`. Because this plan's status is `paid`, it is filtered out — even though the actual unpaid balance proves it is overdue.

The system has two sources of truth for "is this fee paid?" — the `status` field and the `amount` vs `amount_paid` math — and they have drifted apart.

## Fix Plan

### 1. Make the overdue/due-soon loaders trust the money, not the status

In `src/crm/lib/reminders.ts`, change `fetchPendingFeePlansWithStudent` to fetch **any non-void plan with an outstanding balance**, regardless of status:

- Drop the `status IN (pending, partial, overdue)` filter
- Filter in JS for `amount_paid < amount` (already done downstream)
- This way a wrongly-flagged "paid" plan with ₹0 collected still surfaces as overdue

### 2. Auto-correct the status when we detect drift

When `loadOverdue` / `loadDueSoon` find a plan where `amount_paid < amount` but `status = 'paid'`, also display it correctly in the reminders UI. Optionally trigger a one-time backfill to set status to `pending` / `overdue` so dashboards stay consistent.

### 3. Backfill migration to repair existing bad data

Add a SQL migration that fixes any current row where status disagrees with the math:

```text
UPDATE crm_fee_plans
SET status = CASE
  WHEN amount_paid >= amount THEN 'paid'
  WHEN amount_paid > 0 AND amount_paid < amount THEN 'partial'
  WHEN due_date < CURRENT_DATE THEN 'overdue'
  ELSE 'pending'
END
WHERE COALESCE(is_void,false) = false;
```

This will immediately reclassify the ₹3000/2026-04-29 plan as `overdue` and it will appear in the reminders panel.

### 4. Strengthen the payment trigger so this can't recur

The existing `crm_apply_payment_to_plan()` trigger only updates status to `paid` or `partial`. It never demotes back to `pending` when a payment is voided (since voided payments are excluded from the SUM, `total_paid` becomes 0 but status stays `paid`). Update the trigger so when `total_paid = 0`, status returns to `pending` (or `overdue` if past due date).

## Files to Change

- `src/crm/lib/reminders.ts` — remove `status IN (...)` filter in `fetchPendingFeePlansWithStudent`
- New migration — backfill `crm_fee_plans.status` from amount math + patch the `crm_apply_payment_to_plan` trigger

## Result

After this fix:
- The ₹3000 installment due 2026-04-29 will show in the **Overdue** reminders list immediately
- Future void/refund operations will correctly demote status back to pending/overdue
- The reminders panel will always reflect actual unpaid balances, not stale status flags
