import { eventInstant } from "@/lib/cardFormat";
import type { CardSectionId } from "@/types/card";
import type { CustomSection } from "@/types/customSection";
import type { EventDraft, SubEvent } from "@/types/event";

export interface CardSectionMeta {
  label: string;
  description: string;
}

/**
 * The registry of card sections — the single source of truth for what a card
 * can contain and the order sections appear in.
 *
 * A later step will drive a section toggle panel in the editor from this map;
 * that panel is deliberately not built yet. Adding a section here means adding
 * its id to CardSectionId and a renderer in CardCanvas.
 */
export const CARD_SECTIONS: Record<CardSectionId, CardSectionMeta> = {
  cover: {
    label: "Cover",
    description: "Host names and the occasion, the first thing a guest sees.",
  },
  family: {
    label: "Families",
    description:
      "Parents and home town for each side. Hidden until you fill one in.",
  },
  details: {
    label: "Date and time",
    description: "When the celebration happens, with the day of the week.",
  },
  countdown: {
    label: "Countdown",
    description:
      "A live count down to the celebration. Hidden until a date is set.",
  },
  venue: {
    label: "Venue",
    description: "Where to go, with a link that opens the place in Maps.",
  },
  timeline: {
    label: "All functions",
    description:
      "Every function in date order, the main event included. Hidden until there is one.",
  },
  message: {
    label: "Message",
    description: "A short personal note. Hidden when left empty.",
  },
};

/** Default running order, matching the registry above. */
export const DEFAULT_SECTION_ORDER: readonly CardSectionId[] = [
  "cover",
  "family",
  "details",
  "countdown",
  "venue",
  "timeline",
  "message",
];

/* ---------------------------------------------------------------------------
   Content predicates.

   Two callers have to agree exactly on whether a section puts anything on the
   page: the section component, which returns null when it has nothing to show,
   and CardCanvas, which decides where the dividers go. If those two drifted
   apart the card would grow a divider beside a section that rendered nothing,
   so both read the answer from here rather than each trimming their own copy.
   --------------------------------------------------------------------------- */

/** A custom section shows up once either of its two fields has content. */
export function hasCustomContent(section: CustomSection): boolean {
  return (
    section.heading.trim().length > 0 || section.body.trim().length > 0
  );
}

/** The message section hides itself when the host wrote no note. */
export function hasMessage(draft: EventDraft): boolean {
  return draft.message.trim().length > 0;
}

/* ---------------------------------------------------------------------------
   The timeline.
   --------------------------------------------------------------------------- */

/** One row of the schedule. The primary event becomes one of these too. */
export type TimelineEntry = SubEvent;

/** What the main event is called when the host has not titled it. */
const PRIMARY_FALLBACK_LABEL = "Main function";

/**
 * The primary event as a timeline row, or null when it has no date.
 *
 * A dateless primary is left out rather than pinned to the top: it cannot be
 * placed in a sequence, and a row reading "Main function" with nothing under it
 * is worse than a schedule that begins at the mehndi.
 */
function primaryEntry(draft: EventDraft): TimelineEntry | null {
  if (eventInstant(draft.eventDate, draft.eventTime) === null) {
    return null;
  }

  const title = draft.eventTitle.trim();

  return {
    /* Cannot collide: the editor mints "sub-N" and nothing else. */
    id: "primary",
    label: title.length > 0 ? title : PRIMARY_FALLBACK_LABEL,
    date: draft.eventDate,
    time: draft.eventTime,
    venueName: draft.venueName,
    venueAddress: draft.venueAddress,
  };
}

/**
 * Every function of the celebration, earliest first.
 *
 * Sorted here rather than in the section, so the predicate below and the
 * renderer cannot disagree about how many rows there are. The draft's own array
 * is never reordered: the host's entry order is theirs, and this returns a copy.
 *
 * A function with no usable date sorts to the end rather than to 1970. The host
 * has named something real and not yet fixed the day; dropping it would lose
 * their work, and sorting it as the epoch would put the reception before the
 * mehndi. Among themselves those keep the order they were added in, which is
 * the only order there is any information about.
 */
export function timelineEntries(draft: EventDraft): readonly TimelineEntry[] {
  const primary = primaryEntry(draft);
  const rows: TimelineEntry[] = [
    ...(primary === null ? [] : [primary]),
    ...draft.subEvents,
  ];

  return rows
    .map((entry, index) => ({
      entry,
      index,
      at: eventInstant(entry.date, entry.time)?.getTime() ?? null,
    }))
    .sort((a, b) => {
      if (a.at === null && b.at === null) {
        return a.index - b.index;
      }

      if (a.at === null) {
        return 1;
      }

      if (b.at === null) {
        return -1;
      }

      return a.at - b.at || a.index - b.index;
    })
    .map((row) => row.entry);
}

/**
 * The timeline waits for a second function before it appears at all.
 *
 * Not `timelineEntries(draft).length > 0`, which is what this used to be and
 * which counted the primary event on its own. A card with one function and a
 * date would grow a schedule listing that one function, saying what the date
 * and venue sections above it had already said, under a heading promising
 * celebrations plural. Every invitation that predates sub-events would have
 * gained that section the day it shipped.
 *
 * So the question is not "is there anything to list" but "is there a sequence",
 * and one event is not a sequence. Once a host adds a mehndi, the primary joins
 * it in the list and the section is worth its screen.
 */
export function hasTimeline(draft: EventDraft): boolean {
  return draft.subEvents.length > 0;
}

/* ---------------------------------------------------------------------------
   The families.
   --------------------------------------------------------------------------- */

/**
 * One side's block on the card.
 *
 * Every field is nullable and the section skips whichever are null, so a host
 * who filled in a city and no parents gets a city, not an empty line where the
 * parents would have been.
 */
export interface FamilyBlock {
  key: "one" | "two";
  name: string | null;
  parents: string | null;
  city: string | null;
}

function trimmedOrNull(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * The family blocks worth drawing, in order.
 *
 * A block appears only when that side has parents or a city: a name on its own
 * is already on the cover, and repeating it under a heading would be a section
 * that says nothing. The first side falls back to `hostNames` because a card
 * for one person keeps the name there rather than in `partyOneName`.
 */
export function familyBlocks(draft: EventDraft): readonly FamilyBlock[] {
  const candidates: readonly FamilyBlock[] = [
    {
      key: "one",
      name: trimmedOrNull(draft.partyOneName) ?? trimmedOrNull(draft.hostNames),
      parents: trimmedOrNull(draft.partyOneParents),
      city: trimmedOrNull(draft.partyOneCity),
    },
    {
      key: "two",
      name: trimmedOrNull(draft.partyTwoName),
      parents: trimmedOrNull(draft.partyTwoParents),
      city: trimmedOrNull(draft.partyTwoCity),
    },
  ];

  return candidates.filter(
    (block) => block.parents !== null || block.city !== null,
  );
}

/** The family section hides itself when neither side has anything to say. */
export function hasFamily(draft: EventDraft): boolean {
  return familyBlocks(draft).length > 0;
}

/**
 * The countdown hides itself when there is nothing to count down to.
 *
 * Deliberately answered from the draft alone and never from the clock. This
 * runs on the server as well as in the browser — CardCanvas calls it to decide
 * where the dividers go — so an answer that moved as the seconds passed would
 * put a divider beside a section the two runtimes disagreed about.
 */
export function hasCountdown(draft: EventDraft): boolean {
  return eventInstant(draft.eventDate, draft.eventTime) !== null;
}
