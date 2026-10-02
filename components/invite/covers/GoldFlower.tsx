import type { ReactElement } from "react";

/**
 * A small eight-petalled flower in gold: what a cover's monogram is when the
 * card names nobody.
 *
 * A flower and nothing else. The covers that carry it are on cards of every
 * tradition, and a mark that belongs to one of them has no place on the
 * others.
 */
export default function GoldFlower({
  hi,
  body,
  lo,
  className,
}: {
  /** The gold's lit tone, its body and its shade. */
  hi: string;
  body: string;
  lo: string;
  className?: string;
}): ReactElement {
  return (
    <svg viewBox="0 0 40 40" className={className} role="presentation" focusable="false">
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <path
          key={angle}
          d="M20 20 C16.4 14.5 17 8 20 3.5 C23 8 23.6 14.5 20 20 Z"
          fill={angle % 90 === 0 ? body : hi}
          opacity={angle % 90 === 0 ? 1 : 0.85}
          transform={`rotate(${angle} 20 20)`}
        />
      ))}
      <circle cx="20" cy="20" r="3.4" fill={lo} />
      <circle cx="20" cy="20" r="2.2" fill={hi} />
    </svg>
  );
}
