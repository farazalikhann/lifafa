"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties, ReactElement } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  BUTTERFLY_ASPECT,
  LEAF_ASPECT,
  LEAF_SRC,
  butterflySources,
} from "@/lib/butterflies";
import { artWidth } from "@/lib/cardScale";
import type { ButterflyStyle, DecorIntensity } from "@/types/card";

/**
 * A few butterflies, roaming the card, that get out of the way of a finger.
 *
 * The one piece of decor on the card that is a photograph rather than a drawing
 * — the flower frames aside — and it is here rather than in DecorLayer's motif
 * table for exactly that reason. Every motif in that table is stroke work in
 * `currentColor`, scattered across the whole card and held between 0.10 and
 * 0.22 alpha so a name can be read straight through it. A full colour insect
 * cannot join that scatter: at the alpha the scatter runs at it is a grey
 * smudge, and at an alpha where it is a butterfly it is something the guest has
 * to read the date through.
 *
 * THEY CROSS THE TEXT, BUT NEVER STOP ON IT. They used to be held in the
 * margins on short CSS loops, which kept them off the writing but left them
 * bobbing on the spot. Now each one flies anywhere on the visible band, and
 * three things keep the names and the date readable: over the text column it
 * fades to TEXT_OPACITY, it only ever rests in a margin, and a guest who wants
 * to read what one is passing over only has to reach for it. The layer is
 * still `z-[17]`, above the border frame, because anywhere below that a
 * photographic border swallows them.
 *
 * FLIGHT IS STEERED IN SCRIPT AND PLAYED BY THE COMPOSITOR. `startFlight`
 * below works out a couple of seconds of each butterfly's path at a time and
 * hands it over as a keyframed transform — no left or top, no layout reads, no
 * React state, and no work on the main thread between segments, which is what
 * lets it share a low-end phone with the leaves and the petals. The note above
 * SAMPLE_MS says why this is not a per-frame loop. The wingbeat stays the CSS
 * keyframe in globals.css and the flight only changes its playback rate, so the
 * beat never restarts or skips when a butterfly speeds up.
 *
 * NO GIF. The wingbeat is CSS on a still image, and the whole of why is in
 * lifafa-butterfly-wing in globals.css. Briefly: a GIF cannot carry the soft
 * edge this cut-out has, cannot be slowed for a guest who has asked for less
 * movement, and every copy of one beats in the same rhythm at the same moment.
 *
 * LEAVES ARE DRAWN HERE TOO, on a switch of their own. They rode the butterfly
 * switch at first, as the air the butterflies fly through; hosts asked for one
 * without the other, so each is now its own choice and a card may carry either
 * or both. One to three leaves drift depending on the same Amount the
 * butterflies read. They keep the short CSS paths in the margins the
 * butterflies used to fly, since a leaf has nobody to shoo it.
 *
 * WHICH BUTTERFLY IS THE HOST'S, not this file's. A card has a palette, and
 * three colours of insect arriving unasked is a decision made on the host's
 * behalf — so the panel offers red, yellow, purple and a mixture of all three,
 * and what arrives here is whichever they chose. lib/butterflies.ts names the
 * files and turns that choice into the list this layer cycles.
 *
 * PINNED, not scrolled — the same sticky band DecorLayer uses, so the
 * butterflies stay with what the guest is looking at rather than being left
 * behind after the cover.
 */

interface Flyer {
  /**
   * Where it starts, as percentages within the band, and where it stays for a
   * guest who has asked for less movement.
   *
   * In the margins, so the still version keeps off the writing. The flight
   * takes over from here and goes wherever it likes.
   */
  left: number;
  top: number;
  /**
   * Width in px at the old size, before GROW. Varied by hand as well as by
   * the random scale the flight adds, so the still version is not six copies.
   */
  size: number;
  /** Seconds for one wingbeat at cruising speed. */
  wing: number;
  /** Starting heading, so they are not all pointing due north. */
  rotate: number;
  delay: number;
}

/**
 * Where the butterflies start, hand authored and never generated.
 *
 * Math.random would place them differently on the server and in the browser,
 * which React reports as a hydration mismatch — the same reason DecorLayer's
 * shape table is written out longhand. The randomness in their flight starts
 * after hydration, inside the effect.
 *
 * Ordered so that the first two are the two a "subtle" card gets, and they are
 * on opposite sides at different heights: the smallest count still has to look
 * arranged rather than clustered. Every entry after that keeps the balance.
 */
const FLYERS: readonly Flyer[] = [
  { left: 1, top: 22, size: 38, wing: 0.72, rotate: 12, delay: 0 },
  { left: 84, top: 58, size: 35, wing: 0.62, rotate: -16, delay: 1.4 },
  /* Joins at "normal". */
  { left: 86, top: 14, size: 30, wing: 0.84, rotate: 22, delay: 2.6 },
  { left: 1, top: 70, size: 33, wing: 0.68, rotate: -9, delay: 0.8 },
  /* The last two are only reached at "lively". */
  { left: 87, top: 84, size: 29, wing: 0.78, rotate: 7, delay: 3.4 },
  { left: 2, top: 44, size: 31, wing: 0.66, rotate: -20, delay: 2.0 },
];

/**
 * How much bigger than the table they are drawn.
 *
 * 1.4 everywhere but a screen under 400px, where globals.css takes it back to
 * 1.25 — see `.lifafa-butterfly-art`. In CSS rather than a media query hook so
 * the server render is already the right size and nothing jumps on hydration.
 */
const GROW = 1.4;

interface Drifter {
  /** Percentages within the band. */
  left: number;
  top: number;
  /** Rendered width in px. */
  size: number;
  /** Which of the two drift paths in globals.css it takes. */
  path: "a" | "b";
  /** Seconds for one circuit of it. */
  travel: number;
  /** Seconds for one turn in the air. */
  turn: number;
  rotate: number;
  delay: number;
}

/**
 * The leaves, placed in the margins and kept apart from where the butterflies
 * start.
 *
 * A leaf and a butterfly that begin on the same side at the same height read
 * as one torn sprite rather than two things in the air. The right-hand leaf
 * sits at 30% where the right-hand butterflies start at 14, 58 and 84, and the
 * two left-hand leaves fall between the left-hand butterflies' 22, 44 and 70.
 *
 * Fewer than the butterflies at every amount. A leaf is the quieter thing and
 * there is no reading of a wedding card where it should outnumber them.
 */
const LEAVES: readonly Drifter[] = [
  { left: 0, top: 34, size: 30, path: "a", travel: 28, turn: 4.2, rotate: 18, delay: 1.1 },
  /* Joins at "normal". */
  { left: 87, top: 30, size: 26, path: "b", travel: 32, turn: 3.6, rotate: -24, delay: 2.4 },
  /* Only at "lively". */
  { left: 4, top: 78, size: 24, path: "b", travel: 30, turn: 4.8, rotate: -12, delay: 3.2 },
];

/**
 * How many fly at each amount, reusing the control the host already has.
 *
 * Two is not half of four for a reason. The scatter can afford to grow evenly
 * because a motif is a few strokes; a butterfly is the loudest thing on this
 * layer, and six of them on a 390px card is already the point where they stop
 * being a detail someone notices and start being the subject of the card.
 */
const COUNT: Record<DecorIntensity, number> = {
  subtle: 2,
  normal: 4,
  lively: 6,
};

/** How many leaves at each amount — see the note on LEAVES. */
const LEAF_COUNT: Record<DecorIntensity, number> = {
  subtle: 1,
  normal: 2,
  lively: 3,
};

/**
 * Held below full, so a butterfly crossing the frame or a scattered motif
 * reads as being in the same picture rather than pasted on top of it.
 */
const OPACITY = 0.9;

/**
 * A shadow the shape of the butterfly, and it is not decoration.
 *
 * Flying above the border puts them over the flower frames, which paint dense
 * colour into the margins — a violet butterfly over a violet bouquet simply
 * disappeared into it. `drop-shadow` follows the cut-out's own alpha rather
 * than its box, so what it draws is the insect's outline half a pixel down and
 * behind, which is enough to lift it off whatever it is passing over and reads
 * as nothing at all on a plain card.
 *
 * On the image, deliberately, and not on either animated span: a filter on a
 * span whose transform changes every frame is paid for on every frame, where
 * one on the image inside it is drawn once into the layer and then moved.
 */
const SHADOW = "drop-shadow(0 1px 1.5px rgb(0 0 0 / 0.38))";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * How much slower the wings beat for a guest who has asked for less movement.
 * They stay where the table puts them and only open and close, about once
 * every two seconds.
 */
const REDUCED_WING_SLOWDOWN = 3.2;

/* --- The flight. Distances in the band's own px, times in ms or s as named. --- */

/** Targets keep this far in from every edge, so none is ever half off the card. */
const EDGE = 16;
/** Cruising speed in px/s, before each butterfly's own ±15%. */
const CRUISE = 48;
/**
 * How eagerly the heading turns toward the target, per second, and the most it
 * may turn in one. The cap is what makes a turn a curve: at cruising speed it
 * is a circle about 30px across, which is smaller than ARRIVE, so no butterfly
 * can end up orbiting a target it cannot reach.
 */
const TURN = 1.3;
const MAX_TURN = 1.6;
/** Close enough to count as arrived, when it picks the next target. */
const ARRIVE = 40;
/** Given up on a target after this long, in case one keeps sliding past it. */
const TARGET_PATIENCE = 9000;
/**
 * Every 8 to 15 seconds it hangs in the air for 1 to 2 — but only in a margin.
 * It may cross the names and the date on its way somewhere; it never stops over
 * them. So when a rest is due it first picks a spot beside the text column,
 * flies there, slows as it comes in, and rests once it is within REST_ARRIVE.
 */
const REST_EVERY: readonly [number, number] = [8000, 15000];
const REST_FOR: readonly [number, number] = [1000, 2000];
const REST_ARRIVE = 12;
/** Starts slowing this far from a rest spot, so it lands rather than circles. */
const REST_SETTLE = 40;
/**
 * How far outside the column a rest spot sits when the margin is narrower than
 * a butterfly — a phone's is 28px — so its centre is clearly clear of the text.
 */
const REST_INSET = 8;
/** A rest spot not reached in this long is given up, and the rest skipped. */
const REST_PATIENCE = 10000;
/**
 * Its opacity over the text column, faded to from OPACITY and back as it
 * crosses the column's edge, at FADE_RATE per second — about a third of a
 * second either way.
 */
const TEXT_OPACITY = 0.6;
const FADE_RATE = 7;
/** A pointer inside this distance of a butterfly's edge sends it off. */
const SHOO_RADIUS = 70;
/** The dash away from a finger, in px/s, and how long before it calms down. */
const FLEE_SPEED = 330;
const FLEE_FOR: readonly [number, number] = [1000, 2000];
/**
 * A dash that would run into an edge turns along it once it is this close,
 * rather than hitting it and bouncing back at the finger it was fleeing.
 */
const FLEE_ROOM = 60;
/**
 * A finger that stays on a fleeing butterfly re-aims it at most this often.
 * Every re-aim is a new segment, and a pointermove arrives on every frame.
 */
const REAIM_MS = 120;
/** How far it leans into a turn, in degrees, at full sideways travel. */
const MAX_TILT = 32;
/** The gentle rise and fall on top of the path, in px. */
const BOB = 3;
/** Wingbeat playback rate: slow while resting, up to this while fleeing. */
const MIN_FLAP = 0.42;
const MAX_FLAP = 2.8;

/**
 * The flight is worked out ahead of time and played by the compositor.
 *
 * WHY NOT A FRAME LOOP. Writing a transform from requestAnimationFrame looks
 * free, and on an empty page it nearly is. On this card it is not: every frame
 * that changes a transform from script sends the browser back through style,
 * pre-paint and layerisation for the whole page — and the whole page is a card
 * full of animated motifs, leaves and petals. Measured at a 4x CPU slowdown,
 * the stand-in for a low-end Android, that took the card from 60 frames a
 * second to 30. The same flight handed over as a keyframed animation costs one
 * of those passes per segment instead of one per frame, and kept 60.
 *
 * So the steering below runs in simulated time, SAMPLE_MS apart, for
 * SEGMENT_SAMPLES steps, and every step becomes one keyframe of a linear Web
 * Animation on the transform. Thirty keyframes a second is finer than the eye
 * can find the corners of at these speeds. Before a segment runs out it is
 * replaced by the next, simulated onward from the exact sample it had reached
 * and started at that sample's own time, so the join has no seam; a finger
 * does the same thing early, from wherever the butterfly is at that moment.
 */
const SAMPLE_MS = 1000 / 30;
const SEGMENT_SAMPLES = 75;
/** Replanned once this much of a segment has played. */
const REPLAN_AFTER_MS = 1500;
/** How often the scheduler looks in, for replanning and the wingbeat rate. */
const CHECK_MS = 250;
/**
 * At most this many replanned in one look. They all start together, so without
 * a cap all six would be simulated in the same task, which on a slow phone is
 * long enough to drop a frame. The second of slack between REPLAN_AFTER_MS and
 * the end of a segment is room for four looks, and they spread out from there.
 */
const REPLANS_PER_CHECK = 2;

/** Everything that changes as a butterfly flies — a sample is a copy of it. */
interface Sim {
  /** Flight time, in ms, of this sample. */
  t: number;
  /** The centre, in band px. */
  x: number;
  y: number;
  heading: number;
  speed: number;
  tilt: number;
  /** The scale drawn, easing from 1 to its own so the size never snaps. */
  drawnScale: number;
  flap: number;
  targetX: number;
  targetY: number;
  targetSince: number;
  nextRest: number;
  restUntil: number;
  /** A rest is due, and it is on its way to a spot in a margin to take it. */
  restPending: boolean;
  restPendingSince: number;
  fleeStart: number;
  fleeUntil: number;
  fleeX: number;
  fleeY: number;
  /**
   * The outer span's opacity, under the middle span's OPACITY: 1 in a margin,
   * TEXT_OPACITY / OPACITY over the text column, easing between the two.
   */
  fade: number;
}

interface Body {
  node: HTMLElement;
  /** The CSS wingbeat, found once, so its rate can follow the speed. */
  wing: Animation | null;
  flyer: Flyer;
  /** The ±10% that keeps a single colour from looking copied. */
  scale: number;
  cruise: number;
  phase: number;
  /** Half the laid-out size, which is what the translate is measured from. */
  layoutHalfW: number;
  layoutHalfH: number;
  /** Half the drawn size, after scale, which is what the edges are kept from. */
  halfW: number;
  halfH: number;
  /** Where the table's left and top put the span, in band px. */
  baseX: number;
  baseY: number;
  sim: Sim;
  /** The segment playing now, one sample per SAMPLE_MS. Empty until placed. */
  plan: Sim[];
  motion: Animation | null;
  appliedFlap: number;
}

function between([low, high]: readonly [number, number]): number {
  return low + Math.random() * (high - low);
}

function clamp(value: number, low: number, high: number): number {
  return value < low ? low : value > high ? high : value;
}

/** An angle folded into -π..π, so a turn always goes the short way round. */
function wrapAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

/** Frame-rate independent easing: the share of the gap to close in `dt`. */
function ease(rate: number, dt: number): number {
  return 1 - Math.exp(-rate * dt);
}

function setFlap(wing: Animation | null, rate: number): void {
  if (wing === null) {
    return;
  }

  /*
    updatePlaybackRate keeps the beat where it is and only changes its speed.
    Setting playbackRate directly is the fallback for an older WebView, and it
    is only a visible jump on the frame it happens.
  */
  if (typeof wing.updatePlaybackRate === "function") {
    wing.updatePlaybackRate(rate);
  } else {
    wing.playbackRate = rate;
  }
}

/** The document timeline's clock, which is what an animation's startTime is on. */
function timelineNow(): number {
  const now = document.timeline?.currentTime;
  return typeof now === "number" ? now : performance.now();
}

/**
 * Sets every butterfly on the band flying, and returns what stops them.
 *
 * Everything here is imperative on purpose. React renders the spans once; from
 * then on the only thing that changes is the animation on each outer span, and
 * that is replaced about every second and a half, or when a finger arrives.
 * It stops whenever nobody could be watching — the tab hidden, or the card
 * scrolled out of view.
 */
function startFlight(
  band: HTMLElement,
  nodes: readonly HTMLElement[],
  flyers: readonly Flyer[],
): () => void {
  let width = 0;
  let height = 0;
  /* The band's place on screen, read lazily by the pointer and never per frame. */
  let rect: DOMRect | null = null;
  /*
    The text column's left and right edges, in band px — where the sections'
    own padding ends. Read with the sizes, never while flying.
  */
  let columnLeft = 0;
  let columnRight = 0;
  const content =
    band.parentElement?.parentElement?.querySelector<HTMLElement>(
      ".lifafa-card-content",
    ) ?? null;
  let running = false;
  let timer = 0;
  /*
    Flight time is the timeline's time less every pause, so a rest or a dash
    that was under way when the tab was hidden picks up where it left off.
  */
  let offset = 0;
  /* Starts out paused, as of now, until sync() sets it flying. */
  let pausedAt = timelineNow();
  let onScreen = true;
  const flightNow = (): number => timelineNow() - offset;

  const bodies: Body[] = nodes.map((node, index) => {
    const flyer = flyers[index];
    const wingNode = node.querySelector<HTMLElement>("[data-wing]");
    const wing =
      wingNode !== null && typeof wingNode.getAnimations === "function"
        ? (wingNode.getAnimations()[0] ?? null)
        : null;

    return {
      node,
      wing,
      flyer,
      scale: 0.9 + Math.random() * 0.2,
      cruise: CRUISE * (0.85 + Math.random() * 0.3),
      phase: Math.random() * Math.PI * 2,
      layoutHalfW: 0,
      layoutHalfH: 0,
      halfW: 0,
      halfH: 0,
      baseX: 0,
      baseY: 0,
      sim: {
        t: 0,
        x: 0,
        y: 0,
        heading: Math.random() * Math.PI * 2 - Math.PI,
        speed: CRUISE * 0.5,
        tilt: flyer.rotate,
        drawnScale: 1,
        flap: 1,
        targetX: 0,
        targetY: 0,
        targetSince: 0,
        /* Staggered, so the first rests do not all fall together. */
        nextRest: between([3000, REST_EVERY[1]]),
        restUntil: 0,
        restPending: false,
        restPendingSince: 0,
        fleeStart: 0,
        fleeUntil: 0,
        fleeX: 0,
        fleeY: 0,
        fade: 1,
      },
      plan: [],
      motion: null,
      appliedFlap: 1,
    };
  });

  /** The box its centre may take a target in: the whole band, less EDGE. */
  function targetBounds(body: Body): [number, number, number, number] {
    const minX = EDGE + body.halfW;
    const maxX = width - EDGE - body.halfW;
    const minY = EDGE + body.halfH;
    const maxY = height - EDGE - body.halfH;

    return [
      minX <= maxX ? minX : width / 2,
      minX <= maxX ? maxX : width / 2,
      minY <= maxY ? minY : height / 2,
      minY <= maxY ? maxY : height / 2,
    ];
  }

  /**
   * A new place to fly to, anywhere on the band.
   *
   * A few draws rather than one: a target a wingspan away is a twitch, not a
   * flight, so it takes the first that is a fair way off. Given a point to get
   * away from — a finger — it takes the draw furthest from it instead.
   */
  function pickTarget(body: Body, awayX?: number, awayY?: number): void {
    const sim = body.sim;
    const [minX, maxX, minY, maxY] = targetBounds(body);
    const fromX = awayX ?? sim.x;
    const fromY = awayY ?? sim.y;
    const farEnough = Math.min(width, height) * 0.35;
    let bestDistance = -1;

    for (let draw = 0; draw < 4; draw += 1) {
      const x = minX + Math.random() * (maxX - minX);
      const y = minY + Math.random() * (maxY - minY);
      const distance = Math.hypot(x - fromX, y - fromY);

      if (distance > bestDistance) {
        sim.targetX = x;
        sim.targetY = y;
        bestDistance = distance;
      }

      if (awayX === undefined && distance >= farEnough) {
        break;
      }
    }

    sim.targetSince = sim.t;
  }

  /**
   * A place to rest, in whichever margin is nearer, or false if neither has
   * room for one.
   *
   * The centre always lands outside the column. On a card with margins to
   * spare the whole butterfly does, and it keeps EDGE from the card's edge. On
   * a phone the margin is narrower than half a butterfly, so it sits
   * REST_INSET outside the column with its outer wingtip a little past the
   * card's edge — never more than the quarter `contain` allows.
   */
  function pickRestSpot(body: Body): boolean {
    const sim = body.sim;
    const leftRoom = columnLeft - REST_INSET >= body.halfW * 0.5;
    const rightRoom = width - columnRight - REST_INSET >= body.halfW * 0.5;

    if (!leftRoom && !rightRoom) {
      return false;
    }

    const goLeft = leftRoom && (!rightRoom || sim.x < width / 2);
    let x: number;

    if (goLeft) {
      const outer = Math.min(EDGE + body.halfW, columnLeft - REST_INSET);
      const inner = Math.max(outer, columnLeft - body.halfW);
      x = outer + Math.random() * (inner - outer);
    } else {
      const outer = Math.max(
        width - EDGE - body.halfW,
        columnRight + REST_INSET,
      );
      const inner = Math.min(outer, columnRight + body.halfW);
      x = inner + Math.random() * (outer - inner);
    }

    /* Near its own height, so a rest is not a flight across the whole card. */
    const [, , minY, maxY] = targetBounds(body);
    sim.targetX = x;
    sim.targetY = clamp(sim.y + (Math.random() - 0.5) * 360, minY, maxY);
    sim.targetSince = sim.t;
    sim.restPending = true;
    sim.restPendingSince = sim.t;

    return true;
  }

  /** Whether its centre is over the text column. */
  function overText(sim: Sim): boolean {
    return sim.x > columnLeft && sim.x < columnRight;
  }

  /**
   * Keeps the butterfly on the band, turning it back off whichever edge it
   * met. Rare — targets are well inside — but a dash from a finger can reach
   * one. At most a quarter of it may cross the side edges, which is what lets
   * a phone's narrow margins hold a resting butterfly at all; top and bottom
   * keep all of it.
   */
  function contain(body: Body): void {
    const sim = body.sim;
    const minX = Math.min(body.halfW * 0.5, width / 2);
    const maxX = Math.max(width - body.halfW * 0.5, width / 2);
    const minY = Math.min(body.halfH, height / 2);
    const maxY = Math.max(height - body.halfH, height / 2);

    if (sim.x < minX || sim.x > maxX) {
      const inward = sim.x < minX ? 1 : -1;
      sim.x = clamp(sim.x, minX, maxX);
      if (Math.cos(sim.heading) * inward < 0) {
        sim.heading = wrapAngle(Math.PI - sim.heading);
      }
      sim.fleeX = Math.abs(sim.fleeX) * inward;
    }

    if (sim.y < minY || sim.y > maxY) {
      const inward = sim.y < minY ? 1 : -1;
      sim.y = clamp(sim.y, minY, maxY);
      if (Math.sin(sim.heading) * inward < 0) {
        sim.heading = -sim.heading;
      }
      sim.fleeY = Math.abs(sim.fleeY) * inward;
    }
  }

  /**
   * Turns a dash off whichever edge it is heading into, by `share` (1 at once,
   * less for a gradual turn): the push into the edge fades, and if nothing is
   * left to carry it, it heads for the roomier side of the other axis.
   */
  function deflect(body: Body, share: number): void {
    const sim = body.sim;

    if (
      (sim.fleeX < 0 && sim.x - body.halfW < FLEE_ROOM) ||
      (sim.fleeX > 0 && sim.x + body.halfW > width - FLEE_ROOM)
    ) {
      sim.fleeX *= 1 - share;
      if (Math.abs(sim.fleeY) < 0.5) {
        sim.fleeY += (sim.y < height / 2 ? 1 : -1) * share;
      }
    }

    if (
      (sim.fleeY < 0 && sim.y - body.halfH < FLEE_ROOM) ||
      (sim.fleeY > 0 && sim.y + body.halfH > height - FLEE_ROOM)
    ) {
      sim.fleeY *= 1 - share;
      if (Math.abs(sim.fleeX) < 0.5) {
        sim.fleeX += (sim.x < width / 2 ? 1 : -1) * share;
      }
    }

    const length = Math.hypot(sim.fleeX, sim.fleeY) || 1;
    sim.fleeX /= length;
    sim.fleeY /= length;
  }

  /** One step of the steering, `dt` seconds long, on the body's own sim. */
  function step(body: Body, dt: number): void {
    const sim = body.sim;
    sim.t += dt * 1000;

    let heading = sim.heading;
    let speed = body.cruise;
    let turn = TURN;
    let maxTurn = MAX_TURN;
    let pace = 1.6;
    const fleeing = sim.t < sim.fleeUntil;

    if (fleeing) {
      /* Holds most of the dash, then eases back to a cruise. */
      const progress = (sim.t - sim.fleeStart) / (sim.fleeUntil - sim.fleeStart);
      deflect(body, ease(10, dt));
      heading = Math.atan2(sim.fleeY, sim.fleeX);
      speed = FLEE_SPEED + (body.cruise - FLEE_SPEED) * progress * progress;
      turn = 8;
      maxTurn = 10;
      pace = 5;
    } else if (sim.t < sim.restUntil) {
      speed = 0;
      pace = 2.8;
    } else {
      if (!sim.restPending && sim.t >= sim.nextRest && !pickRestSpot(body)) {
        sim.nextRest = sim.t + between(REST_EVERY);
      }

      const distance = Math.hypot(sim.targetX - sim.x, sim.targetY - sim.y);

      if (sim.restPending) {
        /* Only once its centre is clear of the text, however close it is. */
        if (distance < REST_ARRIVE && !overText(sim)) {
          sim.restPending = false;
          sim.restUntil = sim.t + between(REST_FOR);
          sim.nextRest = sim.restUntil + between(REST_EVERY);
          /* Set now, so it leaves the margin for somewhere new afterwards. */
          pickTarget(body);
        } else if (sim.t - sim.restPendingSince > REST_PATIENCE) {
          sim.restPending = false;
          sim.nextRest = sim.t + between(REST_EVERY);
          pickTarget(body);
        } else {
          speed = body.cruise * clamp(distance / REST_SETTLE, 0.3, 1);
        }
      } else if (
        distance < ARRIVE ||
        sim.t - sim.targetSince > TARGET_PATIENCE
      ) {
        pickTarget(body);
      }

      heading = Math.atan2(sim.targetY - sim.y, sim.targetX - sim.x);
    }

    const steer = wrapAngle(heading - sim.heading) * ease(turn, dt);
    sim.heading = wrapAngle(
      sim.heading + clamp(steer, -maxTurn * dt, maxTurn * dt),
    );
    sim.speed += (speed - sim.speed) * ease(pace, dt);
    sim.x += Math.cos(sim.heading) * sim.speed * dt;
    sim.y += Math.sin(sim.heading) * sim.speed * dt;
    contain(body);

    /*
      Leans into the direction of travel rather than pointing along it: the
      photograph is a butterfly seen from above, head up, and one flying down
      the card upside down reads as falling. Straight up or down it stays
      upright; sideways it leans the full MAX_TILT.
    */
    const pace01 = Math.min(1, sim.speed / body.cruise);
    const lean = Math.cos(sim.heading) * MAX_TILT * Math.max(0.35, pace01);
    sim.tilt += (lean - sim.tilt) * ease(fleeing ? 8 : 3.5, dt);
    sim.drawnScale += (body.scale - sim.drawnScale) * ease(1.5, dt);

    const flap = clamp(
      MIN_FLAP + 0.6 * (sim.speed / body.cruise),
      MIN_FLAP,
      MAX_FLAP,
    );
    sim.flap += (flap - sim.flap) * ease(4, dt);

    const fade = overText(sim) ? TEXT_OPACITY / OPACITY : 1;
    sim.fade += (fade - sim.fade) * ease(FADE_RATE, dt);
  }

  /** The transform for the body's sim as it stands. */
  function pose(body: Body): string {
    const sim = body.sim;
    const pace01 = Math.min(1, sim.speed / body.cruise);
    /* A little rise and fall, softer while it hangs in the air. */
    const bob = Math.sin(sim.t * 0.0042 + body.phase) * BOB * (0.4 + 0.6 * pace01);
    const x = sim.x - body.layoutHalfW - body.baseX;
    const y = sim.y + bob - body.layoutHalfH - body.baseY;
    /*
      The middle span already turns it by the table's heading, and both turn
      about the same centre, so this adds only the difference.
    */
    const turn = sim.tilt - body.flyer.rotate;

    return `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${turn.toFixed(2)}deg) scale(${sim.drawnScale.toFixed(3)})`;
  }

  /** The last sample at or before flight time `at`, from the segment playing. */
  function sampleAt(body: Body, at: number): Sim {
    const index = clamp(
      Math.floor((at - body.plan[0].t) / SAMPLE_MS),
      0,
      body.plan.length - 1,
    );
    return body.plan[index];
  }

  /**
   * Simulates the next segment from `from` and hands it to the compositor.
   *
   * Started at the sample's own time, not now, so the animation opens exactly
   * where the one it replaces had got to — and created before that one is
   * cancelled, in the same task, so no frame is drawn between the two.
   */
  function plan(body: Body, from: Sim): void {
    const late = flightNow() - from.t > SAMPLE_MS;
    body.sim = { ...from, t: late ? flightNow() : from.t };

    const samples: Sim[] = [{ ...body.sim }];
    const keyframes: Keyframe[] = [
      { transform: pose(body), opacity: body.sim.fade },
    ];

    for (let index = 1; index <= SEGMENT_SAMPLES; index += 1) {
      step(body, SAMPLE_MS / 1000);

      /*
        A NaN in a keyframe throws. Nothing should produce one; if something
        does, it starts again from its place in the table.
      */
      if (!Number.isFinite(body.sim.x + body.sim.y + body.sim.speed)) {
        body.sim.x = body.baseX + body.layoutHalfW;
        body.sim.y = body.baseY + body.layoutHalfH;
        body.sim.speed = 0;
        body.sim.heading = 0;
      }

      samples.push({ ...body.sim });
      keyframes.push({ transform: pose(body), opacity: body.sim.fade });
    }

    const motion = body.node.animate(keyframes, {
      duration: SEGMENT_SAMPLES * SAMPLE_MS,
      easing: "linear",
      fill: "forwards",
    });
    motion.startTime = samples[0].t + offset;

    body.motion?.cancel();
    body.motion = motion;
    body.plan = samples;
    body.node.style.transform = "";
    body.node.style.opacity = "";
  }

  function updateFlap(body: Body, sim: Sim): void {
    if (Math.abs(sim.flap - body.appliedFlap) > 0.08) {
      setFlap(body.wing, sim.flap);
      body.appliedFlap = sim.flap;
    }
  }

  function check(): void {
    const now = flightNow();
    const due = bodies
      .filter(
        (body) =>
          body.plan.length > 0 && now - body.plan[0].t >= REPLAN_AFTER_MS,
      )
      .sort((a, b) => a.plan[0].t - b.plan[0].t)
      .slice(0, REPLANS_PER_CHECK);

    for (const body of due) {
      plan(body, sampleAt(body, now));
    }

    for (const body of bodies) {
      if (body.plan.length > 0) {
        updateFlap(body, sampleAt(body, now));
      }
    }

    timer = window.setTimeout(check, CHECK_MS);
  }

  /**
   * Where the text sits across the band: a section's box less its own padding,
   * which is what every section sets its text inside. Twenty-eight px in from
   * each side, the phone's padding, if no section can be found.
   */
  function measureColumn(): void {
    columnLeft = Math.min(28, width / 2);
    columnRight = Math.max(width - 28, width / 2);

    const section = content?.querySelector<HTMLElement>(".px-7") ?? null;
    if (section === null || width === 0) {
      return;
    }

    const bandBox = band.getBoundingClientRect();
    const box = section.getBoundingClientRect();
    const style = getComputedStyle(section);
    const scale = bandBox.width / width || 1;

    columnLeft =
      (box.left + parseFloat(style.paddingLeft) - bandBox.left) / scale;
    columnRight =
      (box.right - parseFloat(style.paddingRight) - bandBox.left) / scale;
  }

  /** Sizes, read when something resizes — never while flying. */
  function measure(): void {
    width = band.clientWidth;
    height = band.clientHeight;
    rect = null;
    measureColumn();

    /* Not laid out yet — a preview that has not been opened. Placed once it is. */
    if (width === 0 || height === 0) {
      return;
    }

    const now = flightNow();

    for (const body of bodies) {
      body.layoutHalfW = body.node.offsetWidth / 2;
      body.layoutHalfH = body.node.offsetHeight / 2;
      body.halfW = body.layoutHalfW * body.scale;
      body.halfH = body.layoutHalfH * body.scale;
      body.baseX = (body.flyer.left / 100) * width;
      body.baseY = (body.flyer.top / 100) * height;

      if (body.plan.length === 0) {
        /* Starts exactly where the server drew it, so nothing jumps. */
        body.sim.t = now;
        body.sim.x = body.baseX + body.layoutHalfW;
        body.sim.y = body.baseY + body.layoutHalfH;
        body.sim.nextRest += now;
        pickTarget(body);
      } else {
        /* While paused, body.sim is already where stop() held it. */
        if (running) {
          body.sim = { ...sampleAt(body, now) };
        }
        const [minX, maxX, minY, maxY] = targetBounds(body);
        if (
          body.sim.targetX < minX ||
          body.sim.targetX > maxX ||
          body.sim.targetY < minY ||
          body.sim.targetY > maxY
        ) {
          pickTarget(body);
        }
      }

      contain(body);

      /* The base and the bounds moved, so the segment in flight is stale. */
      if (running) {
        plan(body, body.sim);
      } else {
        body.plan = [{ ...body.sim }];
      }
    }
  }

  function start(): void {
    offset += timelineNow() - pausedAt;
    running = true;

    for (const body of bodies) {
      if (body.plan.length > 0) {
        plan(body, body.sim);
      }
    }

    timer = window.setTimeout(check, CHECK_MS);
  }

  /** Holds every butterfly where it is, and stops working anything out. */
  function stop(): void {
    const now = flightNow();
    pausedAt = timelineNow();
    running = false;
    window.clearTimeout(timer);

    for (const body of bodies) {
      if (body.plan.length === 0) {
        continue;
      }

      body.sim = { ...sampleAt(body, now) };
      body.node.style.transform = pose(body);
      body.node.style.opacity = String(body.sim.fade);
      body.motion?.cancel();
      body.motion = null;
    }
  }

  function sync(): void {
    const run = onScreen && document.visibilityState === "visible";

    if (run && !running) {
      start();
    } else if (!run && running) {
      stop();
    }
  }

  /**
   * A finger or a cursor at (clientX, clientY). Anything within SHOO_RADIUS of
   * it dashes the other way.
   *
   * The one place the band's position is read, and only when a scroll or a
   * resize has made the last reading stale. Scaled against the laid-out width
   * as well, in case the preview frame around the card is ever zoomed. Where a
   * butterfly is comes from its own plan, not from the page.
   */
  function shoo(clientX: number, clientY: number): void {
    if (!running || width === 0 || height === 0) {
      return;
    }

    if (rect === null) {
      rect = band.getBoundingClientRect();
    }

    const pointerX = (clientX - rect.left) / (rect.width / width || 1);
    const pointerY = (clientY - rect.top) / (rect.height / height || 1);
    const now = flightNow();

    for (const body of bodies) {
      if (body.plan.length === 0) {
        continue;
      }

      const sample = sampleAt(body, now);
      if (
        now < sample.fleeUntil &&
        now - sample.fleeStart < REAIM_MS
      ) {
        continue;
      }

      const dx = sample.x - pointerX;
      const dy = sample.y - pointerY;
      const distance = Math.hypot(dx, dy);
      const reach = SHOO_RADIUS + Math.max(body.halfW, body.halfH);

      if (distance > reach) {
        continue;
      }

      body.sim = { ...sample };
      const sim = body.sim;
      /* Straight away from the finger, unless that is straight into an edge. */
      sim.fleeX = distance > 0 ? dx / distance : Math.cos(sim.heading);
      sim.fleeY = distance > 0 ? dy / distance : Math.sin(sim.heading);
      deflect(body, 1);
      sim.fleeStart = sim.t;
      sim.restUntil = 0;
      if (sim.restPending) {
        sim.restPending = false;
        sim.nextRest = sim.t + between(REST_EVERY);
      }

      if (sim.t >= sim.fleeUntil) {
        sim.fleeUntil = sim.t + between(FLEE_FOR);
        /* Startled: it darts, it does not bank round. */
        sim.heading = Math.atan2(sim.fleeY, sim.fleeX);
        sim.speed = Math.max(sim.speed, FLEE_SPEED * 0.6);
        sim.flap = MAX_FLAP;
      } else {
        /* Still being chased: keep going, and keep going for longer. */
        sim.fleeUntil = Math.max(sim.fleeUntil, sim.t + FLEE_FOR[0]);
      }

      /* Where it goes once it calms down: well away from the finger. */
      pickTarget(body, pointerX, pointerY);
      plan(body, sim);
      updateFlap(body, sim);
    }
  }

  function onPointer(event: PointerEvent): void {
    shoo(event.clientX, event.clientY);
  }

  /*
    Touch as well as pointer: once a finger starts scrolling the page the
    browser cancels the pointer stream, and touchmove is what carries on
    reporting where the finger is — which is how a scroll over a butterfly
    shoos it.
  */
  function onTouch(event: TouchEvent): void {
    for (let index = 0; index < event.touches.length; index += 1) {
      const touch = event.touches[index];
      shoo(touch.clientX, touch.clientY);
    }
  }

  function staleRect(): void {
    rect = null;
  }

  const passive: AddEventListenerOptions = { passive: true };
  const passiveCapture: AddEventListenerOptions = {
    passive: true,
    capture: true,
  };

  measure();

  const resize =
    typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
  if (resize !== null) {
    resize.observe(band);
    /* A border change moves the column without resizing the band. */
    if (content !== null) {
      resize.observe(content);
    }
    for (const node of nodes) {
      resize.observe(node);
    }
  } else {
    window.addEventListener("resize", measure, passive);
  }

  const visible =
    typeof IntersectionObserver === "function"
      ? new IntersectionObserver((entries) => {
          onScreen = entries.some((entry) => entry.isIntersecting);
          sync();
        })
      : null;
  visible?.observe(band);

  window.addEventListener("pointerdown", onPointer, passive);
  window.addEventListener("pointermove", onPointer, passive);
  window.addEventListener("touchstart", onTouch, passive);
  window.addEventListener("touchmove", onTouch, passive);
  /* Capture, so a scroll inside the editor's preview frame reaches it too. */
  window.addEventListener("scroll", staleRect, passiveCapture);
  window.addEventListener("resize", staleRect, passive);
  document.addEventListener("visibilitychange", sync);

  sync();

  return () => {
    window.clearTimeout(timer);
    running = false;
    resize?.disconnect();
    visible?.disconnect();
    window.removeEventListener("resize", measure, passive);
    window.removeEventListener("pointerdown", onPointer, passive);
    window.removeEventListener("pointermove", onPointer, passive);
    window.removeEventListener("touchstart", onTouch, passive);
    window.removeEventListener("touchmove", onTouch, passive);
    window.removeEventListener("scroll", staleRect, passiveCapture);
    window.removeEventListener("resize", staleRect, passive);
    document.removeEventListener("visibilitychange", sync);

    for (const body of bodies) {
      body.motion?.cancel();
      body.node.style.transform = "";
      body.node.style.opacity = "";
      setFlap(body.wing, 1);
    }
  };
}

/**
 * Three spans per butterfly, and each one owns exactly one thing.
 *
 * The outermost is moved by the flight loop, the middle one holds the starting
 * heading and the alpha, the innermost beats its wings. The wingbeat's keyframe
 * transform would replace any transform written on the same element, so the
 * two cannot share one. The middle heading is what the server draws and what a
 * guest who asked for less movement keeps; the flight leans away from it.
 */
function Butterfly({
  flyer,
  src,
  still,
  nodeRef,
}: {
  flyer: Flyer;
  src: string;
  /** Reduced motion: no flight, and a slow wingbeat. */
  still: boolean;
  nodeRef: (node: HTMLSpanElement | null) => void;
}): ReactElement {
  const width = Math.round(flyer.size * GROW);

  const travel: CSSProperties = {
    left: `${flyer.left}%`,
    top: `${flyer.top}%`,
    willChange: still ? undefined : "transform, opacity",
  };

  const wing: CSSProperties = {
    /* The span directly around the image, so a fluid card can grow it. */
    ...artWidth(width),
    "--butterfly-width": String(flyer.size),
    animationName: "lifafa-butterfly-wing",
    animationDuration: `${still ? flyer.wing * REDUCED_WING_SLOWDOWN : flyer.wing}s`,
    /*
      Offset per butterfly. Two that happen to start together would otherwise
      beat together for as long as they are both on the card.
    */
    animationDelay: `${flyer.delay * 0.6}s`,
    animationTimingFunction: "ease-in-out",
    animationIterationCount: "infinite",
    animationFillMode: "both",
  } as CSSProperties;

  return (
    <span ref={nodeRef} className="absolute block" style={travel}>
      <span
        className="block"
        style={{ opacity: OPACITY, transform: `rotate(${flyer.rotate}deg)` }}
      >
        <span
          data-wing=""
          className="lifafa-card-art lifafa-butterfly-art block"
          style={wing}
        >
          <img
            src={src}
            alt=""
            aria-hidden="true"
            decoding="async"
            width={width}
            height={Math.round(width / BUTTERFLY_ASPECT)}
            className="block max-w-none select-none"
            style={{ filter: SHADOW }}
          />
        </span>
      </span>
    </span>
  );
}

/**
 * A leaf, built the way a butterfly is and for the same reason.
 *
 * Three spans: the outer drifts, the middle holds the heading and the alpha,
 * the inner turns. An animation's transform replaces the element's own, so the
 * three cannot share one element. Hidden outright under reduced motion — a
 * leaf is nothing but its drift.
 */
function Leaf({ drifter }: { drifter: Drifter }): ReactElement {
  const travel: CSSProperties = {
    left: `${drifter.left}%`,
    top: `${drifter.top}%`,
    animationName: `lifafa-leaf-${drifter.path}`,
    animationDuration: `${drifter.travel}s`,
    animationDelay: `${drifter.delay}s`,
    animationTimingFunction: "ease-in-out",
    animationIterationCount: "infinite",
    animationFillMode: "both",
  };

  const turn: CSSProperties = {
    animationName: "lifafa-leaf-turn",
    animationDuration: `${drifter.turn}s`,
    /* Offset against the drift, so a leaf does not turn on the same beat it sways. */
    animationDelay: `${drifter.delay * 0.45}s`,
    animationTimingFunction: "ease-in-out",
    animationIterationCount: "infinite",
    animationFillMode: "both",
  };

  return (
    <span className="absolute block motion-reduce:hidden" style={travel}>
      <span
        className="block"
        style={{ opacity: OPACITY, transform: `rotate(${drifter.rotate}deg)` }}
      >
        <span className="block" style={turn}>
          <img
            src={LEAF_SRC}
            alt=""
            aria-hidden="true"
            decoding="async"
            width={drifter.size}
            height={Math.round(drifter.size / LEAF_ASPECT)}
            className="block max-w-none select-none"
            style={{ filter: SHADOW }}
          />
        </span>
      </span>
    </span>
  );
}

export default function ButterflyLayer({
  style,
  leaves,
  intensity,
  bandHeight,
}: {
  /**
   * Which butterflies the host picked, or "none" on a card that carries only
   * leaves. The canvas does not mount this layer when both are off.
   */
  style: ButterflyStyle;
  /** Whether leaves drift with them, or on their own. */
  leaves: boolean;
  /** How many fly — the host's existing "Amount", read rather than duplicated. */
  intensity: DecorIntensity;
  /**
   * How tall the sticky band is, exactly as DecorLayer takes it: the guest's
   * screen, or the editor's fixed frame.
   */
  bandHeight: string;
}): ReactElement {
  const prefersReducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const bandRef = useRef<HTMLDivElement>(null);
  const flyerNodes = useRef<(HTMLSpanElement | null)[]>([]);

  const sources = style === "none" ? [] : butterflySources(style);
  const flyerCount = style === "none" ? 0 : COUNT[intensity];
  const leafCount = leaves ? LEAF_COUNT[intensity] : 0;

  /*
    Keyed on the count and the motion preference only. A change of colour swaps
    each image's src and leaves every butterfly exactly where it is in the air.
  */
  useEffect(() => {
    const band = bandRef.current;
    /*
      The query read directly as well as through the hook, whose first render
      is always the server's `false` — without it a guest who asked for less
      movement would see a frame or two of flight before the re-render.
    */
    const reduced =
      prefersReducedMotion ||
      (typeof window.matchMedia === "function" &&
        window.matchMedia(REDUCED_MOTION_QUERY).matches);

    if (reduced || flyerCount === 0 || band === null) {
      return;
    }

    const nodes = flyerNodes.current
      .slice(0, flyerCount)
      .filter((node): node is HTMLSpanElement => node !== null);

    return startFlight(band, nodes, FLYERS);
  }, [prefersReducedMotion, flyerCount]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[17] overflow-clip"
    >
      <div
        ref={bandRef}
        className="sticky top-0 w-full overflow-clip"
        style={{ height: bandHeight }}
      >
        {FLYERS.slice(0, flyerCount).map((flyer, index) => (
          <Butterfly
            key={`${flyer.left}-${flyer.top}`}
            flyer={flyer}
            /*
              Cycled by position rather than authored per flyer, the way
              DecorLayer cycles its motifs and its rotations — and the same
              cycle covers both cases, because a single colour arrives as a list
              of one and every place lands on it.
            */
            src={sources[index % sources.length]}
            still={prefersReducedMotion}
            nodeRef={(node) => {
              flyerNodes.current[index] = node;
            }}
          />
        ))}

        {LEAVES.slice(0, leafCount).map((drifter) => (
          <Leaf key={`leaf-${drifter.left}-${drifter.top}`} drifter={drifter} />
        ))}
      </div>
    </div>
  );
}
