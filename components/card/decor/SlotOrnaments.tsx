import type { CSSProperties, ReactElement } from "react";
import { artWidth, cardPx } from "@/lib/cardScale";
import { DIYA_FLAME } from "@/lib/ornaments/hindu";
import type { CornerPair } from "@/lib/ornaments/slots";
import type { PackOrnament } from "@/lib/traditionPacks";

/**
 * The two slotted places drawn on the names' screen: the ornament above the
 * names, and the pair in its bottom corners. The top border is HangingLayer's.
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
export const ABOVE_NAMES_HEIGHT = 60;

/** Height of each corner ornament, in card px — the same for both, whatever their shapes. */
export const CORNER_HEIGHT = 64;

/** How far in from the card's edges the corners stand, in card px, before a border asks for more. */
export const CORNER_INSET = 14;

/** Room between a corner ornament and the content above it, in card px. */
const CORNER_GAP = 16;

/** The bottom padding a names' screen needs so its corners sit clear of its content. */
export function cornerClearance(inset: number): number {
  return CORNER_HEIGHT + inset + CORNER_GAP;
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
        height={ABOVE_NAMES_HEIGHT}
        instanceId={`above-names-${entry.id}`}
        accent={accent}
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
        height={CORNER_HEIGHT}
        instanceId={`corner-left-${corners.left.id}`}
        accent={accent}
      >
        {glowFor(corners.left)}
      </Placed>
      <Placed
        entry={corners.right}
        height={CORNER_HEIGHT}
        instanceId={`corner-right-${corners.right.id}`}
        accent={accent}
        style={corners.mirrorRight ? { transform: "scaleX(-1)" } : undefined}
      >
        {glowFor(corners.right)}
      </Placed>
    </div>
  );
}
