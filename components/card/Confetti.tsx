"use client";

import { useEffect, useState, type CSSProperties, type ReactElement } from "react";

/** How long the burst lasts, and when its pieces leave the DOM. */
const BURST_MS = 1900;
const PIECES = 40;

interface Piece {
  readonly id: number;
  readonly x: number;
  readonly rise: number;
  readonly fall: number;
  readonly spin: number;
  readonly delay: number;
  readonly width: number;
  readonly height: number;
  readonly color: string;
  readonly round: boolean;
}

/**
 * A short burst of paper confetti from the middle of its box, in the card's
 * colours: thrown up and out, then falling and turning as it fades.
 *
 * The pieces are made after mount, never during render, which is why a random
 * spread is fine here, and they are gone from the DOM once the burst is over.
 * Only transform and opacity move. The caller decides when there is a burst at
 * all: once a session, never under reduced motion.
 */
export default function Confetti({
  colors,
}: {
  colors: readonly string[];
}): ReactElement | null {
  const [pieces, setPieces] = useState<Piece[] | null>(null);

  useEffect(() => {
    setPieces(
      Array.from({ length: PIECES }, (_, id) => ({
        id,
        x: (Math.random() - 0.5) * 320,
        rise: 60 + Math.random() * 90,
        fall: 90 + Math.random() * 120,
        spin: (Math.random() - 0.5) * 900,
        delay: Math.random() * 180,
        width: 5 + Math.random() * 5,
        height: 7 + Math.random() * 7,
        color: colors[id % colors.length],
        round: id % 4 === 0,
      })),
    );

    const timer = window.setTimeout(() => setPieces(null), BURST_MS + 300);
    return () => window.clearTimeout(timer);
    /* One burst per mount: the colours of a card do not change under it. */
  }, []);

  if (pieces === null) {
    return null;
  }

  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-visible">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="lifafa-confetti"
          style={
            {
              "--cx": `${piece.x.toFixed(0)}px`,
              "--cup": `${(-piece.rise).toFixed(0)}px`,
              "--cdown": `${piece.fall.toFixed(0)}px`,
              "--cspin": `${piece.spin.toFixed(0)}deg`,
              width: piece.width,
              height: piece.round ? piece.width : piece.height,
              borderRadius: piece.round ? "9999px" : "1px",
              backgroundColor: piece.color,
              animationDelay: `${piece.delay.toFixed(0)}ms`,
              animationDuration: `${BURST_MS}ms`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}
