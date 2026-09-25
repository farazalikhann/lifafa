import { NextResponse, type NextRequest } from "next/server";
import { applyCapturedPayment } from "@/lib/db/applyPayment";
import {
  readCapturedPayment,
  SIGNATURE_HEADER,
  verifySignature,
} from "@/lib/razorpay/webhook";

/**
 * Where Razorpay tells us a payment actually happened.
 *
 * THIS ROUTE IS THE ONLY THING THAT MAY PUBLISH AN INVITATION FOR MONEY. (The
 * two free paths — an admin's complimentary activation and a code covering the
 * whole price — are 0014's functions, and move no money.) The
 * browser's success callback does not, and must never: it runs on the guest's
 * — here, the host's — own machine, where the code is readable, the network is
 * theirs and a fetch can be replayed by hand. A checkout that "succeeded"
 * according to the page is a claim by the buyer. This is the claim by the bank.
 *
 * So the callback in components/dashboard/PublishButton.tsx refreshes the page
 * and nothing else. If the webhook has landed, the refreshed page shows a
 * published invitation. If it has not yet, the page still says unpaid and the
 * button says it is waiting. Both are honest; neither involves the browser
 * being believed about money.
 *
 * THE ORDER OF THE FIRST TWO STATEMENTS IS LOAD-BEARING. `request.text()` reads
 * the body exactly as it arrived, and the signature is an HMAC over those bytes.
 * Parsing first and re-serialising would change key order, whitespace or number
 * formatting and the hash would never match again. Nothing in this file calls
 * JSON.parse before verifySignature has returned true.
 */

/*
  Node, not Edge. node:crypto's timingSafeEqual — the comparison in
  lib/razorpay/webhook.ts — has no Edge equivalent, and lib/supabase/admin.ts
  reads a secret this runtime keeps server-side. Stated rather than left to the
  default so a future change to that default cannot quietly move this file.
*/
export const runtime = "nodejs";

/*
  Never cached, never statically analysed into a prerender. A webhook is a side
  effect by definition, and a cached 200 would mean a retry that Razorpay
  believes was handled while nothing ran.
*/
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  /* RAW FIRST. See the note above — this line is the security of the route. */
  const rawBody = await request.text();
  const signature = request.headers.get(SIGNATURE_HEADER);

  if (!verifySignature(rawBody, signature)) {
    /*
      401, and deliberately terse. Anyone can POST here, so this branch is
      reachable by a scanner, and a message describing what was wrong with the
      signature would be a hint about how to produce a right one. Not 200:
      unlike the ignored events below, this is not something to stop retrying —
      a genuine delivery failing here means the secret is misconfigured, and a
      retry after it is fixed should succeed.
    */
    console.warn("[razorpay] rejected a webhook with a bad signature.");
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  /* Authentic. Only now is it safe to read what it says. */
  const captured = readCapturedPayment(rawBody);

  if (captured === null) {
    /*
      200, IMMEDIATELY, AND ON PURPOSE. Razorpay sends whatever events the
      dashboard subscribes to, and retries anything that does not answer 2xx.
      An event this route does not handle — payment.authorized, order.paid,
      a refund, a shape from a future API version — is not a failure, and
      answering 4xx would earn a retry schedule for something that will never
      be handled differently. Nothing has been written at this point.
    */
    return NextResponse.json({ ok: true, handled: false });
  }

  const outcome = await applyCapturedPayment(
    captured.orderId,
    captured.paymentId,
  );

  switch (outcome.kind) {
    case "applied":
      console.log(
        `[razorpay] published event ${outcome.eventId} from payment ${captured.paymentId} (${captured.amount} paise).`,
      );
      return NextResponse.json({ ok: true, handled: true });

    case "duplicate":
      /*
        The same capture arriving twice, which is normal: Razorpay retries, and
        a delivery we handled can still time out on the way back. Logged at
        info because it is the system working, and answered 200 so the retries
        stop.
      */
      console.log(
        `[razorpay] ignored a repeat delivery for order ${captured.orderId}.`,
      );
      return NextResponse.json({ ok: true, handled: false });

    case "unknown":
      /*
        A verified payment for an order with no row here. It is genuinely from
        our account — the signature proved that — so this means an order created
        outside createPaymentOrder, or one whose row never got written. There is
        nothing to apply it to and a retry would find the same nothing, so: 200,
        and a log line loud enough to be found, because someone has paid.
      */
      console.error(
        `[razorpay] NO PAYMENT ROW for order ${captured.orderId} (payment ${captured.paymentId}, ${captured.amount} paise). Someone has paid and nothing was published.`,
      );
      return NextResponse.json({ ok: true, handled: false });

    case "error":
      /*
        The one case worth a retry. The delivery was genuine and we failed to
        record it, so 500 asks Razorpay to send it again — and the write path is
        idempotent, so being sent it again is safe.
      */
      return NextResponse.json(
        { ok: false, error: outcome.message },
        { status: 500 },
      );
  }
}

/**
 * Razorpay only ever POSTs. A GET is someone checking whether the URL is live —
 * including whoever is pasting it into the Razorpay dashboard — so it answers
 * plainly rather than with Next's default 405 page, and gives away nothing
 * about whether the secret is set.
 */
export function GET(): NextResponse {
  return NextResponse.json({ ok: true, endpoint: "razorpay-webhook" });
}
