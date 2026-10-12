import { coverNameLine, resolveCoverNames } from "@/lib/cardFormat";
import { dbFailure, dbSuccess, type DbResult } from "@/lib/db/result";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTemplate } from "@/templates/registry";
import { toStoredEvent } from "@/types/database";

/**
 * The admin's list of payments under review (lib/paymentReview.ts): orders a
 * host has paid that the webhook would not apply.
 *
 * Read with the service role, as everything in lib/admin is, and only ever
 * from a server page that has been past requireAdminSession().
 */

/** What publishReviewedPaymentAction answers; shared with its button. */
export type PublishReviewedResult = { ok: true } | { ok: false; error: string };

export interface AdminReviewPayment {
  /** The payments row, which is what the publish action is given. */
  id: string;
  eventId: string;
  /** Null when the event has since been deleted. */
  eventTitle: string | null;
  inviteCode: string | null;
  hostEmail: string | null;
  /** Already live, by a free activation or another payment. */
  eventIsPaid: boolean;
  paymentId: string;
  orderId: string | null;
  /** Paise. What the order asked for, which is what the row holds. */
  orderPaise: number;
  /** Paise the order's coupon took off. */
  discountPaise: number;
  couponCode: string | null;
  templateName: string;
  /** Paise. What the invitation's template costs now. */
  pricePaise: number;
  /** When the order was made. */
  createdAt: string;
}

/**
 * At most this many, oldest first. The list is meant to be empty; a deployment
 * with more than this waiting has a different problem than a long page.
 */
const REVIEW_LIMIT = 100;

export async function listPaymentsUnderReview(): Promise<
  DbResult<readonly AdminReviewPayment[]>
> {
  const admin = createAdminClient();

  const { data: payments, error } = await admin
    .from("payments")
    .select(
      "id, event_id, razorpay_order_id, razorpay_payment_id, amount, discount_amount, coupon_code, created_at",
    )
    .eq("status", "created")
    .not("razorpay_payment_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(REVIEW_LIMIT);

  if (error !== null) {
    return dbFailure(
      "admin/listPaymentsUnderReview",
      error,
      "Could not load the payments to review.",
    );
  }

  if (payments.length === 0) {
    return dbSuccess([]);
  }

  const { data: events, error: eventsError } = await admin
    .from("events")
    .select("*")
    .in("id", [...new Set(payments.map((payment) => payment.event_id))]);

  if (eventsError !== null) {
    return dbFailure(
      "admin/listPaymentsUnderReview/events",
      eventsError,
      "Could not load the payments to review.",
    );
  }

  const eventsById = new Map(events.map((event) => [event.id, event]));

  /* A handful of hosts at most, each one lookup; a failed one reads "no email". */
  const hostIds = [...new Set(events.map((event) => event.host_id))];
  const emails = new Map<string, string | null>(
    await Promise.all(
      hostIds.map(async (hostId): Promise<[string, string | null]> => {
        const { data, error: userError } =
          await admin.auth.admin.getUserById(hostId);

        if (userError !== null) {
          console.error(`[admin] could not read host ${hostId}:`, userError);
          return [hostId, null];
        }

        return [hostId, data.user?.email ?? null];
      }),
    ),
  );

  return dbSuccess(
    payments.flatMap((payment): AdminReviewPayment[] => {
      /* The query asked for rows that have one; this is for the type. */
      if (payment.razorpay_payment_id === null) {
        return [];
      }

      const row = eventsById.get(payment.event_id);
      const event = row === undefined ? null : toStoredEvent(row);
      const template = getTemplate(event?.config.templateId);

      return [
        {
          id: payment.id,
          eventId: payment.event_id,
          eventTitle:
            event === null
              ? null
              : coverNameLine(
                  resolveCoverNames(event.draft, event.config.occasionId, "en"),
                ),
          inviteCode: event?.inviteCode ?? null,
          hostEmail: row === undefined ? null : (emails.get(row.host_id) ?? null),
          eventIsPaid: row?.is_paid ?? false,
          paymentId: payment.razorpay_payment_id,
          orderId: payment.razorpay_order_id,
          orderPaise: payment.amount,
          discountPaise: payment.discount_amount ?? 0,
          couponCode: payment.coupon_code,
          templateName: template.name,
          pricePaise: template.price,
          createdAt: payment.created_at,
        },
      ];
    }),
  );
}
