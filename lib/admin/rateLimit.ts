/**
 * Failed sign in attempts, counted per IP.
 *
 * WHAT THIS IS FOR. The admin password is one password, guarded by one bcrypt
 * comparison. bcrypt at cost 12 makes an offline guess expensive, but an
 * *online* guess costs an attacker nothing but a request, and a login form with
 * no limiter is a form somebody can work through a wordlist against at whatever
 * rate the server will answer. Five wrong answers from one address buys fifteen
 * minutes of silence, which turns a wordlist into a project measured in years.
 *
 * THE LIMITATION, STATED PLAINLY. This is a Map in one process's memory, and
 * that is a real weakness rather than a tidy shortcut:
 *
 *  - Serverless means several processes. On Vercel each concurrent instance has
 *    its own copy of this Map, so an attacker spread across instances gets five
 *    attempts per instance, not five in total.
 *  - It does not survive a restart. A new deployment, or an idle instance being
 *    recycled, forgets every block that was in force.
 *  - An attacker with many addresses is not slowed at all. The key is the IP.
 *
 * So it raises the cost of a naive attack and does not stop a determined one.
 * The thing actually keeping this dashboard shut is the strength of the
 * password behind ADMIN_PASSWORD_HASH. When this needs to be real, the state
 * belongs somewhere every instance shares — a Postgres table, or Upstash — and
 * the shape of this module is deliberately small enough to move.
 */

/** Wrong answers allowed before the door closes. */
const MAX_FAILURES = 5;

/** How long it stays closed, in milliseconds. */
const BLOCK_DURATION_MS = 15 * 60 * 1000;

/**
 * How long a run of failures is remembered when it never reaches the limit.
 *
 * Without this, four typos spread over a month would add up to a block. The
 * count is a burst of wrong guesses, not a lifetime tally.
 */
const FAILURE_WINDOW_MS = 15 * 60 * 1000;

/** How many addresses the map will hold before the oldest are dropped. */
const MAX_TRACKED_ADDRESSES = 10_000;

interface AttemptRecord {
  failures: number;
  /** When the most recent failure was recorded. */
  lastFailureAt: number;
  /** Epoch ms the block lifts, or null when not blocked. */
  blockedUntil: number | null;
}

/*
  Module scope, so it survives between requests inside one instance — which is
  the most this design can promise. See the note at the top.
*/
const attempts = new Map<string, AttemptRecord>();

/** Drops records that have gone quiet, so an attacker cannot grow this map. */
function prune(now: number): void {
  for (const [ip, record] of attempts) {
    const blockLifted = record.blockedUntil === null || record.blockedUntil <= now;
    const windowClosed = now - record.lastFailureAt > FAILURE_WINDOW_MS;

    if (blockLifted && windowClosed) {
      attempts.delete(ip);
    }
  }

  /*
    Still too many after pruning means a flood of live records from many
    addresses. Map iterates in insertion order, so this drops the oldest —
    losing a block rather than letting the map grow without limit, because a
    process that runs out of memory refuses everyone including the owner.
  */
  while (attempts.size > MAX_TRACKED_ADDRESSES) {
    const oldest = attempts.keys().next();

    if (oldest.done === true) {
      break;
    }

    attempts.delete(oldest.value);
  }
}

/** How long this address must wait, in seconds; 0 when it may try now. */
export function blockedForSeconds(ip: string): number {
  const now = Date.now();
  const record = attempts.get(ip);

  if (record === undefined || record.blockedUntil === null) {
    return 0;
  }

  if (record.blockedUntil <= now) {
    /* The block has lapsed. The count goes with it, so the next slip starts over. */
    attempts.delete(ip);
    return 0;
  }

  return Math.ceil((record.blockedUntil - now) / 1000);
}

/**
 * Records one wrong answer, and closes the door on the fifth.
 *
 * Called only for a genuinely failed credential check, never for a request
 * that was already blocked — otherwise every retry against a closed door would
 * extend the block, and a fifteen minute wait would become an indefinite one.
 */
export function recordFailure(ip: string): void {
  const now = Date.now();
  prune(now);

  const record = attempts.get(ip);
  const withinWindow =
    record !== undefined && now - record.lastFailureAt <= FAILURE_WINDOW_MS;

  const failures = withinWindow ? record.failures + 1 : 1;

  attempts.set(ip, {
    failures,
    lastFailureAt: now,
    blockedUntil: failures >= MAX_FAILURES ? now + BLOCK_DURATION_MS : null,
  });
}

/** Forgets this address. Called the moment a sign in succeeds. */
export function clearFailures(ip: string): void {
  attempts.delete(ip);
}

/**
 * Which address a request came from, for counting purposes only.
 *
 * NOT AN IDENTITY. `x-forwarded-for` is a header, and a header is whatever the
 * client typed unless something in front rewrites it. On Vercel the edge
 * network does rewrite it, so the left-most entry is the real client; run this
 * behind a proxy that does not, and an attacker can spoof a fresh address per
 * request and never be counted. That is a limit on how much this limiter can
 * be worth, which is why nothing here is ever used to decide *who* someone is —
 * only how often they have been wrong.
 *
 * "unknown" when there is no header at all, which puts every such request in
 * one bucket. Stricter than letting them through uncounted.
 */
export function requestIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");

  if (forwarded !== null && forwarded.length > 0) {
    const first = forwarded.split(",")[0].trim();

    if (first.length > 0) {
      return first;
    }
  }

  return headers.get("x-real-ip") ?? "unknown";
}
