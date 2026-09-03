import { randomInt } from "node:crypto";

/**
 * Invite codes.
 *
 * WHY NOT A SEQUENTIAL ID: an invite link is the only credential a guest has.
 * There is no login on the guest side, so whoever holds the URL can open the
 * card — which means the code is the access control. A sequential id would let
 * anyone who received one invitation walk the whole table by adding one, and
 * read every other host's event: their names, their venue, their date. A random
 * code makes that walk useless; guessing an unseen one is the only way in, and
 * the alphabet below is sized so that is not worth attempting.
 *
 * WHY THESE CHARACTERS: codes get read aloud down a phone, copied off a
 * WhatsApp message and typed by hand, so the look-alikes are gone — no 0 or o,
 * no 1, l or i. What is left is 31 symbols, and 31^8 is about 8.5e11 codes; at
 * eight characters a random guess lands on a real event about once in a
 * billion tries even after ten thousand events exist.
 */
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

const CODE_LENGTH = 8;

/**
 * Generates one invite code.
 *
 * SERVER ONLY, and never during render. `node:crypto` does not exist in the
 * browser, so importing this into a Client Component fails the build rather
 * than silently falling back to something weaker. Calling it during render
 * would also be wrong on its own terms: a component that mints a fresh code
 * every time it re-renders produces a different link on the server than in the
 * browser, and hydration tears. Call it in a server action or route handler,
 * once, and store the result.
 *
 * `randomInt` is rejection-sampled by Node, so every character is uniformly
 * likely — `% ALPHABET.length` over a raw byte would quietly favour the first
 * few letters and shrink the space this depends on.
 */
export function generateInviteCode(): string {
  let code = "";

  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }

  return code;
}

/**
 * Whether a string could be one of our codes.
 *
 * Worth checking before a lookup: it turns a malformed URL into a 404 without a
 * database round trip, and keeps anything that is not in the alphabet above out
 * of the query entirely.
 */
export function isValidInviteCode(candidate: string): boolean {
  if (candidate.length !== CODE_LENGTH) {
    return false;
  }

  return [...candidate].every((character) => ALPHABET.includes(character));
}
