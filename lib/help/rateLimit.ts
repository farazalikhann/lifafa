/**
 * The Help bot's per-address limit: 3 messages in 10 minutes.
 *
 * BEST EFFORT, like the translate route's limiter: a Map in one process's
 * memory, so each Vercel instance counts on its own and a cold start forgets.
 * It stops a stuck button or a casual loop, not a determined sender. The
 * per-host limit is the firm one: it counts rows in help_messages, which every
 * instance shares. See lib/admin/rateLimit.ts for the trade-off at length.
 */

export const HELP_MAX_MESSAGES = 3;
export const HELP_WINDOW_MS = 10 * 60 * 1000;

const MAX_TRACKED_ADDRESSES = 10_000;

/** When each address sent its recent messages, oldest activity first. */
const recentByIp = new Map<string, number[]>();

function recent(ip: string, now: number): number[] {
  return (recentByIp.get(ip) ?? []).filter(
    (sentAt) => now - sentAt < HELP_WINDOW_MS,
  );
}

/** Takes one slot for `ip`; false when it has already sent its three. */
export function takeHelpSlot(ip: string): boolean {
  const now = Date.now();
  const times = recent(ip, now);

  if (times.length >= HELP_MAX_MESSAGES) {
    recentByIp.set(ip, times);
    return false;
  }

  times.push(now);
  /* Re-inserted, so Map order stays oldest-activity first for the trim below. */
  recentByIp.delete(ip);
  recentByIp.set(ip, times);

  while (recentByIp.size > MAX_TRACKED_ADDRESSES) {
    const oldest = recentByIp.keys().next();

    if (oldest.done === true) {
      break;
    }

    recentByIp.delete(oldest.value);
  }

  return true;
}

/** Gives back the newest slot, for a message that was not saved after all. */
export function returnHelpSlot(ip: string): void {
  const times = recentByIp.get(ip);

  if (times !== undefined && times.length > 0) {
    times.pop();
  }
}
