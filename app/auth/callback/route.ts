import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Where a magic link lands.
 *
 * Supabase sends the host here with a one-time `code`; exchanging it sets the
 * session cookies, and from then on the middleware keeps them fresh. This is a
 * route handler rather than a page because it can write cookies, which is
 * exactly what the exchange needs to do.
 *
 * Nothing here assumes email. The same exchange completes a phone OTP flow when
 * that arrives — this file does not need to change for it.
 */

const DEFAULT_DESTINATION = "/dashboard";

/**
 * Only same-origin paths are honoured as a destination.
 *
 * `redirectTo` arrives in a URL, which means an attacker can put anything in
 * it. Without this check a link to our own domain could bounce a freshly
 * signed-in host to somewhere else entirely — an open redirect, and a
 * convincing one precisely because the first hop was genuine. A value must
 * start with a single slash: "//evil.example" is protocol-relative and would
 * leave the site.
 */
function safeDestination(raw: string | null): string {
  if (raw === null || !raw.startsWith("/") || raw.startsWith("//")) {
    return DEFAULT_DESTINATION;
  }

  return raw;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const destination = safeDestination(searchParams.get("redirectTo"));

  /*
    Supabase reports a refused or expired link with its own error parameters
    rather than a code. Carried through as our own readable reason instead of
    echoing theirs, which is written for developers.
  */
  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");

  if (providerError !== null) {
    console.error("[auth] provider returned an error:", providerError);
    return NextResponse.redirect(`${origin}/login?error=link`);
  }

  if (code === null) {
    return NextResponse.redirect(`${origin}/login?error=link`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error !== null) {
    /* Server side only: the message names tokens and internals. */
    console.error("[auth] code exchange failed:", error);
    return NextResponse.redirect(`${origin}/login?error=expired`);
  }

  return NextResponse.redirect(`${origin}${destination}`);
}
