import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Proving a webhook really came from Razorpay, and reading what it says.
 *
 * THIS FILE IS THE ENTIRE TRUST BOUNDARY FOR PAYMENT. /api/razorpay/webhook is
 * a public URL: anyone on the internet can POST to it, and the body they send
 * is the only thing that decides whether an invitation becomes paid. Nothing
 * about a request is trustworthy until verifySignature below has returned true
 * — not the event name, not the order id, not the amount.
 *
 * node:crypto rather than the razorpay package's own validateWebhookSignature.
 * The helper is a few lines around exactly this HMAC, and having the comparison
 * written out here means the one security-critical step in the payment path is
 * readable in the file that performs it rather than inside a dependency.
 *
 * Server-only by construction: node:crypto cannot be bundled for the browser,
 * so an accidental client import fails the build rather than shipping anything.
 */

/**
 * The header Razorpay signs each delivery with. Lower case because
 * `Headers.get` is case-insensitive but the literal may as well match what is
 * actually on the wire.
 */
export const SIGNATURE_HEADER = "x-razorpay-signature";

/**
 * Whether this raw body was signed with our webhook secret.
 *
 * THE BODY MUST BE THE RAW TEXT, byte for byte as it arrived. The signature is
 * an HMAC over those exact bytes, so a body that has been through JSON.parse
 * and JSON.stringify will not verify: key order, whitespace and number
 * formatting are all free to change, and any one of them breaks the hash. The
 * route handler reads `await request.text()` first and parses only afterwards,
 * which is the whole reason it is written in that order.
 *
 * timingSafeEqual, not `===`. A string comparison returns as soon as two bytes
 * differ, so how long it takes leaks how much of the signature was right —
 * enough, over many attempts, to forge one byte at a time. It needs both
 * buffers to be the same length, so the length is checked first and separately;
 * that check leaks only the length, which is fixed by SHA-256 anyway.
 *
 * False, never a throw, for every way of being wrong: no secret configured, no
 * header, a header that is not hex, a mismatch. The caller's job is to answer
 * 400 and nothing else, and a distinction between kinds of failure here would
 * only ever be used to tell an attacker which part to fix.
 */
export function verifySignature(
  rawBody: string,
  signature: string | null,
): boolean {
  const secret = (process.env.RAZORPAY_WEBHOOK_SECRET ?? "").trim();

  /*
    FAILS CLOSED when the secret is missing. A deployment that forgot the
    variable rejects every webhook, which is a payment that does not complete
    and a bug someone notices. The alternative — treating "no secret" as "no
    checking required" — is an open endpoint that marks any invitation paid for
    anyone who finds the URL.
  */
  if (secret.length === 0) {
    console.error(
      "[razorpay] RAZORPAY_WEBHOOK_SECRET is not set; refusing every webhook.",
    );
    return false;
  }

  if (signature === null || signature.length === 0) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest();

  let received: Buffer;

  try {
    received = Buffer.from(signature, "hex");
  } catch {
    return false;
  }

  /*
    Buffer.from with "hex" does not throw on invalid input — it stops at the
    first character it cannot read and returns a short buffer. So the length
    check below is doing two jobs: it is what makes timingSafeEqual legal, and
    it is what rejects a malformed header.
  */
  if (received.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(received, expected);
}

/* ─────────────────────── What a delivery looks like ─────────────────────── */

/**
 * The part of a Razorpay webhook payload this application reads.
 *
 * Hand-written and deliberately partial, in the same spirit as types/database.ts:
 * Razorpay sends a large object and Lifafa needs four fields from it. Typing
 * the whole envelope would be a promise about someone else's API that this
 * codebase cannot keep.
 *
 * Every field is optional, because this describes JSON that arrived over the
 * wire. It has been proven to come from Razorpay by the time it is parsed, but
 * "authentic" is not "the shape I expected" — a future API version could send
 * something else, and `readCapturedPayment` below tests rather than asserts.
 */
interface WebhookEnvelope {
  event?: unknown;
  payload?: {
    payment?: {
      entity?: {
        id?: unknown;
        order_id?: unknown;
        amount?: unknown;
      };
    };
  };
}

/** The one event that means money actually moved. */
export const PAYMENT_CAPTURED = "payment.captured";

/** What the webhook route needs out of a captured payment. */
export interface CapturedPayment {
  /** The Razorpay payment id, e.g. "pay_ABC123". */
  paymentId: string;
  /** The order it settles, matching payments.razorpay_order_id. */
  orderId: string;
  /** Paise, as Razorpay reports them. */
  amount: number;
}

/**
 * The captured payment inside a verified body, or null if this is anything
 * else.
 *
 * Null covers every "not for us" case — a different event, a payload shaped
 * unexpectedly, a field missing — and the route answers 200 to all of them.
 * Razorpay retries a non-2xx, so answering anything else to an event we simply
 * do not handle would earn a retry of something that will never be handled.
 */
export function readCapturedPayment(rawBody: string): CapturedPayment | null {
  let envelope: WebhookEnvelope;

  try {
    envelope = JSON.parse(rawBody) as WebhookEnvelope;
  } catch {
    return null;
  }

  if (envelope.event !== PAYMENT_CAPTURED) {
    return null;
  }

  const entity = envelope.payload?.payment?.entity;
  const paymentId = entity?.id;
  const orderId = entity?.order_id;
  const amount = entity?.amount;

  if (
    typeof paymentId !== "string" ||
    paymentId.length === 0 ||
    typeof orderId !== "string" ||
    orderId.length === 0 ||
    typeof amount !== "number" ||
    !Number.isFinite(amount)
  ) {
    return null;
  }

  return { paymentId, orderId, amount };
}
