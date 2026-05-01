import { logWaSend } from "./whatsapp";

export interface ShareFormArgs {
  phone: string;
  name?: string;
  formUrl: string;
  instituteName?: string;
  entityId?: string;
}

export function buildEnquiryFormMessage(name: string | undefined, instituteName: string, formUrl: string) {
  const who = (name || "").trim() || "there";
  return (
    `Hi ${who}, this is ${instituteName}.\n\n` +
    `Please fill out our quick enquiry form so we can share course details, fees, and batch timings with you:\n` +
    `${formUrl}\n\n` +
    `It only takes a minute. Thank you!`
  );
}

/**
 * Open WhatsApp with the enquiry form link AND log the send to crm_whatsapp_logs.
 * Returns true if the send was attempted, false on validation failure.
 */
export async function sendEnquiryFormViaWhatsApp(args: ShareFormArgs): Promise<boolean> {
  const phoneDigits = (args.phone || "").replace(/\D/g, "");
  if (phoneDigits.length < 10) return false;

  const message = buildEnquiryFormMessage(
    args.name,
    args.instituteName || "ATEC Education",
    args.formUrl
  );
  const waUrl = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
  window.open(waUrl, "_blank", "noopener,noreferrer");

  try {
    await logWaSend({
      template_key: "enquiry_form_share",
      contact_number: phoneDigits,
      contact_name: args.name,
      message_snapshot: message,
      entity_type: args.entityId ? "enquiry" : undefined,
      entity_id: args.entityId,
    });
  } catch (e) {
    // logging failure shouldn't block the share
    console.warn("logWaSend failed", e);
  }
  return true;
}
