import { hasCardOutline, toPendingCard, type PendingCard } from "@/lib/pendingCard";

/**
 * The card a visitor is making on /create, kept in this browser as they go.
 *
 * So that leaving the page loses nothing: a live demo opened from the gallery
 * and Back again, a reload, a tab closed by mistake. The chosen design and
 * everything typed; a card holds no photos.
 *
 * APART FROM THE SIGN-IN STASH (lib/pendingCard.ts), and below it. The stash
 * is the card a host sent off to sign in, or the one handed over from
 * Instagram's or Facebook's browser to Chrome or Safari; when one is there, it
 * is the card /create opens, and this one is not read. This is only what
 * /create opens with when there is nothing else.
 *
 * KEPT FOR 7 DAYS from the last change, and cleared the moment the card is
 * saved to an account (it is then the invitation's to keep) or the visitor
 * asks to start fresh.
 *
 * NEVER THROWS. Storage can be missing, full or blocked: in a private window,
 * and in the in-app browsers, where a page can be denied it outright. Every
 * read and write is in its own try, and a failure is the same as no card.
 */

const AUTOSAVE_KEY = "lifafa:card-autosave";

/** How long a card is offered back after it was last changed. */
const AUTOSAVE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface StoredAutosave extends PendingCard {
  /** Epoch milliseconds of the last change. */
  savedAt: number;
}

/** Keeps the card as it stands now. False when the browser would not take it. */
export function writeCardAutosave(card: PendingCard): boolean {
  const stored: StoredAutosave = { ...card, savedAt: Date.now() };

  try {
    window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(stored));
    return true;
  } catch {
    return false;
  }
}

/** The card kept here, if there is one, it reads as a card, and it is not too old. */
export function readCardAutosave(now: number = Date.now()): PendingCard | null {
  let raw: string | null;

  try {
    raw = window.localStorage.getItem(AUTOSAVE_KEY);
  } catch {
    return null;
  }

  if (raw === null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (
      !hasCardOutline(parsed) ||
      typeof (parsed as Partial<StoredAutosave>).savedAt !== "number" ||
      now - (parsed as StoredAutosave).savedAt > AUTOSAVE_TTL_MS
    ) {
      clearCardAutosave();
      return null;
    }

    /* The ids beside the config checked, as the sign-in stash's are. */
    return toPendingCard(parsed);
  } catch {
    clearCardAutosave();
    return null;
  }
}

/** Forgets the card: saved to an account, or the visitor started fresh. */
export function clearCardAutosave(): void {
  try {
    window.localStorage.removeItem(AUTOSAVE_KEY);
  } catch {
    /* Nothing kept if storage was never there. */
  }
}
