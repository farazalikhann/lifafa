/**
 * Which Razorpay key this deployment is using, and whether it is a real one.
 *
 * THE PUBLISHABLE HALF ONLY. This module reads NEXT_PUBLIC_RAZORPAY_KEY_ID and
 * nothing else, which is why it is safe to import from a Client Component: that
 * value is the one Razorpay intends to be public — it names the account to the
 * checkout and authorises nothing on its own. RAZORPAY_KEY_SECRET and
 * RAZORPAY_WEBHOOK_SECRET are read in lib/razorpay/client.ts and
 * lib/razorpay/webhook.ts, both of which are server-only and must stay that
 * way. Never add a read of either to this file.
 *
 * Written out in full, not built up from a variable: Next only inlines an
 * environment variable into the browser bundle where it can see the literal
 * `process.env.NAME` expression.
 */

/**
 * The prefix Razorpay gives every key issued against a test account. Live keys
 * are `rzp_live_`.
 */
const TEST_KEY_PREFIX = "rzp_test";

/** The publishable key id, or null when this deployment has none configured. */
export function razorpayKeyId(): string | null {
  const value = (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "").trim();

  return value.length > 0 ? value : null;
}

/**
 * Whether money moving through this deployment is imaginary.
 *
 * Read by the dashboard so a test payment can never be mistaken for a real
 * one. It answers on the KEY rather than on NODE_ENV or VERCEL_ENV, because
 * the key is what actually decides: a production deployment configured with a
 * test key takes no money, and a preview configured with a live key takes real
 * money from whoever is looking at it. The environment is a guess about which
 * key is in use; this is the key.
 *
 * False when nothing is configured. That case is not "live", it is "no
 * checkout at all", and it is reported separately by razorpayKeyId() returning
 * null — a "TEST MODE" badge over a checkout that cannot open would be the
 * wrong warning.
 */
export function isRazorpayTestMode(): boolean {
  return razorpayKeyId()?.startsWith(TEST_KEY_PREFIX) ?? false;
}
