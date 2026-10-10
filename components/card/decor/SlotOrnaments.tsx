import type { CSSProperties, ReactElement } from "react";
import { artWidth, cardPx } from "@/lib/cardScale";
import { DIYA_FLAME } from "@/lib/ornaments/hindu";
import type { CornerPair } from "@/lib/ornaments/slots";
import type { PackOrnament } from "@/lib/traditionPacks";

/**
 * The slotted places drawn on the names' screen: the ornament above the
 * names, the pair in its bottom corners, and the pair that stands either side
 * of it. The top border is HangingLayer's, and a frame round the names is
 * FrameStage's.
 *
 * Both are laid out by CoverSection rather than pinned over the card like the
 * scatter, and that is the whole of how they keep off the writing. The one
 * above the names is in the column's own flow, so the names move down for it
 * rather than under it. The corners stand inside padding the section grows to
 * hold them, below the last line of the names' screen and above whatever
 * follows — never over the title, the divider, a button or the reply form.
 *
 * Decoration only: aria-hidden, and never a tap target.
 */

/** Height of the ornament above the names, in card px. */
const ABOVE_NAMES_HEIGHT = 60;

/** Height of each corner ornament, in card px — the same for both, whatever their shapes. */
const CORNER_HEIGHT = 64;

/** How far in from the card's edges the corners stand, in card px, before a border asks for more. */
export const CORNER_INSET = 14;

/** Room between a corner ornament and the content above it, in card px. */
const CORNER_GAP = 16;

/** How tall a corner ornament stands: its own height if it names one, the usual otherwise. */
function cornerHeight(entry: PackOrnament): number {
  return entry.cornerHeight ?? CORNER_HEIGHT;
}

/** The bottom padding a names' screen needs so its corners sit clear of its content. */
export function cornerClearance(inset: number, corners: CornerPair): number {
  return (
    Math.max(cornerHeight(corners.left), cornerHeight(corners.right)) + inset + CORNER_GAP
  );
}

/** The larger side a shape has to be drawn at to come out `height` tall. */
function sizeForHeight(entry: PackOrnament, height: number): number {
  return entry.aspect >= 1 ? height * entry.aspect : height;
}

/** One ornament at a given height, in the card's accent if it is a drawing. */
function Placed({
  entry,
  height,
  instanceId,
  accent,
  style,
  children,
}: {
  entry: PackOrnament;
  height: number;
  instanceId: string;
  accent: string;
  style?: CSSProperties;
  children?: ReactElement | null;
}): ReactElement {
  const Shape = entry.Component;
  const size = sizeForHeight(entry, height);

  return (
    <span
      /* The art class grows it with a fluid card, as every placed ornament does. */
      className="lifafa-card-art relative block"
      style={{ ...artWidth(height * entry.aspect), color: accent, ...style }}
    >
      <Shape size={size} instanceId={instanceId} />
      {children}
    </span>
  );
}

/**
 * Centred above the names, with room to breathe. The only place Ganesh is
 * drawn: the pack's slots put him here and nowhere else, and every other
 * layer is told the slotted ids are not theirs.
 */
export function AboveNames({
  entry,
  accent,
}: {
  entry: PackOrnament;
  accent: string;
}): ReactElement {
  return (
    <div aria-hidden="true" className="pointer-events-none flex justify-center pb-1">
      <Placed
        entry={entry}
        height={entry.aboveNamesHeight ?? ABOVE_NAMES_HEIGHT}
        instanceId={`above-names-${entry.id}`}
        accent={accent}
      />
    </div>
  );
}

/** Height of an ornament standing in a side margin, in card px. */
const SIDE_HEIGHT = 112;

/**
 * One of the pair that stands either side of the names: the Nishan Sahib.
 *
 * Laid out by CoverSection in a row with what it flanks — flag, names, flag —
 * so it cannot be over the names or the pillars of an arch: they are beside
 * each other, not on top of each other. Drawn as supplied on the right, where
 * the flag flies out to the right; turned on the left, so that one flies
 * outward too. The staff stands nearest the names on both.
 */
export function SideFlag({
  entry,
  side,
  accent,
}: {
  entry: PackOrnament;
  side: "left" | "right";
  accent: string;
}): ReactElement {
  return (
    <div aria-hidden="true" className="pointer-events-none shrink-0">
      <Placed
        entry={entry}
        height={entry.sideHeight ?? SIDE_HEIGHT}
        instanceId={`side-${side}-${entry.id}`}
        accent={accent}
        style={side === "left" ? { transform: "scaleX(-1)" } : undefined}
      />
    </div>
  );
}

/**
 * A warm glow over the diya's flame that breathes, so the lamp reads as lit.
 * Its own element over the picture, so only the glow's opacity moves and the
 * bowl never dims with it; `lifafa-diya-glow` in globals.css, off under
 * reduced motion. Mirrored with the diya, because it is inside it.
 */
function FlameGlow(): ReactElement {
  return (
    <span
      className="lifafa-diya-glow pointer-events-none absolute block rounded-full"
      style={{
        left: `${DIYA_FLAME.x * 100}%`,
        top: `${DIYA_FLAME.y * 100}%`,
        width: "46%",
        aspectRatio: "1",
        transform: "translate(-50%, -50%)",
        background:
          "radial-gradient(closest-side, rgb(255 206 120 / 0.5), rgb(255 170 70 / 0.16) 55%, transparent)",
      }}
    />
  );
}

/** Height of one of the pair beside the title on an opening that carries the names, in card px. */
const OPENING_CORNER_HEIGHT = 48;

/**
 * One of the bottom-corner pair on a card whose opening carries the names
 * (NamesOpening): stood beside the event's title at the foot of that screen,
 * in a row with it, so it is next to the title and never over it, and under
 * the frame and the names. Smaller than in the corners of a screen of its
 * own, which that screen grew to hold.
 *
 * Not drawn on a card narrower than 390px: the row is 28px taller with the
 * pair in it, and at 360 that height is the frame's.
 */
export function OpeningCorner({
  entry,
  side,
  mirror = false,
  accent,
}: {
  entry: PackOrnament;
  side: "left" | "right";
  /** Turned to face back into the card: one ornament alone, standing on the right. */
  mirror?: boolean;
  accent: string;
}): ReactElement {
  return (
    <div aria-hidden="true" className="pointer-events-none shrink-0 max-[389px]:hidden">
      <Placed
        entry={entry}
        height={OPENING_CORNER_HEIGHT}
        instanceId={`opening-corner-${side}-${entry.id}`}
        accent={accent}
        style={mirror ? { transform: "scaleX(-1)" } : undefined}
      >
        {entry.id === "diya" && entry.src !== undefined ? <FlameGlow /> : null}
      </Placed>
    </div>
  );
}

/**
 * The pair in the bottom corners of the names' screen, the same height and
 * the same distance from the edges. One ornament alone stands in both, the
 * right one turned to face back into the card.
 */
export function CornerPieces({
  corners,
  accent,
  inset,
}: {
  corners: CornerPair;
  accent: string;
  /** Distance from the card's side and bottom edges, in card px. */
  inset: number;
}): ReactElement {
  const glowFor = (entry: PackOrnament): ReactElement | null =>
    entry.id === "diya" && entry.src !== undefined ? <FlameGlow /> : null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 flex items-end justify-between"
      style={{
        bottom: cardPx(inset),
        paddingLeft: cardPx(inset),
        paddingRight: cardPx(inset),
      }}
    >
      <Placed
        entry={corners.left}
        height={cornerHeight(corners.left)}
        instanceId={`corner-left-${corners.left.id}`}
        accent={accent}
      >
        {glowFor(corners.left)}
      </Placed>
      <Placed
        entry={corners.right}
        height={cornerHeight(corners.right)}
        instanceId={`corner-right-${corners.right.id}`}
        accent={accent}
        style={corners.mirrorRight ? { transform: "scaleX(-1)" } : undefined}
      >
        {glowFor(corners.right)}
      </Placed>
    </div>
  );
}
