import type { CSSProperties, ReactElement } from "react";
import { GURMUKHI_LANG } from "@/lib/gurmukhiContent";

/**
 * What Gurmukhi script is set in.
 *
 * Noto Sans Gurmukhi, loaded by next/font in app/layout.tsx and resolved
 * through one variable declared in globals.css, with the system faces behind
 * it. The same arrangement the Arabic and Devanagari stacks use.
 */
export const GURMUKHI_FONT_STACK = "var(--lifafa-gurmukhi)";

/**
 * The leading Gurmukhi is set at, measured rather than chosen. The reasoning
 * and the numbers are on the token in globals.css.
 */
export const GURMUKHI_LINE_HEIGHT = "var(--lifafa-gurmukhi-leading)";

/**
 * One run of Gurmukhi, in the right face, at the right leading, tagged as
 * Punjabi and explicitly left to right.
 *
 * The counterpart of components/type/DevanagariText.tsx, and it exists for the
 * same reason: a script's rules do not travel to the next one, and a shared
 * caller must not be where they are decided.
 *
 *   - `lang` is set here and cannot be forgotten. The font matcher and the line
 *     breaker both key off the element carrying the text, so a lang on an
 *     ancestor is not the same thing.
 *   - `dir="ltr"` is explicit. Gurmukhi runs left to right, and stating it
 *     stops an ancestor's direction — or a copied Arabic wrapper — from ever
 *     flipping it.
 *   - The line-height travels with the font. Gurmukhi hangs a sirorekha across
 *     the top of a word and stacks lagaan above it, so its ink runs past the
 *     face's own declared ascender; a caller who sets the family without the
 *     leading gets clipped matras, and the two must not be separable.
 *
 * The caller owns size and colour through `className` and `style`.
 *
 * Renders nothing at all for an empty string — which today is every string in
 * lib/gurmukhiContent.ts, since they all ship empty awaiting a verified source.
 */
export default function GurmukhiText({
  children,
  className,
  style,
}: {
  children: string;
  className?: string;
  style?: CSSProperties;
}): ReactElement | null {
  if (children.length === 0) {
    return null;
  }

  return (
    <span
      lang={GURMUKHI_LANG}
      dir="ltr"
      className={className}
      style={{
        fontFamily: GURMUKHI_FONT_STACK,
        lineHeight: GURMUKHI_LINE_HEIGHT,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
