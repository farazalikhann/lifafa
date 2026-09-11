import { isCoverAnimationId } from "@/lib/coverAnimations";
import { isWeatherThemeId } from "@/lib/weatherThemes";
import type { CardConfig } from "@/types/card";
import type { CoverAnimationId } from "@/types/coverAnimation";
import type { EventDraft } from "@/types/event";
import type { WeatherThemeId } from "@/types/weather";

/**
 * Where an unsaved card waits while the host signs in.
 *
 * sessionStorage rather than localStorage: this is a card in progress, not a
 * preference, and it should not still be here next week on a shared machine.
 * Cleared the moment the event is saved.
 *
 * ONLY /create EVER USES THIS. The editor is open to signed-out visitors there
 * and asks for an account at save time, so the card has to survive a full round
 * trip out of the browser and back — the magic link often opens in a different
 * tab. /dashboard/[eventId]/edit is behind the middleware's gate, so a host who
 * reaches it is already signed in and there is no detour to survive.
 *
 * A module rather than an export of the save button, because the button that
 * used to own it no longer exists: the editor owns saving now, and each route
 * decides what saving means. See components/create/CardEditor.tsx.
 */
export const PENDING_DRAFT_KEY = "lifafa:pending-card";

export interface PendingCard {
  draft: EventDraft;
  config: CardConfig;
  /**
   * Optional, because it is not part of CardConfig.
   *
   * The cover is its own column rather than a field in the card's JSON, so it
   * has to be stashed alongside rather than travelling inside `config`. Older
   * entries written before this existed have no key here, which is exactly
   * what `undefined` means, and the reader below checks it before trusting it.
   */
  coverAnimation?: CoverAnimationId;
  /** Optional for the same reason: neither of these lives inside CardConfig. */
  showWeather?: boolean;
  weatherTheme?: WeatherThemeId;
  /** Nor does this. Absent on anything stashed before 0005, which reads as off. */
  qrCheckinEnabled?: boolean;
}

/** Reads the stashed card, tolerating anything that is not one. */
export function readPendingCard(): PendingCard | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_DRAFT_KEY);

    if (raw === null) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);

    /*
      Shape-checked before it is trusted. This value has been through storage,
      where a stale version of the app or a hand-edited entry could have left
      something that is not a card at all; restoring it blindly would throw
      inside a render the host cannot get out of.
    */
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("draft" in parsed) ||
      !("config" in parsed)
    ) {
      return null;
    }

    const card = parsed as PendingCard;

    /*
      The stored ids are re-checked, the booleans are not: a boolean cannot name
      something that has stopped existing. Everything else in here is restored
      into state that only feeds the renderer, but these two are written to
      columns with check constraints, and a stale or hand-edited entry naming an
      id that no longer exists would be carried all the way to a failed insert.
      Anything that fails is dropped rather than repaired, and the editor falls
      back to its own default.
    */
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
  } catch {
    /* Private mode, disabled storage, malformed JSON — all mean "nothing saved". */
    return null;
  }
}

/**
 * Stashes a card before a sign-in detour.
 *
 * Returns false when the browser would not take it — storage can be disabled or
 * full — because that has to be said out loud rather than discovered on the way
 * back. Sending a host off to sign in and losing everything they typed is the
 * one failure this whole module exists to prevent.
 */
export function writePendingCard(card: PendingCard): boolean {
  try {
    window.sessionStorage.setItem(PENDING_DRAFT_KEY, JSON.stringify(card));
    return true;
  } catch (cause) {
    console.error("[create] could not stash the draft:", cause);
    return false;
  }
}

export function clearPendingCard(): void {
  try {
    window.sessionStorage.removeItem(PENDING_DRAFT_KEY);
  } catch {
    /* Nothing to clear if storage was never available. */
  }
}
