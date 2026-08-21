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
 * The decorative frame drawn around the card's edges.
 *
 * Independent of `traditionId` on purpose, and the only decor on the card that
 * is: an ornament pack says something about whose wedding this is, whereas a
 * border is a piece of stationery. Every style is offered on every card.
 *
 * "none" is the default and is a real member rather than a null, so the card
 * never has to distinguish "no border chosen" from "border turned off".
 */
export type CardBorderStyle =
  | "none"
  | "floralVine"
  | "cornerSprigs"
  | "geometricRule"
  | "scallopedFrame"
  | "hangingGarland";

/**
 * Which section, if any, a guest has to scratch open before they can read it.
 *
 * At most one. Two scratch panels on a single card turn an ornament into a
 * chore, and a guest who gives up on the second one never reaches the RSVP.
 */
export type ScratchTarget = "none" | "date" | "venue";

/**
 * Who the card is being drawn for.
 *
 * The guest's card is the live one. The editor's inline preview repaints on
 * every keystroke, so anything a guest has to *do* — the scratch panel — is
 * rendered there already satisfied: the host is shown what exists rather than
 * asked to re-earn it each time they fix a typo. The full screen preview counts
 * as "guest", because its whole promise is that it behaves like the real thing.
 */
export type CardAudience = "guest" | "host-preview";

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
  /** Which section sits behind a scratch panel, if any. */
  scratchTarget: ScratchTarget;
  /**
   * The decorative frame around the card's edges.
   *
   * Sits on the config beside the other decor decisions rather than inside
   * `style`, because it is a piece of the card's furniture the same way the
   * motif scatter is — and like the scatter, it is drawn by the canvas rather
   * than inherited by the sections.
   */
  borderStyle: CardBorderStyle;
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
  /**
   * Whether this invitation has been paid for.
   *
   * Lives on the config rather than beside it because it is the one thing that
   * changes how the finished card is presented: an unpaid card is watermarked
   * wherever it is shown. Nothing charges anyone yet — a stored event is paid
   * by definition today, and the editor's own draft is not.
   */
  isPaid: boolean;
}
