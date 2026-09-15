/**
 * Where Lifafa lives, and how an invite code becomes a link.
 *
 * Resolved rather than written down. A domain typed into this file used to be
 * the origin of every invite link, which left them all pointing at an address
 * that did not exist yet, and testing on any other deployment meant editing it
 * by hand. The origin is now the first of these that answers:
 *
 * 1. NEXT_PUBLIC_SITE_URL. The explicit override, for the real domain.
 * 2. The deployment's public Vercel address. next.config.ts picks it from
 *    Vercel's system variables and passes it in as LIFAFA_VERCEL_HOST, because
 *    those variables are server-only and this file also runs in the browser.
 * 3. The page's own origin, in the browser only.
 *
 * Steps 1 and 2 are inlined at build time into the server and browser bundles
 * alike, so both runtimes agree on them and a server render cannot put one link
 * in the markup and another in the hydrated tree. Step 3 has no server
 * equivalent in this file: the request's own host is that equivalent, and it
 * lives in lib/serverSiteOrigin.ts, since next/headers cannot be imported here.
 *
 * No `node:` imports here, deliberately: lib/inviteCode.ts would have been the
 * natural home, but it pulls in `node:crypto` to mint codes and so cannot be
 * imported from a Client Component at all.
 */

/** Anything that already names a scheme, such as "https://" or "ftp://". */
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;

/**
 * An address reduced to its origin: scheme and host, no path, no trailing
 * slash. Null for an empty value, or one that is not an http(s) address.
 *
 * Vercel supplies hosts without a scheme, so a bare host is taken as https.
 * URL.origin is what guarantees the shape, whatever was typed: a trailing slash,
 * a stray path or an upper case host all come out the same.
 */
function toOrigin(raw: string | undefined): string | null {
  const value = raw?.trim() ?? "";

  if (value.length === 0) {
    return null;
  }

  try {
    const url = new URL(HAS_SCHEME.test(value) ? value : `https://${value}`);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

/**
 * Steps 1 and 2: the origin this build was configured with, identical on the
 * server and in the browser. Null when neither is set, as under `next dev`.
 *
 * Both reads are written out in full. Next only inlines an environment variable
 * where it can see the literal `process.env.NAME` expression.
 */
export function configuredSiteOrigin(): string | null {
  return (
    toOrigin(process.env.NEXT_PUBLIC_SITE_URL) ??
    toOrigin(process.env.LIFAFA_VERCEL_HOST)
  );
}

/**
 * All three steps, for code running in the browser. Null only on a server with
 * nothing configured; server code wants serverSiteOrigin() instead.
 *
 * Not for anything rendered on the server and then hydrated. Where step 3 is
 * the answer, the server has no window to agree with.
 */
export function siteOrigin(): string | null {
  return (
    configuredSiteOrigin() ??
    (typeof window === "undefined" ? null : window.location.origin)
  );
}

/**
 * The absolute link a guest opens. The only place this shape is written.
 *
 * Joined defensively, so that no origin, however it arrived, can produce a
 * double slash before the path: trailing slashes are trimmed, and the code is
 * encoded so it can never contribute one of its own.
 */
export function inviteUrl(inviteCode: string, origin: string): string {
  return `${origin.replace(/\/+$/, "")}/i/${encodeURIComponent(inviteCode)}`;
}
