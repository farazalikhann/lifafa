"use client";

import { useId, type ReactElement } from "react";
import CollapsibleSection, {
  sectionState,
  type Accordion,
} from "@/components/editor/CollapsibleSection";
import { cardCopy } from "@/lib/cardLanguage";
import {
  FONT_PAIRS,
  fontFamilyOf,
  namesFaceOf,
  pairRoleVar,
} from "@/lib/fontPairs";
import {
  flowerChipScale,
  flowerFrameStyle,
  isPhotoBorder,
} from "@/lib/flowerFrame";
import { PALETTES, getPalette } from "@/lib/palettes";
import { ROYAL_TEXTURE_PATTERNS, royalTextureLayer } from "@/lib/royalTexture";
import {
  CUSTOM_PRIMARIES,
  CUSTOM_SECONDARIES,
  cardPalette,
  inkAllowed,
  inkRefusal,
  matchingTextPair,
  pairInks,
  suitableTextPairs,
  type TextPairId,
} from "@/lib/textColors";
import type {
  CardBorderStyle,
  CardLanguage,
  PhotoBorderStyle,
  RoyalTexturePattern,
} from "@/types/card";
import type {
  CardDensity,
  CardStyle,
  FontPairId,
  PaletteId,
} from "@/types/style";

/**
 * The fourteen borders, in the order the grid lays them out.
 *
 * "None" comes first because it is the default and the way back, and the rest
 * run from the lightest to the busiest — so the row a host reads left to right
 * is also a run from restraint to ornament. Which puts the three photographic
 * frames last, as a row of their own: they are the ones that are not lines, and
 * by some distance the most of anything on offer here.
 *
 * Those eight are named by colour because that is the only thing a host is
 * choosing between — the flowers are arranged much the same way in all of them,
 * and a name describing the arrangement would fit every one. Three of the eight
 * are reds, which no pair of words would separate cleanly; the chips carry the
 * real frame, so a host picks by looking rather than by reading.
 */
const BORDER_STYLES: readonly { id: CardBorderStyle; label: string }[] = [
  { id: "none", label: "None" },
  { id: "cornerSprigs", label: "Corner sprigs" },
  { id: "geometricRule", label: "Geometric" },
  { id: "scallopedFrame", label: "Scalloped" },
  { id: "floralVine", label: "Floral vine" },
  { id: "hangingGarland", label: "Garland" },
  { id: "flowerBackground", label: "Flower background" },
  { id: "flowerGold", label: "Flower gold" },
  { id: "flowerPurple", label: "Flower purple" },
  { id: "flowerRed", label: "Flower red" },
  { id: "flowerRuby", label: "Flower ruby" },
  { id: "flowerCrimson", label: "Flower crimson" },
  { id: "flowerBlue", label: "Flower blue" },
  { id: "flowerBlush", label: "Flower blush" },
  { id: "flowerIvory", label: "Slim ivory" },
  { id: "flowerPearl", label: "Slim pearl" },
  { id: "flowerNoir", label: "Slim noir" },
  { id: "flowerRosegold", label: "Slim rose gold" },
];

/** Shared line work for the miniatures below. */
const PREVIEW_INK = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** The four corners of the miniature card, as transforms off the top left one. */
const PREVIEW_CORNERS: readonly string[] = [
  "translate(6 6)",
  "translate(58 6) scale(-1 1)",
  "translate(58 38) scale(-1 -1)",
  "translate(6 38) scale(1 -1)",
];

/**
 * The chip's miniature, drawn at 64 x 44.
 *
 * Its own drawing rather than a shrunken `BorderFrame`: the real frame tiles
 * down a card several screens tall, and the honest miniature of a repeat is two
 * or three of it — not a whole card squeezed into a thumbnail, where every
 * style would come out as the same grey smudge. Each of these shows the motif
 * at a size a host can actually read, arranged the way that style arranges
 * itself: all four sides, the corners only, or the top alone.
 */
export function BorderPreview({
  id,
  className = "h-11 w-full",
}: {
  id: Exclude<CardBorderStyle, PhotoBorderStyle>;
  /** The chip's size; the preset cards draw it larger. */
  className?: string;
}): ReactElement {
  return (
    <svg
      viewBox="0 0 64 44"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="presentation"
      aria-hidden="true"
      focusable="false"
      {...PREVIEW_INK}
    >
      {/* The card the border is drawn on, so a corner piece reads as a corner. */}
      <rect
        x={4}
        y={4}
        width={56}
        height={36}
        rx={3}
        strokeOpacity={0.22}
      />

      {id === "cornerSprigs" ? (
        <g strokeOpacity={0.9}>
          {PREVIEW_CORNERS.map((transform) => (
            <g key={transform} transform={transform}>
              <path d="M 0 0 C 5 1 9 3 13 3" />
              <path d="M 0 0 C 1 5 3 9 3 13" />
              <path d="M 0 0 C 4 4 6 6 8 9" />
              <circle cx={13} cy={3} r={1.6} />
              <circle cx={3} cy={13} r={1.6} />
              <circle cx={8.6} cy={9.6} r={2} />
            </g>
          ))}
        </g>
      ) : null}

      {id === "geometricRule" ? (
        <g strokeOpacity={0.9}>
          <rect x={7} y={7} width={50} height={30} />
          <rect x={10} y={10} width={44} height={24} />
          {PREVIEW_CORNERS.map((transform) => (
            <g key={transform} transform={transform}>
              {/* Diamond over square — the knot, at thumbnail scale. */}
              <path d="M 2.5 -0.5 L 5.5 2.5 L 2.5 5.5 L -0.5 2.5 Z" />
              <rect x={0.6} y={0.6} width={3.8} height={3.8} />
            </g>
          ))}
        </g>
      ) : null}

      {id === "scallopedFrame" ? (
        <g strokeOpacity={0.9}>
          <rect x={6.5} y={6.5} width={51} height={31} />
          {[0, 1, 2, 3].map((step) => (
            <g key={"h" + step} transform={"translate(" + (9 + step * 11.5) + " 0)"}>
              <path d="M 0 8.5 Q 5.75 15 11.5 8.5" />
              <path d="M 0 35.5 Q 5.75 29 11.5 35.5" />
            </g>
          ))}
          {[0, 1].map((step) => (
            <g key={"v" + step} transform={"translate(0 " + (11 + step * 11) + ")"}>
              <path d="M 8.5 0 Q 15 5.5 8.5 11" />
              <path d="M 55.5 0 Q 49 5.5 55.5 11" />
            </g>
          ))}
        </g>
      ) : null}

      {id === "floralVine" ? (
        <g strokeOpacity={0.9}>
          {/*
            A stem with leaves off it, rather than the wave the real tile draws.
            The wave is what makes the full-size border read as a vine over
            30px of repeat; inside a 44px chip it collapses into a wobble, and
            leaves are what say "vine" at this size.

            Flowers on the two sides and leaves alone across the ends, which is
            the one thing about this style a host needs the chip to tell them.
          */}
          <path d="M 9 7 V 37" />
          <path d="M 55 7 V 37" />
          <path d="M 9 7 H 55" />
          <path d="M 9 37 H 55" />

          {[12, 20, 28, 34].map((y, index) => (
            <g key={"leaf-y" + y}>
              <path d={"M 9 " + y + " l " + (index % 2 === 0 ? 4.5 : -4.5) + " -3.2"} />
              <path d={"M 55 " + y + " l " + (index % 2 === 0 ? -4.5 : 4.5) + " -3.2"} />
            </g>
          ))}

          {[17, 26, 35, 44].map((x, index) => (
            <g key={"leaf-x" + x}>
              <path d={"M " + x + " 7 l -3.2 " + (index % 2 === 0 ? 4.5 : -4.5)} />
              <path d={"M " + x + " 37 l -3.2 " + (index % 2 === 0 ? -4.5 : 4.5)} />
            </g>
          ))}

          {/* The five petal flower, at the only size a chip can carry it. */}
          {[16, 30].map((y) => (
            <g key={"flower" + y}>
              <circle cx={9} cy={y} r={2.6} />
              <circle cx={9} cy={y} r={0.7} />
              <circle cx={55} cy={y} r={2.6} />
              <circle cx={55} cy={y} r={0.7} />
            </g>
          ))}
        </g>
      ) : null}

      {id === "hangingGarland" ? (
        <g strokeOpacity={0.9}>
          <path d="M 10 9 Q 32 27 54 9" />
          <path d="M 10 9 Q 32 31 54 9" />
          <circle cx={21} cy={16.4} r={2} />
          <circle cx={32} cy={18.6} r={2.6} />
          <circle cx={43} cy={16.4} r={2} />
          <path d="M 10 9 C 8 14 9 18 7.5 22" />
          <path d="M 54 9 C 56 14 55 18 56.5 22" />
        </g>
      ) : null}

      {/* Nothing drawn on the card at all — just the plate, and a rule saying so. */}
      {id === "none" ? <path d="M 25 22 H 39" strokeOpacity={0.5} /> : null}
    </svg>
  );
}

/**
 * A photographic frame's chip — the real thing, shrunk.
 *
 * The five styles above each get a hand drawn miniature because the honest
 * miniature of a repeat is two or three of it rather than a whole card squeezed
 * into a thumbnail. These need no such stand-in: a nine-slice is a nine-slice,
 * so the same declaration that frames an 828px screen frames a 44px chip, with
 * the corner clusters pinned and less of the run between them. What the host
 * sees here is what the card does, at the one size a chip has room for.
 *
 * The scale is asked of the frame rather than fixed here, because the three are
 * cut at different depths and one number would serve none of them — see
 * flowerChipScale.
 */
export function FlowerPreview({
  style,
  className = "block h-11 w-full",
  scale = flowerChipScale(style),
}: {
  style: PhotoBorderStyle;
  className?: string;
  /** The chip's scale unless given; the preset cards are taller than a chip. */
  scale?: number;
}): ReactElement {
  return (
    <span
      role="presentation"
      aria-hidden="true"
      className={className}
      style={flowerFrameStyle(style, scale)}
    />
  );
}

const DENSITIES: readonly { id: CardDensity; label: string }[] = [
  { id: "compact", label: "Compact" },
  { id: "comfortable", label: "Comfortable" },
  { id: "airy", label: "Airy" },
];

function pillClass(isSelected: boolean): string {
  return [
    "min-h-11 rounded-full border px-3.5 text-[0.8125rem] font-medium transition-colors duration-150",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]",
    isSelected
      ? "border-transparent bg-[var(--lifafa-ink-raised)] text-[var(--lifafa-cream)] ring-2 ring-[var(--lifafa-marigold)]"
      : "border-[var(--lifafa-hairline)] text-[var(--lifafa-muted)] hover:text-[var(--lifafa-cream)]",
  ].join(" ");
}

/**
 * The card's type, colour, length and border: four sections of the Design tab.
 *
 * These were four groups under one "Style" heading, stacked open. They are
 * sections of the tab's accordion now, each with its current choice in its
 * header, so the border grid is one tap from the top of the tab rather than
 * three groups down it. The controls inside are the ones that were there.
 */
/** Any Devanagari letter, to tell a Hindi names line from an English one. */
const DEVANAGARI_LETTER = /\p{Script=Devanagari}/u;

/** A texture chip's tile, in CSS px, and how much stronger than the card it is drawn. */
const SWATCH_TILE = 132;
const SWATCH_STRENGTH = 2.4;

export default function StylePanel({
  style,
  hostNames,
  language,
  paletteAccent,
  borderStyle,
  royalTexture,
  onRoyalTextureChange,
  royalTexturePattern,
  onRoyalTexturePatternChange,
  onFontPairChange,
  onPaletteChange,
  onTextPairChange,
  onCustomInkChange,
  onDensityChange,
  onAccentChange,
  onBorderStyleChange,
  accordion,
}: {
  style: CardStyle;
  /** Shown in the typography previews so the host sees their own words. */
  hostNames: string;
  /**
   * The language the preview is showing. In Hindi the specimens are set in
   * each pair's Devanagari faces, so the host sees the Hindi look of a pair
   * before choosing it.
   */
  language: CardLanguage;
  /** The selected palette's own accent, used by the reset control. */
  paletteAccent: string;
  /*
    On the card config rather than on CardStyle, for the same reason the
    scratch target is — back when that lived here too, it was the neighbouring
    prop. This is furniture the canvas draws around the sections, not a
    typographic setting the sections inherit. Independent of the tradition —
    every style is offered on every card.
  */
  borderStyle: CardBorderStyle;
  /** Whether the damask is woven into the card's ground; see lib/royalTexture.ts. */
  royalTexture: boolean;
  onRoyalTextureChange: (enabled: boolean) => void;
  /** Which cloth it is woven as. Kept while the texture is off, for when it returns. */
  royalTexturePattern: RoyalTexturePattern;
  onRoyalTexturePatternChange: (pattern: RoyalTexturePattern) => void;
  onFontPairChange: (id: FontPairId) => void;
  onPaletteChange: (id: PaletteId) => void;
  /** A text pair: sets the two inks and nothing else. */
  onTextPairChange: (id: TextPairId) => void;
  /** One ink from the curated set, under "Custom". */
  onCustomInkChange: (role: "primary" | "secondary", ink: string) => void;
  onDensityChange: (density: CardDensity) => void;
  onAccentChange: (accent: string | null) => void;
  onBorderStyleChange: (border: CardBorderStyle) => void;
  /** The Design tab's open section; see CollapsibleSection. */
  accordion: Accordion;
}): ReactElement {
  const isHindi = language === "hi";
  const royalTextureHintId = useId();
  const written = hostNames.trim();
  /*
    In Hindi, a names line with no Devanagari in it (English names with no
    Hindi written yet) would only show the Latin face, so the Hindi
    placeholder stands in for it.
  */
  const previewName = isHindi
    ? DEVANAGARI_LETTER.test(written)
      ? written
      : cardCopy("hi").cover.namesPlaceholder
    : written.length > 0
      ? written
      : "Your names";
  const currentAccent = style.accentOverride ?? paletteAccent;
  /*
    The card colour and the two inks as the card is painted in them now, and
    which pair that is, if it is one. A card colour that came with a pair, on
    a card saved while pairs still brought one, is not any palette's, so no
    palette tile is marked while it holds.
  */
  const painted = cardPalette(style);
  const currentPair = matchingTextPair(style);
  const pairOwnsCard = (style.textColors?.cardColor ?? null) !== null;

  return (
    <>
      <CollapsibleSection
        title="Typography"
        summary={
          FONT_PAIRS.find((pair) => pair.id === style.fontPairId)?.label
        }
        {...sectionState(accordion, "typography")}
      >
        <ul className="flex flex-col gap-2">
          {FONT_PAIRS.map((pair) => {
            const isSelected = pair.id === style.fontPairId;
            const namesFace = namesFaceOf(pair);

            return (
              <li key={pair.id}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onFontPairChange(pair.id)}
                  className={[
                    "flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors duration-150",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]",
                    isSelected
                      ? "border-transparent bg-[var(--lifafa-ink-raised)] ring-2 ring-[var(--lifafa-marigold)]"
                      : "border-[var(--lifafa-hairline)] hover:border-[var(--lifafa-marigold)]/60",
                  ].join(" ")}
                >
                  <span className="shrink-0 text-[0.8125rem] font-medium text-[var(--lifafa-cream)]">
                    {pair.label}
                  </span>

                  <span
                    /*
                      Tagged Hindi in Hindi, so the :lang(hi) rules in
                      globals.css (no tracking, no fake bold) apply here as
                      they do on the card.
                    */
                    lang={isHindi ? "hi" : undefined}
                    className="flex min-w-0 items-baseline justify-end gap-2 text-[var(--lifafa-cream)]"
                  >
                    {/*
                      "Aa" in the pair's heading face, the names in its names
                      face; in Hindi, "अआ" and the Hindi names, in the pair's
                      Devanagari faces through the same stacks the card uses.
                    */}
                    <span
                      aria-hidden="true"
                      className="shrink-0 text-lg"
                      style={{
                        fontFamily: fontFamilyOf(
                          pairRoleVar(pair, "heading"),
                          pair.headingFallback,
                        ),
                        fontWeight: pair.headingWeight,
                      }}
                    >
                      {isHindi ? "अआ" : "Aa"}
                    </span>
                    {/*
                      Padded inside its own clip, because a script's swashes
                      reach past the letters and truncation would cut them.
                    */}
                    <span
                      className="min-w-0 truncate px-1 py-0.5 leading-[1.4]"
                      style={{
                        fontFamily: fontFamilyOf(
                          namesFace.variable,
                          namesFace.fallback,
                        ),
                        fontWeight: namesFace.weight,
                        letterSpacing: namesFace.tracking,
                        wordSpacing: namesFace.wordSpacing,
                        fontSize: `calc(1.125rem * ${namesFace.scale})`,
                      }}
                    >
                      {previewName}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </CollapsibleSection>

      <CollapsibleSection
        title="Colour"
        summary={
          /*
            The dot is the accent the card is actually using, so a custom
            accent shows here as well as the palette it sits on.
          */
          <>
            <span
              aria-hidden="true"
              className="size-3 shrink-0 rounded-full border border-[var(--lifafa-hairline)]"
              style={{ backgroundColor: currentAccent }}
            />
            <span className="truncate">
              {pairOwnsCard && currentPair !== null
                ? currentPair.label
                : getPalette(style.paletteId).label}
            </span>
          </>
        }
        {...sectionState(accordion, "colour")}
      >
        <div className="grid grid-cols-3 gap-2">
          {PALETTES.map((palette) => {
            const isSelected = palette.id === style.paletteId && !pairOwnsCard;

            return (
              <button
                key={palette.id}
                type="button"
                aria-pressed={isSelected}
                aria-label={`${palette.label} palette`}
                onClick={() => onPaletteChange(palette.id)}
                className="flex flex-col items-center gap-1.5 rounded-xl p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
              >
                <span
                  className={[
                    "flex h-11 w-full items-center justify-center gap-1.5 rounded-lg border transition-shadow duration-150",
                    isSelected
                      ? "border-transparent ring-2 ring-[var(--lifafa-marigold)] ring-offset-2 ring-offset-[var(--lifafa-ink)]"
                      : "border-[var(--lifafa-hairline)]",
                  ].join(" ")}
                  style={{ backgroundColor: palette.background }}
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: palette.accent }}
                  />
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: palette.textPrimary }}
                  />
                </span>
                <span
                  className={`text-[0.6875rem] ${
                    isSelected
                      ? "text-[var(--lifafa-cream)]"
                      : "text-[var(--lifafa-muted)]"
                  }`}
                >
                  {palette.label}
                </span>
              </button>
            );
          })}
        </div>

        {/*
          TEXT COLOURS. Every card is set in two: a Primary for the names, the
          title, the headings and the numerals, and a Secondary for everything
          said about them. They are chosen as a pair, and a pair changes the
          text and nothing else. So each tile is the host's own card in small:
          the card colour on screen, a couple in the Primary and a parent's
          line in the Secondary, each exactly as choosing it would set them.
          Only the pairs that suit the card are offered: dark inks on a pale
          card, pale inks on a dark one. There is no single-colour option,
          because there is no such card.
        */}
        <div className="mt-2 flex flex-col gap-2">
          <p className="text-[0.8125rem] font-medium text-[var(--lifafa-cream)]">
            Text colours
          </p>
          <p className="text-xs text-[var(--lifafa-muted)]">
            Two colours that read well on your card colour.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {suitableTextPairs(painted.background).map((pair) => {
              const isSelected = currentPair?.id === pair.id;
              const inks = pairInks(pair, painted.background);

              return (
                <button
                  key={pair.id}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`${pair.label} text colours`}
                  onClick={() => onTextPairChange(pair.id)}
                  className="flex min-w-0 flex-col items-stretch gap-1.5 rounded-xl p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
                >
                  <span
                    className={[
                      "flex min-h-[4.25rem] w-full flex-col items-center justify-center gap-0.5 rounded-lg border px-2 py-2 text-center transition-shadow duration-150",
                      isSelected
                        ? "border-transparent ring-2 ring-[var(--lifafa-marigold)] ring-offset-2 ring-offset-[var(--lifafa-ink)]"
                        : "border-[var(--lifafa-hairline)]",
                    ].join(" ")}
                    style={{ backgroundColor: painted.background }}
                  >
                    <span
                      className="max-w-full truncate text-[0.9375rem] leading-tight"
                      style={{
                        color: inks.textPrimary,
                        fontFamily: "var(--font-display), Georgia, serif",
                      }}
                    >
                      Aarav &amp; Ananya
                    </span>
                    <span
                      className="max-w-full truncate text-[0.625rem] leading-tight"
                      style={{ color: inks.textSecondary }}
                    >
                      Son of Mr Rajesh Sharma
                    </span>
                  </span>
                  <span
                    className={`text-center text-[0.6875rem] ${
                      isSelected
                        ? "text-[var(--lifafa-cream)]"
                        : "text-[var(--lifafa-muted)]"
                    }`}
                  >
                    {pair.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/*
            CUSTOM: one ink at a time, from a short list of colours that are
            known to be readable on some card. Which of them this card may
            take is measured against its own colour, 7:1 for the Primary and
            4.5:1 for the Secondary; the rest are shown, struck through and
            switched off, so a host can see they exist and why they are not
            on offer.
          */}
          <details className="group mt-1">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded text-[0.8125rem] font-medium text-[var(--lifafa-cream)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]">
              <span
                aria-hidden="true"
                className="inline-block text-[var(--lifafa-muted)] transition-transform duration-150 group-open:rotate-90"
              >
                ›
              </span>
              Custom
              {style.textColors !== undefined && currentPair === null ? (
                <span className="text-xs font-normal text-[var(--lifafa-muted)]">
                  (in use)
                </span>
              ) : null}
            </summary>

            <div className="flex flex-col gap-3 pt-1">
              {(
                [
                  ["primary", "Primary", CUSTOM_PRIMARIES, painted.textPrimary],
                  ["secondary", "Secondary", CUSTOM_SECONDARIES, painted.textMuted],
                ] as const
              ).map(([role, label, inks, current]) => {
                const refused = inks.some(
                  (ink) => !inkAllowed(ink.hex, painted.background, role),
                );

                return (
                  <div key={role} className="flex flex-col gap-1.5">
                    <p className="text-xs text-[var(--lifafa-muted)]">
                      {label}
                      {role === "primary"
                        ? ": names, title, headings, numerals"
                        : ": parents, places, labels, captions"}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {inks.map((ink) => {
                        const allowed = inkAllowed(ink.hex, painted.background, role);
                        const isCurrent =
                          style.textColors !== undefined &&
                          ink.hex.toUpperCase() === current.toUpperCase();

                        return (
                          <button
                            key={ink.hex}
                            type="button"
                            disabled={!allowed}
                            aria-pressed={isCurrent}
                            aria-label={`${label} text: ${ink.label}${
                              allowed ? "" : `. ${inkRefusal(painted.background)}`
                            }`}
                            title={allowed ? ink.label : inkRefusal(painted.background)}
                            onClick={() => onCustomInkChange(role, ink.hex)}
                            className={[
                              "relative flex size-11 items-center justify-center rounded-lg border text-[0.8125rem] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] disabled:cursor-not-allowed disabled:opacity-35",
                              isCurrent
                                ? "border-transparent ring-2 ring-[var(--lifafa-marigold)] ring-offset-2 ring-offset-[var(--lifafa-ink)]"
                                : "border-[var(--lifafa-hairline)]",
                            ].join(" ")}
                            /* The ink on the card's own colour, which is the only place it is ever read. */
                            style={{ backgroundColor: painted.background, color: ink.hex }}
                          >
                            Aa
                            {allowed ? null : (
                              <span
                                aria-hidden="true"
                                className="absolute inset-x-1.5 top-1/2 h-px rotate-[-28deg] bg-[var(--lifafa-muted)]"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {refused ? (
                      <p className="text-[0.6875rem] text-[var(--lifafa-muted)]">
                        Struck through: {inkRefusal(painted.background).toLowerCase()}.
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </details>
        </div>

        {/*
          ROYAL TEXTURE. A damask woven into whichever card colour is chosen,
          never a colour of its own. After the text colours, so the two
          questions about colour, the card's and its lettering's, are asked
          one after the other.
        */}
        <div className="mt-1 flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-[0.8125rem] font-medium text-[var(--lifafa-cream)]">
              Royal texture
            </p>
            <p id={royalTextureHintId} className="text-xs text-[var(--lifafa-muted)]">
              A soft pattern woven into the card colour.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={royalTexture}
            aria-label="Royal texture"
            aria-describedby={royalTextureHintId}
            onClick={() => onRoyalTextureChange(!royalTexture)}
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
          >
            {/* The state in words as well, hidden because aria-checked already says it. */}
            <span
              aria-hidden="true"
              className="text-[0.8125rem] font-medium text-[var(--lifafa-cream)]"
            >
              {royalTexture ? "On" : "Off"}
            </span>
            <span
              aria-hidden="true"
              className={`flex h-6 w-10 items-center rounded-full p-0.5 transition-colors duration-150 ${
                royalTexture ? "bg-[var(--lifafa-marigold)]" : "bg-[var(--lifafa-hairline)]"
              }`}
            >
              <span
                className={`h-5 w-5 rounded-full bg-[var(--lifafa-ink)] transition-transform duration-150 ${
                  royalTexture ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </span>
          </button>
        </div>

        {/*
          WHICH CLOTH. Three, shown only while the texture is on, the way a
          floating element's kinds are. Each chip is the pattern on the card
          colour on screen, in the tile, the blend and the tone the card
          itself uses, so a light card shows the light tiles and a dark card
          the dark ones. Drawn at a third of the card's scale, so a whole
          motif fits a chip, and at a little over twice the card's strength:
          at the card's own, which is set to be read through, a swatch this
          small is a flat square.
        */}
        {royalTexture ? (
          <div
            role="group"
            aria-label="Royal texture pattern"
            className="grid grid-cols-3 gap-2"
          >
            {ROYAL_TEXTURE_PATTERNS.map((pattern) => {
              const isSelected = pattern.id === royalTexturePattern;
              const layer = royalTextureLayer(painted.background, pattern.id);

              return (
                <button
                  key={pattern.id}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`${pattern.label} texture`}
                  onClick={() => onRoyalTexturePatternChange(pattern.id)}
                  className="flex flex-col items-center gap-1.5 rounded-xl p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
                >
                  <span
                    className={[
                      "relative isolate block h-14 w-full overflow-hidden rounded-lg border transition-shadow duration-150",
                      isSelected
                        ? "border-transparent ring-2 ring-[var(--lifafa-marigold)] ring-offset-2 ring-offset-[var(--lifafa-ink)]"
                        : "border-[var(--lifafa-hairline)]",
                    ].join(" ")}
                    style={{ backgroundColor: painted.background }}
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `url(${layer.src})`,
                        backgroundSize: `${SWATCH_TILE}px ${SWATCH_TILE}px`,
                        backgroundPosition: "center",
                        mixBlendMode: layer.blend,
                        opacity: Math.min(1, layer.opacity * SWATCH_STRENGTH),
                      }}
                    />
                  </span>
                  <span
                    className={`text-[0.6875rem] ${
                      isSelected
                        ? "text-[var(--lifafa-cream)]"
                        : "text-[var(--lifafa-muted)]"
                    }`}
                  >
                    {pattern.label}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="mt-1 flex flex-col gap-2">
          <label
            htmlFor="accent-override"
            className="text-[0.8125rem] font-medium text-[var(--lifafa-cream)]"
          >
            Custom accent colour
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <input
              id="accent-override"
              type="color"
              value={currentAccent}
              onChange={(event) => onAccentChange(event.target.value)}
              className="h-11 w-16 shrink-0 cursor-pointer rounded-lg border border-[var(--lifafa-hairline)] bg-transparent p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
            />

            <span className="text-xs text-[var(--lifafa-muted)] tabular-nums uppercase">
              {currentAccent}
              {style.accentOverride === null ? " (palette)" : ""}
            </span>

            <button
              type="button"
              disabled={style.accentOverride === null}
              onClick={() => onAccentChange(null)}
              className="min-h-11 rounded px-2 text-xs font-medium text-[var(--lifafa-marigold)] underline decoration-transparent underline-offset-4 transition-colors duration-150 hover:decoration-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] disabled:cursor-not-allowed disabled:text-[var(--lifafa-muted)] disabled:no-underline"
            >
              Reset to palette accent
            </button>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Card length"
        summary={DENSITIES.find((option) => option.id === style.density)?.label}
        {...sectionState(accordion, "length")}
      >
        <div className="flex flex-wrap gap-2">
          {DENSITIES.map((option) => {
            const isSelected = option.id === style.density;

            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onDensityChange(option.id)}
                className={pillClass(isSelected)}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-[var(--lifafa-muted)]">
          Controls how much space each section takes.
        </p>
      </CollapsibleSection>

      <CollapsibleSection
        title="Card border"
        summary={BORDER_STYLES.find((option) => option.id === borderStyle)?.label}
        {...sectionState(accordion, "border")}
      >
        {/*
          Three per row on a phone, and still three above it, at every width. A
          miniature is the only honest control here: "Scalloped" and "Corner
          sprigs" mean nothing until they are drawn, and without one the host is
          picking blind and checking the preview after every guess.

          Fourteen chips in three columns, so the six drawn styles and "None"
          take the first two rows and the eight photographs run on from there —
          which is the right reading of them: they are a set, and a host choosing
          between them is choosing a colour rather than a different kind of
          border. The odd chip at the end is left odd rather than padded out; a
          column narrow enough to square the grid is a column too narrow to read
          a miniature in.
        */}
        <div className="grid grid-cols-3 gap-2">
          {BORDER_STYLES.map((option) => {
            const isSelected = option.id === borderStyle;

            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onBorderStyleChange(option.id)}
                className="flex flex-col items-center gap-1.5 rounded-xl p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
              >
                <span
                  className={[
                    "flex w-full items-center justify-center rounded-lg border px-1 py-1.5 transition-colors duration-150",
                    isSelected
                      ? "border-transparent bg-[var(--lifafa-ink-raised)] text-[var(--lifafa-marigold)] ring-2 ring-[var(--lifafa-marigold)]"
                      : "border-[var(--lifafa-hairline)] text-[var(--lifafa-muted)]",
                  ].join(" ")}
                >
                  {isPhotoBorder(option.id) ? (
                    <FlowerPreview style={option.id} />
                  ) : (
                    <BorderPreview id={option.id} />
                  )}
                </span>

                <span
                  className={`text-[0.6875rem] ${
                    isSelected
                      ? "text-[var(--lifafa-cream)]"
                      : "text-[var(--lifafa-muted)]"
                  }`}
                >
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-[var(--lifafa-muted)]">
          A decorative frame around the edges of your card.
        </p>
      </CollapsibleSection>
    </>
  );
}
