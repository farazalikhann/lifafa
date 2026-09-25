import type { CardLanguage } from "@/types/card";

/** Keyed to the themes declared in lib/themes.ts. */
export type ThemeId = "marigold" | "rose" | "emerald";

/**
 * A card's words in a language other than the one it was written in.
 *
 * WHY A CARD HAS MORE THAN ONE. A family sends one invitation to two kinds of
 * guest: the relatives who read Hindi and the colleagues who read English. The
 * card's own words — the date, the headings, the reply form — can be printed
 * in either without the host lifting a finger; the names, the venue and the
 * note are the host's, and only the host can say what they are in the other
 * script. This is where they say it.
 *
 * Every field optional and every field a fallback. A word the host left blank
 * shows as they wrote it in the card's own language, so a half-finished
 * version is still a whole card. See cardInLanguage in lib/cardTranslation.ts,
 * which is the only reader.
 *
 * Only the words. Dates, times, the design and the running order belong to the
 * event, not to a language, and are never repeated here.
 */
export interface DraftWords {
  partyOneName?: string;
  partyTwoName?: string;
  joinerWord?: string;
  hostNames?: string;
  eventTitle?: string;
  venueName?: string;
  venueAddress?: string;
  message?: string;
  partyOneParents?: string;
  partyOneCity?: string;
  partyTwoParents?: string;
  partyTwoCity?: string;
}

/** One function's words in another language. See DraftWords. */
export interface SubEventWords {
  label?: string;
  venueName?: string;
  venueAddress?: string;
  note?: string;
}

/**
 * Words kept per language, for everything but the card's own language.
 *
 * Never holds an entry for the card's own language: those words are the
 * ordinary fields beside this, and a second copy of them here would be a
 * second answer to the same question. Changing the card's language moves the
 * words across rather than leaving them stranded — see swapCardLanguage.
 */
export type Translations<Words> = Partial<Record<CardLanguage, Words>>;

/**
 * One function in a celebration that runs to more than one.
 *
 * An Indian wedding is rarely a single event: the mehndi is at somebody's
 * house on the Thursday, the sangeet is at a hall on the Friday, the wedding
 * itself is somewhere else on the Saturday morning and the reception is that
 * evening. Each has its own date, its own time and usually its own venue, and
 * a card that can only express one of them is asking the host to leave the
 * rest to WhatsApp.
 *
 * Every field is a plain string, including the ones a guest might expect to be
 * required: a host adding functions three months out often knows the name and
 * the day and nothing else, and a half filled function is worth more on the
 * card than no function at all.
 */
export interface SubEvent {
  /**
   * Stable across renders, minted by a counter in the editor.
   *
   * Never from Math.random or the clock. This array is rendered on the server
   * and again in the browser, and a key that differs between the two is a
   * hydration mismatch; it is also written into the saved draft, so it has to
   * survive a round trip through the database unchanged.
   */
  id: string;
  /** What the function is called, e.g. "Mehndi", "Sangeet", "Reception". */
  label: string;
  /** ISO date string, e.g. "2026-12-12". Empty until the host sets one. */
  date: string;
  /** 24 hour time string, e.g. "18:30". Empty until the host sets one. */
  time: string;
  venueName: string;
  venueAddress: string;
  /**
   * The function's own Google Maps link or "lat, lng", for exact directions.
   * Optional, like the main venue's venueMapsLink, and read only through
   * parseMapsLink, so anything else in it is ignored.
   */
  mapsLink?: string;
  /** One short line, e.g. "Lunch will be served". Absent when unused. */
  note?: string;
  /**
   * This function's words in the card's other languages. Absent until the
   * host writes one, which is every function saved before this existed.
   * Travels with the function, so removing it removes its translations too.
   */
  translations?: Translations<SubEventWords>;
}

export interface EventDraft {
  /**
   * The first person being celebrated, e.g. "Aarav".
   *
   * Empty until the host fills it in; the card only uses the two party fields
   * when both carry something, and falls back to `hostNames` otherwise.
   */
  partyOneName: string;
  /** The second person being celebrated, e.g. "Meera". */
  partyTwoName: string;
  /**
   * The word set between the two names — "weds", "&", "and", or whatever short
   * phrase the host types. Only read when both party names are filled in.
   */
  joinerWord: string;
  /**
   * One line the host writes themselves, e.g. "Aarav and Meera".
   *
   * Predates the two party fields and is now the fallback: whatever is here is
   * shown whenever the pair is incomplete, so an older draft — or a host who
   * would rather phrase the line their own way — still renders.
   */
  hostNames: string;
  /** e.g. "Wedding Reception" */
  eventTitle: string;
  /** ISO date string, e.g. "2026-12-14" */
  eventDate: string;
  /** 24 hour time string, e.g. "19:00" */
  eventTime: string;
  venueName: string;
  venueAddress: string;
  /**
   * A Google Maps link to the venue, or its "lat, lng", pasted by the host for
   * exact directions. Absent on every draft saved before it existed, and on
   * any the host leaves blank.
   *
   * Never printed on the card: Get directions and the map use it as their
   * link, and the address the host typed is what guests read. Read only
   * through parseMapsLink (lib/cardFormat.ts), which accepts Google Maps and
   * coordinates and nothing else, so a value that is not one of those is
   * never turned into a link, whatever reached the stored draft.
   */
  venueMapsLink?: string;
  /** Optional short note from the host — empty string when unused. */
  message: string;
  themeId: ThemeId;
  /**
   * The other functions, in the order the host added them.
   *
   * NOT the whole running order. `eventDate`, `eventTime`, `venueName` and
   * `venueAddress` above are untouched and go on meaning exactly what they
   * always meant: the primary event. Everything that read them before still
   * reads them — the countdown counts to the primary date and to no sub-event,
   * the details and venue sections describe the primary event, the calendar
   * links point at it, and the weather is the weather at its venue.
   *
   * So this array is additive, and that is what makes it safe: every draft
   * saved before it existed has no key here at all, which types/database.ts
   * fills in as an empty array on the way out. Such a card renders precisely as
   * it did, with the timeline section hiding itself for want of anything to
   * list.
   *
   * Entry order, not chronological order. A host adds the reception before
   * remembering the haldi, and reordering their list under them as they typed
   * would be its own kind of rude. TimelineSection sorts a copy at render time.
   */
  subEvents: readonly SubEvent[];
  /**
   * Who each side belongs to, and where they are from.
   *
   * All four optional, all four absent from every draft saved before now, and
   * FamilySection draws nothing at all unless at least one of them is filled
   * in. On an Indian invitation the parents' names are often the point of the
   * card; on a corporate one they would be baffling. Optional is the only shape
   * that serves both.
   */
  partyOneParents?: string;
  partyOneCity?: string;
  partyTwoParents?: string;
  partyTwoCity?: string;
  /**
   * The words above, in the card's other languages, so one invitation can be
   * shared in each. Absent on every draft saved before this existed and on
   * every draft whose host has not written a word of another language, which
   * reads exactly as an empty one does.
   */
  translations?: Translations<DraftWords>;
  /**
   * The editor's record of the one-click Translate helper. Absent until a host
   * first uses it. Kept on the draft so it is saved with the invitation and
   * survives a reload — see lib/autoTranslate.ts. Nothing on the card reads it.
   */
  autoTranslation?: AutoTranslation;
}

/**
 * Whether an invitation has had its one auto-translate.
 *
 * `translationUsed` is set only by a translate that fully succeeded; a failed
 * request leaves it false. `sources` holds a short fingerprint of the exact
 * text each field was translated from, keyed by field, so a retry after a
 * partial failure sends only the fields that are still missing.
 */
export interface AutoTranslation {
  translationUsed: boolean;
  /**
   * The editor's id for this card, minted on its first translate request. The
   * server records usage against it (translation_usage.draft_id), and it rides
   * with the draft through the sign-in stash and into the saved invitation.
   */
  cardId?: string;
  sources?: Record<string, string>;
}

/**
 * Field-level update callback. Generic so the value is checked against the
 * field it is being written to.
 */
export type DraftChangeHandler = <K extends keyof EventDraft>(
  field: K,
  value: EventDraft[K],
) => void;
