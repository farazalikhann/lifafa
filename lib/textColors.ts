import { contrastRatio, fitContrast, mixHex, relativeLuminance } from "@/lib/contrast";
import { PALETTES, getPalette, type Palette } from "@/lib/palettes";
import type { CardStyle, CardTextColors, PaletteId } from "@/types/style";

/**
 * The card's two text colours, and the six pairs they are offered in.
 *
 * EVERY CARD IS SET IN TWO INKS. The Primary is what the card is about — the
 * names, the title, the headings, the date's numeral, the countdown. The
 * Secondary is everything said about them — parents, places, labels, small
 * dates and times, captions. The accent is not a third ink: it stays the colour
 * of ornament, rules, buttons and icons. Which element takes which is decided
 * once, in `textRoles` (lib/themes.ts), and nowhere in a section.
 *
 * A PAIR IS CHOSEN WITH THE CARD COLOUR IT WAS MADE FOR. Two inks are only a
 * pair against a ground, so each of the six carries its own, and an accent to
 * go with it. Choosing a pair sets all four; choosing a palette afterwards
 * keeps the host's inks where they can still be read on it and finds the
 * nearest pair where they cannot.
 *
 * NOTHING HERE IS TRUSTED TO BE READABLE; IT IS MEASURED. Primary is held to
 * 7:1 on the card colour and Secondary to 4.5:1, with the same contrast code
 * the decor layer uses (lib/contrast.ts), and anything short of that is moved
 * just far enough to pass before it reaches the card — `fitted`.
 */

/** The least contrast each ink may have against the card colour. */
export const PRIMARY_MIN_RATIO = 7;
export const SECONDARY_MIN_RATIO = 4.5;

export type TextPairId =
  | "ivoryRose"
  | "royalMaroon"
  | "champagneClassic"
  | "midnightGold"
  | "sageGarden"
  | "haldiSaffron";

export interface TextPair {
  id: TextPairId;
  label: string;
  /** The card colour the pair was made for. */
  card: string;
  primary: string;
  secondary: string;
  /** The accent that goes with it: an existing palette's, or the Secondary. */
  accent: string;
}

/**
 * The six. Every value is as measured: all but one pass as they were
 * specified, and Champagne Classic's Secondary was #8A6A2F at 4.36:1 and is
 * darkened to #86672E, the nearest that reaches 4.5:1 (4.56:1).
 *
 *   Ivory Rose         primary 15.23:1   secondary 7.47:1
 *   Royal Maroon       primary 12.99:1   secondary 8.26:1
 *   Champagne Classic  primary 14.85:1   secondary 4.56:1
 *   Midnight Gold      primary 15.56:1   secondary 8.93:1
 *   Sage Garden        primary 11.96:1   secondary 5.57:1
 *   Haldi Saffron      primary 12.03:1   secondary 5.26:1
 *
 * The accents: Ivory Rose takes Cream's rose, Royal Maroon the Maroon
 * palette's gold, Midnight Gold the Midnight palette's, Sage Garden the Sand
 * palette's brown and Haldi Saffron Blush's terracotta. No existing accent is
 * a gold that reads on a pale card, so Champagne Classic takes its own
 * Secondary.
 */
export const TEXT_PAIRS: readonly TextPair[] = [
  {
    id: "ivoryRose",
    label: "Ivory Rose",
    card: "#FBF4EE",
    primary: "#2B1A1A",
    secondary: "#8C2F39",
    accent: "#A4394F",
  },
  {
    id: "royalMaroon",
    label: "Royal Maroon",
    card: "#4A0F1C",
    primary: "#F7EBDD",
    secondary: "#E2B968",
    accent: "#E2B968",
  },
  {
    id: "champagneClassic",
    label: "Champagne Classic",
    card: "#F6EEDF",
    primary: "#1F1B16",
    secondary: "#86672E",
    accent: "#86672E",
  },
  {
    id: "midnightGold",
    label: "Midnight Gold",
    card: "#10172A",
    primary: "#F4EFE6",
    secondary: "#D6B36A",
    accent: "#D8B26A",
  },
  {
    id: "sageGarden",
    label: "Sage Garden",
    card: "#F2F4EC",
    primary: "#24332A",
    secondary: "#7A5C2E",
    accent: "#6B4A2F",
  },
  {
    id: "haldiSaffron",
    label: "Haldi Saffron",
    card: "#FFF6E5",
    primary: "#5A1E0E",
    secondary: "#A0521A",
    accent: "#974B2E",
  },
];

export function getTextPair(id: TextPairId): TextPair {
  return TEXT_PAIRS.find((pair) => pair.id === id) ?? TEXT_PAIRS[0];
}

/**
 * The inks a host may pick one at a time, under "Custom": about a dozen for
 * each role, dark ones for pale cards and pale ones for dark cards. Curated
 * rather than a colour wheel, because a wheel offers ten thousand colours that
 * cannot be read for every one that can. Which of them a card may use is not
 * decided here: see `inkAllowed`.
 */
export const CUSTOM_PRIMARIES: readonly { hex: string; label: string }[] = [
  { hex: "#1F1B16", label: "Espresso" },
  { hex: "#2B1A1A", label: "Dark plum" },
  { hex: "#2A2A2A", label: "Charcoal" },
  { hex: "#24332A", label: "Deep green" },
  { hex: "#16203A", label: "Navy" },
  { hex: "#3A1420", label: "Wine" },
  { hex: "#5A1E0E", label: "Henna" },
  { hex: "#FFFFFF", label: "White" },
  { hex: "#F7EBDD", label: "Cream" },
  { hex: "#F4EFE6", label: "Ivory" },
  { hex: "#F6E7C8", label: "Pale gold" },
  { hex: "#EAF1EC", label: "Mist" },
];

export const CUSTOM_SECONDARIES: readonly { hex: string; label: string }[] = [
  { hex: "#8C2F39", label: "Rose" },
  { hex: "#86672E", label: "Antique gold" },
  { hex: "#7A5C2E", label: "Bronze" },
  { hex: "#A0521A", label: "Saffron" },
  { hex: "#6B4A2F", label: "Brown" },
  { hex: "#55633A", label: "Olive" },
  { hex: "#3E5C76", label: "Slate blue" },
  { hex: "#6C5C57", label: "Taupe" },
  { hex: "#E2B968", label: "Gold" },
  { hex: "#D6B36A", label: "Soft gold" },
  { hex: "#D9B7AA", label: "Rose beige" },
  { hex: "#A8CBC6", label: "Pale teal" },
];

/** Whether the card colour is a pale one, which dark inks are read on. */
function isPale(color: string): boolean {
  return relativeLuminance(color) > 0.4;
}

/** Whether this ink reads on this card colour, at its role's ratio. */
export function inkAllowed(
  ink: string,
  card: string,
  role: "primary" | "secondary",
): boolean {
  return (
    contrastRatio(ink, card) >=
    (role === "primary" ? PRIMARY_MIN_RATIO : SECONDARY_MIN_RATIO)
  );
}

/**
 * Why an ink is not offered on this card, in the host's words: it fails
 * because it is too close to the card, and which way depends on the card.
 */
export function inkRefusal(card: string): string {
  return isPale(card) ? "Too light for this card" : "Too dark for this card";
}

/** Both inks, moved just far enough to pass on `card` if they do not already. */
function fitted(
  primary: string,
  secondary: string,
  card: string,
): Pick<CardTextColors, "textPrimary" | "textSecondary"> {
  return {
    textPrimary: fitContrast(primary, card, PRIMARY_MIN_RATIO),
    textSecondary: fitContrast(secondary, card, SECONDARY_MIN_RATIO),
  };
}

/** How far apart two colours are, as a distance in sRGB. Only ever compared. */
function distance(a: string, b: string): number {
  return Math.hypot(
    ...[1, 3, 5].map(
      (at) =>
        Number.parseInt(a.slice(at, at + 2), 16) -
        Number.parseInt(b.slice(at, at + 2), 16),
    ),
  );
}

/** How much a difference in accent counts beside a difference in card colour. */
const ACCENT_WEIGHT = 0.25;

/**
 * The pair nearest a palette: a dark card gets one of the pairs made for dark
 * cards, a pale card one made for pale cards, and of those the one whose own
 * card colour is closest.
 *
 * The accent has a say, a quarter of the card colour's. The pale card colours
 * are all within a few steps of each other, and on distance alone Cream came
 * out as Sage Garden, by one step, over the pair that shares Cream's own rose.
 * A palette is a card colour and an accent, and the pair that goes with both
 * is the near one.
 *
 * As it falls out: Ink, Forest, Midnight and Peacock take Midnight Gold;
 * Maroon takes Royal Maroon; Cream takes Ivory Rose; Blush takes Haldi
 * Saffron; Sand takes Champagne Classic.
 */
export function closestTextPair(card: string, accent: string): TextPair {
  const pale = isPale(card);
  const far = (pair: TextPair): number =>
    distance(pair.card, card) + ACCENT_WEIGHT * distance(pair.accent, accent);

  return TEXT_PAIRS.filter((pair) => isPale(pair.card) === pale).reduce(
    (best, pair) => (far(pair) < far(best) ? pair : best),
  );
}

/**
 * The inks a palette gets by itself: the nearest pair's, on the palette's own
 * card colour and with the palette's own accent. Not the host's choice, so the
 * next palette they pick brings its own.
 */
export function paletteTextColors(paletteId: PaletteId): CardTextColors {
  const palette = getPalette(paletteId);
  const pair = closestTextPair(palette.background, palette.accent);

  return {
    ...fitted(pair.primary, pair.secondary, palette.background),
    cardColor: null,
    accent: null,
    chosen: false,
  };
}

/** One of the six, as the host picked it: its inks, its card colour, its accent. */
export function pairTextColors(pair: TextPair): CardTextColors {
  return {
    ...fitted(pair.primary, pair.secondary, pair.card),
    cardColor: pair.card,
    accent: pair.accent,
    chosen: true,
  };
}

/**
 * The style with one of the six chosen.
 *
 * The palette moves to the one nearest the pair's card colour, so everything
 * a palette still decides — the colour a field or a tile is filled with before
 * the pair's own is derived, the label in the editor — is the neighbouring
 * one rather than whatever was selected before. A custom accent is cleared:
 * the pair brings its own.
 */
export function withTextPair(style: CardStyle, pair: TextPair): CardStyle {
  const pale = isPale(pair.card);
  const nearest = PALETTES.filter(
    (palette) => isPale(palette.background) === pale,
  ).reduce((best, palette) =>
    distance(palette.background, pair.card) < distance(best.background, pair.card)
      ? palette
      : best,
  );

  return {
    ...style,
    paletteId: nearest.id,
    accentOverride: null,
    textColors: pairTextColors(pair),
  };
}

/**
 * The style with a palette chosen.
 *
 * The card colour is the palette's again. The inks follow it — the nearest
 * pair's — unless the host chose theirs and they can still be read on the new
 * card colour, in which case they are kept. Inks that cannot be read on it
 * are never kept, whoever chose them: cream on cream is not a preference.
 */
export function withPalette(style: CardStyle, paletteId: PaletteId): CardStyle {
  const card = getPalette(paletteId).background;
  const current = style.textColors;

  const keep =
    current !== undefined &&
    current.chosen &&
    inkAllowed(current.textPrimary, card, "primary") &&
    inkAllowed(current.textSecondary, card, "secondary");

  return {
    ...style,
    paletteId,
    textColors: keep
      ? { ...current, cardColor: null, accent: null }
      : paletteTextColors(paletteId),
  };
}

/** The style with one ink chosen by hand, the other as it stood. */
export function withCustomInk(
  style: CardStyle,
  role: "primary" | "secondary",
  ink: string,
): CardStyle {
  const current = style.textColors ?? paletteTextColors(style.paletteId);

  return {
    ...style,
    textColors: {
      ...current,
      ...(role === "primary" ? { textPrimary: ink } : { textSecondary: ink }),
      chosen: true,
    },
  };
}

/** Which of the six the card is set in, if it is one of them exactly. */
export function matchingTextPair(style: CardStyle): TextPair | null {
  const current = style.textColors;

  if (current === undefined) {
    return null;
  }

  const card = cardPalette(style).background;

  return (
    TEXT_PAIRS.find((pair) => {
      const inks = fitted(pair.primary, pair.secondary, card);

      return (
        inks.textPrimary === current.textPrimary &&
        inks.textSecondary === current.textSecondary &&
        (current.cardColor === null || current.cardColor === pair.card)
      );
    }) ?? null
  );
}

/**
 * The colour a field, a tile or a calendar page is filled with on a card
 * colour that came from a pair rather than a palette: the card colour lifted
 * a little, as every palette's own surface is.
 */
function surfaceOf(card: string): string {
  return mixHex(card, "#FFFFFF", isPale(card) ? 0.6 : 0.06);
}

/**
 * The colours a card is painted in, as a palette: the one the host picked,
 * with the text pair laid over it.
 *
 * THE ONE PLACE A CARD'S GROUND IS RESOLVED. The cover, the page behind the
 * card, the share image and the editor's previews all asked the palette for
 * its background, which was the whole answer while a palette was the only
 * thing that set one. A pair sets one too now, so they ask here.
 *
 * A CARD SAVED BEFORE THERE WERE TEXT PAIRS HAS NONE, and comes back as its
 * palette, untouched: the same ground, the same two text colours, the same
 * accent it has always had.
 */
export function cardPalette(style: CardStyle): Palette {
  const palette = getPalette(style.paletteId);
  const text = style.textColors;

  if (text === undefined) {
    return palette;
  }

  return {
    ...palette,
    background: text.cardColor ?? palette.background,
    surface:
      text.cardColor === null ? palette.surface : surfaceOf(text.cardColor),
    accent: text.accent ?? palette.accent,
    textPrimary: text.textPrimary,
    textMuted: text.textSecondary,
  };
}

/**
 * Long passages — a message, a host's own paragraph — in the Secondary a
 * little quieter, where that can still be read; the Secondary itself where it
 * cannot.
 */
export function bodyInk(secondary: string, card: string): string {
  const quieter = mixHex(secondary, card, 0.12);

  return contrastRatio(quieter, card) >= SECONDARY_MIN_RATIO
    ? quieter
    : secondary;
}
