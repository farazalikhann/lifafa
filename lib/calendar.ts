/**
 * Calendar export for one invitation: a Google Calendar link, an Android
 * intent that opens the phone's calendar app on a filled-in new event, and an
 * .ics file for Apple Calendar, Outlook and everything else.
 *
 * Pure functions only, and no ambient clock anywhere in this file. The entry
 * is derived from the draft's own date and time through `eventInstant`, which
 * is the same helper the card's formatters use — so the moment written into a
 * guest's calendar is the moment printed on the card they read it from. The
 * one timestamp that is about "now", the .ics DTSTAMP, is handed in.
 */

import {
  coverNameLine,
  eventInstant,
  hasEventTime,
  resolveCoverNames,
} from "@/lib/cardFormat";
import { cardCopy } from "@/lib/cardLanguage";
import { LIFAFA_DOMAIN } from "@/lib/siteUrl";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";
import type { OccasionId } from "@/types/occasion";

/**
 * How long the celebration is assumed to run for.
 *
 * An EventDraft carries a start and nothing else — Lifafa has never asked a
 * host when their reception ends, and asking now to satisfy a calendar file
 * would be the tail wagging the dog. Two hours is the assumption, because a
 * calendar entry has to occupy *some* span: a zero length entry collapses to a
 * hairline in a week view. A guest who wants it longer can drag it.
 *
 * Only for an event with a time. One with a date alone is written as an
 * all-day entry, which is what the host said: "the 14th", not "midnight".
 */
const ASSUMED_DURATION_MS = 2 * 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

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

/**
 * When the entry happens.
 *
 * Two shapes, because the two are written differently in every format: a
 * timed entry is a pair of absolute instants, an all-day one is a calendar
 * date that means the same day wherever the guest's phone thinks it is.
 */
export type CalendarTiming =
  | { readonly kind: "timed"; readonly start: Date; readonly end: Date }
  /** "YYYY-MM-DD", the day in India the host picked. */
  | { readonly kind: "allDay"; readonly date: string };

/** Everything any of the three exports writes, resolved once. */
export interface CalendarEvent {
  readonly uid: string;
  readonly title: string;
  /** Venue and address on one line, or "" when the host gave neither. */
  readonly location: string;
  readonly description: string;
  /** The invitation's link, or null in the editor's previews. */
  readonly url: string | null;
  readonly timing: CalendarTiming;
}

/* ---------------------------------------------------------------------------
   Shared shaping.
   --------------------------------------------------------------------------- */

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * UTC basic format, "YYYYMMDDTHHMMSSZ".
 *
 * Google's `dates` parameter and ICS's DTSTART share this grammar, and it is
 * built from the UTC getters rather than a locale formatter, so the IST offset
 * is applied once, by `eventInstant`, and never by a string. `toISOString`
 * names the same instant but keeps separators an ICS parser rejects.
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

/** "2026-12-14" to "20261214", the DATE form both Google and ICS want. */
function toBasicDate(date: string): string {
  return date.replace(/-/g, "");
}

/**
 * The day after a "YYYY-MM-DD" date, in the same form.
 *
 * An all-day entry ends at the start of the next day in both Google's link and
 * ICS — the end is exclusive — so a one-day event runs from the 14th to the
 * 15th. Worked in UTC so no zone can move the day.
 */
function nextDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day) + DAY_MS);

  return [
    next.getUTCFullYear(),
    pad(next.getUTCMonth() + 1),
    pad(next.getUTCDate()),
  ].join("-");
}

/**
 * The entry's title: the event and whose it is, in the language the guest is
 * reading. "Wedding Reception: Aarav & Diya", then either half alone, then a
 * neutral stand-in so no entry is ever blank.
 */
function calendarTitle(
  draft: EventDraft,
  occasionId: OccasionId,
  language: CardLanguage,
): string {
  const names = resolveCoverNames(draft, occasionId, language);
  const nameLine =
    names.kind === "line" && names.isPlaceholder ? "" : coverNameLine(names);

  const title = [draft.eventTitle.trim(), nameLine]
    .filter((part) => part.length > 0)
    .join(": ");

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

/**
 * The invitation as a calendar entry, or null when the draft has no date.
 *
 * Main event only. The timeline's functions each have a date of their own, but
 * none of them has a calendar button, and one entry per invitation is what a
 * guest expects to be adding.
 */
export function calendarEvent(
  draft: EventDraft,
  occasionId: OccasionId,
  invite: CalendarInvite,
  language: CardLanguage,
): CalendarEvent | null {
  const start = eventInstant(draft.eventDate, draft.eventTime);

  if (start === null) {
    return null;
  }

  const timing: CalendarTiming = hasEventTime(draft.eventTime)
    ? {
        kind: "timed",
        start,
        end: new Date(start.getTime() + ASSUMED_DURATION_MS),
      }
    : /* `eventInstant` accepted it, so it is a well-formed YYYY-MM-DD. */
      { kind: "allDay", date: draft.eventDate.trim() };

  return {
    uid: `${invite.code}@${UID_DOMAIN}`,
    title: calendarTitle(draft, occasionId, language),
    location: location(draft),
    description: description(draft, invite, language),
    url: invite.url,
    timing,
  };
}

/* ---------------------------------------------------------------------------
   Google Calendar, on the web.
   --------------------------------------------------------------------------- */

const GOOGLE_RENDER = "https://calendar.google.com/calendar/render";

/**
 * An "add this to my Google Calendar" link.
 *
 * Every value goes through encodeURIComponent, `dates` included: the slash
 * between the two halves survives as %2F, which Google accepts, and encoding
 * the parameter wholesale is what stops a venue with an ampersand in its name
 * from ending the query string early and taking the description with it.
 *
 * A timed entry also names Asia/Kolkata as its zone. The instants are already
 * UTC, so this moves nothing; it is what the entry says its zone is when a
 * guest opens it, rather than whatever zone their account happens to be in.
 */
export function googleCalendarUrl(event: CalendarEvent): string {
  const { timing } = event;

  const dates =
    timing.kind === "timed"
      ? `${toUtcBasic(timing.start)}/${toUtcBasic(timing.end)}`
      : `${toBasicDate(timing.date)}/${toBasicDate(nextDate(timing.date))}`;

  const parameters: readonly (readonly [string, string])[] = [
    ["action", "TEMPLATE"],
    ["text", event.title],
    ["dates", dates],
    ...(timing.kind === "timed"
      ? [["ctz", "Asia/Kolkata"] as const]
      : []),
    ["location", event.location],
    ["details", event.description],
  ];

  const query = parameters
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");

  return `${GOOGLE_RENDER}?${query}`;
}

/* ---------------------------------------------------------------------------
   Android: straight into the calendar app.
   --------------------------------------------------------------------------- */

/**
 * An Android intent that opens the calendar app's new-event screen with the
 * entry filled in, falling back to the Google Calendar web link.
 *
 * WHY NOT THE WEB LINK ON ANDROID. calendar.google.com is claimed by the
 * Google Calendar app, so tapping the link hands it to the app — and an app
 * that was not already running opens on its own home screen and drops the
 * event it was given. The second tap works, because by then the app is
 * running. INSERT is the platform's own "new event" action, which the app
 * answers with the form filled in whether it was running or not.
 *
 * No `package`, so any calendar app that handles the action can answer it —
 * Samsung Calendar on a phone that uses it, a chooser on a phone with two.
 *
 * Chrome decodes each extra's value, so every one goes through
 * encodeURIComponent: that is also what keeps a ";" or "=" in a venue from
 * being read as the end of the extra.
 *
 * An all-day entry is sent as noon in India on both ends. The app reads the
 * day out of the instant in whichever zone it works in, and noon IST falls on
 * the same date from UTC−6:30 to UTC+11:30, where midnight IST would already be
 * the day before in UTC.
 */
export function androidCalendarIntent(event: CalendarEvent): string {
  const { timing } = event;

  let begin: number;
  let end: number;

  if (timing.kind === "timed") {
    begin = timing.start.getTime();
    end = timing.end.getTime();
  } else {
    begin = new Date(`${timing.date}T12:00:00+05:30`).getTime();
    end = begin;
  }

  const extras = [
    `S.title=${encodeURIComponent(event.title)}`,
    `S.description=${encodeURIComponent(event.description)}`,
    `S.eventLocation=${encodeURIComponent(event.location)}`,
    `l.beginTime=${begin}`,
    `l.endTime=${end}`,
    ...(timing.kind === "allDay" ? ["B.allDay=true"] : []),
    `S.browser_fallback_url=${encodeURIComponent(googleCalendarUrl(event))}`,
  ];

  return [
    "intent:#Intent",
    "action=android.intent.action.INSERT",
    "type=vnd.android.cursor.item/event",
    ...extras,
    "end",
  ].join(";");
}

/* ---------------------------------------------------------------------------
   iCalendar, for Apple Calendar, Outlook and the rest.
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

/** RFC 5545 §3.1: no line longer than 75 octets, excluding the line break. */
const FOLD_OCTETS = 75;

const encoder = new TextEncoder();

/**
 * One content line folded to the RFC's width.
 *
 * Counted in UTF-8 octets, not characters: a Devanagari letter is three octets,
 * so a Hindi title folded by character count would run to three times the
 * limit. Folds between code points, never inside one, which is what keeps a
 * character from being split across the break. A continuation line starts with
 * a space that counts towards its 75.
 */
function fold(line: string): string {
  let folded = "";
  let used = 0;

  for (const character of line) {
    const size = encoder.encode(character).length;

    if (used + size > FOLD_OCTETS) {
      folded += "\r\n ";
      used = 1;
    }

    folded += character;
    used += size;
  }

  return folded;
}

/**
 * A complete VCALENDAR for the event.
 *
 * The UID is derived from the invite code, so opening the file a second time
 * updates the entry a guest already has rather than adding another one — which
 * a random UID would do, once per download, until their week view was
 * unusable.
 *
 * `stamp` is DTSTAMP, when this copy was written. Handed in rather than read
 * from the clock, so the function stays pure.
 */
export function icsContent(event: CalendarEvent, stamp: Date): string {
  const { timing } = event;

  const when =
    timing.kind === "timed"
      ? [
          `DTSTART:${toUtcBasic(timing.start)}`,
          `DTEND:${toUtcBasic(timing.end)}`,
        ]
      : [
          `DTSTART;VALUE=DATE:${toBasicDate(timing.date)}`,
          `DTEND;VALUE=DATE:${toBasicDate(nextDate(timing.date))}`,
        ];

  const lines: readonly string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lifafa//Invitation//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${toUtcBasic(stamp)}`,
    ...when,
    `SUMMARY:${escapeText(event.title)}`,
    ...(event.location.length > 0
      ? [`LOCATION:${escapeText(event.location)}`]
      : []),
    ...(event.description.length > 0
      ? [`DESCRIPTION:${escapeText(event.description)}`]
      : []),
    /* A URI value, which is not TEXT and takes no escaping. */
    ...(event.url === null ? [] : [`URL:${event.url}`]),
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  /* CRLF between lines and after the last one, as RFC 5545 requires. */
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

/**
 * Where a saved invitation's .ics is served — app/i/[inviteCode]/calendar.ics.
 *
 * A real URL rather than a file made in the browser, because iOS only offers
 * its "Add to Calendar" sheet for a calendar it fetched: a blob link opens as
 * text or not at all. `download` asks for it as an attachment, for the
 * browsers that should save it rather than show it.
 */
export function icsPath(
  code: string,
  language: CardLanguage,
  download: boolean,
): string {
  const query = `lang=${language}${download ? "&dl=1" : ""}`;

  return `/i/${encodeURIComponent(code)}/calendar.ics?${query}`;
}

/**
 * A safe .ics filename built from the event's title.
 *
 * Anything that is not a letter or a digit becomes a dash, because a title is
 * free text and a colon or a slash in a filename is refused outright by
 * Windows and silently rewritten by macOS. A title in Devanagari has no a-z
 * in it at all and comes out as "invitation.ics", which is fine: a filename is
 * not something a guest reads.
 */
export function icsFileName(event: CalendarEvent): string {
  const slug = event.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");

  return `${slug.length > 0 ? slug : "invitation"}.ics`;
}
