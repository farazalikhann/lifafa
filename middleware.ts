import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Session refresh, and the gate in front of the dashboard.
 *
 * Two jobs, and the order matters. Supabase access tokens are short-lived; the
 * refresh happens here because middleware is the one place that runs before
 * every render and can still write a cookie. A server component cannot — the
 * headers are settled by the time it runs — which is why lib/supabase/server.ts
 * swallows its cookie writes and leans on this file instead.
 *
 * getUser(), not getSession(): getSession reads the cookie and believes it,
 * while getUser revalidates the token against Supabase. A gate that trusts an
 * unverified cookie is a gate anyone can forge their way through.
 */

/** Everything under these is host-only. */
const PROTECTED_PREFIXES = ["/dashboard"];

/**
 * Public, and deliberately listed rather than inferred.
 *
 * /i/[inviteCode] is the guest's whole experience and must never meet a sign-in
 * prompt — a guest has no account to sign into. /create is public too: anyone
 * may build a card, and the prompt comes at save time.
 */
function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function middleware(request: NextRequest) {
  /*
    The response is created up front and handed to the cookie writer, because
    the refreshed token has to be set on the object that is actually returned.
    Building a fresh NextResponse at the end would drop whatever Supabase wrote.
  */
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  /*
    Without configuration there is no session to refresh and no way to verify
    anyone. Failing open here would let an unauthenticated visitor into the
    dashboard, so the protected routes are closed and the public ones are left
    alone.
  */
  if (
    url === undefined ||
    url.length === 0 ||
    anonKey === undefined ||
    anonKey.length === 0
  ) {
    if (isProtected(request.nextUrl.pathname)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "config");
      return NextResponse.redirect(loginUrl);
    }

    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({ request });

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  /*
    Called for its side effect as much as its answer: this is what rotates an
    expiring token and writes the new cookie through setAll above. Skipping it
    on public routes would mean a host's session quietly expiring while they
    sat on the editor.
  */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user === null && isProtected(request.nextUrl.pathname)) {
    const loginUrl = new URL("/login", request.url);
    /*
      Carries where they were headed, so signing in returns them there rather
      than dumping them at a generic dashboard. Stored as a path only — see the
      callback route for why an absolute URL here would be an open redirect.
    */
    loginUrl.searchParams.set(
      "redirectTo",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );

    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  /*
    Everything except Next's own assets, image files and sounds. The session
    refresh has to run broadly — a host can land anywhere — but running it on
    every static chunk would add a token check to each one.
  */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3)$).*)",
  ],
};
