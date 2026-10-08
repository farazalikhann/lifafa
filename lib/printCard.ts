/**
 * The invitation, cut into pages for paper.
 *
 * The card is one long page a guest scrolls; a sheet of A5 is not. So the
 * printable copy (app/i/[inviteCode]/print) is the same card drawn several
 * times over, once per sheet, each time with only the sections that sheet
 * carries. Every sheet is the real card: the same components, the same faces,
 * the same palette, border and texture.
 *
 *   1  the opening and the names: calligraphy, greeting, blessing
 *   2  the couple and their families
 *   3  the date, the time and the venue
 *   4  every function, and the note
 *   5  whatever sections the host wrote themselves
 *
 * A sheet with nothing on it is not printed, so a card with no families on it
 * runs to three. Within a sheet the sections keep the order the host put
 * them in.
 *
 * WHAT PAPER CANNOT DO IS LEFT OFF IT. Nothing flies, falls or plays; the
 * countdown, which is only right at the moment it is read, is not printed at
 * all; a date or venue behind a scratch panel is simply shown, and the royal
 * scroll stands open (see hooks/useCardStill.ts).
 */

import {
  hasCustomContent,
  hasFamily,
  hasMessage,
  hasTimeline,
} from "@/lib/cardSections";
import type { CardConfig, CardSectionId } from "@/types/card";
import type { CardBlock } from "@/types/customSection";
import type { EventDraft } from "@/types/event";

/** A5 at the 96 CSS px to the inch a browser lays a page out in. */
export const PRINT_PAGE_WIDTH = 559;
export const PRINT_PAGE_HEIGHT = 794;

/** Which sheet each of the card's own sections goes on. The countdown goes on none. */
const SHEET_OF: Record<CardSectionId, number | null> = {
  cover: 0,
  family: 1,
  details: 2,
  venue: 2,
  timeline: 3,
  message: 3,
  countdown: null,
};

/** The host's own sections, after everything the card supplies. */
const CUSTOM_SHEET = 4;

/** Whether a block puts anything on paper: on the card, and not empty. */
function prints(block: CardBlock, draft: EventDraft, config: CardConfig): boolean {
  if (block.kind === "custom") {
    return hasCustomContent(block.section);
  }

  if (!block.enabled) {
    return false;
  }

  switch (block.id) {
    case "message":
      return hasMessage(draft);
    case "timeline":
      return hasTimeline(draft);
    case "family":
      return hasFamily(draft, config.occasionId);
    case "countdown":
      return false;
    default:
      return true;
  }
}

/** One sheet: the card's config with only that sheet's sections on it. */
export interface PrintSheet {
  /** Stable, for a key: the first section on the sheet. */
  id: string;
  /** The first sheet carries what hangs from the top of the card; the rest do not. */
  first: boolean;
  config: CardConfig;
}

/**
 * The card as its sheets, in order.
 *
 * Each sheet's config is the card's own with the sections cut down and
 * everything that moves or waits for a tap turned off. Only the first keeps
 * the ornaments: they hang from the top of the card, which is the first
 * sheet's top and no other's.
 */
export function printSheets(draft: EventDraft, config: CardConfig): readonly PrintSheet[] {
  const sheets = new Map<number, CardBlock[]>();

  for (const block of config.blocks) {
    if (!prints(block, draft, config)) {
      continue;
    }

    const sheet = block.kind === "custom" ? CUSTOM_SHEET : SHEET_OF[block.id];

    if (sheet === null) {
      continue;
    }

    sheets.set(sheet, [...(sheets.get(sheet) ?? []), block]);
  }

  return [...sheets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([index, blocks]) => {
      const head = blocks[0];
      const first = index === 0;

      return {
        id: head.kind === "custom" ? `custom-${head.section.id}` : head.id,
        first,
        config: {
          ...config,
          blocks,
          musicUrl: null,
          decorMotion: "none",
          butterflies: "none",
          leaves: false,
          petals: "none",
          /* Nothing to scratch on paper: what was hidden is simply printed. */
          scratchTarget: "none",
          ...(config.dateReveal === "scratch" ? { dateReveal: "simple" as const } : null),
          ornamentConfig: first
            ? config.ornamentConfig
            : { ...config.ornamentConfig, enabledOrnaments: [] },
        },
      };
    });
}
