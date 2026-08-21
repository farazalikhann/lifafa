import { DEFAULT_SECTION_ORDER } from "@/lib/cardSections";
import { DEFAULT_FONT_PAIR_ID } from "@/lib/fontPairs";
import {
  DEFAULT_OCCASION_ID,
  DEFAULT_TRADITION_ID,
  getOccasion,
} from "@/lib/occasions";
import { DEFAULT_ORNAMENT_CONFIG } from "@/lib/ornaments/muslim";
import type { DecorIntensity, DecorMotion, ScratchTarget } from "@/types/card";
import type { CardBlock } from "@/types/customSection";
import type { EventDraft } from "@/types/event";
import type { OccasionId, TraditionId } from "@/types/occasion";
import type { OrnamentConfig } from "@/types/ornament";
import type { CardStyle } from "@/types/style";

/**
 * Everything a stored event will one day carry: the draft the host typed plus
 * the design decisions they made around it.
 *
 * The card and the share image both need all of it — the image has to paint the
 * event's own palette, not a generic one — so it lives in a single shape rather
 * than being reassembled at each call site.
 */
export interface MockEvent {
  /** Echoed back so a caller can tell which event it was handed. */
  inviteCode: string;
  draft: EventDraft;
  occasionId: OccasionId;
  traditionId: TraditionId;
  decorMotion: DecorMotion;
  decorIntensity: DecorIntensity;
  scratchTarget: ScratchTarget;
  style: CardStyle;
  /**
   * The Muslim ornament pack's choices.
   *
   * Carried whatever the tradition, so a stored event has one shape rather than
   * two. The card reads it only on a Muslim tradition, and the sample below is
   * not one, so today this is always the empty default.
   */
  ornamentConfig: OrnamentConfig;
  /** Ordered running order, exactly as CardCanvas expects it. */
  blocks: readonly CardBlock[];
}

const OCCASION = getOccasion(DEFAULT_OCCASION_ID);

const SAMPLE_DRAFT: EventDraft = {
  partyOneName: "Aarav",
  partyTwoName: "Meera",
  joinerWord: "weds",
  /* Kept as the fallback the two names above take precedence over. */
  hostNames: "Aarav and Meera",
  eventTitle: "Wedding Reception",
  eventDate: "2026-12-14",
  eventTime: "19:00",
  venueName: "The Grand Ballroom",
  venueAddress: "12 MG Road, Bengaluru 560001",
  message: "We would love to have you with us as we begin this chapter.",
  themeId: OCCASION.defaultThemeId,
};

/**
 * PLACEHOLDER LOOKUP.
 *
 * There is no database in this step, so every invite code resolves to the same
 * sample invitation and the code itself is only echoed back. When events are
 * stored this becomes the real read — an async fetch by invite code returning
 * null for an unknown one — and both the invite page and the share image follow
 * it there without changing shape.
 */
export function getMockEvent(inviteCode: string): MockEvent {
  return {
    inviteCode,
    draft: SAMPLE_DRAFT,
    occasionId: DEFAULT_OCCASION_ID,
    traditionId: DEFAULT_TRADITION_ID,
    decorMotion: OCCASION.defaultMotion,
    decorIntensity: "normal",
    /*
      The sample card exercises the feature rather than sitting on the default,
      so opening an invite link shows what a scratch panel actually does. A
      stored event will carry the host's own choice here.
    */
    scratchTarget: "date",
    /* The sample event chooses no tradition at all, so the pack stays off. */
    ornamentConfig: DEFAULT_ORNAMENT_CONFIG,
    style: {
      fontPairId: DEFAULT_FONT_PAIR_ID,
      paletteId: OCCASION.defaultPaletteId,
      density: "comfortable",
      accentOverride: null,
    },
    blocks: DEFAULT_SECTION_ORDER.map((id) => ({
      kind: "builtin" as const,
      id,
      enabled: true,
    })),
  };
}
