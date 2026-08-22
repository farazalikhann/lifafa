import type { CSSProperties, ReactElement } from "react";
import { DEVANAGARI_LANG } from "@/lib/devanagariContent";

/**
 * What Devanagari script is set in.
 *
 * Noto Sans Devanagari, loaded by next/font in app/layout.tsx and resolved
 * through one variable declared in globals.css, with the system faces behind
 * it. The exact arrangement the Arabic uses — see ARABIC_FONT_STACK in
 * components/card/CardCanvas.tsx and components/create/OrnamentPanel.tsx.
 */
export const DEVANAGARI_FONT_STACK = "var(--lifafa-devanagari)";

/**
 * The leading Devanagari is set at, measured rather than chosen. The reasoning
 * and the numbers behind it are on the token in globals.css.
 */
export const DEVANAGARI_LINE_HEIGHT = "var(--lifafa-devanagari-leading)";

/**
 * One run of Devanagari, in the right face, at the right leading, tagged as
 * Hindi.
 *
 * A component rather than the pair of shared constants the Arabic uses. The
 * Arabic gets away with constants because there are only two call sites and
 * both were written at once; here the rules are easier to get wrong and worth
 * making unstateable:
 *
 *   - `lang="hi"` is set here and cannot be forgotten. The font matcher and the
 *     line breaker both key off the element carrying the text, so a lang on an
 *     ancestor is not the same thing.
 *   - `dir` IS NEVER SET. Devanagari runs left to right. The Arabic components
 *     set dir="rtl" on their text element, and this is the file that exists so
 *     nobody copies that line across with the markup around it.
 *   - The line-height travels with the font. Devanagari ink runs above the
 *     face's own declared ascender, so a caller who sets the family without the
 *     leading gets clipped matras — the two must not be separable.
 *
 * The caller still owns size and colour, through `className` and `style`, the
 * same way the Arabic's size class is passed in from the card and the panel.
 * A `style` of the caller's wins on anything it sets, which is deliberate for
 * colour and size — but overriding `lineHeight` or `fontFamily` there defeats
 * the point of the component.
 *
 * Renders nothing at all for an empty string, because lib/devanagariContent.ts
 * ships the opt-out entries with every field blank and absence has to read as
 * absence rather than as a gap.
 */
export default function DevanagariText({
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
      lang={DEVANAGARI_LANG}
      className={className}
      style={{
        fontFamily: DEVANAGARI_FONT_STACK,
        lineHeight: DEVANAGARI_LINE_HEIGHT,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
