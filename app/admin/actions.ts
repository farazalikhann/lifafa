"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { compare } from "bcryptjs";
import { adminCredentials } from "@/lib/admin/credentials";
import type { AdminLoginState } from "@/lib/admin/loginState";
import {
  blockedForSeconds,
  clearFailures,
  recordFailure,
  requestIp,
} from "@/lib/admin/rateLimit";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_COOKIE_OPTIONS,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  mintAdminToken,
} from "@/lib/admin/session";

/**
 * Signing in and out of the admin dashboard.
 *
 * ONE MESSAGE FOR EVERY WAY OF BEING WRONG. A wrong username, a wrong
 * password, an unconfigured environment and a malformed form all answer
 * "Invalid credentials". Telling someone the username was right is telling
 * them which half of the problem to work on, and this dashboard has exactly
 * one username to find.
 *
 * The same idea applied to time, which is the part that is easy to miss: the
 * bcrypt comparison below runs whether or not the username matched. Skipping
 * it on a wrong username would make that case answer in a millisecond and a
 * right one in eighty, and an attacker who can time the difference has been
 * told the username without ever being shown it.
 */

/*
  The state shape and its initial value live in lib/admin/loginState.ts, not
  here. A "use server" module may export only async functions — each export
  becomes a callable endpoint — so a constant beside these would fail the
  build. See that file.
*/

/** The one thing a failed sign in is ever told. */
const GENERIC_FAILURE = "Invalid credentials";

/**
 * A comparison that takes the same time whatever the difference.
 *
 * `===` on strings stops at the first byte that differs, so the time it takes
 * leaks how much of the value was right — enough, over many requests, to
 * recover a secret one character at a time. This XORs every byte and looks at
 * the answer once, at the end.
 *
 * Lengths are compared up front and that is deliberate rather than an
 * oversight: a length is not a secret here (the username's length is already
 * implied by a dozen other things) and the alternative — comparing a short
 * value against a long one — is where the subtle bugs live.
 */
function timingSafeEquals(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);

  if (left.length !== right.length) {
    return false;
  }

  let difference = 0;

  for (let i = 0; i < left.length; i += 1) {
    difference |= left[i] ^ right[i];
  }

  return difference === 0;
}

/**
 * A bcrypt hash of nothing in particular, at the cost this project uses.
 *
 * Compared against when the environment is unconfigured, so that a dashboard
 * with no ADMIN_PASSWORD_HASH set takes exactly as long to refuse a sign in as
 * one with a real hash. Without it, "not configured yet" would be visible from
 * the outside as a suspiciously fast no.
 *
 * It is not a password and nothing can be signed in with it: the username
 * check has already failed by then, and the two results are combined below.
 */
const DUMMY_HASH =
  "$2b$12$9AVuXtnQoHxosYaDF9Knm.AS.ttFfekfAoFmL3SbzF0vz4rk.dDla";

export async function signIn(
  _previous: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const requestHeaders = await headers();
  const ip = requestIp(requestHeaders);

  /*
    Checked before anything else, and before a single bcrypt round is spent. A
    limiter that runs after the expensive work still lets an attacker consume
    the CPU it was meant to protect.
  */
  const waitSeconds = blockedForSeconds(ip);

  if (waitSeconds > 0) {
    const minutes = Math.ceil(waitSeconds / 60);

    /*
      Not the generic message, and on purpose. This says nothing about the
      credentials — it is a fact about this address, which whoever is at that
      address already knows. Answering "Invalid credentials" here would leave
      the owner retyping a password that is perfectly correct.
    */
    return {
      error: `Too many failed attempts. Try again in ${minutes} minute${
        minutes === 1 ? "" : "s"
      }.`,
    };
  }

  const username = formData.get("username");
  const password = formData.get("password");

  if (typeof username !== "string" || typeof password !== "string") {
    recordFailure(ip);
    return { error: GENERIC_FAILURE };
  }

  const credentials = adminCredentials();

  /*
    Both halves are computed before either is judged. `usernameMatches` is a
    constant-time comparison; the bcrypt call is the expensive one and runs
    unconditionally, against the real hash when there is one and against a
    stand-in when there is not. Only then are the two anded together.
  */
  const usernameMatches =
    credentials !== null &&
    timingSafeEquals(username.trim(), credentials.username);

  const passwordMatches = await compare(
    password,
    credentials?.passwordHash ?? DUMMY_HASH,
  );

  if (!usernameMatches || !passwordMatches) {
    recordFailure(ip);

    /* Server side only: the visitor is told nothing beyond the generic line. */
    console.warn(`[admin] failed sign in from ${ip}`);

    return { error: GENERIC_FAILURE };
  }

  const token = await mintAdminToken(credentials.username);

  /*
    Null means ADMIN_SESSION_SECRET is missing or too short. The password was
    right, and there is still no way to hand out a session that anything could
    later verify — so this fails closed with the same message rather than
    letting someone in on an unsigned cookie.
  */
  if (token === null) {
    return { error: GENERIC_FAILURE };
  }

  clearFailures(ip);

  const store = await cookies();

  store.set(ADMIN_COOKIE_NAME, token, {
    ...ADMIN_COOKIE_OPTIONS,
    /*
      Matched to the expiry signed into the token. The browser dropping it at
      the same moment is a courtesy, not the enforcement — see the note on
      mintAdminToken for why the signed expiry is the one that decides.
    */
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });

  console.info(`[admin] signed in from ${ip}`);

  /*
    Throws, so nothing after it runs. The cookie above is already on the
    response Next is preparing, and the redirect carries it.
  */
  redirect("/admin");
}

/**
 * Clears the session cookie and returns to the login page.
 *
 * `delete` with the same name and path the cookie was written on. A delete
 * that names only the cookie writes its clearing header at the default path
 * and the browser keeps the one scoped to /admin — a logout that appears to
 * work and leaves the session standing.
 */
export async function signOut(): Promise<void> {
  const store = await cookies();

  store.delete({
    name: ADMIN_COOKIE_NAME,
    path: ADMIN_COOKIE_OPTIONS.path,
  });

  redirect("/admin/login");
}
