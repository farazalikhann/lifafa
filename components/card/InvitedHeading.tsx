import type { ReactElement } from "react";
import { cardCopy } from "@/lib/cardLanguage";
import { textRoles, type Theme } from "@/lib/themes";
import type { CardLanguage } from "@/types/card";

/**
 * "You are invited", small, over whatever opens the card's first screen: the
 * calligraphy, or the greeting, or the names where there is neither.
 *
 * In the card's display face and its accent, as the theme resolves the accent
 * for small text (`mark`), so it holds on a palette whose raw accent would be
 * too faint at this size. Spaced capitals in Latin. Devanagari has no capitals
 * and is not letter spaced anywhere on the card (globals.css), so it is set a
 * step larger in its own case instead, which is what carries it there.
 *
 * Still: it has no motion of its own. On the names' screen it rises with the
 * names, which is the wrapper CoverSection gives every line.
 */
export default function InvitedHeading({
  language,
  theme,
}: {
  language: CardLanguage;
  theme: Theme;
}): ReactElement {
  const copy = cardCopy(language);

  return (
    <p
      lang={copy.lang}
      className={
        copy.script === "devanagari"
          ? "text-[calc(0.9375*var(--card-rem,1rem))] leading-[1.7]"
          : /* The left padding is the tracking after the last letter, so the line is centred on its letters. */
            "pl-[0.34em] text-[calc(0.6875*var(--card-rem,1rem))] leading-[1.6] tracking-[0.34em] uppercase"
      }
      style={{
        color: textRoles(theme).mark,
        fontFamily: theme.displayFontFamily ?? theme.fontFamily,
        fontWeight: theme.displayFontWeight,
      }}
    >
      {copy.invitedHeading}
    </p>
  );
}
