"use client";

import { useState, type CSSProperties, type ReactElement } from "react";
import { mixHex } from "@/lib/contrast";
import type { Theme } from "@/lib/themes";

/**
 * One split-flap card: a digit printed across two halves with a line between.
 *
 * On a change, the old digit's top half folds down over the new one, and the
 * new digit's bottom half comes down to meet it, 280ms each, which is how a
 * split-flap board turns over. While that happens the fixed halves show the
 * new top and the old bottom, so there is never a frame with half a digit
 * missing. The two moving halves are keyed on the change, so the next one
 * starts them again; nothing here keeps a timer. The countdown's one interval
 * is the only clock.
 *
 * Under reduced motion the folding top half is not drawn and the new bottom
 * half sits flat, so the card simply shows the new digit (globals.css).
 */
function FlipDigit({ value }: { value: string }): ReactElement {
  /*
    The previous digit is derived state: what `value` was on the render before
    it changed. Setting it here, during render and only when the value moves,
    is React's documented way to keep it, and costs no extra commit.
  */
  const [shown, setShown] = useState({ current: value, previous: value, turn: 0 });

  if (value !== shown.current) {
    setShown({ current: value, previous: shown.current, turn: shown.turn + 1 });
  }

  const turning = shown.turn > 0 && shown.previous !== shown.current;

  return (
    <span className="lifafa-flip" aria-hidden="true">
      <span className="lifafa-flip-half lifafa-flip-top">
        <span>{shown.current}</span>
      </span>
      <span className="lifafa-flip-half lifafa-flip-bottom">
        <span>{turning ? shown.previous : shown.current}</span>
      </span>
      {turning ? (
        <span key={shown.turn} className="contents">
          <span className="lifafa-flip-half lifafa-flip-top lifafa-flip-fold-top">
            <span>{shown.previous}</span>
          </span>
          <span className="lifafa-flip-half lifafa-flip-bottom lifafa-flip-fold-bottom">
            <span>{shown.current}</span>
          </span>
        </span>
      ) : null}
    </span>
  );
}

export interface FlipUnit {
  id: string;
  label: string;
  /** The digits to show, already padded; "––" before the first tick. */
  digits: string;
}

/**
 * The countdown as a split-flap clock: a group of cards per unit, the label
 * under each in the body face.
 *
 * Sized off its own width (a container query), so days, hours, minutes and
 * seconds fit a 375px phone, a photo frame's narrower column and a laptop
 * alike: each card takes an equal share of the room, capped at the size the
 * card's type scale would give it.
 */
export default function FlipClock({
  units,
  theme,
  label,
}: {
  units: readonly FlipUnit[];
  theme: Theme;
  /** Read out in place of the cards, which are drawn and hidden from a screen reader. */
  label: string;
}): ReactElement {
  const cards = units.reduce((sum, unit) => sum + unit.digits.length, 0);

  const style = {
    "--flip-count": String(Math.max(cards, 1)),
    "--flip-units": String(units.length),
    "--flip-face": mixHex(theme.surface, theme.textPrimary, 0.06),
    "--flip-face-top": mixHex(theme.surface, theme.textPrimary, 0.02),
    "--flip-ink": theme.textPrimary,
    "--flip-line": theme.background,
    "--flip-edge": `${theme.textMuted}33`,
  } as CSSProperties;

  return (
    <div className="lifafa-flipclock w-full" style={style}>
      <p className="sr-only">{label}</p>
      <div className="flex items-start justify-center" style={{ gap: "var(--flip-unit-gap)" }}>
        {units.map((unit) => (
          <div key={unit.id} className="flex flex-col items-center gap-1.5">
            <div className="flex" style={{ gap: "var(--flip-digit-gap)" }}>
              {[...unit.digits].map((digit, index) => (
                /* Keyed by place, so a digit's card persists and flips in place. */
                <FlipDigit key={`${unit.digits.length}-${index}`} value={digit} />
              ))}
            </div>
            <span
              aria-hidden="true"
              className="text-[0.6875rem] tracking-[0.2em] uppercase sm:text-xs"
              style={{ color: theme.textMuted }}
            >
              {unit.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
