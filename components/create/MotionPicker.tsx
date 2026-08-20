"use client";

import type { ReactElement } from "react";
import type { DecorIntensity, DecorMotion } from "@/types/card";

const MOTIONS: readonly { id: DecorMotion; label: string }[] = [
  { id: "float", label: "Float" },
  { id: "fall", label: "Fall" },
  { id: "drift", label: "Drift" },
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
  onMotionChange,
  onIntensityChange,
}: {
  motion: DecorMotion;
  intensity: DecorIntensity;
  onMotionChange: (motion: DecorMotion) => void;
  onIntensityChange: (intensity: DecorIntensity) => void;
}): ReactElement {
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
    </section>
  );
}
