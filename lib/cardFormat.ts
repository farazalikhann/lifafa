/**
 * Shared card formatting and reveal helpers.
 *
 * Lifted out of CardPreview so all four sections use one implementation rather
 * than four copies. Pure functions only — no JSX — so it can be imported from
 * anywhere in the card tree without creating an import cycle.
 */

import { pairsNames } from "@/lib/occasions";
import type { EventDraft } from "@/types/event";
import type { OccasionId } from "@/types/occasion";

/**
 * Every date on the card is pinned to India, on both sides of the wire.
 *
 * Without this the same draft can render differently on the server and in the
 * browser: an unqualified date string is parsed in whatever zone the runtime
 * sits in, and an Intl formatter with no `timeZone` formats in that zone too.
 * Pinning both makes the output identical everywhere. India observes no
 * daylight saving, so the offset is a constant.
 */
const IST_OFFSET = "+05:30";
const TIME_ZONE = "Asia/Kolkata";

/** <input type="date"> emits YYYY-MM-DD; <input type="time"> emits HH:MM[:SS]. */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(\d{2}:\d{2})/;

const WEEKDAY_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "long",
  timeZone: TIME_ZONE,
};

const FULL_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TIME_ZONE,
};

/** Date without the weekday, for when the weekday is on its own line. */
const DATE_ONLY_FORMAT: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TIME_ZONE,
};

const TIME_FORMAT: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: TIME_ZONE,
};

export interface FieldValue {
  text: string;
  isPlaceholder: boolean;
}

/**
 * Resolves a draft field to what the card should show. Empty fields fall back
 * to a placeholder, which sections render at reduced opacity so it never reads
 * as real content.
 */
export function resolve(value: string, placeholder: string): FieldValue {
  const trimmed = value.trim();
  return trimmed.length > 0
    ? { text: trimmed, isPlaceholder: false }
    : { text: placeholder, isPlaceholder: true };
}

/* ---------------------------------------------------------------------------
   Whose names go on the cover.

   Two shapes, one resolution, because three places have to agree: the card,
   the share image WhatsApp unfurls, and the page title. If any of them
   resolved the names on its own, a guest could be shown one thing in the chat
   thread and another after tapping through.
   --------------------------------------------------------------------------- */

/** The placeholder shown when the host has typed no names at all. */
export const NAMES_PLACEHOLDER = "Your names";

/** Used when both names are filled in but the joining word was left blank. */
const JOINER_FALLBACK = "&";

/**
 * A cover name is either a pair set over three lines or a single written line.
 * A discriminated union rather than an optional-fields object, so a caller
 * that forgets the pair case does not compile.
 */
export type CoverNames =
  | {
      readonly kind: "pair";
      readonly first: string;
      readonly joiner: string;
      readonly second: string;
    }
  | {
      readonly kind: "line";
      readonly text: string;
      readonly isPlaceholder: boolean;
    };

/** The draft fields the cover name is built from. */
export type CoverNameFields = Pick<
  EventDraft,
  "partyOneName" | "partyTwoName" | "joinerWord" | "hostNames"
>;

/**
 * Resolves what the cover should call the people being celebrated.
 *
 * The occasion decides whether a pair is even possible. A birthday has one
 * person and a corporate invitation has none, so those never set two names over
 * three lines however the draft happens to be filled in — which also means a
 * host who types a pair under "Wedding" and then switches to "Birthday" gets
 * the single line their new occasion calls for, with the pair kept in the draft
 * and waiting should they switch back.
 *
 * Within an occasion that does pair, the pair wins only when *both* names are
 * there: one name plus a joining word is a half-finished thought, and rendering
 * "Aarav weds" would be worse than falling back. Everything else comes down to
 * hostNames, then the placeholder.
 */
export function resolveCoverNames(
  draft: CoverNameFields,
  occasionId: OccasionId,
): CoverNames {
  const first = draft.partyOneName.trim();
  const second = draft.partyTwoName.trim();

  if (pairsNames(occasionId) && first.length > 0 && second.length > 0) {
    const joiner = draft.joinerWord.trim();

    return {
      kind: "pair",
      first,
      joiner: joiner.length > 0 ? joiner : JOINER_FALLBACK,
      second,
    };
  }

  const line = resolve(draft.hostNames, NAMES_PLACEHOLDER);

  return { kind: "line", text: line.text, isPlaceholder: line.isPlaceholder };
}

/**
 * The same names flattened to one line, for places that cannot stack them —
 * the document title, the share preview's alt text, a screen reader heading.
 */
export function coverNameLine(names: CoverNames): string {
  return names.kind === "pair"
    ? `${names.first} ${names.joiner} ${names.second}`
    : names.text;
}

/**
 * Builds an absolute instant from the draft's own date and time strings, never
 * from the ambient clock. Returns null when the date is empty or unparseable.
 */
function toInstant(eventDate: string, eventTime: string): Date | null {
  const date = eventDate.trim();

  if (!DATE_PATTERN.test(date)) {
    return null;
  }

  const timeMatch = TIME_PATTERN.exec(eventTime.trim());
  const time = timeMatch !== null ? timeMatch[1] : "00:00";
  const parsed = new Date(`${date}T${time}:00${IST_OFFSET}`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function hasTime(eventTime: string): boolean {
  return TIME_PATTERN.test(eventTime.trim());
}

/** ICU uses a narrow no-break space and may lower case the day period. */
function normaliseTime(formatted: string): string {
  return formatted
    .replace(/[\u202F\u00A0]/g, " ")
    .replace(
      /\s*(am|pm)\s*$/i,
      (_match, period: string) => ` ${period.toUpperCase()}`,
    );
}

/** "Monday" — null when there is no usable date. */
export function formatWeekday(
  eventDate: string,
  eventTime: string,
): string | null {
  const instant = toInstant(eventDate, eventTime);
  return instant === null
    ? null
    : new Intl.DateTimeFormat("en-IN", WEEKDAY_FORMAT).format(instant);
}

/** "14 December 2026 at 7:00 PM" — weekday omitted, it gets its own line. */
export function formatDateAndTime(
  eventDate: string,
  eventTime: string,
): string | null {
  const instant = toInstant(eventDate, eventTime);

  if (instant === null) {
    return null;
  }

  const datePart = new Intl.DateTimeFormat("en-IN", DATE_ONLY_FORMAT).format(
    instant,
  );

  if (!hasTime(eventTime)) {
    return datePart;
  }

  const timePart = normaliseTime(
    new Intl.DateTimeFormat("en-IN", TIME_FORMAT).format(instant),
  );

  return `${datePart} at ${timePart}`;
}

/** "Monday, 14 December 2026 at 7:00 PM" — the single-line form. */
export function formatWhen(
  eventDate: string,
  eventTime: string,
): string | null {
  const instant = toInstant(eventDate, eventTime);

  if (instant === null) {
    return null;
  }

  const datePart = new Intl.DateTimeFormat("en-IN", FULL_DATE_FORMAT).format(
    instant,
  );

  if (!hasTime(eventTime)) {
    return datePart;
  }

  const timePart = normaliseTime(
    new Intl.DateTimeFormat("en-IN", TIME_FORMAT).format(instant),
  );

  return `${datePart} at ${timePart}`;
}

/** Google Maps search URL for a venue. */
export function mapsSearchUrl(venueName: string, venueAddress: string): string {
  const query = [venueName.trim(), venueAddress.trim()]
    .filter((part) => part.length > 0)
    .join(", ");

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/* ---------------------------------------------------------------------------
   Placeholder tone.

   An empty draft has to look deliberate rather than broken, so a placeholder
   keeps the exact spacing and type of the real line and differs only in
   opacity. Two values, not one: text already drawn in textMuted starts dimmer
   than textPrimary does, so applying the same multiplier to both would sink the
   muted line out of sight.
   --------------------------------------------------------------------------- */

const PLACEHOLDER_OPACITY: Record<"primary" | "muted", number> = {
  primary: 0.4,
  muted: 0.55,
};

/**
 * Opacity for one line of card text. Always returns a number — real content
 * gets 1 — so a section never has to branch on the placeholder flag itself.
 */
export function placeholderOpacity(
  isPlaceholder: boolean,
  tone: "primary" | "muted",
): number {
  return isPlaceholder ? PLACEHOLDER_OPACITY[tone] : 1;
}

/* ---------------------------------------------------------------------------
   Reveal helpers. Sections drive these from their own useInView result.
   --------------------------------------------------------------------------- */

/**
 * Observer settings shared by every card section.
 *
 * threshold is 0 rather than a fraction of the element, because a section is
 * as tall as its content: a long custom section can be several screens tall,
 * and no fraction-of-element threshold it could satisfy is also a sensible
 * trigger for a short one. A zero threshold with a bottom inset fires on the
 * section's leading edge instead, which behaves identically whatever the
 * section's height turns out to be.
 */
export const SECTION_REVEAL_OPTIONS: IntersectionObserverInit = {
  threshold: 0,
  rootMargin: "0px 0px -12% 0px",
};

export const REVEAL_BASE =
  "transition-[opacity,transform] duration-[600ms] ease-out motion-reduce:transition-none";

export function revealClass(isInView: boolean): string {
  return isInView ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0";
}

/**
 * Staggers a section's own lines by roughly 80ms each.
 *
 * The stagger is a transition delay, not an animation: once useInView latches
 * the section revealed it never un-latches, so a guest who flicks past mid
 * stagger still arrives at a fully visible section. Nothing here can leave a
 * line stranded half revealed.
 */
export function lineDelay(index: number): { transitionDelay: string } {
  return { transitionDelay: `${index * 80}ms` };
}
