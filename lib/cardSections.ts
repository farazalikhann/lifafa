import type { CardSectionId } from "@/types/card";
import type { CustomSection } from "@/types/customSection";
import type { EventDraft } from "@/types/event";

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
  details: {
    label: "Date and time",
    description: "When the celebration happens, with the day of the week.",
  },
  venue: {
    label: "Venue",
    description: "Where to go, with a link that opens the place in Maps.",
  },
  message: {
    label: "Message",
    description: "A short personal note. Hidden when left empty.",
  },
};

/** Default running order, matching the registry above. */
export const DEFAULT_SECTION_ORDER: readonly CardSectionId[] = [
  "cover",
  "details",
  "venue",
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
