import type { ReactElement, ReactNode } from "react";
import BorderFrame, {
  borderClearance,
} from "@/components/card/decor/BorderFrame";
import type { CardBorderStyle } from "@/types/card";

/**
 * The padding a panel under the card already keeps for itself, in px: its
 * `px-5`, `pt-10` and `pb-12`. The frame's clearance only ever adds to these.
 */
const PANEL_PAD_X = 20;
const PANEL_PAD_TOP = 40;
const PANEL_PAD_BOTTOM = 48;

/**
 * A panel laid out under the card — the reply form, the note after it — inside
 * the border the host chose for the card itself.
 *
 * The card's frame is pinned to the screen and stops where the card stops, so
 * everything under it used to sit on bare ground. This draws the same frame,
 * from the same `borderStyle` and in the same accent, round the panel's own
 * box (see BorderFit), and nothing else: no border is invented here, and a
 * card with no border gets its panel back exactly as it was.
 *
 * THE FRAME NEVER REACHES WHAT IS INSIDE IT. Each border publishes how far the
 * rest of the card must stay clear of it (`borderClearance`), and the panel is
 * padded in to that on every side the frame is drawn on, the same number the
 * card's own column is inset by. The frame is `pointer-events-none`, so even
 * where it is painted it takes no tap meant for a field or a button.
 *
 * At the card's own 420px, not the panel's 480px: every clearance was measured
 * against a card that wide, and a garland drawn wider hangs lower.
 */
export default function FramedPanel({
  borderStyle,
  accent,
  children,
}: {
  borderStyle: CardBorderStyle;
  /** The card's resolved accent, which the drawn borders are inked in. */
  accent: string;
  children: ReactNode;
}): ReactElement {
  if (borderStyle === "none") {
    return <>{children}</>;
  }

  const clearance = borderClearance(borderStyle);
  /* The garland hangs from the top edge only; nothing is drawn at the foot. */
  const footClearance = borderStyle === "hangingGarland" ? 0 : clearance.y;

  return (
    <div
      className="relative mx-auto w-full max-w-[420px]"
      style={{
        paddingInline: Math.max(0, clearance.x - PANEL_PAD_X),
        paddingTop: Math.max(0, clearance.y - PANEL_PAD_TOP),
        paddingBottom: Math.max(0, footClearance - PANEL_PAD_BOTTOM),
      }}
    >
      {children}
      <BorderFrame
        borderStyle={borderStyle}
        accent={accent}
        bandHeight="100%"
        fit="box"
      />
    </div>
  );
}
