import type { CSSProperties, ReactElement } from "react";

/**
 * What Arabic script is set in.
 *
 * Noto Naskh Arabic, loaded by next/font in app/layout.tsx and resolved through
 * one variable declared in globals.css, with the system faces behind it.
 */
export const ARABIC_FONT_STACK = "var(--lifafa-arabic)";

/**
 * One run of Arabic, right to left, in the right face.
 *
 * The counterpart of components/type/DevanagariText.tsx, and the reason both
 * exist: a tradition's script has rules that do not travel to the next one, and
 * a shared caller must not be the place those rules are decided. This one sets
 * dir="rtl"; the Devanagari one must never set dir at all.
 *
 * `dir` and `lang` sit on the element that actually holds the text, never on a
 * wrapper — the bidi algorithm and the font matcher both key off the element
 * carrying the script. A block rather than a span, because every caller wants
 * it to fill and centre in its column.
 *
 * The caller owns size and colour through `className` and `style`; `style` is
 * spread last so a card can set its accent, but overriding `fontFamily` there
 * defeats the point.
 */
export default function ArabicText({
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
    <p
      dir="rtl"
      lang="ar"
      className={className}
      style={{ fontFamily: ARABIC_FONT_STACK, ...style }}
    >
      {children}
    </p>
  );
}
