import type { ReactElement } from "react";

export type StripPattern = "seigaiha" | "asanoha";

/**
 * A faint Japanese pattern down the left and right edges of a section: 28px
 * wide on tablets, 64px from 1024px, hidden on phones. Purely decorative.
 *
 * Goes inside a `relative` section and is absolute within it, so it scrolls
 * with the page. The look is `.lifafa-strip` in globals.css.
 */
export default function SideStrips({
  pattern,
}: {
  pattern: StripPattern;
}): ReactElement {
  return (
    <>
      <span aria-hidden="true" className="lifafa-strip" data-side="left" data-pattern={pattern} />
      <span aria-hidden="true" className="lifafa-strip" data-side="right" data-pattern={pattern} />
    </>
  );
}
