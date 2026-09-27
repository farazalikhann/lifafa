"use client";

import { useState, type CSSProperties, type ReactElement } from "react";
import { mixHex } from "@/lib/contrast";
import type { Theme } from "@/lib/themes";

/**
 * One digit in its fixed slot.
 *
 * On a change the old digit slides up and out as the new one slides up into
 * its place (`lifafa-tick-*` in globals.css), transform and opacity only. The
 * slot is a fixed width, so a second ticking over never moves a neighbour.
 * The two moving copies are keyed on the change, so the next one starts
 * them again; nothing here keeps a timer — the countdown's one interval is
 * the only clock. Under reduced motion the new digit simply replaces the old.
 */
function TickDigit({ value }: { value: string }): ReactElement {
  /*
    The previous digit is derived state: what `value` was on the render before
    it changed, kept by React's documented set-during-render pattern.
  */
  const [shown, setShown] = useState({ current: value, previous: value, turn: 0 });

  if (value !== shown.current) {
    setShown({ current: value, previous: shown.current, turn: shown.turn + 1 });
  }

  const moving = shown.turn > 0 && shown.previous !== shown.current;

  return (
    <span className="lifafa-tick" aria-hidden="true">
      {moving ? (
        <span key={`out-${shown.turn}`} className="lifafa-tick-out">
          {shown.previous}
        </span>
      ) : null}
      <span key={`in-${shown.turn}`} className={moving ? "lifafa-tick-in" : undefined}>
        {shown.current}
      </span>
    </span>
  );
}

export interface TileUnit {
  id: string;
  label: string;
  /** The digits to show, already padded; "––" before the first tick. */
  digits: string;
}

/**
 * The countdown as four tiles: days, hours, minutes and seconds, each a
 * number over its label in a softly rounded box with a thin accent border.
 *
 * The four share the row equally and never resize, whatever the numbers do —
 * tabular, lining figures in fixed digit slots, in the card's display face.
 * The tile's fill is the card's surface leaned a touch toward the accent, so
 * it sits on a cream card and on an ink one alike.
 */
export default function CountdownTiles({
  units,
  theme,
  label,
  hindi,
}: {
  units: readonly TileUnit[];
  theme: Theme;
  /** Read out in place of the tiles, which are drawn and hidden from a screen reader. */
  label: string;
  /** Labels in the Hindi serif rather than as spaced Latin capitals. */
  hindi: boolean;
}): ReactElement {
  const tile: CSSProperties = {
    borderColor: `${theme.accent}8c`,
    backgroundColor: mixHex(theme.surface, theme.accent, 0.05),
  };

  return (
    <div className="w-full">
      <p className="sr-only">{label}</p>
      <div className="mx-auto grid w-full max-w-[21rem] grid-cols-4 gap-2 sm:gap-2.5" aria-hidden="true">
        {units.map((unit) => (
          <div
            key={unit.id}
            className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-1 pt-3 pb-2.5"
            style={tile}
          >
            <span
              className="flex text-[1.75rem] sm:text-[calc(1.9*var(--card-rem,1rem))]"
              style={{
                color: theme.accent,
                fontFamily: "var(--card-heading)",
                fontWeight: "var(--card-heading-weight)" as unknown as number,
                fontVariantNumeric: "lining-nums tabular-nums",
              }}
            >
              {[...unit.digits].map((digit, index) => (
                /* Keyed by place, so a digit's slot persists and slides in place. */
                <TickDigit key={`${unit.digits.length}-${index}`} value={digit} />
              ))}
            </span>
            {hindi ? (
              <span
                lang="hi"
                className="text-[calc(0.8*var(--card-rem,1rem))] leading-[1.4]"
                style={{
                  color: theme.textMuted,
                  fontFamily:
                    'var(--font-hi-tiro), var(--font-devanagari), "Noto Serif Devanagari", serif',
                }}
              >
                {unit.label}
              </span>
            ) : (
              <span
                className="text-[0.625rem] tracking-[0.18em] uppercase sm:text-[0.6875rem]"
                style={{ color: theme.textMuted }}
              >
                {unit.label}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
