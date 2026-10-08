import type { ReactElement } from "react";
import BorderInset from "@/components/invite/BorderInset";
import { cardCopy } from "@/lib/cardLanguage";
import { DISPLAY_FACE } from "@/lib/fontPairs";
import type { Theme } from "@/lib/themes";
import type { CardBorderStyle, CardLanguage } from "@/types/card";

/**
 * The hosts' thanks, under the reply form: the last words on the page.
 *
 * Shown to every guest, whether or not they have replied yet, in the card's
 * own display face and colours and beside the card's own border (see
 * BorderInset), so the page ends on the card's stationery rather than on a
 * form's submit button.
 *
 * The words are the card's fixed copy, not the host's: there is nothing to
 * edit yet. They are written in the card's language, and name the event the
 * way the card does — see `eventName`.
 */
export default function ThankYouNote({
  eventName,
  couple,
  theme,
  language,
  borderStyle,
  last = true,
}: {
  /**
   * What the note calls the occasion: the couple, as the card titles them, on
   * a wedding card; the event's title otherwise. Null on a card that names
   * neither, where the note says "our celebration".
   */
  eventName: string | null;
  /** `eventName` is a wedding's two names: the note says "the wedding of" them. */
  couple: boolean;
  /** The card's composed theme, as the reply form above is handed it. */
  theme: Theme;
  language: CardLanguage;
  borderStyle: CardBorderStyle;
  /**
   * Whether this is the last thing on the page, which has to end clear of
   * the border's foot. It is, unless the way to keep the card follows it;
   * see KeepsakeSection.
   */
  last?: boolean;
}): ReactElement {
  const copy = cardCopy(language);

  return (
    <BorderInset borderStyle={borderStyle} last={last}>
      <section
        className={`mx-auto flex w-full max-w-[480px] flex-col items-center gap-5 px-5 pt-10 text-center sm:px-6 ${
          last ? "pb-12" : "pb-4"
        }`}
      >
        {/* The same rule and diamond the cover sets between the names and the way in. */}
        <span
          aria-hidden="true"
          className="flex items-center gap-2"
          style={{ color: theme.accent }}
        >
          <span className="h-px w-8 bg-current opacity-60" />
          <svg viewBox="0 0 10 10" className="h-2 w-2" focusable="false">
            <path d="M5 0 L10 5 L5 10 L0 5 Z" fill="currentColor" />
          </svg>
          <span className="h-px w-8 bg-current opacity-60" />
        </span>

        <p
          className={`text-pretty wrap-anywhere ${
            copy.script === "devanagari"
              ? "text-[1.0625rem] leading-[1.9]"
              : "text-[1.0625rem] leading-[1.75]"
          }`}
          style={{
            color: theme.textPrimary,
            fontFamily: theme.displayFontFamily ?? DISPLAY_FACE,
            fontWeight: theme.displayFontWeight,
          }}
        >
          {copy.thankYou(eventName, couple)}
        </p>
      </section>
    </BorderInset>
  );
}
