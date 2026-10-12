"use server";

import { revalidatePath } from "next/cache";
import { adminSession } from "@/lib/admin/auth";
import type { PublishReviewedResult } from "@/lib/admin/paymentReview";
import { publishReviewedPayment } from "@/lib/db/applyPayment";

/*
  ────────────────────────────────────────────────────────────────────────────
  Publishing an invitation whose payment is under review (lib/paymentReview.ts).

  The one export of this file is a public endpoint with a stable id, so it
  checks the admin session first and does nothing without one, as the actions
  in app/admin/events/actions.ts do. Its argument is whatever crossed the wire
  and is checked as a string.

  The write is publishReviewedPayment in lib/db/applyPayment.ts: the payments
  row becomes 'paid' and the event is marked paid exactly as the webhook marks
  it, through the service role. It only matches a row that is under review, so
  this cannot publish an invitation nobody has paid for.
  ────────────────────────────────────────────────────────────────────────────
*/

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function publishReviewedPaymentAction(
  paymentRowId: unknown,
): Promise<PublishReviewedResult> {
  const session = await adminSession();

  if (session === null) {
    console.warn("[admin] publishReviewedPaymentAction called without a session.");
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  if (typeof paymentRowId !== "string" || !UUID.test(paymentRowId)) {
    return { ok: false, error: "That payment is not valid." };
  }

  const outcome = await publishReviewedPayment(paymentRowId);

  switch (outcome.kind) {
    case "published":
      console.info(
        `[admin] ${session.username} published event ${outcome.eventId} from reviewed payment ${outcome.paymentId}`,
      );
      revalidatePath("/admin/payments");
      revalidatePath(`/admin/events/${outcome.eventId}`);
      return { ok: true };

    case "gone":
      revalidatePath("/admin/payments");
      return {
        ok: false,
        error: "This payment is no longer waiting for review. Reload the page.",
      };

    case "error":
      return {
        ok: false,
        error:
          outcome.message === "events update failed"
            ? "The payment was recorded but the invitation could not be published. Activate it from Free activation."
            : "Could not publish this invitation. Please try again.",
      };
  }
}
