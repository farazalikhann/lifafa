import { contrastRatio, fitContrast } from "@/lib/contrast";
import { calligraphyGround } from "@/lib/calligraphy";
import { textRoles, type Theme } from "@/lib/themes";
import type { DateReveal, ScratchTarget } from "@/types/card";

/**
 * The royal scroll: the pictures it is built from, its proportions, and the
 * inks its words are set in. Drawn by components/card/RoyalScroll.tsx.
 *
 * Two scrolls, one for each kind of card: maroon velvet on a dark card, ivory
 * paper on a light one. Cut by scripts/cut-flowers.mjs (`scroll`), which also
 * says why the paper is one strip and not a tiled one.
 */

export type ScrollVariant = "maroon" | "ivory";

export interface ScrollInks {
  /** The day's numeral, the month and the venue's name. */
  emphasis: string;
  /** The weekday, the year, the time and the address. */
  quiet: string;
  /** The small rules between them: gold, and never read. */
  rule: string;
}

export interface ScrollArt {
  variant: ScrollVariant;
  roller: string;
  paper: string;
  /** The whole scroll, open: the thumbnail the editor shows for this reveal. */
  full: string;
  /**
   * The paper's own colour where the words sit, at its worst for them: its
   * lightest on the maroon, where the words are pale, and its darkest on the
   * ivory, where they are dark. Measured off the published strip. Every ink is
   * held to 4.5:1 against this, not against the card the scroll lies on.
   */
  ground: string;
  /** The scroll's own inks, used wherever the card's two do not read on it. */
  inks: ScrollInks;
}

/** The least any word on the scroll may have against the paper. */
const SCROLL_MIN_RATIO = 4.5;

const MAROON_GROUND = "#7D040A";
const IVORY_GROUND = "#ECD1A6";

const ART: Record<ScrollVariant, ScrollArt> = {
  /* Soft cream for what matters and warm gold for the rest: 9.6:1 and 6.7:1 on the velvet. */
  maroon: {
    variant: "maroon",
    roller: "/decor/scroll/scroll-roller-maroon.webp",
    paper: "/decor/scroll/scroll-paper-maroon.webp",
    full: "/decor/scroll/scroll-full-maroon.webp",
    ground: MAROON_GROUND,
    inks: {
      emphasis: "#F7EBDD",
      quiet: "#E9C46A",
      rule: "#E2B968",
    },
  },
  /* Deep maroon, and an antique gold taken down until it reads on the paper. */
  ivory: {
    variant: "ivory",
    roller: "/decor/scroll/scroll-roller-ivory.webp",
    paper: "/decor/scroll/scroll-paper-ivory.webp",
    full: "/decor/scroll/scroll-full-ivory.webp",
    ground: IVORY_GROUND,
    inks: {
      emphasis: "#5A0F1A",
      quiet: fitContrast("#8A6A2F", IVORY_GROUND, SCROLL_MIN_RATIO),
      rule: "#A8802E",
    },
  },
};

/**
 * The scroll for a card of this colour: maroon on a dark card, ivory on a
 * light one, by the same test that picks the calligraphy's ink.
 */
export function scrollArtFor(cardBackground: string): ScrollArt {
  return ART[calligraphyGround(cardBackground) === "light" ? "ivory" : "maroon"];
}

export function scrollArt(variant: ScrollVariant): ScrollArt {
  return ART[variant];
}

/**
 * The inks the date is set in on this scroll.
 *
 * A card with a text pair lends the scroll its two — the Primary to the
 * numeral, the month and the venue, the Secondary to the rest — but only
 * where each can be read on the scroll's paper, which is not the card's
 * colour and may be nothing like it. An ink that falls short of 4.5:1 there
 * is replaced by the scroll's own. A card with no text pair gets the scroll's
 * own throughout.
 */
export function scrollInks(art: ScrollArt, theme: Theme): ScrollInks {
  if (theme.roles === undefined) {
    return art.inks;
  }

  const reads = (ink: string): boolean =>
    contrastRatio(ink, art.ground) >= SCROLL_MIN_RATIO;
  const roles = textRoles(theme);

  return {
    emphasis: reads(roles.heading) ? roles.heading : art.inks.emphasis,
    quiet: reads(roles.detail) ? roles.detail : art.inks.quiet,
    rule: art.inks.rule,
  };
}

/* --- Proportions, as shares of the scroll's full width ------------------- */

/** The published roller, 900 x 134, finials included. */
const ROLLER_ASPECT = 900 / 134;
/** The published paper strip, 700 x 1186. */
const PAPER_ASPECT = 700 / 1186;

/**
 * How wide the paper is beside a roller. A little wider than the roller's
 * velvet (63%) and narrower than its gold caps (74%), so its edges run in
 * behind the caps the way they do on the whole scroll as it was drawn.
 */
export const SCROLL_PAPER_SHARE = 0.72;
/**
 * How far in from each edge of the paper the words keep, as a share of the
 * paper: the gold border reaches 13.4% in at its paisleys, and this clears it.
 */
export const SCROLL_SAFE_INSET = 0.15;

/** A roller's height. */
export const SCROLL_ROLLER_H = 1 / ROLLER_ASPECT;
/** The paper's height: one strip, at its own proportions. */
export const SCROLL_PAPER_H = SCROLL_PAPER_SHARE / PAPER_ASPECT;
/** The open scroll: the paper runs from the middle of one roller to the middle of the other. */
export const SCROLL_H = SCROLL_PAPER_H + SCROLL_ROLLER_H;
/** How far each roller travels from the closed scroll, where the two touch at the middle. */
export const SCROLL_TRAVEL = SCROLL_H / 2 - SCROLL_ROLLER_H;

/* --- Which reveal a card's date has -------------------------------------- */

/**
 * The reveal on the date's screen.
 *
 * A card saved before there was a choice has none stored, and shows what it
 * always showed: the scratch panel if its date was behind one, and the plain
 * date if it was not. The royal scroll is only ever a host's own choice.
 *
 * Scratch is read off the scratch target rather than trusted to the stored
 * value, because the target is what the scratch panel itself obeys: the two
 * cannot then disagree about whether the date is hidden.
 */
export function dateRevealOf(
  value: unknown,
  scratchTarget: ScratchTarget,
): DateReveal {
  if (value === "scroll") {
    return "scroll";
  }

  return scratchTarget === "date" ? "scratch" : "simple";
}

/**
 * The scratch target a card obeys under this reveal: the scroll never has a
 * scratch layer over its date, so a date target left on the card from before
 * is not honoured while the scroll is the reveal.
 */
export function scratchTargetUnder(
  reveal: DateReveal,
  scratchTarget: ScratchTarget,
): ScratchTarget {
  return reveal === "scroll" && scratchTarget === "date" ? "none" : scratchTarget;
}
