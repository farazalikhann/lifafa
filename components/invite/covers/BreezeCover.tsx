"use client";

import { useEffect, useState, type CSSProperties, type ReactElement } from "react";
import type { CoverVisualState } from "@/components/invite/CoverShell";
import { stage } from "@/components/invite/covers/timing";
import { BREEZE_PIECES } from "@/lib/breezeArt";

/**
 * How the open splits across the shell's timer, as fractions of --cover-ms,
 * which is 2.9 seconds.
 *
 * The words go first, in the shell's own quarter of a second, and the breeze
 * waits for them. Then it crosses from the left: a piece's own delay is how
 * far across the screen it lies, up to WAVE for one at the right edge, and
 * each then takes its flight to leave. A leaf's flight is the longer, so the
 * last leaf at the right edge has landed off the screen at 0.98. The veil
 * follows the wave across and has cleared the screen a little before that.
 */
const START = 0.08;
const WAVE = 0.48;
const LEAF_FLY = 0.42;
const PETAL_FLY = 0.32;
const VEIL_START = 0.1;
const VEIL_SHARE = 0.72;

/** How many pieces lie on the cover, and on a small or slow phone. */
const FULL = 72;
const LITE = 40;

/** The scatter's grid: every cell holds one piece, thrown off its centre. */
const COLS = 6;
const ROWS = 12;

/** The soft edge of the veil, as a share of the screen's width. */
const VEIL_EDGE = 0.45;

/** Lifted, then carried: slow to leave the ground, and away. */
const FLY_EASE = "cubic-bezier(0.4,0,0.7,0.85)";

/**
 * A number in [0, 1) from two whole numbers: the scatter's own dice.
 *
 * Not Math.random, which would put one arrangement in the server's HTML and
 * another in the browser's; and not built on Math.sin, whose last digits
 * differ between engines. Integer arithmetic comes out the same everywhere,
 * so the same leaves lie in the same places on every load.
 */
function dice(index: number, salt: number): number {
  let value = Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 15), 0x2c1b3c6d);
  value ^= value >>> 13;

  return ((value >>> 0) % 10000) / 10000;
}

const round = (value: number): number => Math.round(value * 100) / 100;

/**
 * The cells in the order they are dealt: shuffled once, by the dice, so the
 * first forty are spread over the whole screen and not its top half.
 */
const ORDER = Array.from({ length: COLS * ROWS }, (_, cell) => cell)
  .map((cell) => ({ cell, key: dice(cell, 11) }))
  .sort((a, b) => a.key - b.key)
  .map((entry) => entry.cell);

/** Every piece: which, where it lies, how, and how it leaves. */
const SCATTER = ORDER.map((cell, index) => {
  const piece = BREEZE_PIECES[index % BREEZE_PIECES.length];
  const col = cell % COLS;
  const row = Math.floor(cell / COLS);
  /* Thrown up to most of a cell off its centre, so no grid is seen and neighbours overlap. */
  const x = (col + 0.5 + (dice(index, 1) - 0.5) * 0.9) / COLS;
  const y = (row + 0.5 + (dice(index, 2) - 0.5) * 0.9) / ROWS;
  const leaf = piece.kind === "leaf";

  return {
    piece,
    x: round(x * 100),
    y: round(y * 100),
    /* 0.6 to 1.3 of the usual size. */
    scale: round(0.6 + dice(index, 3) * 0.7),
    rest: Math.round(dice(index, 4) * 360),
    /* About one in three lies the other way up. */
    mirror: dice(index, 5) < 0.34,
    /* When the breeze reaches it: by how far across it lies, a little off for each. */
    when: round(Math.min(1, Math.max(0, x + (dice(index, 6) - 0.5) * 0.14))),
    /* How far it is carried, in screen widths past the right edge, and how far up. */
    carry: round(1.08 - x + dice(index, 7) * 0.3),
    lift: round(6 + dice(index, 8) * (leaf ? 14 : 26)),
    /* A leaf tumbles over once or more; a petal only turns. */
    turn: Math.round((leaf ? 260 + dice(index, 9) * 300 : 70 + dice(index, 9) * 130) * (dice(index, 10) < 0.5 ? -1 : 1)),
    fly: leaf ? LEAF_FLY : PETAL_FLY,
    /* One in six rocks while the cover waits, each to its own beat. */
    rocks: index % 6 === 2,
    beat: round(5 + dice(index, 12) * 3),
    lag: round(dice(index, 13) * 5),
    flutter: round(0.42 + dice(index, 14) * 0.3),
  };
});

/**
 * Dry leaves and rose petals lying over the invitation, blown off it from
 * left to right by one soft breeze.
 *
 * CLOSED, the card is already drawn underneath. Over it lies a veil of the
 * card's own colour, and on the veil the leaves and petals: one to each cell
 * of a grid, thrown off its centre, turned, sized and sometimes mirrored by
 * dice that fall the same way on every load. A band of the same colour is
 * laid over them at the head, thinning downwards, so the words the shell
 * prints there have clear ground to be read on. A few pieces rock a little,
 * each to its own beat, as if the breeze were already about.
 *
 * THE BREEZE. On the tap each piece is lifted and carried off to the right
 * and a little upward, turning as it goes: those on the left first, each
 * later the further across it lies, so the breeze is seen to cross the
 * screen. A petal goes quicker and only turns; a leaf takes longer and
 * tumbles. Each flutters on its way, and fades as it leaves.
 *
 * THE VEIL CLEARS BEHIND THE WAVE, AND IS MOVED, NOT MASKED. It is one sheet
 * wider than the screen, the card's colour all across but for its left end,
 * which thins away to nothing. At rest that end hangs off the left of the
 * screen. On the tap the whole sheet is slid off to the right, so its soft
 * end crosses the screen behind the leaves and the card is what it leaves
 * behind, from the left. A moving mask would have been repainted every
 * frame; this is one transform.
 *
 * Transform and opacity only, and no filter anywhere. A small or slow phone
 * gets forty pieces, not seventy two. Under reduced motion the shell never
 * hands this the "opening" phase: the whole cover crossfades to the card,
 * and nothing rocks.
 */
export default function BreezeCover({
  phase,
  option,
  reducedMotion,
  colors,
}: CoverVisualState): ReactElement {
  const opening = phase === "opening";

  /*
    Forty until the browser has said what it is, and for good on a narrow
    screen or a phone with few cores or little memory. Decided once, after
    the first paint, so the server and the browser draw the same thing first;
    the cover's loader is still up then, so nobody sees the rest arrive.
  */
  const [count, setCount] = useState(LITE);

  useEffect(() => {
    const device = navigator as Navigator & { deviceMemory?: number };
    const slow =
      window.innerWidth < 380 ||
      (device.hardwareConcurrency ?? 8) <= 4 ||
      (device.deviceMemory ?? 8) <= 3;

    if (!slow) {
      setCount(FULL);
    }
  }, []);

  const rootStyle = {
    "--cover-ms": `${option.durationMs}ms`,
    /* A piece at its usual size: a fifth of a phone's width, and no larger on a wide screen. */
    "--piece": "min(21cqw, 11cqh)",
    containerType: "size",
  } as CSSProperties;

  const transition = (...entries: string[]): string | undefined =>
    reducedMotion ? undefined : entries.join(", ");

  /* The veil: see the note above. Its soft end is the first VEIL_EDGE of a screen's width. */
  const veilStyle: CSSProperties = {
    left: `${-VEIL_EDGE * 100}cqw`,
    width: `${(1 + VEIL_EDGE) * 100 + 2}cqw`,
    backgroundImage: `linear-gradient(90deg, transparent 0, ${colors.ground} ${round((VEIL_EDGE / (1 + VEIL_EDGE)) * 100)}%)`,
    transition: transition(stage("transform", VEIL_SHARE, VEIL_START, "cubic-bezier(0.4,0,0.6,1)")),
    transform: opening
      ? `translate3d(${(1 + VEIL_EDGE) * 100 + 2}cqw, 0, 0)`
      : "translate3d(0, 0, 0)",
    willChange: "transform",
  };

  /* The clear ground behind the words at the head. It goes with them. */
  const mistStyle: CSSProperties = {
    backgroundImage: `linear-gradient(180deg, ${colors.ground} 0%, ${colors.ground}E6 46%, ${colors.ground}00 100%)`,
    transition: transition(stage("opacity", 0.1, 0, "ease-out")),
    opacity: opening ? 0 : 1,
  };

  return (
    <div
      aria-hidden
      style={rootStyle}
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute inset-y-0" style={veilStyle} />

      {SCATTER.slice(0, count).map((item, index) => {
        const start = START + item.when * WAVE;
        const rest = `translate3d(-50%, -50%, 0) rotate(${item.rest}deg) scale(${item.mirror ? -item.scale : item.scale}, ${item.scale})`;
        const gone = `translate3d(calc(-50% + ${item.carry * 100}cqw), calc(-50% - ${item.lift}cqh), 0) rotate(${item.rest + item.turn}deg) scale(${item.mirror ? -item.scale : item.scale}, ${item.scale})`;

        return (
          <span
            key={index}
            className="absolute block"
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              width: `calc(var(--piece) * ${round(item.piece.aspect >= 1 ? 1 : item.piece.aspect)})`,
              aspectRatio: String(item.piece.aspect),
              transform: opening ? gone : rest,
              opacity: opening ? 0 : 1,
              transition: transition(
                stage("transform", item.fly, start, FLY_EASE),
                /* Whole for most of its flight, and gone over the last of it. */
                stage("opacity", item.fly * 0.4, start + item.fly * 0.6, "ease-in"),
              ),
              willChange: "transform, opacity",
            }}
          >
            <img
              src={item.piece.src}
              alt=""
              decoding="async"
              draggable={false}
              className={`block h-full w-full select-none ${
                !opening && item.rocks ? "lifafa-breeze-rock" : ""
              }`}
              style={
                opening && !reducedMotion
                  ? {
                      /* The flutter: a small rise and dip and a tilt, for as long as it flies. */
                      animation: `lifafa-breeze-flutter ${item.flutter}s ease-in-out calc(var(--cover-ms)*${round(start)}) infinite alternate`,
                    }
                  : item.rocks
                    ? { animationDuration: `${item.beat}s`, animationDelay: `${item.lag}s` }
                    : undefined
              }
            />
          </span>
        );
      })}

      <div className="absolute inset-x-0 top-0 h-[42%]" style={mistStyle} />
    </div>
  );
}
