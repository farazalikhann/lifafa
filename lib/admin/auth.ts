import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_COOKIE_NAME,
  verifyAdminToken,
  type AdminSession,
} from "@/lib/admin/session";

/**
 * The gate as a page sees it.
 *
 * middleware.ts already turns an unauthenticated request for /admin into a
 * redirect before any of this renders, so in normal operation these functions
 * never refuse anybody. They exist anyway, and the reason is worth stating:
 * middleware is configured by a matcher, and a matcher is a regex in a file
 * somebody will edit one day. A route that falls out of it stops being guarded
 * silently — no error, no failing build, just a page that quietly serves every
 * host's revenue to whoever asks.
 *
 * So the gate is checked twice, in two independent places, and the second
 * check is the one that is impossible to route around: it runs inside the page
 * that is about to do the reading.
 */

/** The current admin session, or null. Never throws, never redirects. */
export async function adminSession(): Promise<AdminSession | null> {
  const store = await cookies();

  return verifyAdminToken(store.get(ADMIN_COOKIE_NAME)?.value);
}

/**
 * The current admin session, or a redirect to the login page.
 *
 * Call this at the top of every page under /admin, before any query runs. It
 * does not return on failure — `redirect` throws — so anything after the call
 * has a verified session by construction.
 */
export async function requireAdminSession(): Promise<AdminSession> {
  const session = await adminSession();

  if (session === null) {
    redirect("/admin/login");
  }

  return session;
}
