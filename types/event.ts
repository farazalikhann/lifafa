/** Keyed to the themes declared in lib/themes.ts. */
export type ThemeId = "marigold" | "rose" | "emerald";

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
}

/**
 * Field-level update callback. Generic so the value is checked against the
 * field it is being written to.
 */
export type DraftChangeHandler = <K extends keyof EventDraft>(
  field: K,
  value: EventDraft[K],
) => void;
