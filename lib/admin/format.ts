import { formatInr } from "@/lib/pricing";

/**
 * How the admin dashboard writes dates and numbers.
 *
 * ONE PLACE, because there were three. The same Intl.DateTimeFormat was
 * declared in app/admin/events/[id]/page.tsx, app/admin/coupons/[code]/page.tsx
 * and the events table, and three copies of a format is
 * three chances for one screen to disagree with the next about what time it is.
 *
 * ALWAYS ASIA/KOLKATA, never the reader's own zone. The counts on the overview
 * — "created today" — are bucketed from IST midnight in lib/admin/stats.ts, so
 * a table rendering the same rows in the browser's local zone would put an
 * event on a different day from the tile counting it. On a laptop that has
 * followed somebody to another country, that gap is five and a half hours of
 * quiet nonsense.
 *
 * The formatters are module constants rather than built per call: constructing
 * an Intl formatter is the expensive part, and a table of fifty rows would
 * otherwise build fifty of them.
 */

/** "16 Sep 2026, 10:19 pm" — the default, for anything with a time. */
const DATE_TIME = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

/** "16 Sep 2026" — for a column where the time is noise, like an expiry. */
const DATE_ONLY = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

/** "16 Sep" — for a chart axis, where the year is the same on every bar. */
const DAY_MONTH = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  timeZone: "Asia/Kolkata",
});

/**
 * An em dash for null, and for anything that is not a date.
 *
 * `Number.isNaN` on the parsed time rather than a try/catch: `new Date()` does
 * not throw on nonsense, it returns an Invalid Date, which formats as the
 * string "Invalid Date" and looks like a bug in the data rather than a bug in
 * the parsing.
 */
function format(
  iso: string | null | undefined,
  formatter: Intl.DateTimeFormat,
): string {
  if (iso === null || iso === undefined || iso.length === 0) {
    return "—";
  }

  const parsed = new Date(iso);

  return Number.isNaN(parsed.getTime()) ? "—" : formatter.format(parsed);
}

/** Date and time, IST. The one to reach for unless the time is noise. */
export function formatIst(iso: string | null | undefined): string {
  return format(iso, DATE_TIME);
}

/** Date only, IST. For expiries and anything where the hour says nothing. */
export function formatIstDate(iso: string | null | undefined): string {
  return format(iso, DATE_ONLY);
}

/** Day and month, IST. For the bar chart's labels. */
export function formatIstDayMonth(iso: string | null | undefined): string {
  return format(iso, DAY_MONTH);
}

/**
 * A count with Indian grouping — 1,23,456 rather than 123,456.
 *
 * Not a currency: money goes through formatInr in lib/pricing.ts, always, so
 * that a rupee figure can never be printed as a bare number. This is for the
 * things that are counted rather than charged.
 */
export function formatCount(value: number): string {
  return value.toLocaleString("en-IN");
}

/**
 * Paise to a rupee string, through the one currency formatter there is.
 *
 * Every amount in the payments table is paise and every amount on screen is
 * rupees, so this conversion happens on every money figure the admin shows.
 * Doing it at each call site is how one screen ends up reading ₹99,900 for an
 * invitation that cost ₹999 — and the rounding is here rather than there so
 * that two tiles summing the same rows cannot round differently.
 */
export function formatPaise(paise: number): string {
  return formatInr(Math.round(paise / 100));
}

/*
  Re-exported so a component formatting money needs one import rather than two,
  and so there is no call site tempted to print a rupee figure with
  formatCount. lib/pricing.ts stays the definition; this is the doorway.
*/
export { formatInr };
