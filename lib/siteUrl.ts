/**
 * Where Lifafa lives, and how an invite code becomes a link.
 *
 * ONE FILE OWNS THE DOMAIN. The string "getlifafa.co.in" is written once, just
 * below, and nowhere else in the codebase. Everything that needs the host —
 * metadata, the sitemap, robots.txt, the check-in QR, calendar UIDs, the
 * support address — reaches it through this file, so moving the site again is
 * an edit here and a redeploy rather than a search across the tree.
 *
 * The origin is resolved rather than assumed. It is the first of these that
 * answers:
 *
 * 1. NEXT_PUBLIC_SITE_URL. The explicit override, for the real domain, and the
 *    thing to set when a deployment must speak for an address it cannot see.
 * 2. The deployment's public Vercel address. next.config.ts picks it from
 *    Vercel's system variables and passes it in as LIFAFA_VERCEL_HOST, because
 *    those variables are server-only and this file also runs in the browser.
 *    This is what keeps a preview deploy pointing at itself.
 * 3. DEFAULT_SITE_ORIGIN, the canonical domain. The last word, so that nothing
 *    that needs an absolute URL can ever end up without one.
 *
 * All three are settled at build time — steps 1 and 2 are inlined into the
 * server and browser bundles alike — so both runtimes agree and a server render
 * cannot put one link in the markup and another in the hydrated tree.
 *
 * WHY THE FALLBACK IS THE BARE DOMAIN AND NOT www. www.getlifafa.co.in
 * redirects to getlifafa.co.in, so the bare host is the one address that is
 * never a redirect. Every link this file builds is one a guest opens weeks
 * later, or a scraper fetches once and caches; neither should have to follow a
 * hop to get there.
 *
 * No `node:` imports here, deliberately: lib/inviteCode.ts would have been the
 * natural home, but it pulls in `node:crypto` to mint codes and so cannot be
 * imported from a Client Component at all.
 */

/**
 * The domain Lifafa is known by, scheme and path stripped off.
 *
 * Separate from the origin below because two things want the host on its own
 * and neither is a URL: the domain half of a calendar UID (lib/calendar.ts)
 * and the support mailbox (components/landing/HelpFooter.tsx). Both are
 * deliberately NOT env-driven — see those files for why.
 */
export const LIFAFA_DOMAIN = "getlifafa.co.in";

/** The canonical origin, used whenever nothing else names an address. */
export const DEFAULT_SITE_ORIGIN = `https://${LIFAFA_DOMAIN}`;

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
 * Callers who need a definite answer want canonicalSiteOrigin() instead. This
 * one stays nullable because lib/serverSiteOrigin.ts has a better third step
 * than the canonical domain — the host the request actually arrived on — and
 * can only reach for it if it can tell "nothing configured" apart from "the
 * fallback".
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
 * THE SITE'S ADDRESS. All three steps, and never null.
 *
 * The single source of truth for anything that must name an absolute URL with
 * no request in hand: metadataBase, the sitemap, robots.txt, and the check-in
 * QR. Safe in a Client Component, a Server Component and a route handler
 * alike, because every step is settled at build time.
 *
 * Server code that is building a link for the person making the request, and
 * would rather honour the address they are actually on, wants
 * serverSiteOrigin() instead.
 */
export function canonicalSiteOrigin(): string {
  return configuredSiteOrigin() ?? DEFAULT_SITE_ORIGIN;
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

/**
 * The absolute address a guest's check-in QR points at, and the only place
 * that shape is written. Built on canonicalSiteOrigin() by its one caller;
 * see components/invite/GuestPass.tsx for why it is not the page's own origin.
 */
export function checkinUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, "")}/checkin/${encodeURIComponent(token)}`;
}
