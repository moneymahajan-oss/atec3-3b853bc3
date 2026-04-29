# Cascade Delete for Enquiries

When an enquiry is deleted, all of its related records across the CRM should be removed too. Currently only the row in `crm_enquiries` is deleted, leaving orphan notes, WhatsApp logs, audit entries, and broken student links.

## What gets cleaned up

For the enquiry being deleted, we will remove or unlink:

| Where | What happens |
|---|---|
| `crm_enquiry_notes` (enquiry_id = X) | Hard delete — timeline notes, stage-change history |
| `crm_whatsapp_logs` (entity_type='enquiry' AND entity_id = X) | Hard delete — all WA send logs for this enquiry |
| `crm_students.source_enquiry_id = X` | Set to NULL — keep the student record but break the link (do NOT delete the student or their fees/certificates/docs) |
| `crm_audit_logs` (entity='crm_enquiries' AND entity_id = X) | Keep, then add a final `delete` audit entry (audit trail must survive) |
| `crm_enquiries` row | Hard delete |

Note: courses, fees, payments, attendance, certificates, and student documents are tied to the **student**, not the enquiry. Deleting an enquiry must never touch those — only the enquiry-side artifacts above.

## Implementation

### 1. Database — enforce at the DB layer (migration)

Add ON DELETE behavior so deletes can never leave orphans, even from SQL/admin tools:

```sql
ALTER TABLE crm_enquiry_notes
  ADD CONSTRAINT crm_enquiry_notes_enquiry_id_fkey
  FOREIGN KEY (enquiry_id) REFERENCES crm_enquiries(id) ON DELETE CASCADE;

ALTER TABLE crm_students
  ADD CONSTRAINT crm_students_source_enquiry_id_fkey
  FOREIGN KEY (source_enquiry_id) REFERENCES crm_enquiries(id) ON DELETE SET NULL;

-- crm_whatsapp_logs.entity_id is text (polymorphic), so use a trigger instead
CREATE OR REPLACE FUNCTION public.crm_cleanup_enquiry_wa_logs()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  DELETE FROM public.crm_whatsapp_logs
   WHERE entity_type = 'enquiry' AND entity_id = OLD.id::text;
  RETURN OLD;
END $$;

CREATE TRIGGER trg_crm_cleanup_enquiry_wa_logs
BEFORE DELETE ON public.crm_enquiries
FOR EACH ROW EXECUTE FUNCTION public.crm_cleanup_enquiry_wa_logs();
```

### 2. Frontend — `src/crm/pages/CrmEnquiryForm.tsx` `remove()` function

Strengthen the confirm dialog to make the consequences clear, and rely on DB cascade. After delete, write the audit entry (already there).

```ts
const remove = async () => {
  if (!confirm(
    "Delete this enquiry?\n\nThis will also remove:\n• All notes & timeline\n• All WhatsApp send logs\n• Link from any converted student (student record itself is kept)\n\nThis cannot be undone."
  )) return;
  const { error } = await supabase.from("crm_enquiries").delete().eq("id", id!);
  if (error) { toast.error(error.message); return; }
  await logAudit("crm_enquiries", "delete", id);
  toast.success("Enquiry and related records deleted");
  navigate("/crm/enquiries");
};
```

That's it — nothing else in the app needs to change. The Enquiries list, dashboard counts, reminders, and reports all re-query on mount, so they'll naturally reflect the deletion.

## Out of scope (intentionally not touched)

- Student record, fees, payments, attendance, certificates, documents — these belong to the student even if the enquiry that created them is gone.
- Other modules (courses, batches, expenses) — no changes.
- Admin settings — no changes.