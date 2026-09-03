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
 */
export type DbResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function dbSuccess<T>(data: T): DbResult<T> {
  return { ok: true, data };
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
  console.error(`[db] ${context}:`, cause);

  return { ok: false, error: message };
}
