/** Keyed to the themes declared in lib/themes.ts. */
export type ThemeId = "marigold" | "rose" | "emerald";

export interface EventDraft {
  /** e.g. "Aarav and Meera" */
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
