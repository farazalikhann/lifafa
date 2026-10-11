import type { ReactElement } from "react";
import { borderCornerDepth } from "@/components/card/decor/BorderFrame";
import BorderInset from "@/components/invite/BorderInset";
import { cardCopy } from "@/lib/cardLanguage";
import { hasMessage } from "@/lib/cardSections";
import { textRoles, type Theme } from "@/lib/themes";
import type { CardBorderStyle, CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";

/**
 * The bouquet over the words, cut by scripts/cut-flowers.mjs (`closing`) to
 * /decor/closing/thank-you-bouquet.webp. Null until that art is supplied and
 * cut: the block has no picture rather than a broken one.
 */
const BOUQUET: string | null = null;
/** Its drawn width, in px, and its shape. */
const BOUQUET_WIDTH = 140;
const BOUQUET_ASPECT = 1;

/** Under the words at the card's end, and the least air over the border's bottom corners, in px. */
const CARD_FOOT = 48;
const CORNER_AIR = 16;

/**
 * The hosts' closing words: one block, after the reply section and before the
 * way to keep the card.
 *
 * THE HOST'S NOTE, OR THE CARD'S THANKS. A host who wrote a note (`message`)
 * has it here, and nowhere else: it was the card's last section, and the
 * card's own thanks followed it after the reply form, so the page closed
 * twice. With no note, the card thanks the guest in its own words, which name
 * no one; see `thankYou` in lib/cardLanguage.ts.
 *
 * Under a bouquet, in the card's body face and its ink for long passages.
 *
 * TWO PLACES. On the guest's page it is laid out under the card, held clear
 * of the page's one border (`placement: "page"`, BorderInset). In the
 * editor's previews there is no reply form, and the card draws it at its own
 * end (`placement: "card"`), inside its column, which already stands clear of
 * its border. See `closingNote` on CardCanvas.
 */
export default function ThankYouNote({
  draft,
  theme,
  language,
  placement,
  borderStyle = "none",
  last = true,
}: {
  draft: EventDraft;
  /** The card's composed theme, as the reply form above is handed it. */
  theme: Theme;
  language: CardLanguage;
  placement: "page" | "card";
  /** The border to stand clear of: at its sides on the page, at its foot either way. */
  borderStyle?: CardBorderStyle;
  /**
   * On the page: whether this is the last thing on it, which has to end clear
   * of the border's foot. It is, unless the way to keep the card follows it;
   * see KeepsakeSection.
   */
  last?: boolean;
}): ReactElement {
  const copy = cardCopy(language);
  const text = hasMessage(draft) ? draft.message.trim() : copy.thankYou;

  const block = (
    <section
      data-thank-you=""
      className={`mx-auto flex w-full flex-col items-center gap-5 text-center ${
        placement === "page"
          ? `max-w-[480px] px-5 pt-10 sm:px-6 ${last ? "pb-12" : "pb-4"}`
          : "pt-12"
      }`}
      /*
        At the card's end the border's foot is under it, as it is under the
        last panel on the page: it ends above the bottom corners. See
        BorderInset.
      */
      style={
        placement === "card"
          ? {
              paddingBottom: Math.max(
                CARD_FOOT,
                borderCornerDepth(borderStyle) + CORNER_AIR,
              ),
            }
          : undefined
      }
    >
      {BOUQUET !== null ? (
        <img
          src={BOUQUET}
          alt=""
          width={BOUQUET_WIDTH}
          height={Math.round(BOUQUET_WIDTH / BOUQUET_ASPECT)}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="h-auto select-none"
          style={{ width: BOUQUET_WIDTH }}
        />
      ) : null}

      <p
        className={`max-w-[300px] text-[1.125rem] text-pretty wrap-anywhere ${
          copy.script === "devanagari" ? "leading-[1.9]" : "leading-[1.7]"
        }`}
        style={{ color: textRoles(theme).body, fontFamily: theme.fontFamily }}
      >
        {text}
      </p>
    </section>
  );

  return placement === "page" ? (
    <BorderInset borderStyle={borderStyle} last={last}>
      {block}
    </BorderInset>
  ) : (
    block
  );
}
