import {
  displayFaceFor,
  fontFamilyOf,
  getFontPair,
  pairRoleVar,
} from "@/lib/fontPairs";
import { bodyInk, cardPalette } from "@/lib/textColors";
import type { Theme } from "@/lib/themes";
import type { CardStyle } from "@/types/style";

/**
 * The colours a card is actually painted in.
 *
 * Two things describe how an invitation looks and only one of them is the
 * host's. `themeId` is set from the occasion when the card is created and no
 * control in the editor ever changes it; the palette is what the Colour picker
 * writes. So the theme is a last resort — a set of defaults for anything the
 * palette has no answer for — and reading it directly is reading the card the
 * host did not choose.
 *
 * That is not a theoretical distinction. Every dark theme paired with a light
 * palette produces cream text on cream and near-black fields on near-white:
 * the guest's reply form went out like that, with its labels invisible and its
 * inputs solid blocks, because it was handed the raw theme while the card
 * beside it was drawn from the palette.
 *
 * Resolution order, narrowest first: the host's own accent, then the palette
 * they picked with their text pair laid over it (cardPalette), then the theme
 * underneath. Composing it in one place is what keeps the card and everything
 * laid out beside it from drifting apart again.
 *
 * THE TWO INKS ARRIVE HERE. On a card with a text pair, `textPrimary` is the
 * Primary and `textMuted` is the Secondary, so every line that was already in
 * the right one of the two needs nothing; the kinds of line that were not are
 * given their ink in `roles`. A card saved before there were text pairs gets
 * no `roles`, and `textRoles` hands each of those lines the colour it has
 * always had.
 */
export function effectiveTheme(theme: Theme, style: CardStyle): Theme {
  const palette = cardPalette(style);
  const fontPair = getFontPair(style.fontPairId);
  const text = style.textColors;

  return {
    ...theme,
    background: palette.background ?? theme.background,
    surface: palette.surface ?? theme.surface,
    accent: style.accentOverride ?? palette.accent ?? theme.accent,
    textPrimary: palette.textPrimary ?? theme.textPrimary,
    textMuted: palette.textMuted ?? theme.textMuted,
    roles:
      text === undefined
        ? undefined
        : {
            heading: text.textPrimary,
            title: text.textPrimary,
            detail: text.textSecondary,
            mark: text.textSecondary,
            body: bodyInk(text.textSecondary, palette.background),
          },
    /* The pair's body stack: its Latin text face, then its Devanagari one. */
    fontFamily: fontFamilyOf(
      pairRoleVar(fontPair, "body"),
      fontPair.bodyFallback,
    ),
    displayFontFamily: displayFaceFor(fontPair),
    displayFontWeight: fontPair.headingWeight,
  };
}
