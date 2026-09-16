/**
 * The owner's credentials, read from the environment and nowhere else.
 *
 * There is no admin table and no admin row. This dashboard has exactly one
 * principal — whoever owns Lifafa — and a single row in Postgres describing
 * them would be a row the service key can rewrite, a row that shows up in a
 * backup, and a second place for an account to exist. An environment variable
 * is the whole account: change it, redeploy, and the old credential is gone.
 *
 * ADMIN_PASSWORD_HASH holds a bcrypt hash, never the password. The plain
 * password never exists anywhere but the owner's head and, for the length of
 * one request, the login form. See scripts/hash-admin-password.mjs.
 */

/*
  The same guard lib/supabase/admin.ts opens with, for the same reason and by
  the same mechanism: neither variable below carries a NEXT_PUBLIC_ prefix, so
  Next compiles both lookups to undefined in a browser bundle — but a module
  that silently answers "not configured" in the browser is a module whose
  misuse nobody notices. This throws on load instead.
*/
if (typeof window !== "undefined") {
  throw new Error(
    "lib/admin/credentials.ts was imported into client code. It reads the admin password hash and must only ever run on the server.",
  );
}

export interface AdminCredentials {
  username: string;
  /** A bcrypt hash — `$2a$`/`$2b$`/`$2y$` and a cost, never a plain password. */
  passwordHash: string;
}

/**
 * The configured credentials, or null when the environment is incomplete.
 *
 * Null rather than a throw, because the caller has to fail closed anyway: an
 * unconfigured dashboard must refuse a sign in, not crash into an error page
 * that tells a visitor which variable is missing. The missing name is logged
 * server side instead, where only the owner can read it.
 */
export function adminCredentials(): AdminCredentials | null {
  const username = (process.env.ADMIN_USERNAME ?? "").trim();
  const passwordHash = (process.env.ADMIN_PASSWORD_HASH ?? "").trim();

  const missing: string[] = [];

  if (username.length === 0) {
    missing.push("ADMIN_USERNAME");
  }

  if (passwordHash.length === 0) {
    missing.push("ADMIN_PASSWORD_HASH");
  }

  if (missing.length > 0) {
    console.error(
      `[admin] ${missing.join(" and ")} not set. The admin dashboard is closed until ${
        missing.length === 1 ? "it is" : "they are"
      } configured.`,
    );

    return null;
  }

  /*
    A plain password pasted into ADMIN_PASSWORD_HASH by mistake would compare
    against nothing and lock the owner out with no explanation — bcryptjs
    answers false for a malformed hash rather than complaining. Saying so here
    turns twenty minutes of confusion into one log line.
  */
  if (!/^\$2[aby]\$\d{2}\$/.test(passwordHash)) {
    console.error(
      "[admin] ADMIN_PASSWORD_HASH is not a bcrypt hash. It must begin with $2a$, $2b$ or $2y$ and a cost. Run `npm run hash-admin-password` to generate one.",
    );

    return null;
  }

  return { username, passwordHash };
}
