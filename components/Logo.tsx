import type { ReactElement } from "react";
import localFont from "next/font/local";
import { ENVELOPE_PATH } from "@/components/brand/envelope";

/**
 * The Lifafa logo, the one place every host page takes it from.
 *
 * Drawn inline in `currentColor`, so it takes the text colour around it: near
 * black on the paper pages, white where the caller sets white (the emerald
 * band). The envelope is the path in public/brand/lifafa-icon-black.svg
 * (components/brand/envelope.ts).
 *
 * - `variant`: "full" is the envelope with the word; "icon" is the envelope
 *   alone, in a square box.
 * - `size`: the height in pixels. Without it the logo is 32px tall on a phone
 *   and 40px from 1024px.
 * - `compact`: the icon below 640px and the full logo from there, for a
 *   header that shares one line with other things on a phone.
 * - `className`: added to the logo, for margins or another height.
 *
 * The caller wraps it in a link home where it is one. Never used inside an
 * invitation (/i, /demo, previews, print).
 */

/*
  Poppins Bold for the word only: a subset holding just L, i, f and a,
  committed in app/fonts/files/ (OFL, see poppins-OFL.txt there), so nothing is
  fetched from Google at build time.
*/
const poppinsBold = localFont({
  src: "../app/fonts/files/poppins-700-logo.woff2",
  weight: "700",
  style: "normal",
  display: "swap",
});

export type LogoVariant = "icon" | "full";

/*
  The two boxes, on the envelope's 1024 unit grid. The icon is a square around
  the envelope (52 to 972 across), so it fills the same 32px square the old
  mark did. The full logo is cropped to the envelope's height, with the word
  set as in the lockup on public/og-image.png: Poppins Bold at 0.545 of the
  envelope's height, its baseline 0.71 of the way down, after a gap of 0.34 of
  that height. textLength is the word's own advance, so the logo is the same
  width whichever face draws it.
*/
const ICON_BOX = { viewBox: "52 52 920 920", ratio: 1 } as const;
const FULL_BOX = { viewBox: "52 174 2162 676", ratio: 2162 / 676 } as const;
const WORD = { x: 1187, y: 655, fontSize: 368, textLength: 1049 } as const;

/* About 32px tall on a phone and 40px from 1024px. */
const DEFAULT_HEIGHT = "h-8 lg:h-10";
const DEFAULT_HEIGHT_PX = 32;

function LogoSvg({
  variant,
  size,
  className,
}: {
  variant: LogoVariant;
  size: number | undefined;
  className: string;
}): ReactElement {
  const box = variant === "full" ? FULL_BOX : ICON_BOX;
  const height = size ?? DEFAULT_HEIGHT_PX;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={box.viewBox}
      width={Math.round(height * box.ratio)}
      height={height}
      role="img"
      aria-label="Lifafa"
      focusable="false"
      fill="currentColor"
      className={`w-auto shrink-0 ${size === undefined ? DEFAULT_HEIGHT : ""} ${className}`}
      style={size === undefined ? undefined : { height: size }}
    >
      <path fillRule="evenodd" d={ENVELOPE_PATH} />
      {variant === "full" ? (
        <text
          x={WORD.x}
          y={WORD.y}
          fontSize={WORD.fontSize}
          fontWeight={700}
          textLength={WORD.textLength}
          lengthAdjust="spacingAndGlyphs"
          style={{ fontFamily: poppinsBold.style.fontFamily }}
        >
          Lifafa
        </text>
      ) : null}
    </svg>
  );
}

export default function Logo({
  variant = "full",
  size,
  className = "",
  compact = false,
}: {
  variant?: LogoVariant;
  size?: number;
  className?: string;
  compact?: boolean;
}): ReactElement {
  if (compact) {
    return (
      <>
        <LogoSvg variant="icon" size={size} className={`block sm:hidden ${className}`} />
        <LogoSvg variant="full" size={size} className={`hidden sm:block ${className}`} />
      </>
    );
  }
  return <LogoSvg variant={variant} size={size} className={`block ${className}`} />;
}
