"use client";

import type { CSSProperties, ReactElement } from "react";
import { useCardStill } from "@/hooks/useCardStill";
import { useFloatingPause } from "@/hooks/useFloatingPause";
import styles from "@/templates/emerald-shahi/emerald.module.css";

/**
 * Twelve small things falling: gold leaves and ivory petals, no symbol of
 * anybody's faith among them.
 *
 * A TABLE, NOT A DICE ROLL. Where each starts, how big it is, how long it
 * takes and how far it sways are written down here, so the server and the
 * browser draw the same twelve and two visits look alike. The last four are
 * left out under 400px by the stylesheet, which leaves eight on a narrow
 * phone.
 *
 * Each is one element moved by one CSS animation of transform and opacity,
 * which the compositor runs without this component doing anything again.
 * The layer is paused by the card's own useFloatingPause while the tab is
 * hidden or the layer is off screen, drawn behind everything that is read, so
 * no piece is ever over a name, a date or a button, and takes no taps.
 */
interface Piece {
  kind: "leaf" | "petal";
  /** Where across the screen it falls, in percent. */
  x: number;
  /** Its width in px. */
  size: number;
  /** Seconds to fall the height of the screen. */
  dur: number;
  /** Seconds into its fall it starts at, so the twelve are never in a row. */
  delay: number;
  /** How far it drifts sideways on the way, in px. */
  sway: number;
  alpha: number;
}

const PIECES: readonly Piece[] = [
  { kind: "leaf", x: 6, size: 9, dur: 19, delay: -2, sway: 26, alpha: 0.7 },
  { kind: "petal", x: 88, size: 10, dur: 23, delay: -11, sway: -30, alpha: 0.6 },
  { kind: "leaf", x: 72, size: 8, dur: 21, delay: -6, sway: 22, alpha: 0.65 },
  { kind: "petal", x: 22, size: 9, dur: 25, delay: -17, sway: 34, alpha: 0.55 },
  { kind: "leaf", x: 94, size: 10, dur: 18, delay: -9, sway: -24, alpha: 0.7 },
  { kind: "petal", x: 48, size: 8, dur: 27, delay: -21, sway: 28, alpha: 0.5 },
  { kind: "leaf", x: 34, size: 8, dur: 24, delay: -14, sway: -20, alpha: 0.6 },
  { kind: "petal", x: 12, size: 10, dur: 22, delay: -4, sway: 30, alpha: 0.6 },
  /* The four a narrow phone goes without. */
  { kind: "leaf", x: 60, size: 9, dur: 26, delay: -19, sway: 24, alpha: 0.6 },
  { kind: "petal", x: 80, size: 8, dur: 20, delay: -13, sway: -26, alpha: 0.55 },
  { kind: "leaf", x: 42, size: 10, dur: 22, delay: -8, sway: -30, alpha: 0.65 },
  { kind: "petal", x: 66, size: 9, dur: 24, delay: -16, sway: 20, alpha: 0.5 },
];

/* Every piece from here on is one the stylesheet hides under 400px. */
const NARROW_COUNT = 8;

export default function EmeraldShahiFloating({
  pagewide,
  band,
}: {
  /** Fixed under the guest's whole page, or pinned in a preview's own scroll box. */
  pagewide: boolean;
  /** The height of that scroll box, where it is pinned. */
  band: string;
}): ReactElement | null {
  const pauseRef = useFloatingPause();
  const still = useCardStill();

  /* A card drawn as a picture of itself, or laid out for paper, has nothing falling over it. */
  if (still) {
    return null;
  }

  return (
    <div
      ref={pauseRef}
      aria-hidden="true"
      className={`${styles.drift} ${pagewide ? styles.driftFixed : styles.driftPinned}`}
      style={pagewide ? undefined : ({ "--es-band": band } as CSSProperties)}
    >
      {PIECES.map((piece, index) => (
        <span
          key={index}
          className={`${styles.piece} ${piece.kind === "leaf" ? styles.leaf : styles.petal} ${
            index >= NARROW_COUNT ? styles.pieceExtra : ""
          }`}
          style={
            {
              "--x": `${piece.x}%`,
              "--size": `${piece.size}px`,
              "--dur": `${piece.dur}s`,
              "--delay": `${piece.delay}s`,
              "--sway": `${piece.sway}px`,
              "--alpha": piece.alpha,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
