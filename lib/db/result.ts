/**
 * What every database call in lib/db returns.
 *
 * A result, never a throw. A query that rejects inside a server component takes
 * the whole render tree with it and the host meets an error page in place of
 * their dashboard; returning a value means the caller has to decide what to
 * show, which is where that decision belongs.
 *
 * `error` is always a sentence written for a host. The real Postgres error is
 * logged server side by `dbFailure` below and never travels to the browser: it
 * names columns, constraints and sometimes row contents, and none of that is a
 * guest's or another host's business.
 *
 * Outside production the failure code is appended to that sentence. A generic
 * "please try again" is the right thing to show a host and the wrong thing to
 * debug against: 42501 and 42703 are the same message to a host and completely
 * different faults to fix, and reading the deployment log to tell them apart is
 * a slow way to find out. Never in production, where the code is a detail about
 * the schema that no visitor is owed.
 */
export type DbResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function dbSuccess<T>(data: T): DbResult<T> {
  return { ok: true, data };
}

/**
 * The parts of a postgrest-js error worth reading, narrowed by hand.
 *
 * Hand-narrowed rather than imported, because what arrives here is `unknown`:
 * a PostgrestError, an auth error, a thrown TypeError from a fetch that never
 * reached Supabase. Checking the shape is what tells those apart, and importing
 * the type would only let us assert one of them without looking.
 */
export interface PostgresErrorLike {
  code: string;
  message: string;
  details: string | null;
  hint: string | null;
}

/** The error as Postgres described it, or null when it did not come from there. */
export function postgresError(cause: unknown): PostgresErrorLike | null {
  if (typeof cause !== "object" || cause === null) {
    return null;
  }

  const { code, message, details, hint } = cause as Partial<PostgresErrorLike>;

  if (typeof code !== "string" || typeof message !== "string") {
    return null;
  }

  return {
    code,
    message,
    details: typeof details === "string" ? details : null,
    hint: typeof hint === "string" ? hint : null,
  };
}

/**
 * Logs the real failure where only the server can see it, and hands back the
 * readable line.
 *
 * `context` says which call failed, so a log line is searchable without having
 * to guess which of a dozen queries produced it.
 */
export function dbFailure<T>(
  context: string,
  cause: unknown,
  message: string,
): DbResult<T> {
  const pg = postgresError(cause);

  if (pg === null) {
    console.error(`[db] ${context}:`, cause);

    return { ok: false, error: message };
  }

  /*
    The code first and on the same line as the context, so a log search for the
    failing call answers "which fault was it" without unfolding an object.
  */
  console.error(`[db] ${context}: [${pg.code}] ${pg.message}`, {
    details: pg.details,
    hint: pg.hint,
  });

  return {
    ok: false,
    error:
      process.env.NODE_ENV === "production" ? message : `${message} [${pg.code}]`,
  };
}
