import { isCoverAnimationId } from "@/lib/coverAnimations";
import {
  DEFAULT_SITE_ORIGIN,
  LIFAFA_DOMAIN,
  configuredSiteOrigin,
} from "@/lib/siteUrl";
import { isWeatherThemeId } from "@/lib/weatherThemes";
import type { CardConfig } from "@/types/card";
import type { CoverAnimationId } from "@/types/coverAnimation";
import type { EventDraft } from "@/types/event";
import type { WeatherThemeId } from "@/types/weather";

/**
 * Where an unsaved card waits while the host signs in.
 *
 * LOCALSTORAGE, FOR A DAY. It used to be sessionStorage, which belongs to one
 * tab, and the detour this exists for very often ends in another: a magic link
 * opens in whatever tab the mail client picks. The card was in the tab the host
 * left and the editor they came back to was empty. localStorage is shared by
 * every tab on the address, and the day limit is what keeps a card from still
 * being here next week on a shared machine.
 *
 * WRITTEN BY SAVE, CLEARED BY SAVE, AND NOTHING ELSE. The reader below only
 * reads. A host who comes back, looks at their card and reloads before pressing
 * Save again has to find it again — so the stash stays until createEvent has
 * actually written the invitation, and is cleared then, by /create.
 *
 * ONE ADDRESS AT A TIME. Browsers keep storage separately for each address, and
 * the site answers on two: a card stashed on www.getlifafa.co.in cannot be seen
 * from getlifafa.co.in at all. So the stash records the address it was made on,
 * and the same address rides on the sign-in round trip in the return path — see
 * pendingCardReturnPath. That second copy is the only one a page on the other
 * address can read, and it is what lets /create say where the card actually is
 * instead of opening empty.
 *
 * ONLY /create EVER USES THIS. The editor is open to signed-out visitors there
 * and asks for an account at save time. /dashboard/[eventId]/edit is behind the
 * middleware's gate, so a host who reaches it is already signed in and there is
 * no detour to survive.
 */
export const PENDING_CARD_KEY = "lifafa:pending-card";

/** How long a stashed card is offered back, from the moment it was stashed. */
export const PENDING_CARD_TTL_MS = 24 * 60 * 60 * 1000;

/** The query parameter on /create that names the address a card was stashed on. */
export const STASH_ORIGIN_PARAM = "stashOrigin";

export interface PendingCard {
  draft: EventDraft;
  config: CardConfig;
  /**
   * Optional, because it is not part of CardConfig.
   *
   * The cover is its own column rather than a field in the card's JSON, so it
   * has to be stashed alongside rather than travelling inside `config`. An
   * entry with no key here reads as the default, and the reader below checks
   * the id before trusting it.
   */
  coverAnimation?: CoverAnimationId;
  /** Optional for the same reason: neither of these lives inside CardConfig. */
  showWeather?: boolean;
  weatherTheme?: WeatherThemeId;
  /** Nor does this. Absent reads as off. */
  qrCheckinEnabled?: boolean;
}

/** What is written: the card, and when and where it was stashed. */
interface StoredPendingCard extends PendingCard {
  /** Epoch milliseconds. */
  savedAt: number;
  /** window.location.origin at the moment of stashing. */
  origin: string;
}

/**
 * Everything a read can find. Only `card` gives a card back; the rest are the
 * reasons there is none, kept apart because each one is told to the host in
 * different words.
 */
export type PendingCardRead =
  | { kind: "none" }
  | { kind: "card"; card: PendingCard; origin: string; savedAt: number }
  /** A card, older than the day it is kept for. */
  | { kind: "expired" }
  /** Something under the key that is not a card this build can open. */
  | { kind: "damaged" }
  /** Storage refused to be read at all: disabled, or blocked by a setting. */
  | { kind: "blocked" };

/**
 * The card as a page can use it, with the stored ids re-checked.
 *
 * The booleans are not re-checked: a boolean cannot name something that has
 * stopped existing. The two ids are, because they are written to columns with
 * check constraints, and a stale or hand-edited entry naming an id that no
 * longer exists would be carried all the way to a failed insert. Anything that
 * fails is dropped rather than repaired, and the editor falls back to its own
 * default.
 */
function toPendingCard(card: PendingCard): PendingCard {
  return {
    draft: card.draft,
    config: card.config,
    coverAnimation: isCoverAnimationId(card.coverAnimation)
      ? card.coverAnimation
      : undefined,
    showWeather: card.showWeather === true,
    weatherTheme: isWeatherThemeId(card.weatherTheme)
      ? card.weatherTheme
      : undefined,
    qrCheckinEnabled: card.qrCheckinEnabled === true,
  };
}

/**
 * Whether a parsed value has the outline of a card.
 *
 * Only the outline. This value has been through storage, where an older build
 * or a hand-edited entry can leave anything at all, but checking every field
 * of a CardConfig here would be a second copy of the type to keep in step with
 * it. A card with the right outline and a wrong field inside is caught where it
 * fails, by the boundary around the restored editor on /create.
 */
function hasCardOutline(value: unknown): value is PendingCard {
  return (
    typeof value === "object" &&
    value !== null &&
    "draft" in value &&
    "config" in value &&
    typeof value.draft === "object" &&
    value.draft !== null &&
    typeof value.config === "object" &&
    value.config !== null
  );
}

/**
 * The card stashed on this address, if there is one. Reads, and never writes.
 *
 * Never throws either. Private mode, disabled storage and malformed JSON all
 * come back as a reason rather than an exception, because this runs as the
 * editor mounts and a throw there is a page the host cannot get past.
 */
export function readPendingCard(now: number = Date.now()): PendingCardRead {
  let raw: string | null;

  try {
    raw = window.localStorage.getItem(PENDING_CARD_KEY);
  } catch {
    return { kind: "blocked" };
  }

  if (raw === null) {
    return readLegacyPendingCard();
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: "damaged" };
  }

  if (
    !hasCardOutline(parsed) ||
    !("savedAt" in parsed) ||
    typeof parsed.savedAt !== "number" ||
    !("origin" in parsed) ||
    typeof parsed.origin !== "string"
  ) {
    return { kind: "damaged" };
  }

  const stored = parsed as StoredPendingCard;

  if (now - stored.savedAt > PENDING_CARD_TTL_MS) {
    return { kind: "expired" };
  }

  return {
    kind: "card",
    card: toPendingCard(stored),
    origin: stored.origin,
    savedAt: stored.savedAt,
  };
}

/**
 * A card stashed by the build before this one, which kept it in sessionStorage.
 *
 * For the hosts who pressed Save just before a deploy and are still on their way
 * back from signing in: Google returns them to the same tab, where the old
 * entry is still sitting. It carries no time and no address. Neither is needed —
 * sessionStorage belongs to this tab and this address, and goes when the tab
 * does — so it is taken as stashed here and now. Nothing is migrated, because
 * this only reads; clearPendingCard removes it with the rest.
 */
function readLegacyPendingCard(): PendingCardRead {
  try {
    const raw = window.sessionStorage.getItem(PENDING_CARD_KEY);

    if (raw === null) {
      return { kind: "none" };
    }

    const parsed: unknown = JSON.parse(raw);

    if (!hasCardOutline(parsed)) {
      return { kind: "damaged" };
    }

    return {
      kind: "card",
      card: toPendingCard(parsed),
      origin: window.location.origin,
      savedAt: Date.now(),
    };
  } catch {
    /* An old entry that cannot be read is no worse than no old entry. */
    return { kind: "none" };
  }
}

/**
 * Stashes a card before a sign-in detour, stamped with when and where.
 *
 * Returns false when the browser would not take it — storage can be disabled or
 * full — because that has to be said out loud rather than discovered on the way
 * back. Sending a host off to sign in and losing everything they typed is the
 * one failure this whole module exists to prevent.
 */
export function writePendingCard(card: PendingCard): boolean {
  const stored: StoredPendingCard = {
    ...card,
    savedAt: Date.now(),
    origin: window.location.origin,
  };

  try {
    window.localStorage.setItem(PENDING_CARD_KEY, JSON.stringify(stored));
    return true;
  } catch (cause) {
    console.error("[create] could not stash the draft:", cause);
    return false;
  }
}

/** For /create to call once createEvent has succeeded, and from nowhere else. */
export function clearPendingCard(): void {
  try {
    window.localStorage.removeItem(PENDING_CARD_KEY);
  } catch {
    /* Nothing to clear if storage was never available. */
  }

  try {
    window.sessionStorage.removeItem(PENDING_CARD_KEY);
  } catch {
    /* The same, for the entry an older build left. */
  }
}

/**
 * Where sign in sends the host back to: /create, naming this address.
 *
 * The name is what lets /create, if it opens somewhere else, say where the card
 * is. It is carried through the login page and the auth callback as
 * `redirectTo`, both of which keep it on every path, errors included.
 */
export function pendingCardReturnPath(): string {
  const params = new URLSearchParams({
    [STASH_ORIGIN_PARAM]: window.location.origin,
  });

  return `/create?${params.toString()}`;
}

/**
 * The address a card was stashed on, as named in /create's own URL, if it is
 * one of Lifafa's.
 *
 * Checked against the addresses this site answers on and nothing else, because
 * the value came in through a URL and anyone can write one: a link naming some
 * other site would otherwise have /create tell a host their card was waiting
 * there, and offer them a button to go and look.
 */
export function stashOriginFromUrl(search: string): string | null {
  const raw = new URLSearchParams(search).get(STASH_ORIGIN_PARAM);

  if (raw === null) {
    return null;
  }

  let origin: string;

  try {
    origin = new URL(raw).origin;
  } catch {
    return null;
  }

  const lifafaOrigins = new Set<string>([
    DEFAULT_SITE_ORIGIN,
    `https://www.${LIFAFA_DOMAIN}`,
    window.location.origin,
  ]);
  const configured = configuredSiteOrigin();

  if (configured !== null) {
    lifafaOrigins.add(configured);
  }

  return lifafaOrigins.has(origin) ? origin : null;
}
