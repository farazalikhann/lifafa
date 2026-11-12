import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exits, isNewAccount, safeDestination } from "@/lib/auth/signInExits";

/**
 * Where an email code sign in finishes.
 *
 * The code itself is checked in the browser (components/auth/EmailCodeForm.tsx),
 * which writes the session cookies. Supabase limits code checks per IP
 * address, so they are made from the visitor's own connection rather than
 * from this server's, which every visitor would share.
 *
 * The browser then comes here, and leaves exactly as a return from Google
 * does (app/auth/callback/route.ts): to the same `redirectTo`, so a card on
 * its way to /create (a handoff, or one stashed in this browser) goes with
 * it, and with the same marks for Clarity's login_success and the ads'
 * CompleteRegistration (lib/auth/signInExits.ts).
 *
 * getUser(), not getSession(): the session is checked with Supabase, so a
 * host is only sent on when the server can really see them signed in. If it
 * cannot (cookies blocked in this browser), they go back to /login with the
 * destination kept, rather than on to a page that would send them back.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const { fail, succeed } = exits(
    origin,
    safeDestination(searchParams.get("redirectTo")),
  );

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error !== null || data.user === null) {
    console.error("[auth] email code accepted, but no session reached the server:", error);
    return fail("session");
  }

  return succeed(isNewAccount(data.user));
}
