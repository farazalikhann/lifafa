import { NextResponse, type NextRequest } from "next/server";
import {
  isAuthPKCECodeVerifierMissingError,
  type EmailOtpType,
} from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Where a magic link lands.
 *
 * Two shapes of link arrive here, and both end with the session cookies set.
 * This is a route handler rather than a page because it can write cookies,
 * which is exactly what both need to do.
 *
 * `token_hash` is the one the email template sends, and the one that works on a
 * phone. Verifying it needs nothing from the browser that asked for the link,
 * which matters because the Gmail app opens links in its own built-in browser —
 * a different cookie jar from the Safari or Chrome tab the host signed in from.
 *
 * `code` is Supabase's default PKCE link. Exchanging it needs a verifier cookie
 * written when the link was requested, so it only succeeds in that same
 * browser. It is still accepted for links already sitting in inboxes, and in
 * case the template is ever reset to the default.
 *
 * Nothing here assumes email. The same exchange completes a phone OTP flow when
 * that arrives — this file does not need to change for it.
 */

const DEFAULT_DESTINATION = "/dashboard";

/** The verification types a sign in email can carry. */
const EMAIL_OTP_TYPES: ReadonlySet<string> = new Set<EmailOtpType>([
  "email",
  "magiclink",
  "signup",
]);

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
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
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

  const supabase = await createClient();

  if (tokenHash !== null && type !== null) {
    if (!EMAIL_OTP_TYPES.has(type)) {
      return NextResponse.redirect(`${origin}/login?error=link`);
    }

    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });

    if (error !== null) {
      /* Server side only: the message names tokens and internals. */
      console.error("[auth] token verification failed:", error);
      return NextResponse.redirect(`${origin}/login?error=expired`);
    }

    return NextResponse.redirect(`${origin}${destination}`);
  }

  if (code === null) {
    return NextResponse.redirect(`${origin}/login?error=link`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error !== null) {
    /*
      Told apart from an expired link because the fix is different: the link
      itself was fine, it was opened somewhere that never asked for it.
    */
    if (isAuthPKCECodeVerifierMissingError(error)) {
      console.error("[auth] code opened in a different browser:", error);
      return NextResponse.redirect(`${origin}/login?error=browser`);
    }

    console.error("[auth] code exchange failed:", error);
    return NextResponse.redirect(`${origin}/login?error=expired`);
  }

  return NextResponse.redirect(`${origin}${destination}`);
}
