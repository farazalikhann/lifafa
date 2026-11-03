"use client";

import { useEffect, useState, type ReactElement } from "react";
import Link from "next/link";

/**
 * The cookie @supabase/ssr keeps a session in: sb-<project ref>-auth-token,
 * split into .0, .1 … when it is long. Not httpOnly, by the library's design,
 * so the page can see it without loading the Supabase client.
 */
const SESSION_COOKIE = (() => {
  try {
    const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname.split(".")[0];
    return `sb-${ref}-auth-token`;
  } catch {
    return null;
  }
})();

/** Whether this browser holds a session cookie: signed in, as far as a link needs to know. */
function hasSession(): boolean {
  if (SESSION_COOKIE === null) {
    return false;
  }

  return document.cookie
    .split(";")
    .some((part) => {
      const name = part.trim().split("=", 1)[0];
      return name === SESSION_COOKIE || name === `${SESSION_COOKIE}.0`;
    });
}

/**
 * "Sign in", or "My invitations" for a host who is signed in.
 *
 * DECIDED IN THE BROWSER, after the page is up, so the home page itself reads
 * no cookie and is the same HTML for everyone: built once and served from the
 * edge's cache. A signed-in host sees "Sign in" for the moment before this
 * runs. The cookie is only looked at, not checked: one that has gone stale
 * still says "My invitations", and /dashboard sends that host on to /login,
 * which is where "Sign in" would have taken them.
 */
export default function AccountLink({ className }: { className: string }): ReactElement {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(hasSession());
  }, []);

  return (
    <Link href={signedIn ? "/dashboard" : "/login"} className={className}>
      {signedIn ? "My invitations" : "Sign in"}
    </Link>
  );
}
