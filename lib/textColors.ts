import { contrastRatio, fitContrast, mixHex, relativeLuminance } from "@/lib/contrast";
import { getPalette, type Palette } from "@/lib/palettes";
import type { CardStyle, CardTextColors, PaletteId } from "@/types/style";

/**
 * The card's two text colours, and the ten pairs they are offered in.
 *
 * EVERY CARD IS SET IN TWO INKS. The Primary is what the card is about — the
 * names, the title, the headings, the date's numeral, the countdown. The
 * Secondary is everything said about them — parents, places, labels, small
 * dates and times, captions. The accent is not a third ink: it stays the colour
 * of ornament, rules, buttons and icons. Which element takes which is decided
 * once, in `textRoles` (lib/themes.ts), and nowhere in a section.
 *
 * A PAIR IS TEXT, AND ONLY TEXT. Choosing one sets the two inks and nothing
 * else: the card colour and the accent are the palette's, and stay as they
 * are. It used to bring a card colour and an accent of its own, so a host who
 * wanted different lettering had their card repainted under them. Each pair
 * still names the card colour it was drawn against (`card`), but only to say
 * which kind of card it is for: dark inks for a pale card, pale inks for a
 * dark one. A host is offered the pairs that suit the card they have, and a
 * palette picked afterwards keeps their pair where it still suits and finds
 * the nearest that does where it does not.
 *
 * A CARD SAVED WHILE A PAIR STILL BROUGHT ITS CARD COLOUR HAS ONE STORED
 * (`cardColor`, and `accent` beside it), and goes on being painted in it:
 * `cardPalette` reads both exactly as it did. Nothing writes them any more.
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
  | "haldiSaffron"
  | "ivoryGold"
  | "pearlRose"
  | "mintIvory"
  | "silverMoon";

export interface TextPair {
  id: TextPairId;
  label: string;
  /**
   * The card colour the pair was drawn against. Never painted on a card: it
   * says whether the pair is for pale cards or dark ones, and how near a
   * palette it is. See `pairSuits` and `closestTextPair`.
   */
  card: string;
  primary: string;
  secondary: string;
  /**
   * The accent of the palette it sits nearest, or its own Secondary. Never
   * painted on a card either: it is the other half of what "nearest" measures.
   */
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
  /*
    Four more for dark cards. There are five dark palettes and there were two
    pairs to read on them, both ivory with gold. Each of these is drawn against
    one dark palette and measured against all five; every one passes as it was
    specified, with nothing moved. Lowest of the five in each case:

      Ivory Gold    primary 11.02:1   secondary 6.63:1
      Pearl Rose    primary 11.33:1   secondary 6.27:1
      Mint Ivory    primary 11.25:1   secondary 6.85:1
      Silver Moon   primary 12.41:1   secondary 7.86:1

    All eight lowest figures are on Peacock, the lightest of the dark cards.

    AFTER THE FIRST SIX, AND NOT AMONG THEM: `closestTextPair` gives a palette
    its inks from the first six alone, so every card that has only ever
    followed its palette keeps the inks it has.
  */
  {
    id: "ivoryGold",
    label: "Ivory Gold",
    card: "#12100E",
    primary: "#F7F1E3",
    secondary: "#E0B865",
    accent: "#E0B865",
  },
  {
    id: "pearlRose",
    label: "Pearl Rose",
    card: "#4A0F1C",
    primary: "#FBF3F0",
    secondary: "#E9A7AE",
    accent: "#E9A7AE",
  },
  {
    id: "mintIvory",
    label: "Mint Ivory",
    card: "#0B0E0C",
    primary: "#F1F5EE",
    secondary: "#9CCBB0",
    accent: "#9CCBB0",
  },
  {
    id: "silverMoon",
    label: "Silver Moon",
    card: "#0E1424",
    primary: "#FFFFFF",
    secondary: "#C9CED8",
    accent: "#C9CED8",
  },
];

/**
 * The six a palette is given its inks from when the host has chosen none:
 * the six there were when every saved card and every preset was made. Kept
 * to these so that adding a pair never changes what a palette looks like.
 */
const PALETTE_PAIRS: readonly TextPairId[] = [
  "ivoryRose",
  "royalMaroon",
  "champagneClassic",
  "midnightGold",
  "sageGarden",
  "haldiSaffron",
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

/**
 * Whether a pair is for this kind of card: one drawn against a pale card for
 * a pale card, one drawn against a dark card for a dark one. The card colour
 * asked about is the one on screen, whatever set it.
 */
export function pairSuits(pair: TextPair, card: string): boolean {
  return isPale(pair.card) === isPale(card);
}

/** The pairs a host is offered on this card colour, in the table's order. */
export function suitableTextPairs(card: string): readonly TextPair[] {
  return TEXT_PAIRS.filter((pair) => pairSuits(pair, card));
}

/**
 * A pair's two inks as they are on this card colour: its own where they pass,
 * and moved just far enough where they do not. What a tile in the panel shows
 * and what choosing it stores are both this, so they cannot differ.
 */
export function pairInks(
  pair: TextPair,
  card: string,
): Pick<CardTextColors, "textPrimary" | "textSecondary"> {
  return fitted(pair.primary, pair.secondary, card);
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
 * card colour is closest. This is what a palette is given when the host has
 * not chosen, and what a host's pair gives way to when it no longer suits.
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

  /* Of the first six only: see PALETTE_PAIRS. */
  return TEXT_PAIRS.filter(
    (pair) => PALETTE_PAIRS.includes(pair.id) && isPale(pair.card) === pale,
  ).reduce((best, pair) => (far(pair) < far(best) ? pair : best));
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

/**
 * A pair as the host picked it, on the card colour they have: its two inks,
 * fitted to that colour, and nothing else. No card colour and no accent: those
 * are not a pair's to set.
 */
export function pairTextColors(pair: TextPair, card: string): CardTextColors {
  return {
    ...pairInks(pair, card),
    cardColor: null,
    accent: null,
    chosen: true,
  };
}

/**
 * The style with a pair chosen: the two inks change and nothing else does.
 *
 * The palette, the accent and a custom accent are all left as they were, and
 * the inks are fitted to the card colour on screen, so what the host picked a
 * tile for is what they get.
 *
 * A card saved while a pair still brought its own card colour has that colour
 * stored, and it is kept, with the accent stored beside it: picking new
 * lettering must not be what repaints such a card either. It goes back to its
 * palette's colour when the host picks a palette; see `withPalette`.
 */
export function withTextPair(style: CardStyle, pair: TextPair): CardStyle {
  const current = style.textColors;

  return {
    ...style,
    textColors: {
      ...pairTextColors(pair, cardPalette(style).background),
      cardColor: current?.cardColor ?? null,
      accent: current?.accent ?? null,
    },
  };
}

/**
 * The style with a palette chosen.
 *
 * The card colour is the palette's again. The inks follow it, the nearest
 * pair's, unless the host chose theirs and they still belong on the new card:
 *
 *   A pair they picked, that suits the new card colour, is kept as that pair
 *   and fitted to the new colour, so the tile they chose is still the one
 *   marked.
 *
 *   Inks they picked one at a time are kept where both can still be read.
 *
 *   Anything else gives way to the nearest pair that suits. Inks that cannot
 *   be read are never kept, whoever chose them: cream on cream is not a
 *   preference.
 */
export function withPalette(style: CardStyle, paletteId: PaletteId): CardStyle {
  const card = getPalette(paletteId).background;
  const current = style.textColors;

  if (current !== undefined && current.chosen) {
    const pair = matchingTextPair(style);

    if (pair !== null && pairSuits(pair, card)) {
      return { ...style, paletteId, textColors: pairTextColors(pair, card) };
    }

    if (
      inkAllowed(current.textPrimary, card, "primary") &&
      inkAllowed(current.textSecondary, card, "secondary")
    ) {
      return {
        ...style,
        paletteId,
        textColors: { ...current, cardColor: null, accent: null },
      };
    }
  }

  return { ...style, paletteId, textColors: paletteTextColors(paletteId) };
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

/**
 * Which pair the card is set in, if it is one of them exactly: the one whose
 * two inks, on the card colour on screen, are the card's two inks. By its
 * inks alone. Which card colour the card has is no part of it, since a pair
 * no longer has one of its own.
 *
 * Looked for among the pairs that suit the card, which are the ones the panel
 * shows: inks from any other are a host's own, and the panel says "Custom".
 */
export function matchingTextPair(style: CardStyle): TextPair | null {
  const current = style.textColors;

  if (current === undefined) {
    return null;
  }

  const card = cardPalette(style).background;

  return (
    suitableTextPairs(card).find((pair) => {
      const inks = pairInks(pair, card);

      return (
        inks.textPrimary === current.textPrimary &&
        inks.textSecondary === current.textSecondary
      );
    }) ?? null
  );
}

/**
 * The colour a field, a tile or a calendar page is filled with on a card
 * colour that came from a pair rather than a palette, which only a card saved
 * while pairs still brought one has: the card colour lifted a little, as
 * every palette's own surface is.
 */
function surfaceOf(card: string): string {
  return mixHex(card, "#FFFFFF", isPale(card) ? 0.6 : 0.06);
}

/**
 * The colours a card is painted in, as a palette: the one the host picked,
 * with the text pair laid over it.
 *
 * THE ONE PLACE A CARD'S GROUND IS RESOLVED. The cover, the page behind the
 * card, the share image and the editor's previews all ask here. It is the
 * palette's, except on a card saved while a text pair still brought a card
 * colour and an accent with it: those are stored on the card and are read
 * here exactly as they always were, so such a card is painted as it was.
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
