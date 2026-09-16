/**
 * Calendar export for one invitation: a Google Calendar link and an .ics file.
 *
 * Pure functions only, and no ambient clock anywhere in this file. Everything
 * is derived from the draft's own date and time through `eventInstant`, which
 * is the same helper the card's formatters use — so the moment written into a
 * guest's calendar is the moment printed on the card they read it from.
 */

import { eventInstant } from "@/lib/cardFormat";
import { cardCopy } from "@/lib/cardLanguage";
import { LIFAFA_DOMAIN } from "@/lib/siteUrl";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";

/**
 * How long the celebration is assumed to run for.
 *
 * An EventDraft carries a start and nothing else — Lifafa has never asked a
 * host when their reception ends, and asking now to satisfy a calendar file
 * would be the tail wagging the dog. Two hours is the assumption, because a
 * calendar entry has to occupy *some* span: a zero length entry collapses to a
 * hairline in a week view, and an all-day entry would lose the 7 PM a guest
 * actually needs to read. A guest who wants it longer can drag it.
 */
const ASSUMED_DURATION_MS = 2 * 60 * 60 * 1000;

/**
 * The domain half of a calendar UID.
 *
 * LIFAFA_DOMAIN rather than the resolved origin, and deliberately so. A UID is
 * how a calendar recognises an entry it has already got: re-import the same
 * invitation and it updates that entry rather than adding a second one. Built
 * from whatever address the file happened to be generated on, the UID for one
 * event would differ between the live site, a preview and a dev server, and
 * every host testing a change would hand their guests a duplicate. The domain
 * is a fixed namespace here, not a location, so it does not follow
 * NEXT_PUBLIC_SITE_URL.
 */
const UID_DOMAIN = LIFAFA_DOMAIN;

/**
 * The invitation these links point back at.
 *
 * Separate from the draft because neither field is on it: the code is minted
 * server-side by lib/inviteCode.ts and the URL is assembled from it. Passing
 * them in also keeps both builders pure — nothing here reads `window`.
 */
export interface CalendarInvite {
  /** The event's invite code. The stable half of the ICS UID. */
  code: string;
  /** The absolute link a guest can open, or null before the event is saved. */
  url: string | null;
}

/**
 * Stands in for a real invitation in the editor's previews.
 *
 * A draft the host is still typing has no code and no link yet, but they should
 * still see the calendar buttons their guests will get. The UID is stable, as
 * the format requires, and a preview's file is never shared with anyone.
 */
export const PREVIEW_INVITE: CalendarInvite = { code: "preview", url: null };

/* ---------------------------------------------------------------------------
   Shared shaping.
   --------------------------------------------------------------------------- */

/** The span a calendar entry occupies, or null when there is no date. */
function span(draft: EventDraft): { start: Date; end: Date } | null {
  const start = eventInstant(draft.eventDate, draft.eventTime);

  if (start === null) {
    return null;
  }

  return {
    start,
    end: new Date(start.getTime() + ASSUMED_DURATION_MS),
  };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * UTC basic format, "YYYYMMDDTHHMMSSZ".
 *
 * Both outputs want the same string — Google's `dates` parameter and ICS's
 * DTSTART share this grammar — and it is built from the UTC getters rather
 * than a locale formatter, so the offset is applied once, by Date, and never
 * by a string. `toISOString` names the same instant but keeps separators an
 * ICS parser rejects.
 */
function toUtcBasic(instant: Date): string {
  return [
    instant.getUTCFullYear(),
    pad(instant.getUTCMonth() + 1),
    pad(instant.getUTCDate()),
    "T",
    pad(instant.getUTCHours()),
    pad(instant.getUTCMinutes()),
    pad(instant.getUTCSeconds()),
    "Z",
  ].join("");
}

/**
 * The event's title, or a neutral stand-in in the card's language so no entry
 * is ever blank.
 */
export function calendarTitle(draft: EventDraft, language: CardLanguage): string {
  const title = draft.eventTitle.trim();
  return title.length > 0 ? title : cardCopy(language).calendar.titleFallback;
}

/** Venue name and address as one line, with either half allowed to be missing. */
function location(draft: EventDraft): string {
  return [draft.venueName.trim(), draft.venueAddress.trim()]
    .filter((part) => part.length > 0)
    .join(", ");
}

/**
 * The note in the calendar entry: who is hosting, and how to get back to the
 * invitation. Two short lines — a calendar entry is glanced at rather than
 * read, and most clients truncate anything longer in the views that matter.
 */
function description(
  draft: EventDraft,
  invite: CalendarInvite,
  language: CardLanguage,
): string {
  const hosts = draft.hostNames.trim();
  const { calendar } = cardCopy(language);

  const lines = [
    hosts.length > 0 ? calendar.hostedBy(hosts) : null,
    invite.url === null ? null : calendar.invitationLink(invite.url),
  ].filter((line): line is string => line !== null);

  return lines.join("\n");
}

/* ---------------------------------------------------------------------------
   Google Calendar.
   --------------------------------------------------------------------------- */

const GOOGLE_RENDER = "https://calendar.google.com/calendar/render";

/**
 * An "add this to my Google Calendar" link, or null when the draft has no date.
 *
 * Every value goes through encodeURIComponent, `dates` included: the slash
 * between the two instants survives as %2F, which Google accepts, and encoding
 * the parameter wholesale is what stops a venue with an ampersand in its name
 * from ending the query string early and taking the description with it.
 */
export function buildGoogleCalendarUrl(
  draft: EventDraft,
  invite: CalendarInvite,
  language: CardLanguage,
): string | null {
  const window = span(draft);

  if (window === null) {
    return null;
  }

  const parameters: readonly (readonly [string, string])[] = [
    ["action", "TEMPLATE"],
    ["text", calendarTitle(draft, language)],
    ["dates", `${toUtcBasic(window.start)}/${toUtcBasic(window.end)}`],
    ["location", location(draft)],
    ["details", description(draft, invite, language)],
  ];

  const query = parameters
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");

  return `${GOOGLE_RENDER}?${query}`;
}

/* ---------------------------------------------------------------------------
   iCalendar, for Apple Calendar and Outlook.
   --------------------------------------------------------------------------- */

/**
 * RFC 5545 §3.3.11 text escaping.
 *
 * The backslash is escaped first, or every escape the passes below it add
 * would be escaped a second time. Without the comma rule a venue written
 * "The Leela, Mumbai" is read as two values and arrives in Apple Calendar cut
 * off at the comma; without the newline rule a multi-line description ends its
 * property early and the rest of the file is parsed as garbage.
 */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * A complete VCALENDAR for the event, or null when the draft has no date.
 *
 * The UID is derived from the invite code, so downloading the file a second
 * time updates the entry a guest already has rather than adding another one —
 * which a random UID would do, once per download, until their week view was
 * unusable.
 *
 * DTSTAMP is the event's own start instant rather than the moment of the
 * download. That keeps this function pure and its output byte-identical across
 * two downloads of the same invitation; in a file with no METHOD, DTSTAMP
 * means only "when this object was written" and nothing acts on it.
 */
export function buildIcsContent(
  draft: EventDraft,
  invite: CalendarInvite,
  language: CardLanguage,
): string | null {
  const window = span(draft);

  if (window === null) {
    return null;
  }

  const start = toUtcBasic(window.start);

  const lines: readonly string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lifafa//Invitation//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${invite.code}@${UID_DOMAIN}`,
    `DTSTAMP:${start}`,
    `DTSTART:${start}`,
    `DTEND:${toUtcBasic(window.end)}`,
    `SUMMARY:${escapeText(calendarTitle(draft, language))}`,
    `LOCATION:${escapeText(location(draft))}`,
    `DESCRIPTION:${escapeText(description(draft, invite, language))}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  /* CRLF between lines and after the last one, as RFC 5545 requires. */
  return `${lines.join("\r\n")}\r\n`;
}

/**
 * A safe .ics filename built from the event's title.
 *
 * Anything that is not a letter or a digit becomes a dash, because a title is
 * free text and a colon or a slash in a filename is refused outright by
 * Windows and silently rewritten by macOS.
 *
 * Always the English fallback, whatever the card is written in. The slug keeps
 * a-z and digits only, so a title in Devanagari comes out as "invitation.ics"
 * either way, and a filename is not something a guest reads.
 */
export function icsFileName(draft: EventDraft): string {
  const slug = calendarTitle(draft, "en")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug.length > 0 ? slug : "invitation"}.ics`;
}
