import { isHandoffId } from "@/lib/handoff/link";

/**
 * The last handed-over card this browser was shown, so it is not lost when
 * the host leaves the sign-in page without signing in.
 *
 * A card made in Instagram's or Facebook's browser reaches Chrome or Safari
 * as an id in the address (lib/handoff/link.ts); the card itself is on the
 * server. A host who reads the sign-in page and then goes to the home page,
 * or opens /create again, used to get an empty gallery: nothing in that
 * address, and nothing in this browser. The id is kept here for the day the
 * server keeps the card, so /create can say the card is waiting and open it
 * (components/wizard/Wizard.tsx). Forgotten once the card is saved to an
 * account, or found gone.
 */

const KEY = "lifafa:handoff-seen";

/** As long as the server keeps the card (lib/handoff/actions.ts). */
const KEEP_MS = 24 * 60 * 60 * 1000;

interface Seen {
  id: string;
  at: number;
}

export function rememberHandoff(id: string): void {
  if (!isHandoffId(id)) {
    return;
  }

  try {
    window.localStorage.setItem(KEY, JSON.stringify({ id, at: Date.now() } satisfies Seen));
  } catch {
    /* No storage: the address still carries the id while the host is on it. */
  }
}

/** The id of a handed-over card this browser was shown in the last day, or null. */
export function seenHandoff(now: number = Date.now()): string | null {
  try {
    const raw = window.localStorage.getItem(KEY);

    if (raw === null) {
      return null;
    }

    const seen = JSON.parse(raw) as Partial<Seen>;

    if (!isHandoffId(seen.id) || typeof seen.at !== "number" || now - seen.at > KEEP_MS) {
      window.localStorage.removeItem(KEY);
      return null;
    }

    return seen.id;
  } catch {
    return null;
  }
}

/** Forgets the card: saved to an account, gone, or dismissed. Only that one, when `id` is given. */
export function forgetHandoff(id?: string): void {
  try {
    if (id === undefined || seenHandoff() === id) {
      window.localStorage.removeItem(KEY);
    }
  } catch {
    /* Nothing to forget. */
  }
}
