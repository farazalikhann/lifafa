import type { CSSProperties, ReactElement, ReactNode } from "react";

/**
 * The shell every ornament in every pack is drawn inside, and the props they
 * all take.
 *
 * THIS FILE EXISTS BECAUSE THE THIRD PACK ARRIVED. It was private to
 * lib/ornaments/muslim.tsx, copied once into lib/ornaments/hindu.tsx with a
 * note saying that when a third pack landed both belonged in a shared module —
 * four landed at once, and six copies of a 40-line component is how six
 * ornament packs quietly stop looking like each other. Nothing here is new; it
 * is the Muslim shell, unchanged, with the Hindu file's `r2` beside it.
 *
 * Every ornament is stroke based line art drawn with `currentColor`, so a
 * caller colours it by setting `color` on the wrapper and it inherits the
 * card's accent.
 */

/** Rendered size of an ornament's larger dimension when the caller says nothing. */
export const DEFAULT_SIZE = 64;

/** Two places is finer than a subpixel at these sizes, and keeps the markup short. */
export function r2(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface OrnamentProps {
  /**
   * Rendered size in px of the ornament's *larger* dimension.
   *
   * Sizing the long side rather than a fixed square is what lets a 6.7:1 vine
   * border and a 0.55:1 lantern share one prop: at `size` 64 the border comes
   * out 64x10 and the lantern 35x64, and both are drawn to hold up there.
   *
   * Ignored when `className` is supplied — that branch hands sizing to CSS.
   */
  size?: number;
  /**
   * Stable id fragment, used to build the unique ids that SVG filters need.
   *
   * Supplied by the caller rather than generated, and never from Math.random
   * or the clock: two renders of the same ornament in the same place have to
   * emit byte-identical markup or hydration reports a mismatch.
   */
  instanceId: string;
  /**
   * Sizes the svg through CSS instead of width/height attributes.
   *
   * Used where an ornament has to stretch to a box whose size it cannot know —
   * the arches framing a cover are the only such case today.
   */
  className?: string;
  preserveAspectRatio?: string;
  style?: CSSProperties;
  /**
   * Overrides the ornament's authored stroke weight, in viewBox units.
   *
   * Stroke scales with the drawing, which is right nearly everywhere: an
   * ornament is meant to look like the same pen drew it at 30px and at 64px.
   * It stops being right the moment one is blown up far past the sizes it was
   * authored for. This is the escape hatch for that case and nothing else.
   */
  strokeWidth?: number;
}

export type Ornament = (props: OrnamentProps) => ReactElement;

/**
 * Shared svg shell.
 *
 * `aspect` is the drawing's width over its height, and is what turns the single
 * `size` prop into the right pair of dimensions for shapes as different as a
 * tall lantern and a wide garland.
 */
export function Frame({
  viewBox,
  aspect,
  size = DEFAULT_SIZE,
  strokeWidth,
  className,
  preserveAspectRatio,
  style,
  children,
}: {
  viewBox: string;
  aspect: number;
  size?: number;
  strokeWidth: number;
  className?: string;
  preserveAspectRatio?: string;
  style?: CSSProperties;
  children: ReactNode;
}): ReactElement {
  /* CSS sizing and attribute sizing are mutually exclusive, never both. */
  const dimensions =
    className === undefined
      ? {
          width: r2(aspect >= 1 ? size : size * aspect),
          height: r2(aspect >= 1 ? size / aspect : size),
        }
      : {};

  return (
    <svg
      viewBox={viewBox}
      {...dimensions}
      className={className}
      style={style}
      preserveAspectRatio={preserveAspectRatio}
      role="presentation"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/**
 * A closed regular polygon. `rotationDeg` 0 puts the first vertex straight up.
 *
 * Lifted here with the shell because more than one pack needs it now — the
 * Muslim geometric star and the Jain siddhashila are the same construction.
 */
export function polygonPath(
  cx: number,
  cy: number,
  sides: number,
  radius: number,
  rotationDeg: number,
): string {
  const start = (rotationDeg * Math.PI) / 180 - Math.PI / 2;
  const step = (Math.PI * 2) / sides;
  const points: string[] = [];

  for (let index = 0; index < sides; index += 1) {
    const angle = start + index * step;
    points.push(
      `${r2(cx + radius * Math.cos(angle))} ${r2(cy + radius * Math.sin(angle))}`,
    );
  }

  return `M ${points.join(" L ")} Z`;
}

/**
 * A closed ring of outward bulging arcs — a flower head seen face on.
 *
 * `curvature` is each arc's radius as a fraction of the chord it spans. Above
 * 0.5 is drawable; the closer to 0.5, the deeper the petal. Points are walked
 * in increasing angle, which with y pointing down is clockwise on screen, so
 * sweep flag 1 bulges every arc away from the centre.
 *
 * Three packs draw a lotus and one draws a marigold, so this is shared rather
 * than copied four times.
 */
export function flowerPath(
  cx: number,
  cy: number,
  radius: number,
  petals: number,
  curvature: number,
): string {
  const step = (Math.PI * 2) / petals;
  const at = (index: number): readonly [number, number] => {
    const angle = index * step - Math.PI / 2;

    return [
      r2(cx + radius * Math.cos(angle)),
      r2(cy + radius * Math.sin(angle)),
    ];
  };

  const [startX, startY] = at(0);
  let d = `M ${startX} ${startY}`;

  for (let index = 1; index <= petals; index += 1) {
    const [previousX, previousY] = at(index - 1);
    const [x, y] = at(index);
    const arcR = r2(Math.hypot(x - previousX, y - previousY) * curvature);

    d += ` A ${arcR} ${arcR} 0 0 1 ${x} ${y}`;
  }

  return `${d} Z`;
}

/**
 * A pointed leaf, as a closed outline of two quadratics either side of the
 * base-to-tip line.
 *
 * `controlSpread` is the control offset, NOT the leaf's half width: a quadratic
 * only reaches half way to its control, so a leaf three units wide either side
 * is authored by passing six.
 */
export function leafPath(
  baseX: number,
  baseY: number,
  tipX: number,
  tipY: number,
  controlSpread: number,
): string {
  const runX = tipX - baseX;
  const runY = tipY - baseY;
  const length = Math.hypot(runX, runY);
  const offsetX = (runY / length) * controlSpread;
  const offsetY = (-runX / length) * controlSpread;
  const midX = (baseX + tipX) / 2;
  const midY = (baseY + tipY) / 2;

  return [
    `M ${r2(baseX)} ${r2(baseY)}`,
    `Q ${r2(midX + offsetX)} ${r2(midY + offsetY)} ${r2(tipX)} ${r2(tipY)}`,
    `Q ${r2(midX - offsetX)} ${r2(midY - offsetY)} ${r2(baseX)} ${r2(baseY)}`,
    "Z",
  ].join(" ");
}

/**
 * A point on a quadratic cord, for hanging things that must sit exactly on a
 * drawn string rather than near it.
 */
export function pointOnCord(
  start: readonly [number, number],
  control: readonly [number, number],
  end: readonly [number, number],
  t: number,
): readonly [number, number] {
  const inverse = 1 - t;
  const x =
    inverse * inverse * start[0] + 2 * inverse * t * control[0] + t * t * end[0];
  const y =
    inverse * inverse * start[1] + 2 * inverse * t * control[1] + t * t * end[1];

  return [r2(x), r2(y)];
}

/** The `d` of a quadratic cord, from the same three points. */
export function cordPath(
  start: readonly [number, number],
  control: readonly [number, number],
  end: readonly [number, number],
): string {
  return `M ${start[0]} ${start[1]} Q ${control[0]} ${control[1]} ${end[0]} ${end[1]}`;
}
