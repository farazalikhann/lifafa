"use client";

import { useId, type ReactElement } from "react";
import type { DecorIntensity, DecorMotion } from "@/types/card";

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
  butterflies: boolean;
  onMotionChange: (motion: DecorMotion) => void;
  onIntensityChange: (intensity: DecorIntensity) => void;
  onButterfliesChange: (butterflies: boolean) => void;
}): ReactElement {
  const butterflyHeadingId = useId();
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
        bringing a count of its own, and it is drawn the way SectionManager and
        CheckinPanel draw a switch: aria-checked carries the state and the
        heading is its name, so a screen reader says "Butterflies, switch, off".
      */}
      <div className="flex flex-col gap-2 border-t border-[var(--lifafa-hairline)] pt-3">
        <div className="flex items-center justify-between gap-4">
          <h3
            id={butterflyHeadingId}
            className="text-[0.6875rem] tracking-[0.2em] text-[var(--lifafa-muted)] uppercase"
          >
            Butterflies
          </h3>

          <button
            type="button"
            role="switch"
            aria-checked={butterflies}
            aria-labelledby={butterflyHeadingId}
            aria-describedby={butterflyHintId}
            onClick={() => onButterfliesChange(!butterflies)}
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
          >
            {/* The state in words too — hidden from assistive tech, which has aria-checked. */}
            <span
              aria-hidden="true"
              className="text-[0.8125rem] font-medium text-[var(--lifafa-cream)]"
            >
              {butterflies ? "On" : "Off"}
            </span>
            <span
              aria-hidden="true"
              className={`flex h-6 w-10 items-center rounded-full p-0.5 transition-colors duration-150 ${
                butterflies
                  ? "bg-[var(--lifafa-marigold)]"
                  : "bg-[var(--lifafa-hairline)]"
              }`}
            >
              <span
                className={`h-5 w-5 rounded-full bg-[var(--lifafa-ink)] transition-transform duration-150 ${
                  butterflies ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </span>
          </button>
        </div>

        {/*
          The second sentence only when it is true. A switch that is on while
          nothing flies is the one state a host cannot explain to themselves,
          and the card is right to hold still — so the panel says so here rather
          than letting them go looking in the preview.
        */}
        <p
          id={butterflyHintId}
          className="text-xs leading-relaxed text-[var(--lifafa-muted)]"
        >
          A few small ones fly in the margins, clear of your writing.
          {motion === "none"
            ? " Motion style is None, so they are holding still for now."
            : ""}
        </p>
      </div>
    </section>
  );
}
