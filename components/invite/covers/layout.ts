import type { CSSProperties } from "react";

/**
 * The part of the screen a cover's centrepiece may use: everything above the
 * names and the prompt the shell prints at the foot.
 *
 * The shell measures how far up the screen its words reach and publishes it
 * as --cover-words-h; see `wordsRef` in CoverShell. Until the first
 * measurement lands, the fallback is roughly what two lines of names and the
 * prompt take on a phone.
 *
 * It starts below --cover-top-h, the band the guest page's language switch
 * takes when it is shown (see `topClearance` on CoverShell), so a centrepiece
 * never sits under the switch. Zero when there is no switch.
 *
 * A size container, so a centrepiece inside can be sized to this space with
 * `cqw` and `cqh` — by the height it actually has, and not only by the width
 * of the screen, which is what let a folded card sit on the couple's names on
 * a short phone with long names. A browser without container units drops
 * those declarations and keeps the width-only size its class gives it.
 */
export const ABOVE_WORDS: CSSProperties = {
  position: "absolute",
  top: "var(--cover-top-h, 0px)",
  left: 0,
  right: 0,
  bottom: "var(--cover-words-h, 38vh)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  containerType: "size",
};
