/** Keyed to the themes declared in lib/themes.ts. */
export type ThemeId = "marigold" | "rose" | "emerald";

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
  /** One short line, e.g. "Lunch will be served". Absent when unused. */
  note?: string;
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
}

/**
 * Field-level update callback. Generic so the value is checked against the
 * field it is being written to.
 */
export type DraftChangeHandler = <K extends keyof EventDraft>(
  field: K,
  value: EventDraft[K],
) => void;
