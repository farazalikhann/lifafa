/**
 * Shared card formatting and reveal helpers.
 *
 * Lifted out of CardPreview so all four sections use one implementation rather
 * than four copies. Pure functions only — no JSX — so it can be imported from
 * anywhere in the card tree without creating an import cycle.
 */

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
   Reveal helpers. Sections drive these from their own useInView result.
   --------------------------------------------------------------------------- */

export const REVEAL_BASE =
  "transition-[opacity,transform] duration-[600ms] ease-out motion-reduce:transition-none";

export function revealClass(isInView: boolean): string {
  return isInView ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0";
}

/** Staggers a section's own lines by roughly 80ms each. */
export function lineDelay(index: number): { transitionDelay: string } {
  return { transitionDelay: `${index * 80}ms` };
}
