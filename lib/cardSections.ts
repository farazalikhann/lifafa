import type { CardSectionId } from "@/types/card";

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
