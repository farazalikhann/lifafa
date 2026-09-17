import { randomInt } from "node:crypto";

/**
 * A random coupon code, for when the admin leaves the field blank.
 *
 * WHY THE ALPHABET IS NOT THE ONE IN lib/inviteCode.ts, even though both mint
 * short codes people type by hand. An invite code is generated, stored and
 * pasted; nobody ever reads one aloud to a stranger. A coupon code is put in a
 * caption, printed on a card, and spoken down a phone — and 0010 requires
 * uppercase, so the lowercase look-alikes that file avoids are not the problem
 * here. Uppercase brings its own: O against 0, I against 1, and S against 5 in
 * some faces. All four are gone below.
 *
 * SERVER ONLY. `node:crypto` does not exist in the browser, so importing this
 * into a Client Component fails the build rather than falling back to
 * Math.random — which for a code worth money would be a code somebody can
 * predict from a handful of earlier ones.
 */

/** 30 symbols: A–Z and 2–9, less O, I, S and the digits that mimic them. */
const ALPHABET = "ABCDEFGHJKLMNPQRTUVWXYZ2346789";

/**
 * Ten characters.
 *
 * Longer than an invite code's eight, because the consequence of a guess is
 * different. Guessing an invite code shows you somebody's party; guessing a
 * coupon code costs the business money every time, and unlike an invitation a
 * coupon is a target worth grinding at. 30^10 is about 5.9e14.
 */
const CODE_LENGTH = 10;

/**
 * One random code.
 *
 * NOT CHECKED FOR COLLISION HERE, on purpose. `coupons.code` is unique, so the
 * database is what decides; the caller retries on a unique violation, exactly
 * as createEvent does for invite codes. Reasoning about the odds is a worse
 * answer than letting the constraint answer.
 *
 * `randomInt` is rejection-sampled by Node, so every character is uniformly
 * likely — `% ALPHABET.length` over a raw byte would quietly favour the first
 * few letters and shrink the space this depends on.
 */
export function generateCouponCode(): string {
  let code = "";

  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }

  return code;
}
