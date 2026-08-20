import type { CardBlock } from "@/types/customSection";
import type { ThemeId } from "@/types/event";
import type { OccasionId, TraditionId } from "@/types/occasion";
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
}
