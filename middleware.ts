import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ADMIN_COOKIE_NAME, verifyAdminToken } from "@/lib/admin/session";

/**
 * Session refresh, and the two gates.
 *
 * THE HOST GATE, below, is the original job. Supabase access tokens are
 * short-lived; the refresh happens here because middleware is the one place
 * that runs before every render and can still write a cookie. A server
 * component cannot — the headers are settled by the time it runs — which is
 * why lib/supabase/server.ts swallows its cookie writes and leans on this file
 * instead.
 *
 * getUser(), not getSession(): getSession reads the cookie and believes it,
 * while getUser revalidates the token against Supabase. A gate that trusts an
 * unverified cookie is a gate anyone can forge their way through.
 *
 * THE ADMIN GATE is a different lock on a different door and is handled first,
 * before a single line of Supabase code runs. /admin is the owner's dashboard,
 * not a host's, and it has nothing to do with Supabase Auth: there is no user
 * row behind it and no session to refresh. Running the host path over it would
 * spend a network round trip per navigation to learn something irrelevant.
 */

/** Everything under these is host-only. */
const PROTECTED_PREFIXES = ["/dashboard"];

/** The owner's dashboard, and the one path inside it that is open. */
const ADMIN_PREFIX = "/admin";
const ADMIN_LOGIN_PATH = "/admin/login";

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

/** Whether this path belongs to the owner's dashboard at all. */
function isAdminPath(pathname: string): boolean {
  return (
    pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`)
  );
}

/**
 * Keeps /admin out of every index there is.
 *
 * A header rather than only a meta tag, because a meta tag is in the HTML and
 * the HTML is only reached by something that got past the gate. This is on the
 * redirect to the login page and on the login page itself — the two things a
 * crawler can actually see — as well as on every page behind it.
 *
 * `noindex` keeps it out of results, `nofollow` stops the links on it being
 * crawled, `noarchive` stops a cached copy being served from elsewhere.
 */
function withNoIndex<T extends NextResponse>(response: T): T {
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");

  return response;
}

/**
 * The owner's gate.
 *
 * VERIFIES, NEVER READS. verifyAdminToken recomputes the HMAC over the
 * payload and refuses anything whose signature does not match, so a cookie
 * someone wrote by hand — or edited to move its own expiry — is refused here
 * and never reaches a page. Nothing in this function trusts a single byte of
 * the cookie before that check has passed.
 *
 * FAILS CLOSED. verifyAdminToken answers null when ADMIN_SESSION_SECRET is
 * missing or too short, exactly as it does for a forged token, so a deployment
 * that forgot the variable has a dashboard nobody can open rather than one
 * anybody can.
 *
 * Returns null when the request is not for /admin at all, which is the signal
 * to carry on into the host path below.
 */
async function adminGate(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;

  if (!isAdminPath(pathname)) {
    return null;
  }

  const session = await verifyAdminToken(
    request.cookies.get(ADMIN_COOKIE_NAME)?.value,
  );

  if (pathname === ADMIN_LOGIN_PATH) {
    /*
      The one open path. Someone already signed in is sent on to the dashboard
      rather than shown a form they have no use for; everyone else gets the
      form.
    */
    return withNoIndex(
      session === null
        ? NextResponse.next({ request })
        : NextResponse.redirect(new URL(ADMIN_PREFIX, request.url)),
    );
  }

  if (session === null) {
    /*
      No `redirectTo`, unlike the host gate below. The host gate carries the
      destination so a magic link can come back to it; here the only thing on
      the other side is a dashboard with a handful of pages, and a query
      parameter that is fed straight back into a redirect is a category of bug
      worth simply not having.
    */
    return withNoIndex(
      NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, request.url)),
    );
  }

  return withNoIndex(NextResponse.next({ request }));
}

export async function middleware(request: NextRequest) {
  /*
    First, and with its own return. Everything below this line is Supabase Auth
    and belongs to hosts; the owner's dashboard shares none of it.
  */
  const adminResponse = await adminGate(request);

  if (adminResponse !== null) {
    return adminResponse;
  }

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

    api/razorpay/webhook is excluded for a different reason than the assets.
    Nothing in this file applies to it: it carries no session to refresh, it is
    not under /dashboard or /admin, and it authenticates itself by HMAC rather
    than by cookie. Left in, every delivery from Razorpay would wait on a
    getUser() round trip to Supabase before the route even started — latency
    added to a request whose whole job is to answer 200 quickly, and which
    Razorpay retries if it does not.
  */
  matcher: [
    "/((?!api/razorpay/webhook|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3)$).*)",
  ],
};
