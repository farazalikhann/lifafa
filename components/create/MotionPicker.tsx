"use client";

import { useId, type ReactElement } from "react";
import {
  BUTTERFLY_ASPECT,
  BUTTERFLY_STYLES,
  butterflySources,
} from "@/lib/butterflies";
import type {
  ButterflyStyle,
  DecorIntensity,
  DecorMotion,
} from "@/types/card";

const MOTIONS: readonly { id: DecorMotion; label: string }[] = [
  { id: "float", label: "Float" },
  { id: "fall", label: "Fall" },
  { id: "drift", label: "Drift" },
  { id: "roam", label: "Roam" },
  { id: "none", label: "None" },
];

const INTENSITIES: readonly { id: DecorIntensity; label: string }[] = [
  { id: "subtle", label: "Subtle" },
  { id: "normal", label: "Normal" },
  { id: "lively", label: "Lively" },
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
 * The butterfly on a chip, at the size a pill has room for.
 *
 * The real cut-out rather than a swatch of its colour, for the reason the
 * border chips are miniatures of the real border: "Purple" names a colour, and
 * what a host is actually choosing is an insect. "Mixed" shows all three
 * overlapping, which is the only honest picture of what it does.
 */
function ButterflyChip({ style }: { style: ButterflyStyle }): ReactElement {
  const width = style === "mixed" ? 15 : 20;

  return (
    <span aria-hidden="true" className="flex items-center -space-x-1">
      {butterflySources(style === "none" ? "red" : style).map((src) => (
        <img
          key={src}
          src={src}
          alt=""
          width={width}
          height={Math.round(width / BUTTERFLY_ASPECT)}
          className="block max-w-none"
        />
      ))}
    </span>
  );
}

export default function MotionPicker({
  motion,
  intensity,
  butterflies,
  onMotionChange,
  onIntensityChange,
  onButterfliesChange,
}: {
  motion: DecorMotion;
  intensity: DecorIntensity;
  butterflies: ButterflyStyle;
  onMotionChange: (motion: DecorMotion) => void;
  onIntensityChange: (intensity: DecorIntensity) => void;
  onButterfliesChange: (butterflies: ButterflyStyle) => void;
}): ReactElement {
  const butterflyHintId = useId();

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-[var(--lifafa-hairline)] px-4 py-4">
      <div className="flex flex-col gap-2">
        <h3 className="text-[0.6875rem] tracking-[0.2em] text-[var(--lifafa-muted)] uppercase">
          Motion style
        </h3>
        <div className="flex flex-wrap gap-2">
          {MOTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={option.id === motion}
              onClick={() => onMotionChange(option.id)}
              className={pillClass(option.id === motion)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-[0.6875rem] tracking-[0.2em] text-[var(--lifafa-muted)] uppercase">
          Amount
        </h3>
        <div className="flex flex-wrap gap-2">
          {INTENSITIES.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={option.id === intensity}
              onClick={() => onIntensityChange(option.id)}
              className={pillClass(option.id === intensity)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-[var(--lifafa-muted)]">
        Decoration moves as guests scroll through your card.
      </p>

      {/*
        In this panel and not in the border grid beside it, because what a host
        is turning on here is movement. It reads the Amount above rather than
        bringing a count of its own.

        Pills with the real cut-out on them, not a switch and not a row of
        colour swatches: a host is choosing an insect, and the border grid
        beside this one already settled that the honest control for something
        you can look at is a picture of it.
      */}
      <div className="flex flex-col gap-2 border-t border-[var(--lifafa-hairline)] pt-3">
        <h3 className="text-[0.6875rem] tracking-[0.2em] text-[var(--lifafa-muted)] uppercase">
          Butterflies
        </h3>

        <div className="flex flex-wrap gap-2" aria-describedby={butterflyHintId}>
          {BUTTERFLY_STYLES.map((option) => {
            const isSelected = option.id === butterflies;

            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onButterfliesChange(option.id)}
                className={`flex items-center gap-1.5 ${pillClass(isSelected)}`}
              >
                {option.id === "none" ? null : (
                  <ButterflyChip style={option.id} />
                )}
                {option.label}
              </button>
            );
          })}
        </div>

        {/*
          The second sentence only when it is true. A colour picked while
          nothing flies is the one state a host cannot explain to themselves,
          and the card is right to hold still — so the panel says so here rather
          than letting them go looking in the preview.
        */}
        <p
          id={butterflyHintId}
          className="text-xs leading-relaxed text-[var(--lifafa-muted)]"
        >
          A few small ones fly in the margins, clear of your writing.
          {motion === "none" && butterflies !== "none"
            ? " Motion style is None, so they are holding still for now."
            : ""}
        </p>
      </div>
    </section>
  );
}
