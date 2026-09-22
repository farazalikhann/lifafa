"use client";

import { useEffect, useState, type CSSProperties, type ReactElement } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useRevealGate } from "@/hooks/useRevealGate";
import { artWidth } from "@/lib/cardScale";
import { PETALS } from "@/lib/petals";
import type { DecorIntensity } from "@/types/card";

/**
 * Rose petals, in two ways a host can ask for them: a shower when the card
 * opens, and a steady fall down the margins.
 *
 * THE FALL KEEPS TO THE MARGINS, for the reason the butterflies do. This layer
 * sits at `z-[17]` beside ButterflyLayer, above the text, so the position table
 * is the only thing keeping a petal off a line of writing — every faller is
 * placed in the outer strip of the card and sways no more than 8px either way.
 * See the note at the top of ButterflyLayer.tsx.
 *
 * THE SHOWER DOES CROSS THE CARD, once, and then it is gone. It is the moment
 * of opening, and a shower that kept politely to the edges would not read as
 * one. It fades out as it falls, is over in under four seconds, never takes a
 * tap (`pointer-events-none` throughout), and unmounts when it is done, so
 * nothing of it is left over the writing once the guest starts reading.
 *
 * WHEN IT FIRES is the reveal gate's business: under a cover the gate opens as
 * the cover hands over to the card, and everywhere else — the editor's preview,
 * a card with no cover — it is open from the start, so the shower plays as the
 * card appears. The canvas keys this layer on the host's choice, so picking it
 * in the editor plays it again.
 *
 * Distances in `cqw` and `cqh` — shares of the pinned band, which is made a
 * size container for exactly this — so one table throws the same shower across
 * a 360px phone and a laptop-wide card alike.
 */

interface Faller {
  /** Percentage across the band. Kept to the outer strips — see above. */
  left: number;
  /** Rendered width in px. */
  size: number;
  /** Seconds to cross the band top to bottom. */
  travel: number;
  /** Seconds for one sway, and for one turn. */
  sway: number;
  turn: number;
  rotate: number;
  /**
   * Negative, so the fall is already under way on the first frame rather than
   * every petal entering from the top together.
   */
  delay: number;
}

/**
 * Hand authored, alternating sides, so the first two a "subtle" card gets are
 * on opposite sides and each added pair keeps the balance.
 */
const FALLERS: readonly Faller[] = [
  { left: 1, size: 24, travel: 13, sway: 3.4, turn: 2.6, rotate: 20, delay: -2 },
  { left: 90, size: 22, travel: 15, sway: 3.9, turn: 3.1, rotate: -35, delay: -9 },
  { left: 3, size: 20, travel: 14, sway: 3.7, turn: 2.4, rotate: -40, delay: -8.5 },
  /* Joins at "normal". */
  { left: 91, size: 20, travel: 12, sway: 3.1, turn: 2.3, rotate: 50, delay: -3.5 },
  { left: 2, size: 21, travel: 16, sway: 4.2, turn: 2.9, rotate: -15, delay: -13.5 },
  { left: 89, size: 19, travel: 13.5, sway: 3.3, turn: 2.7, rotate: 15, delay: -11 },
  /* Only at "lively". */
  { left: 0, size: 19, travel: 14, sway: 3.6, turn: 2.2, rotate: 70, delay: -5.5 },
  { left: 88, size: 23, travel: 17, sway: 4.5, turn: 3.4, rotate: -60, delay: -15.5 },
  { left: 4, size: 18, travel: 15.5, sway: 3.9, turn: 2.5, rotate: 35, delay: -11.5 },
  { left: 91, size: 18, travel: 16.5, sway: 4.1, turn: 3.2, rotate: -20, delay: -6.5 },
];

/*
  More than the butterflies at every amount, where the leaves are fewer: a petal
  is the smallest thing in the air, and it spends a sixth of each fall off the
  band, so fewer than this and a margin is often empty.
*/
const FALL_COUNT: Record<DecorIntensity, number> = {
  subtle: 3,
  normal: 6,
  lively: 10,
};

interface Thrown {
  /** Where it lands, across, in cqw from the middle. */
  dx: number;
  /** How high it is thrown, in cqh (negative is up). */
  up: number;
  /** Where it has fallen to by the end, in cqh. */
  down: number;
  /** Total turn in degrees over the flight. */
  spin: number;
  size: number;
  duration: number;
  delay: number;
}

/**
 * A small seeded generator, so the shower is laid out the same on the server
 * and in the browser — Math.random would be a hydration mismatch, which is why
 * every other table in this directory is written out longhand. Twenty-four
 * petals is too many to write out, so they are drawn from a fixed seed instead.
 */
function seeded(seed: number): () => number {
  let state = seed;

  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const THROWN: readonly Thrown[] = (() => {
  const random = seeded(20260923);
  const petals: Thrown[] = [];

  for (let index = 0; index < 24; index += 1) {
    /*
      Alternating sides and widening as the list goes on, so the first twelve a
      "subtle" card gets are already spread across the card rather than all
      thrown one way.
    */
    const side = index % 2 === 0 ? 1 : -1;
    const reach = 10 + random() * 38;

    petals.push({
      dx: side * reach,
      up: -(10 + random() * 22),
      down: 55 + random() * 45,
      spin: (random() < 0.5 ? -1 : 1) * (220 + random() * 380),
      size: 18 + Math.round(random() * 12),
      duration: 2.6 + random() * 1,
      delay: random() * 0.35,
    });
  }

  return petals;
})();

const BURST_COUNT: Record<DecorIntensity, number> = {
  subtle: 12,
  normal: 18,
  lively: 24,
};

/** Longer than the slowest petal's duration plus its delay, with room to spare. */
const BURST_MS = 4200;

/** The same shadow the butterflies and leaves carry, for the same reason. */
const SHADOW = "drop-shadow(0 1px 1.5px rgb(0 0 0 / 0.32))";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function PetalImage({
  index,
  size,
}: {
  index: number;
  size: number;
}): ReactElement {
  const petal = PETALS[index % PETALS.length];

  return (
    <img
      src={petal.src}
      alt=""
      aria-hidden="true"
      decoding="async"
      width={size}
      height={Math.round(size / petal.aspect)}
      className="block max-w-none select-none"
      style={{ filter: SHADOW }}
    />
  );
}

/**
 * Four spans, each owning one thing, for the reason a butterfly has three: an
 * animation's transform replaces the element's own. The outer falls, the next
 * sways, the next holds the heading, the inner turns.
 */
function FallingPetal({
  faller,
  index,
}: {
  faller: Faller;
  index: number;
}): ReactElement {
  const loop = {
    animationTimingFunction: "ease-in-out",
    animationIterationCount: "infinite",
    animationFillMode: "both",
  } as const;

  return (
    <span
      className="absolute top-0 block"
      style={{
        left: `${faller.left}%`,
        animationName: "lifafa-petal-fall",
        animationDuration: `${faller.travel}s`,
        animationDelay: `${faller.delay}s`,
        animationTimingFunction: "linear",
        animationIterationCount: "infinite",
      }}
    >
      <span
        className="block"
        style={{
          ...loop,
          animationName: "lifafa-petal-sway",
          animationDuration: `${faller.sway}s`,
          animationDirection: "alternate",
        }}
      >
        <span
          className="block"
          style={{ opacity: 0.92, transform: `rotate(${faller.rotate}deg)` }}
        >
          <span
            className="lifafa-card-art block"
            style={{
              ...artWidth(faller.size),
              ...loop,
              animationName: "lifafa-leaf-turn",
              animationDuration: `${faller.turn}s`,
            }}
          >
            <PetalImage index={index} size={faller.size} />
          </span>
        </span>
      </span>
    </span>
  );
}

function ThrownPetal({
  thrown,
  index,
}: {
  thrown: Thrown;
  index: number;
}): ReactElement {
  return (
    <span
      className="absolute block"
      style={
        {
          /* Thrown from just above the middle, where the names sit. */
          left: "50%",
          top: "40%",
          "--dx": String(thrown.dx),
          "--up": String(thrown.up),
          "--down": String(thrown.down),
          "--spin": String(thrown.spin),
          animationName: "lifafa-petal-burst",
          animationDuration: `${thrown.duration}s`,
          animationDelay: `${thrown.delay}s`,
          animationFillMode: "both",
        } as CSSProperties
      }
    >
      <span
        className="lifafa-card-art block"
        style={{
          ...artWidth(thrown.size),
          animationName: "lifafa-leaf-turn",
          animationDuration: `${0.9 + (index % 5) * 0.2}s`,
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
        }}
      >
        <PetalImage index={index} size={thrown.size} />
      </span>
    </span>
  );
}

export default function PetalLayer({
  burst,
  fall,
  intensity,
  bandHeight,
}: {
  /** Whether a shower plays as the card opens. */
  burst: boolean;
  /**
   * Whether petals fall in the margins. Already gated on the motion style by
   * the canvas, the way the butterflies are.
   */
  fall: boolean;
  /** How many, read from the host's existing Amount. */
  intensity: DecorIntensity;
  /** The pinned band's height, exactly as the other decor layers take it. */
  bandHeight: string;
}): ReactElement | null {
  const prefersReducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const gateOpen = useRevealGate();
  /* Set once the shower has run its course, and never unset — it plays once. */
  const [burstDone, setBurstDone] = useState(false);

  const isBursting = burst && gateOpen && !burstDone && !prefersReducedMotion;

  useEffect(() => {
    if (!isBursting) {
      return undefined;
    }

    const timer = window.setTimeout(() => setBurstDone(true), BURST_MS);

    return () => window.clearTimeout(timer);
  }, [isBursting]);

  /*
    Nothing to leave behind under reduced motion: a petal is nothing but its
    fall. `motion-reduce:hidden` below covers the first paint, as it does on
    the other layers.
  */
  if (prefersReducedMotion || (!fall && !isBursting)) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[17] overflow-clip motion-reduce:hidden"
    >
      <div
        className="sticky top-0 w-full overflow-clip"
        style={{ height: bandHeight, containerType: "size" }}
      >
        {fall
          ? FALLERS.slice(0, FALL_COUNT[intensity]).map((faller, index) => (
              <FallingPetal
                key={`fall-${faller.left}-${faller.delay}`}
                faller={faller}
                index={index}
              />
            ))
          : null}

        {isBursting
          ? THROWN.slice(0, BURST_COUNT[intensity]).map((thrown, index) => (
              <ThrownPetal key={`burst-${index}`} thrown={thrown} index={index} />
            ))
          : null}
      </div>
    </div>
  );
}
