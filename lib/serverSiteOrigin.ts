import { headers } from "next/headers";
import { configuredSiteOrigin, DEFAULT_SITE_ORIGIN } from "@/lib/siteUrl";

/**
 * The site's origin, for server code building a link someone will open.
 *
 * The configured origin first, exactly as lib/siteUrl.ts resolves it. With
 * nothing configured, the host this request actually arrived on, which is the
 * server's counterpart to window.location.origin. That is what lets `next dev`
 * hand out working links on whatever port or network address it was opened on,
 * with nothing to edit. Failing that — a request with no readable host at all —
 * the canonical domain, which is better than an exception on a page a guest is
 * looking at.
 *
 * On Vercel the configured origin always answers first, and that matters: a
 * host who reaches the dashboard through a per-deployment address would
 * otherwise copy a link to that address, which sits behind Vercel's login. With
 * NEXT_PUBLIC_SITE_URL set in Production, a host who arrives on
 * www.getlifafa.co.in still copies a link on the bare domain, so no invitation
 * ever goes out naming a host that only redirects.
 *
 * Server only. next/headers fails the build if a Client Component imports this,
 * which is the point of keeping it out of lib/siteUrl.ts.
 */
export async function serverSiteOrigin(): Promise<string> {
  const configured = configuredSiteOrigin();

  if (configured !== null) {
    return configured;
  }

  const requestHeaders = await headers();

  /*
    A proxy in front of the server names the original host and scheme in the
    forwarded headers, as a list when there is more than one hop. The first
    entry is the one the visitor typed.
  */
  const host = firstEntry(requestHeaders.get("x-forwarded-host")) ??
    firstEntry(requestHeaders.get("host"));
  const scheme = firstEntry(requestHeaders.get("x-forwarded-proto")) ?? "http";

  if (host === null || (scheme !== "http" && scheme !== "https")) {
    return DEFAULT_SITE_ORIGIN;
  }

  /* Through URL, so a malformed Host header cannot smuggle a path in. */
  return new URL(`${scheme}://${host}`).origin;
}

function firstEntry(value: string | null): string | null {
  const first = value?.split(",")[0]?.trim() ?? "";
  return first.length > 0 ? first : null;
}
