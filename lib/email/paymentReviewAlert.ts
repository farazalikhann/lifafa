import { sendOwnerAlert } from "@/lib/email/alerts";
import { formatPrice } from "@/lib/pricing";
import { canonicalSiteOrigin } from "@/lib/siteUrl";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTemplate } from "@/templates/registry";

/** What the webhook knows about a payment it took and would not apply. */
export interface PaymentUnderReview {
  eventId: string;
  hostId: string | null;
  orderId: string;
  paymentId: string;
  /** Paise. */
  capturedPaise: number;
  orderPaise: number;
  pricePaise: number;
  templateId: string | null;
  reason: string;
}

/**
 * Tells the owner, by email, that a host has paid and is not published.
 *
 * Server only, and called from the webhook after it has answered. Never
 * throws: the host's address is looked up with the service role, and a lookup
 * that fails goes out as "unknown" beside the event id, which finds the host
 * in the admin just as well.
 */
export async function alertPaymentUnderReview(
  payment: PaymentUnderReview,
): Promise<void> {
  try {
    const hostEmail = await hostEmailOf(payment.hostId);
    const template = getTemplate(payment.templateId);

    await sendOwnerAlert(
      `Lifafa: payment to review, ${formatPrice(payment.capturedPaise)} paid, invitation not published`,
      [
        "A payment was captured and the invitation was NOT published.",
        "The host has been told the payment is being verified.",
        "",
        `Event id:        ${payment.eventId}`,
        `Host email:      ${hostEmail ?? "unknown"}`,
        `Payment id:      ${payment.paymentId}`,
        `Order id:        ${payment.orderId}`,
        `Amount paid:     ${formatPrice(payment.capturedPaise)}`,
        `Order asked for: ${formatPrice(payment.orderPaise)}`,
        `Template price:  ${formatPrice(payment.pricePaise)} (${template.name})`,
        "",
        `Why: ${payment.reason}.`,
        "",
        `Publish it by hand, or refund it in Razorpay: ${canonicalSiteOrigin()}/admin/payments`,
      ],
    );
  } catch (cause: unknown) {
    console.error(
      `[alert] could not send the alert for payment ${payment.paymentId} (event ${payment.eventId}):`,
      cause,
    );
  }
}

async function hostEmailOf(hostId: string | null): Promise<string | null> {
  if (hostId === null) {
    return null;
  }

  const { data, error } = await createAdminClient().auth.admin.getUserById(hostId);

  if (error !== null) {
    console.error(`[alert] could not read host ${hostId}:`, error);
    return null;
  }

  return data.user?.email ?? null;
}
