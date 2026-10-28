import type { CSSProperties, ReactElement, ReactNode } from "react";

/**
 * Soft hand-painted shading for the landing page: p5.brush washes and one
 * underline from the Lifafa motion kit (public/landing/brush/). The looks are
 * `.lifafa-brush` and `.lifafa-underline` in globals.css; BrushReveal shows
 * them. Server components, decorative only.
 *
 * Rules (DESIGN.md, section 6): very light, at most two on one screen,
 * absolute inside their section and behind its content, never on a button.
 * The section that holds one needs `relative isolate` so the wash sits under
 * the text and not under the page.
 */

export type BrushTone = "blush" | "gold" | "emerald";

/**
 * One watercolour wash. Place and size it with `className` (absolute
 * offsets, a width and an aspect ratio); `opacity` is the strength it
 * settles at, from 0 to 1.
 */
export function BrushWash({
  tone,
  opacity,
  className,
}: {
  tone: BrushTone;
  opacity: number;
  className: string;
}): ReactElement {
  return (
    <span
      aria-hidden="true"
      data-brush=""
      data-tone={tone}
      data-shape={tone}
      className={`lifafa-brush ${className}`}
      style={{ "--brush-opacity": opacity } as CSSProperties}
    />
  );
}

/**
 * The box a section's washes live in: the section's own size, behind its
 * content, clipping any wash that runs past its edges.
 */
export function BrushField({ children }: { children: ReactNode }): ReactElement {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {children}
    </span>
  );
}

/**
 * A gold brush stroke under a few words, wiped on left to right once it has
 * loaded. Goes inside a `relative` inline span around the words.
 */
export function BrushUnderline(): ReactElement {
  return (
    <img
      aria-hidden="true"
      alt=""
      src="/landing/brush/underline-gold.webp"
      width={840}
      height={64}
      decoding="async"
      data-brush-wipe=""
      className="lifafa-underline"
    />
  );
}
