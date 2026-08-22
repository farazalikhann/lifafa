import type { CSSProperties, ReactElement } from "react";

/**
 * One run of a language that is already written in the Latin alphabet, tagged
 * with its own `lang` and explicitly left to right.
 *
 * Used by the Christian pack, whose lines are English, and by the Buddhist
 * pack, whose Pali is stored in Roman script by deliberate choice — see the
 * header of lib/buddhistContent.ts.
 *
 * NO FONT IS SET HERE, and that is the point of the component. Both packs use
 * the card's own body face, because the Latin alphabet is already covered by
 * the faces app/layout.tsx loads; setting a family would mean loading a
 * seventh webfont for text that has one. What this still owns is the `lang`,
 * which a screen reader and a hyphenation engine both need, and the explicit
 * direction, which stops an ancestor — or a wrapper copied from the Arabic
 * pack — from flipping a line that must run left to right.
 *
 * `lang` is required rather than defaulted: "en" and "pi" are both correct in
 * this component and neither is the obvious fallback for the other.
 *
 * Renders nothing at all for an empty string — which today is every string in
 * both packs, since they ship empty awaiting a verified source.
 */
export default function LatinScriptText({
  children,
  lang,
  className,
  style,
}: {
  children: string;
  lang: string;
  className?: string;
  style?: CSSProperties;
}): ReactElement | null {
  if (children.length === 0) {
    return null;
  }

  return (
    <span lang={lang} dir="ltr" className={className} style={style}>
      {children}
    </span>
  );
}
