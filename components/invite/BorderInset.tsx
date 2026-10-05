import type { ReactElement, ReactNode } from "react";
import { borderClearance } from "@/components/card/decor/BorderFrame";
import type { CardBorderStyle } from "@/types/card";

/**
 * The padding a panel under the card already keeps for itself, in px: its
 * `px-5` and `pb-12`. The border's clearance only ever adds to these.
 */
const PANEL_PAD_X = 20;
const PANEL_PAD_BOTTOM = 48;

/**
 * A little more than the clearance at the sides. The card's sections are
 * centred lines with room to spare; a form's fields and a note's paragraph
 * run the full width of the column, and at the bare clearance their ends
 * stand right against a drawn border's vine.
 */
const BREATHING = 10;

/**
 * A panel laid out under the card — the reply form, the note after it — held
 * clear of the card's border.
 *
 * NO FRAME IS DRAWN HERE. This used to draw the card's border again round
 * each panel's own box, so a page was three frames one under another: the
 * card's, the form's, the note's, each with its own corners and its own line
 * across the foot. There is one border now, pinned to the screen for the
 * whole page (see InviteExperience), and it runs past these panels as it
 * runs past every section of the card.
 *
 * What is left is the room it needs. Each border publishes how far the rest
 * of the card must stay clear of it (`borderClearance`), and the panel is
 * padded in to that at the sides, the same number the card's own column is
 * inset by, so no field or line of text can lie under the border's run. The
 * last panel on the page is padded at its foot as well: the page ends with
 * the border's foot across the bottom of the screen, and the last words have
 * to end above it.
 *
 * A card with no border gets its panel back exactly as it was.
 */
export default function BorderInset({
  borderStyle,
  last = false,
  children,
}: {
  borderStyle: CardBorderStyle;
  /** The last thing on the page, which has to end clear of the border's foot. */
  last?: boolean;
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
      className="mx-auto w-full max-w-[420px]"
      style={{
        paddingInline: Math.max(0, clearance.x + BREATHING - PANEL_PAD_X),
        paddingBottom: last ? Math.max(0, footClearance - PANEL_PAD_BOTTOM) : 0,
      }}
    >
      {children}
    </div>
  );
}
