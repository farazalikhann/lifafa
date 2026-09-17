import { createAdminClient } from "@/lib/supabase/admin";
import type { CouponRow } from "@/types/database";

/**
 * Deciding whether one typed code may be used, right now.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * A PLAIN MODULE, NOT "use server", and that is the same decision
 * lib/db/applyPayment.ts documents at length. Every export of a "use server"
 * file becomes an HTTP endpoint with an id. This function reads the coupons
 * table with the service-role key and hands back the row — the discount, the
 * limit, the affiliate's commission — and there is no version of that which
 * should be callable from a browser.
 *
 * Its two callers are both server-side imports: the preview action and the
 * order creation, in lib/db/payments.ts. Both of those have already identified
 * the host before they get here.
 * ────────────────────────────────────────────────────────────────────────────
 */

/*
  The guard lib/supabase/admin.ts opens with, repeated here for the same reason.
  This module cannot function in a browser — it would have no key — but failing
  loudly on import beats returning "no such coupon" for every code because the
  query silently found nothing.
*/
if (typeof window !== "undefined") {
  throw new Error(
    "lib/coupons/lookup.ts was imported into client code. It reads the coupons table with a key that bypasses Row Level Security and must only ever run on the server.",
  );
}

/**
 * Why a code cannot be used, or the row saying it can.
 *
 * The reasons are distinguished because a host deserves to be told which one it
 * is — "this code has expired" is actionable and "invalid code" is not, and
 * none of them reveals anything about a code the person did not already type.
 * That is the difference from the admin login in app/admin/actions.ts, where
 * every failure gets one message: there, distinguishing them would tell an
 * attacker which half of a secret they had guessed. Here the "secret" is a
 * promotional code somebody was handed on purpose.
 */
export type CouponLookup =
  | { kind: "ok"; coupon: CouponRow }
  | { kind: "unknown" }
  | { kind: "inactive" }
  | { kind: "expired" }
  | { kind: "exhausted" }
  /** The query itself failed. Distinct from "no such code". */
  | { kind: "error" };

/** What a code looks like once normalised: uppercase, trimmed, no stray spaces. */
export function normaliseCouponCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/**
 * The shape 0010's check constraint allows.
 *
 * Tested before the round trip, exactly as isValidInviteCode is: anything
 * outside this cannot match a stored row, so a pasted sentence becomes an
 * "unknown code" without troubling the database — and cannot become a very long
 * string sitting in a query either.
 */
const CODE_PATTERN = /^[A-Z0-9-]{4,32}$/;

export function isPossibleCouponCode(code: string): boolean {
  return CODE_PATTERN.test(code);
}

/**
 * Looks a code up and says whether it may be used.
 *
 * THE ORDER OF THE CHECKS IS THE ORDER OF THE MESSAGES, deliberately: inactive
 * first, then expired, then exhausted, so a code that is all three reports the
 * most fundamental reason rather than an incidental one.
 *
 * EVERY CHECK IS ON THE STORED ROW. Nothing here consults an argument beyond
 * the code string, and the code string is used for one thing only — finding the
 * row. The discount is not computed here at all; see lib/coupons/quote.ts.
 *
 * NOT A RESERVATION. Passing this does not hold a use: `used_count` is advanced
 * only by the webhook, on a captured payment. Two hosts can therefore both be
 * told the last remaining use is theirs and both pay. See the note on
 * applyCapturedPayment, which logs that overrun rather than refusing money that
 * has already moved.
 */
export async function findUsableCoupon(
  rawCode: string,
): Promise<CouponLookup> {
  const code = normaliseCouponCode(rawCode);

  if (!isPossibleCouponCode(code)) {
    return { kind: "unknown" };
  }

  const admin = createAdminClient();

  const { data: coupon, error } = await admin
    .from("coupons")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (error !== null) {
    console.error(`[coupons] could not look up ${code}:`, error);
    return { kind: "error" };
  }

  if (coupon === null) {
    return { kind: "unknown" };
  }

  if (!coupon.is_active) {
    return { kind: "inactive" };
  }

  /*
    Compared here as well as in redeem_coupon()'s WHERE clause. Two clocks, and
    they are allowed to disagree by the width of a request: this one decides
    what the host is shown and charged, and the database's decides whether the
    use is counted. The database is the one that matters for the limit.
  */
  if (coupon.expires_at !== null && new Date(coupon.expires_at) <= new Date()) {
    return { kind: "expired" };
  }

  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
    return { kind: "exhausted" };
  }

  return { kind: "ok", coupon };
}

/**
 * The sentence a host reads when a code is refused.
 *
 * Written for someone holding a code they believe in, so each one says what to
 * do next rather than only what went wrong. "error" gets the vaguest message
 * because it is the only one that is not about their code.
 */
export function couponRefusalMessage(
  kind: Exclude<CouponLookup["kind"], "ok">,
): string {
  switch (kind) {
    case "unknown":
      return "That code was not recognised. Check it for typos.";
    case "inactive":
      return "That code is no longer available.";
    case "expired":
      return "That code has expired.";
    case "exhausted":
      return "That code has already been fully used.";
    case "error":
      return "Could not check that code, please try again.";
  }
}
