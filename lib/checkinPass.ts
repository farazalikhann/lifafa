/**
 * What a check-in pass looks like, and how the door reads one.
 *
 * Plain functions with no server imports, so the scanner in the browser and the
 * check-in helper on the server share one definition of a token. They cannot
 * live in lib/db/guests.ts: a "use server" module may only export async
 * functions, and everything it exports becomes callable from a browser.
 */

/**
 * gen_random_uuid()::text, which is exactly what 0006 mints: lowercase hex,
 * hyphenated 8-4-4-4-12.
 */
const TOKEN_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** True when the value could be a token the database issued. */
export function isCheckinToken(value: string): boolean {
  return TOKEN_PATTERN.test(value);
}

/**
 * The token inside whatever the camera read, or null when it is not a pass.
 *
 * Any origin is accepted. A pass carries the address the guest opened their
 * invitation on — the live site, a preview deploy, localhost while testing —
 * and the token alone is what the database looks up. The path is what has to
 * match: /checkin/<token>, with nothing before it and nothing after.
 */
export function tokenFromScan(text: string): string | null {
  let path: string;

  try {
    path = new URL(text.trim()).pathname;
  } catch {
    return null;
  }

  const match = /^\/checkin\/([^/]+)\/?$/.exec(path);

  if (match === null) {
    return null;
  }

  let token: string;

  try {
    token = decodeURIComponent(match[1]).toLowerCase();
  } catch {
    return null;
  }

  return isCheckinToken(token) ? token : null;
}

/** Arrival times are pinned to India so they read the same on every phone at the door. */
const TIME_FORMAT: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
};

/** "7:42 PM", or null for a time that is missing or unreadable. */
export function formatArrivalTime(iso: string | null): string | null {
  if (iso === null) {
    return null;
  }

  const parsed = new Date(iso);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-IN", TIME_FORMAT)
    .format(parsed)
    .replace(/[\u202F\u00A0]/g, " ")
    .replace(
      /\s*(am|pm)\s*$/i,
      (_match, period: string) => ` ${period.toUpperCase()}`,
    );
}
