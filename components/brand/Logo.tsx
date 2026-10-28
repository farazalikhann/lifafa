import type { ReactElement } from "react";

/**
 * The Lifafa logo, the one place every host page takes it from. The artwork
 * is in public/brand/ and is never edited here.
 *
 * - `variant`: "emerald" on ivory and other light grounds, "white" on the
 *   emerald band or anything dark.
 * - `shape`: "full" is the V mark with the word; "mark" is the V and its red
 *   dot alone.
 * - `compact`: the mark below 640px and the full logo from there, for a
 *   header that shares one line with other things on a phone. One file is
 *   fetched, whichever the screen needs.
 *
 * About 32px tall on a phone and 40px from 1024px. `className` replaces that
 * height when a place needs another. `lazy` is for a logo far down a page
 * (the closing band, the footer): fetched early, even a small file pushes the
 * page's fonts back, and the landing page's largest paint waits on them.
 *
 * The caller wraps it in a link home where it is one. Never used inside an
 * invitation (/i, /demo, previews, print).
 */

export type LogoVariant = "emerald" | "white";
export type LogoShape = "full" | "mark";

/* The artwork's own size: the full logo is 363 by 110, the mark 100 square. */
const FULL = { width: 106, height: 32 } as const;
const MARK = { width: 32, height: 32 } as const;

const DEFAULT_HEIGHT = "h-8 lg:h-10";

export function logoSrc(variant: LogoVariant, shape: LogoShape): string {
  return shape === "full"
    ? `/brand/lifafa-logo-${variant}.svg`
    : `/brand/lifafa-mark-${variant}.svg`;
}

export default function Logo({
  variant = "emerald",
  shape = "full",
  compact = false,
  className = DEFAULT_HEIGHT,
  lazy = false,
}: {
  variant?: LogoVariant;
  shape?: LogoShape;
  compact?: boolean;
  className?: string;
  lazy?: boolean;
}): ReactElement {
  const loading = lazy ? "lazy" : undefined;
  if (compact) {
    return (
      <picture className="contents">
        <source
          media="(min-width: 640px)"
          srcSet={logoSrc(variant, "full")}
          width={FULL.width}
          height={FULL.height}
        />
        <img
          src={logoSrc(variant, "mark")}
          alt="Lifafa"
          width={MARK.width}
          height={MARK.height}
          loading={loading}
          decoding="async"
          className={`block w-auto ${className}`}
        />
      </picture>
    );
  }

  const size = shape === "full" ? FULL : MARK;
  return (
    <img
      src={logoSrc(variant, shape)}
      alt="Lifafa"
      width={size.width}
      height={size.height}
      loading={loading}
      decoding="async"
      className={`block w-auto ${className}`}
    />
  );
}
