import type { CardBlock } from "@/types/customSection";
import type { ThemeId } from "@/types/event";
import type { OccasionId, TraditionId } from "@/types/occasion";
import type { OrnamentConfig } from "@/types/ornament";
import type { CardStyle } from "@/types/style";

export type CardSectionId = "cover" | "details" | "venue" | "message";

export type DecorMotion = "float" | "fall" | "drift" | "none";

/** How much decoration the canvas scatters. */
export type DecorIntensity = "subtle" | "normal" | "lively";

/**
 * How tall a section should be.
 *
 * "viewport" sizes against the guest's screen. "frame" sizes against the fixed
 * preview frame in the editor, so the host sees the same proportions a guest
 * would rather than sections that overflow the frame on a desktop monitor.
 */
export type CardSizing = "viewport" | "frame";

export interface CardConfig {
  themeId: ThemeId;
  /** Ordered — the canvas renders blocks in exactly this sequence. */
  blocks: readonly CardBlock[];
  decorMotion: DecorMotion;
  decorIntensity: DecorIntensity;
  occasionId: OccasionId;
  traditionId: TraditionId;
  /** Host overrides for typography, colour and card length. */
  style: CardStyle;
  /**
   * The Muslim ornament pack's choices: which ornaments are on, and which
   * greeting and dua head the card.
   *
   * Always present, and always read through `traditionId` — the card acts on it
   * only when the tradition is "muslim", and the editor resets it to its
   * defaults the moment the host picks a different one. A card that is not a
   * Muslim card therefore cannot render a Muslim ornament even if a stale
   * config were somehow to reach it.
   */
  ornamentConfig: OrnamentConfig;
}
