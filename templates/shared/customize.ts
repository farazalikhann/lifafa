import { paletteTextColors } from "@/lib/textColors";
import type { TemplateConfig, TemplatePalette } from "@/templates/types";
import type { CardBorderStyle } from "@/types/card";
import type { CardStyle } from "@/types/style";

/**
 * Colour, the one thing about a template's look that takes more than setting
 * a field: as pure functions over the card's style. Step 3 of the wizard is
 * the only caller.
 */

/** Which of the template's colourways the card is in, or null for none of them. */
export function selectedPalette(
  template: TemplateConfig,
  style: CardStyle,
): TemplatePalette | null {
  return (
    template.palettes.find(
      (palette) =>
        palette.paletteId === style.paletteId &&
        palette.accentOverride === style.accentOverride,
    ) ?? null
  );
}

/**
 * The card's style and border in one of the template's colourways.
 *
 * The template's own (its first) puts back the base design's colours exactly,
 * the look's two inks included. Any other is its palette with the inks that
 * palette brings. The type and the card's length are left as the host has
 * them.
 */
export function withTemplatePalette(
  template: TemplateConfig,
  style: CardStyle,
  palette: TemplatePalette,
): { style: CardStyle; borderStyle: CardBorderStyle } {
  const base = template.baseDesign;
  const isOwn = palette === template.palettes[0];

  return {
    style: {
      ...style,
      paletteId: palette.paletteId,
      accentOverride: palette.accentOverride,
      textColors: isOwn
        ? (base.style.textColors ?? paletteTextColors(palette.paletteId))
        : paletteTextColors(palette.paletteId),
    },
    borderStyle: palette.borderStyle ?? base.borderStyle,
  };
}
