"use client";

import type { ReactElement } from "react";
import { FONT_PAIRS, fontFamilyOf } from "@/lib/fontPairs";
import { PALETTES } from "@/lib/palettes";
import type { CardBorderStyle, ScratchTarget } from "@/types/card";
import type {
  CardDensity,
  CardStyle,
  FontPairId,
  PaletteId,
} from "@/types/style";

/**
 * The six borders, in the order the grid lays them out.
 *
 * "None" comes first because it is the default and the way back, and the rest
 * run from the lightest to the busiest — so the row a host reads left to right
 * is also a run from restraint to ornament.
 */
const BORDER_STYLES: readonly { id: CardBorderStyle; label: string }[] = [
  { id: "none", label: "None" },
  { id: "cornerSprigs", label: "Corner sprigs" },
  { id: "geometricRule", label: "Geometric" },
  { id: "scallopedFrame", label: "Scalloped" },
  { id: "floralVine", label: "Floral vine" },
  { id: "hangingGarland", label: "Garland" },
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
function BorderPreview({ id }: { id: CardBorderStyle }): ReactElement {
  return (
    <svg
      viewBox="0 0 64 44"
      className="h-11 w-full"
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

const DENSITIES: readonly { id: CardDensity; label: string }[] = [
  { id: "compact", label: "Compact" },
  { id: "comfortable", label: "Comfortable" },
  { id: "airy", label: "Airy" },
];

/*
  Labelled by what the host is choosing to hide rather than by the mechanism,
  because that is the decision they are actually making. Only one section can be
  hidden, so these are radio-like pills rather than a pair of toggles.
*/
const SCRATCH_TARGETS: readonly { id: ScratchTarget; label: string }[] = [
  { id: "none", label: "Off" },
  { id: "date", label: "Hide the date" },
  { id: "venue", label: "Hide the venue" },
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

function GroupHeading({ children }: { children: string }): ReactElement {
  return (
    <h3 className="text-[0.6875rem] tracking-[0.2em] text-[var(--lifafa-muted)] uppercase">
      {children}
    </h3>
  );
}

export default function StylePanel({
  style,
  hostNames,
  paletteAccent,
  scratchTarget,
  borderStyle,
  onFontPairChange,
  onPaletteChange,
  onDensityChange,
  onAccentChange,
  onScratchTargetChange,
  onBorderStyleChange,
}: {
  style: CardStyle;
  /** Shown in the typography previews so the host sees their own words. */
  hostNames: string;
  /** The selected palette's own accent, used by the reset control. */
  paletteAccent: string;
  /*
    Lives on the card config rather than on CardStyle, because it changes what
    a guest has to do and not how the card looks, so it is passed on its own.
  */
  scratchTarget: ScratchTarget;
  /*
    On the card config rather than on CardStyle for the same reason the scratch
    target is: it is furniture the canvas draws around the sections, not a
    typographic setting the sections inherit. Independent of the tradition —
    every style is offered on every card.
  */
  borderStyle: CardBorderStyle;
  onFontPairChange: (id: FontPairId) => void;
  onPaletteChange: (id: PaletteId) => void;
  onDensityChange: (density: CardDensity) => void;
  onAccentChange: (accent: string | null) => void;
  onScratchTargetChange: (target: ScratchTarget) => void;
  onBorderStyleChange: (border: CardBorderStyle) => void;
}): ReactElement {
  const previewName =
    hostNames.trim().length > 0 ? hostNames.trim() : "Your names";
  const currentAccent = style.accentOverride ?? paletteAccent;

  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-[var(--lifafa-hairline)] px-4 py-4">
      <h2 className="text-[0.6875rem] tracking-[0.26em] text-[var(--lifafa-marigold)] uppercase">
        Style
      </h2>

      {/* 1 — Typography */}
      <div className="flex flex-col gap-2.5">
        <GroupHeading>Typography</GroupHeading>

        <ul className="flex flex-col gap-2">
          {FONT_PAIRS.map((pair) => {
            const isSelected = pair.id === style.fontPairId;

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

                  {/* Rendered in the pair's real heading face. */}
                  <span
                    className="min-w-0 truncate text-right text-lg text-[var(--lifafa-cream)]"
                    style={{
                      fontFamily: fontFamilyOf(
                        pair.headingVar,
                        pair.headingFallback,
                      ),
                      fontWeight: pair.headingWeight,
                    }}
                  >
                    Aa {previewName}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* 2 — Colour */}
      <div className="flex flex-col gap-2.5">
        <GroupHeading>Colour</GroupHeading>

        <div className="grid grid-cols-3 gap-2">
          {PALETTES.map((palette) => {
            const isSelected = palette.id === style.paletteId;

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
      </div>

      {/* 3 — Card length */}
      <div className="flex flex-col gap-2.5">
        <GroupHeading>Card length</GroupHeading>

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
      </div>

      {/* 4 — Reveal effect */}
      <div className="flex flex-col gap-2.5">
        <GroupHeading>Reveal effect</GroupHeading>

        <div className="flex flex-wrap gap-2">
          {SCRATCH_TARGETS.map((option) => {
            const isSelected = option.id === scratchTarget;

            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onScratchTargetChange(option.id)}
                className={pillClass(isSelected)}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-[var(--lifafa-muted)]">
          Guests scratch the panel to uncover it.
        </p>
      </div>

      {/* 5 — Card border */}
      <div className="flex flex-col gap-2.5">
        <GroupHeading>Card border</GroupHeading>

        {/*
          Three per row on a phone, and still three above it — six chips in two
          even rows at every width. A miniature is the only honest control here:
          "Scalloped" and "Corner sprigs" mean nothing until they are drawn, and
          without one the host is picking blind and checking the preview after
          every guess.
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
                  <BorderPreview id={option.id} />
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
      </div>
    </section>
  );
}
