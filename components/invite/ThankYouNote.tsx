import type { ReactElement } from "react";
import FramedPanel from "@/components/invite/FramedPanel";
import { cardCopy } from "@/lib/cardLanguage";
import { DISPLAY_FACE } from "@/lib/fontPairs";
import type { Theme } from "@/lib/themes";
import type { CardBorderStyle, CardLanguage } from "@/types/card";

/**
 * The hosts' thanks, under the reply form: the last thing on the page.
 *
 * Shown to every guest, whether or not they have replied yet, in the card's
 * own display face and colours and inside the card's own border (see
 * FramedPanel), so the page ends on the card's stationery rather than on a
 * form's submit button.
 *
 * The words are the card's fixed copy, not the host's: there is nothing to
 * edit yet. They are written in the card's language, and name the event the
 * way the card does — see `eventName`.
 */
export default function ThankYouNote({
  eventName,
  theme,
  language,
  borderStyle,
}: {
  /**
   * What the note calls the occasion: the couple, as the card titles them, on
   * a wedding card; the event's title otherwise. Null on a card that names
   * neither, where the note says "our celebration".
   */
  eventName: string | null;
  /** The card's composed theme, as the reply form above is handed it. */
  theme: Theme;
  language: CardLanguage;
  borderStyle: CardBorderStyle;
}): ReactElement {
  const copy = cardCopy(language);

  return (
    <FramedPanel borderStyle={borderStyle} accent={theme.accent}>
      <section className="mx-auto flex w-full max-w-[480px] flex-col items-center gap-5 px-5 pt-10 pb-12 text-center sm:px-6">
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
          {copy.thankYou(eventName)}
        </p>
      </section>
    </FramedPanel>
  );
}
