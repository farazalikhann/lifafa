/**
 * The admin session token: minted after a correct password, verified on every
 * request that touches /admin.
 *
 * WHY A SIGNED TOKEN AND NOT A SESSION TABLE. There is one principal and no
 * "sessions" worth listing, revoking individually or reasoning about. A signed
 * value in a cookie needs no storage, survives a serverless instance being
 * recycled between two clicks, and is the only design where middleware can
 * decide before a page renders without a database round trip per navigation.
 * The cost is that a token cannot be revoked one at a time — rotating
 * ADMIN_SESSION_SECRET revokes every one of them at once, which for a single
 * owner is the only revocation that was ever wanted.
 *
 * WHY WEB CRYPTO AND NOT node:crypto. This module is imported by middleware.ts,
 * which Next compiles for the Edge runtime, and `node:crypto` is not there.
 * `crypto.subtle` is, in both runtimes, so one implementation serves the gate
 * and the pages behind it — and a gate that verified tokens differently from
 * the pages it guards would be a gate with a second opinion.
 *
 * WHAT THE TOKEN IS NOT: it is not encrypted, and it is not meant to be.
 * Anyone holding it can read the username and the expiry inside. What they
 * cannot do is change either one, because the signature is over both and they
 * do not have the secret. Nothing secret is ever put in here.
 */

/** The cookie the token lives in. */
export const ADMIN_COOKIE_NAME = "lifafa_admin_session";

/**
 * Eight hours, in seconds.
 *
 * Long enough to cover a working day without a second sign in, short enough
 * that a laptop left open overnight is signed out by morning.
 */
export const ADMIN_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

/** The shortest secret worth calling a secret. */
const MIN_SECRET_LENGTH = 32;

/** What a valid token asserts. */
export interface AdminSession {
  /** The username the token was minted for. Signed, so it cannot be edited. */
  username: string;
  /** Expiry, as whole seconds since the epoch. */
  expiresAt: number;
}

/** The payload as it is actually serialised — short keys, small cookie. */
interface TokenPayload {
  u: string;
  exp: number;
}

/* ─────────────────────────── base64url ─────────────────────────── */

/*
  Written out by hand because `Buffer` does not exist in the Edge runtime and
  this module has to run there. btoa and atob do exist in both runtimes, and
  both speak binary strings, so the two conversions below are the whole
  adapter between them and the byte arrays Web Crypto works in.
*/

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Null for anything that is not base64url, rather than a throw.
 *
 * The return type names its backing buffer. `Uint8Array` on its own widens to
 * `Uint8Array<ArrayBufferLike>`, which could be backed by a SharedArrayBuffer
 * — and `crypto.subtle` will not take one of those, because a buffer another
 * thread can write to while it is being read is not something a signature
 * check can be made over.
 */
function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) {
    return null;
  }

  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");

  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
  } catch {
    return null;
  }
}

/* ─────────────────────────── The key ─────────────────────────── */

/**
 * The signing key, or null when ADMIN_SESSION_SECRET is missing or too short.
 *
 * Null rather than a throw, because both callers — the gate and the sign in —
 * have to fail closed on it, and a gate that throws is a gate serving a 500
 * where it meant to serve a redirect. A short secret is treated as no secret
 * at all: a guessable HMAC key is a forgeable session, and the whole dashboard
 * rests on this one value.
 */
async function signingKey(): Promise<CryptoKey | null> {
  const secret = process.env.ADMIN_SESSION_SECRET ?? "";

  if (secret.length < MIN_SECRET_LENGTH) {
    console.error(
      secret.length === 0
        ? "[admin] ADMIN_SESSION_SECRET is not set. The admin dashboard is closed until it is."
        : `[admin] ADMIN_SESSION_SECRET is ${secret.length} characters; it must be at least ${MIN_SECRET_LENGTH}. The admin dashboard is closed until it is.`,
    );

    return null;
  }

  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/* ─────────────────────────── Mint ─────────────────────────── */

/**
 * A token for this username, valid for eight hours. Null when unconfigured.
 *
 * The expiry is inside the signature rather than only on the cookie. A cookie's
 * Max-Age is a request to the browser and nothing more — trivially edited by
 * whoever holds the cookie jar — so the only expiry that decides anything is
 * the one under the HMAC.
 */
export async function mintAdminToken(username: string): Promise<string | null> {
  const key = await signingKey();

  if (key === null) {
    return null;
  }

  const payload: TokenPayload = {
    u: username,
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS,
  };

  const encoded = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(payload)),
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(encoded),
  );

  return `${encoded}.${base64UrlEncode(new Uint8Array(signature))}`;
}

/* ─────────────────────────── Verify ─────────────────────────── */

/**
 * The session a token proves, or null for anything at all wrong with it.
 *
 * NOTHING IS READ OUT OF THE TOKEN BEFORE THE SIGNATURE IS CHECKED. The order
 * of the steps below is the security property: split, verify, and only then
 * decode the payload. Reading the username first and verifying afterwards
 * would behave identically right up to the day somebody edits a line of it,
 * and by then the code no longer says which order was meant.
 *
 * `crypto.subtle.verify` rather than recomputing the HMAC and comparing
 * strings: it compares in constant time, so a forged signature takes as long
 * to refuse as a correct one and reveals nothing about how close it got.
 */
export async function verifyAdminToken(
  token: string | undefined,
): Promise<AdminSession | null> {
  if (token === undefined || token.length === 0) {
    return null;
  }

  const parts = token.split(".");

  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, encodedSignature] = parts;
  const signature = base64UrlDecode(encodedSignature);

  if (signature === null) {
    return null;
  }

  const key = await signingKey();

  if (key === null) {
    return null;
  }

  const isAuthentic = await crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    new TextEncoder().encode(encodedPayload),
  );

  if (!isAuthentic) {
    return null;
  }

  const payloadBytes = base64UrlDecode(encodedPayload);

  if (payloadBytes === null) {
    return null;
  }

  let payload: unknown;

  try {
    payload = JSON.parse(new TextDecoder().decode(payloadBytes));
  } catch {
    return null;
  }

  /*
    Checked rather than asserted, even though the signature has already passed.
    Authentic is not the same as well formed: a token minted by an older build,
    in a format this one no longer writes, is genuinely ours and still
    unreadable, and the honest answer to that is "no session" rather than a
    crash inside the gate.
  */
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const { u, exp } = payload as Partial<TokenPayload>;

  if (typeof u !== "string" || u.length === 0 || typeof exp !== "number") {
    return null;
  }

  if (exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  return { username: u, expiresAt: exp };
}

/* ─────────────────────────── The cookie ─────────────────────────── */

/** Scoped to /admin: see the note on ADMIN_COOKIE_OPTIONS. */
export const ADMIN_COOKIE_PATH = "/admin";

/**
 * How the cookie is written, in one place, so setting it and clearing it
 * cannot drift apart. A clear only takes effect when the name, path and flags
 * match the set exactly, and two literals in two files is how a logout ends up
 * leaving the cookie exactly where it was.
 *
 * httpOnly: no script on any Lifafa page can read this, so an XSS anywhere in
 *   the host-facing app cannot walk off with the owner's session.
 * secure: HTTPS only. Browsers treat http://localhost as a secure origin, so
 *   this does not get in the way of local development.
 * sameSite strict: never sent on a navigation that began on another site, so
 *   no link, form or image on a hostile page can act as the owner. The visible
 *   cost is that following a link to /admin from outside the site lands on the
 *   login page; opening /admin directly, or one more click, is already signed
 *   in.
 * path: scoped to /admin, so this is not attached to the hundreds of guest
 *   requests to /i/<code> that have no business carrying it.
 */
export const ADMIN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  path: ADMIN_COOKIE_PATH,
} as const;
