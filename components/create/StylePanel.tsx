"use client";

import type { ReactElement } from "react";
import { FONT_PAIRS, fontFamilyOf } from "@/lib/fontPairs";
import { PALETTES } from "@/lib/palettes";
import type { ScratchTarget } from "@/types/card";
import type {
  CardDensity,
  CardStyle,
  FontPairId,
  PaletteId,
} from "@/types/style";

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
  onFontPairChange,
  onPaletteChange,
  onDensityChange,
  onAccentChange,
  onScratchTargetChange,
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
  onFontPairChange: (id: FontPairId) => void;
  onPaletteChange: (id: PaletteId) => void;
  onDensityChange: (density: CardDensity) => void;
  onAccentChange: (accent: string | null) => void;
  onScratchTargetChange: (target: ScratchTarget) => void;
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
    </section>
  );
}
