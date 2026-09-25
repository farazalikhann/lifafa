import type { EventDraft } from "@/types/event";

/**
 * When a paid invitation stops being editable, and how far it may be changed
 * before then.
 *
 * THE TWO RULES
 *
 *   After the event. A paid invitation is "ended" from 00:00 India time on the
 *   day after its end date: the latest of the main date and every timeline
 *   function's date. Ended, it is a keepsake: guests can still open it, but
 *   the host can no longer edit it, and it takes no replies or check-ins.
 *
 *   No reuse before it. After payment the dates may be changed twice, never to
 *   end more than 180 days after the end date it was paid with, and the names
 *   on the cover three times, for spelling. A paid card cannot become the next
 *   family's invitation.
 *
 * ENFORCED TWICE, the same way. The app checks here first so the host gets a
 * clear message (lib/db/events.ts, the editor); the database checks again in
 * its own trigger (0013_event_lock.sql) and does the counting, so no request
 * that goes round the app can skip it. The two are written to agree: the
 * signatures below are built exactly as event_date_signature() and
 * event_name_signature() build them in SQL.
 *
 * Unpaid invitations are untouched by all of it.
 *
 * Pure functions: the server, the editor and the guest page share them.
 */

export const DATE_CHANGE_LIMIT = 2;
export const NAME_CHANGE_LIMIT = 3;
/** How far past the paid-for end date a new end date may go. */
export const DATE_WINDOW_DAYS = 180;
/** How long an admin unlock of an ended invitation lasts. */
export const ADMIN_UNLOCK_HOURS = 48;

export const ENDED_EDIT_MESSAGE =
  "This event has ended, so the invitation can no longer be edited. Your guest list and responses are still available.";
export const DATE_LIMIT_MESSAGE =
  "The date can be changed twice and up to 6 months later. Contact support if your event has moved further.";
export const NAME_LIMIT_MESSAGE =
  "Names can no longer be changed. Contact support if you need help.";
export const DATE_REQUIRED_MESSAGE =
  "A paid invitation needs its event date. Add the date to save your changes.";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar date in YYYY-MM-DD, or null: "2026-02-30" is not one. */
function isoDate(value: unknown): string | null {
  if (typeof value !== "string" || !ISO_DATE.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
    ? value
    : null;
}

/** Every date on the card, the main one and each function's, sorted. */
export function eventDates(draft: EventDraft): string[] {
  return [draft.eventDate, ...(draft.subEvents ?? []).map((entry) => entry.date)]
    .map(isoDate)
    .filter((date): date is string => date !== null)
    .sort();
}

/** The latest date on the card, or null when it has none. */
export function eventEndDate(draft: EventDraft): string | null {
  const dates = eventDates(draft);
  return dates.length > 0 ? dates[dates.length - 1] : null;
}

/** Today's date in India, YYYY-MM-DD. India keeps no daylight saving. */
export function todayInIndia(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** `days` after an ISO date, as an ISO date. */
export function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

/**
 * Whether a paid invitation has ended: India's today is past its end date.
 * An unpaid one never has, and neither has one with no date.
 */
export function hasEnded(
  isPaid: boolean,
  draft: EventDraft,
  now: Date = new Date(),
): boolean {
  const end = eventEndDate(draft);
  return isPaid && end !== null && todayInIndia(now) > end;
}

/** Whether an admin has lifted the lock on an ended invitation, for now. */
export function isUnlocked(
  editUnlockedUntil: string | null,
  now: Date = new Date(),
): boolean {
  return (
    editUnlockedUntil !== null && Date.parse(editUnlockedUntil) > now.getTime()
  );
}

/** Ended and not unlocked: the host may not edit it. */
export function isEditLocked(
  lock: { isPaid: boolean; draft: EventDraft; editUnlockedUntil: string | null },
  now: Date = new Date(),
): boolean {
  return (
    hasEnded(lock.isPaid, lock.draft, now) &&
    !isUnlocked(lock.editUnlockedUntil, now)
  );
}

/**
 * The card's dates as one string, so any change to any of them — moved,
 * added, removed — is one change. Same as event_date_signature() in SQL.
 */
export function dateSignature(draft: EventDraft): string {
  return eventDates(draft).join(",");
}

type Named = { partyOneName?: string; partyTwoName?: string; hostNames?: string };

function nameTriple(words: Named | undefined): string {
  return [words?.partyOneName, words?.partyTwoName, words?.hostNames]
    .map((name) => (name ?? "").trim())
    .join("|");
}

/**
 * The names on the cover, in the card's language and in every translation, as
 * one string: renaming the couple in Hindi is renaming them too. Same as
 * event_name_signature() in SQL.
 */
export function nameSignature(draft: EventDraft): string {
  const translations = draft.translations ?? {};
  const languages = Object.keys(translations).sort();

  return [
    nameTriple(draft),
    ...languages.map(
      (language) =>
        `${language}:${nameTriple(translations[language as keyof typeof translations])}`,
    ),
  ].join(";");
}

/** What a paid invitation carries about its changes so far. */
export interface ChangeAllowance {
  originalEndDate: string | null;
  dateChangeCount: number;
  nameChangeCount: number;
}

export type PaidEditRefusal = "date_required" | "date_limit" | "name_limit";

/**
 * Whether saving `next` over `current` is allowed after payment, and why not.
 * What the database counts: a save that touches any date is one date change,
 * and one that touches any name is one name change.
 */
export function checkPaidEdit(
  current: EventDraft,
  next: EventDraft,
  allowance: ChangeAllowance,
): PaidEditRefusal | null {
  return (
    dateEditRefusal(current, next, allowance) ??
    nameEditRefusal(current, next, allowance)
  );
}

/** Why the dates in `next` may not be saved, or null when they may. */
export function dateEditRefusal(
  current: EventDraft,
  next: EventDraft,
  allowance: ChangeAllowance,
): "date_required" | "date_limit" | null {
  if (dateSignature(current) === dateSignature(next)) {
    return null;
  }

  const end = eventEndDate(next);

  if (end === null) {
    return "date_required";
  }

  if (allowance.dateChangeCount >= DATE_CHANGE_LIMIT) {
    return "date_limit";
  }

  if (
    allowance.originalEndDate !== null &&
    end > addDays(allowance.originalEndDate, DATE_WINDOW_DAYS)
  ) {
    return "date_limit";
  }

  return null;
}

/** Why the names in `next` may not be saved, or null when they may. */
export function nameEditRefusal(
  current: EventDraft,
  next: EventDraft,
  allowance: ChangeAllowance,
): "name_limit" | null {
  return nameSignature(current) !== nameSignature(next) &&
    allowance.nameChangeCount >= NAME_CHANGE_LIMIT
    ? "name_limit"
    : null;
}

export function paidEditMessage(refusal: PaidEditRefusal | "event_ended"): string {
  switch (refusal) {
    case "event_ended":
      return ENDED_EDIT_MESSAGE;
    case "date_required":
      return DATE_REQUIRED_MESSAGE;
    case "date_limit":
      return DATE_LIMIT_MESSAGE;
    case "name_limit":
      return NAME_LIMIT_MESSAGE;
  }
}
