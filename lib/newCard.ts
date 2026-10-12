import type { PendingCardProblem } from "@/components/create/PendingCardNotice";
import type { EditorSnapshot } from "@/hooks/useCardEditor";
import { DEFAULT_CARD_LANGUAGE } from "@/lib/cardLanguage";
import { DEFAULT_SECTION_ORDER } from "@/lib/cardSections";
import { DEFAULT_COVER_ANIMATION } from "@/lib/coverAnimations";
import { DEFAULT_DESIGN } from "@/lib/designDefaults";
import { DEFAULT_OCCASION_ID, getOccasion } from "@/lib/occasions";
import type { PendingCard, PendingCardRead } from "@/lib/pendingCard";
import { DEFAULT_WEATHER_THEME } from "@/lib/weatherThemes";

/**
 * The card a new invitation starts from, and what a host arriving to make one
 * finds: an empty card, the card they stashed before signing in, or an empty
 * card and the reason theirs is not in it.
 *
 * FOR THE WIZARD AT /create/wizard. app/create/page.tsx holds the same three
 * things for the tabbed editor, word for word, and is left as it is until the
 * wizard takes its place; this is then the one copy.
 */

const DEFAULT_OCCASION = getOccasion(DEFAULT_OCCASION_ID);

/** An empty card: nothing typed, every section on, the default design. */
export const EMPTY_SNAPSHOT: EditorSnapshot = {
  draft: {
    partyOneName: "",
    partyTwoName: "",
    /* The commonest joining word on the cards this is built for. */
    joinerWord: "weds",
    hostNames: "",
    eventTitle: "",
    eventDate: "",
    eventTime: "",
    venueName: "",
    venueAddress: "",
    message: "",
    themeId: DEFAULT_OCCASION.defaultThemeId,
    subEvents: [],
  },
  config: {
    themeId: DEFAULT_OCCASION.defaultThemeId,
    /* Every built-in section starts enabled, in the registry order. */
    blocks: DEFAULT_SECTION_ORDER.map((id) => ({
      kind: "builtin" as const,
      id,
      enabled: true,
    })),
    decorMotion: DEFAULT_DESIGN.decorMotion,
    decorIntensity: DEFAULT_DESIGN.decorIntensity,
    butterflies: DEFAULT_DESIGN.butterflies,
    leaves: DEFAULT_DESIGN.leaves,
    petals: DEFAULT_DESIGN.petals,
    petalFlower: DEFAULT_DESIGN.petalFlower,
    occasionId: DEFAULT_OCCASION_ID,
    traditionId: DEFAULT_DESIGN.traditionId,
    language: DEFAULT_CARD_LANGUAGE,
    rsvpEnabled: true,
    scratchTarget: "none",
    borderStyle: DEFAULT_DESIGN.borderStyle,
    royalTexture: true,
    style: DEFAULT_DESIGN.style,
    ornamentConfig: DEFAULT_DESIGN.ornamentConfig,
    musicUrl: null,
    /* Nothing that has never been saved has been paid for. */
    isPaid: false,
  },
  coverAnimation: DEFAULT_DESIGN.coverAnimation,
  showWeather: false,
  weatherTheme: DEFAULT_WEATHER_THEME,
  qrCheckinEnabled: false,
};

export type Arrival =
  | { kind: "fresh" }
  | { kind: "restored"; snapshot: EditorSnapshot; step: string | null }
  | { kind: "lost"; problem: PendingCardProblem };

/**
 * A stashed card, as the editor takes one. The fields kept beside the config
 * fall back to a new card's, and `isPaid` is never the stash's to say.
 */
function restoredSnapshot(card: PendingCard): EditorSnapshot {
  return {
    draft: card.draft,
    config: { ...card.config, isPaid: false },
    coverAnimation: card.coverAnimation ?? DEFAULT_COVER_ANIMATION,
    showWeather: card.showWeather === true,
    weatherTheme: card.weatherTheme ?? DEFAULT_WEATHER_THEME,
    qrCheckinEnabled: card.qrCheckinEnabled === true,
  };
}

/**
 * Decides the arrival from what this browser holds and what the URL says.
 *
 * `stashOrigin` is only in the URL when the host is coming back from signing
 * in with a card stashed, so it is what tells "expected a card and it is not
 * here" apart from an ordinary visit. Only the first of those is told
 * anything. A card stashed on another of the site's addresses is in that
 * address's storage, which this page cannot read, so that is checked first.
 */
export function arrivalFor(
  read: PendingCardRead,
  stashOrigin: string | null,
  here: string,
): Arrival {
  if (read.kind === "card") {
    return {
      kind: "restored",
      snapshot: restoredSnapshot(read.card),
      step: read.card.step ?? null,
    };
  }

  if (stashOrigin !== null && stashOrigin !== here) {
    return { kind: "lost", problem: { kind: "elsewhere", origin: stashOrigin } };
  }

  const expected = stashOrigin !== null;

  switch (read.kind) {
    /* Always said: it is a card, it is here, and it would not open. */
    case "damaged":
      return { kind: "lost", problem: { kind: "damaged" } };
    case "blocked":
      return expected
        ? { kind: "lost", problem: { kind: "blocked" } }
        : { kind: "fresh" };
    case "expired":
      return expected
        ? { kind: "lost", problem: { kind: "expired" } }
        : { kind: "fresh" };
    case "none":
      return expected
        ? { kind: "lost", problem: { kind: "missing" } }
        : { kind: "fresh" };
  }
}
