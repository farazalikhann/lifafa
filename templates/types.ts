import type { ComponentProps, ComponentType, ReactNode } from "react";
import type { StaticImageData } from "next/image";
import type CardCanvas from "@/components/card/CardCanvas";
import type { CoverVisualState } from "@/components/invite/CoverShell";
import type { DesignState } from "@/lib/designDefaults";
import type { Theme } from "@/lib/themes";
import type { CardConfig } from "@/types/card";
import type { EventDraft } from "@/types/event";
import type { CardBorderStyle, CardLanguage, CardSectionId, Scene } from "@/types/card";
import type { CoverAnimationOption } from "@/types/coverAnimation";
import type { TraditionId } from "@/types/occasion";
import type { FontPairId, PaletteId } from "@/types/style";

/**
 * What a template's card is handed: exactly what CardCanvas has always been
 * handed. Every template draws the same event (the draft) and is placed by the
 * same callers (the guest's page, the previews, the printed copy), so a
 * template that needed something more would be one those callers could not
 * draw.
 */
export type TemplateCardProps = ComponentProps<typeof CardCanvas>;

/**
 * One of the two or three colourways a template offers.
 *
 * Named by the template rather than by the palette, because two templates can
 * offer the same palette under different accents and a host is choosing "the
 * maroon one", not a row of lib/palettes.ts.
 */
export interface TemplatePalette {
  id: string;
  label: string;
  paletteId: PaletteId;
  /** Hex laid over the palette's accent, or null for the palette's own. */
  accentOverride: string | null;
  /**
   * The border that goes with this colourway, where the template's own would
   * not: a photographic border is a colour as much as a shape, and an ivory
   * frame on a maroon card is a different card. Absent means the template's.
   */
  borderStyle?: CardBorderStyle;
}

/**
 * A template: one finished look, and the little a host may change about it.
 *
 * Each lives in its own folder under templates/, with this as its config.ts
 * and its preview image beside it. The event itself (names, functions, venue,
 * the words in each language) is never part of one: every template reads the
 * same EventDraft, which is what lets a host change template without typing
 * anything again. See switch.ts.
 */
export interface TemplateConfig {
  /** Written into every card saved with it (CardConfig.templateId). Never renamed. */
  id: string;
  name: string;
  /** One short line, shown under the name in the gallery. */
  description: string;
  /**
   * Whose tradition the look belongs to, which the gallery filters by. "none"
   * is a card for any occasion.
   */
  category: TraditionId;
  /**
   * Other categories it is also shown under. A template that suits any
   * wedding is not one tradition's: it is under each of their chips. Its
   * sample invitation is still the one for `category`.
   */
  alsoIn?: readonly TraditionId[];
  /** What the gallery calls its category on the card, where one tradition's name would be wrong. */
  categoryLabel?: string;
  /** A word on the corner of its gallery card: "New". */
  badge?: string;
  /** Whether the gallery offers it. */
  listed: boolean;
  /**
   * Which of the gallery's two sections it is in. "premium" is the templates
   * with a card of their own, each for any wedding and shown without chips;
   * "traditions" is the rest, filtered by tradition.
   */
  collection: "premium" | "traditions";
  /**
   * What an invitation on this template costs, in paise, from lib/pricing.ts.
   * Shown in the gallery, and read on the server (templatePricePaise in
   * registry.ts) for the saved invitation when an order is made: the figure
   * a host is charged never comes from a browser.
   */
  price: number;
  /**
   * The first screen of the template's sample card at 360px, for the gallery.
   * Made by scripts/shoot-templates.mjs; null until it has been.
   */
  preview: StaticImageData | null;
  /**
   * The colourways on offer. The first is the template's own: its entry names
   * the palette and accent of `baseDesign`, and choosing it puts the base
   * design's colours back exactly.
   */
  palettes: readonly TemplatePalette[];
  /** The type pairs on offer, the first being `baseDesign`'s. */
  fontPairs: readonly FontPairId[];
  /** The built-in sections a host may switch on and off. The cover is not one. */
  sections: readonly CardSectionId[];
  /**
   * Everything about the look a host cannot change, and the starting point for
   * what they can. Laid down whole when the template is chosen.
   */
  baseDesign: DesignState;
  /**
   * The painted scene on the card's first screen, where it is not the one a
   * card has by default (the palace garden). Laid down with the base design
   * when the template is chosen.
   */
  scene?: Scene;
  /** What draws the card. */
  Card: ComponentType<TemplateCardProps>;
  /**
   * The template's own opening cover, where its artwork has one. Then it is
   * the cover on every card in this template, and the host is not offered the
   * choice of animation: the envelope is part of the design. `option` is what
   * the shell reads (how long, when the card is let go, which pictures to wait
   * for, the sound); `Visual` is what is drawn. Absent, the card opens with
   * the animation its host chose.
   */
  cover?: {
    option: CoverAnimationOption;
    Visual: ComponentType<CoverVisualState>;
  };
  /**
   * What the template changes about the guest's page round its card, where it
   * changes anything: the page places the card's own reply form and closing
   * note under every card, and a template with a look of its own for them
   * says so here. Presentation only. The form, its checks and what a reply
   * does are the page's and are not replaceable.
   */
  page?: {
    /**
     * What the reply form, the confirmation and the pass are put on, told
     * which of them it is showing, for a frame that draws the change from one
     * to the other.
     */
    RsvpFrame: ComponentType<{
      children: ReactNode;
      stage?: "form" | "confirmed";
      language?: CardLanguage;
    }>;
    /** The theme those three are drawn in, on that. */
    rsvpTheme: (theme: Theme) => Theme;
    /** In place of the card's closing note, after the reply form. */
    Closing: ComponentType<{ draft: EventDraft; config: CardConfig }>;
    /** False to leave the ribboned-card picture off "Keep this invitation". */
    keepsakeArt?: boolean;
    /**
     * False for a card that draws its own way down, where the page's scroll
     * cue would be a second one: a card of full-screen pages with its own
     * "Swipe up" on the first of them.
     */
    scrollCue?: boolean;
  };
  /**
   * The colours of the printed copy's page, where they are not the card's: a
   * template with a dark ground prints on a pale one. The card's own sections
   * are turned by the template itself.
   */
  print?: { background: string; textPrimary: string };
  /**
   * Whether step 3 offers "scratch to reveal the countdown": a template that
   * draws its own countdown says whether it draws the scratch panels too.
   * One that does starts a new card with them on, and the host can switch
   * them off there; see switchTemplate.
   */
  countdownScratch?: boolean;
}
