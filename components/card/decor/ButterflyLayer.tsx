"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties, ReactElement } from "react";
import { useFloatingPause } from "@/hooks/useFloatingPause";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  fireflyGlow,
  flyingPieces,
  naturePiece,
  type FlyingPiece,
  type NaturePiece,
} from "@/lib/butterflies";
import { artWidth } from "@/lib/cardScale";
import type {
  ButterflyStyle,
  DecorIntensity,
  FlyingKind,
  NatureKind,
} from "@/types/card";

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
 * ALWAYS SOLID, AND NEVER LEFT ON THE WRITING. A butterfly is drawn at full
 * strength wherever it is — it used to fade over the text column, which made
 * it a smudge on the names rather than a butterfly near them. What keeps the
 * card readable now is that it does not stay: it only ever rests in a margin,
 * it does not choose a line of text to fly to, and one that drifts onto the
 * writing anyway flies off the card by itself a moment later, slowly, and
 * comes back in from the edge once it has gone. A guest who taps one, or
 * reaches for it, sends it off the same way. The layer is still `z-[17]`,
 * above the border frame, because anywhere below that a photographic border
 * swallows them.
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
 *
 * NOT ONLY BUTTERFLIES ANY MORE. A card flies one kind: butterflies,
 * lovebirds, dragonflies or hearts. They are all flown by the one flight
 * below, from the same table, in the same numbers, and all leave for a
 * finger the same way; what differs between them is a `Manner`, a handful of
 * numbers the steering reads, so a new kind is no new work for the main
 * thread. See MANNERS.
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

/** The table without its headings, for a kind that is drawn level. See Manner. */
const LEVEL_FLYERS: readonly Flyer[] = FLYERS.map((flyer) => ({
  ...flyer,
  rotate: 0,
}));

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
 * The leaves are held below full, so one crossing the frame or a scattered
 * motif reads as being in the same picture rather than pasted on top of it.
 * The butterflies are not: they are fully opaque at all times.
 */
const LEAF_OPACITY = 0.9;

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
/** A pointer inside this distance of a butterfly's edge sends it off. */
const SHOO_RADIUS = 70;
/**
 * Flying away: off the card altogether, slowly, when a guest taps or reaches
 * for it, or when it has drifted onto the writing.
 *
 * LEAVE_FOR is how long it takes to be out of sight. It follows one soft curve
 * to the nearest edge on an ease-out — away at once, then slower and slower —
 * and the curve runs on a little past the edge, so the slowest stretch of it
 * is spent out of sight rather than half way off the card: it is out of sight
 * at LEAVE_HIDDEN_AT of the whole flight, having covered LEAVE_HIDDEN_SHARE of
 * the curve, which is what an ease-out quad makes of that moment.
 */
const LEAVE_FOR: readonly [number, number] = [2500, 3500];
const LEAVE_HIDDEN_AT = 0.8;
const LEAVE_HIDDEN_SHARE = 1 - (1 - LEAVE_HIDDEN_AT) ** 2;
/** How far the curve bows off the straight line, as a share of it, and its limits in px. */
const LEAVE_BOW = 0.3;
const LEAVE_BOW_RANGE: readonly [number, number] = [30, 120];
/** How far up the card it climbs on its way out of a side, in px. */
const LEAVE_RISE: readonly [number, number] = [60, 160];
/** The wingbeat while it leaves: slow, unhurried strokes. */
const LEAVE_FLAP = 0.6;
/** How long it is gone before it comes back in over the same edge. */
const AWAY_FOR: readonly [number, number] = [1500, 4000];
/**
 * How long it may be over a line of text before it leaves by itself. Long
 * enough that clipping the corner of a word on the way past is not a reason to
 * go; short enough that nobody has to wait to read what is under it.
 */
const LINGER_MS = 600;
/**
 * How much of a wing may overlap a line before it counts as being on it, as a
 * share of the butterfly's half size added round every line.
 */
const TEXT_REACH = 0.6;
/**
 * How long the page has to hold still after a scroll before the text is
 * measured again. Never measured while it is moving: see `measureText`.
 */
const TEXT_SETTLE_MS = 200;
/** How far it leans into a turn, in degrees, at full sideways travel. */
const MAX_TILT = 32;
/** The gentle rise and fall on top of the path, in px. */
const BOB = 3;
/** Wingbeat playback rate: slow while resting, and never faster than this. */
const MIN_FLAP = 0.42;
const MAX_FLAP = 1.6;

/**
 * How a kind carries itself: the numbers the one flight reads to fly it.
 *
 * Everything a kind does differently is here and is arithmetic inside the
 * same simulated step, played by the compositor as the same keyframed
 * transform. Nothing here adds a timer, a listener or a frame loop.
 */
interface Manner {
  /** Its cruising speed, as a share of a butterfly's. */
  cruise: number;
  /** How eagerly it turns, the most it may turn in a second, and how quickly it picks up speed. */
  turn: number;
  maxTurn: number;
  pace: number;
  /** How far it leans, in degrees, and how far it rises and falls on its way, in px. */
  maxTilt: number;
  bob: number;
  /** The keyframes its wings beat to, and how long a beat is as a share of the table's. Null: no beat. */
  wing: string | null;
  wingBeat: number;
  /**
   * Seen from the side: it faces the way it is going, mirrored when that is
   * left, and its lean is its nose rising or dipping, not a bank.
   */
  faces: boolean;
  /** Drawn level, without the table's starting heading: a bird or a heart at a tilt is falling. */
  level: boolean;
  /** Flies in short hops of this length in px, and hangs in the air this long in ms after each. */
  hops: readonly [number, number] | null;
  pause: readonly [number, number] | null;
  /** Goes to a margin every so often and rests there, as a butterfly does. */
  rests: boolean;
  /** Does not roam: it rises up a margin, swaying, fades out at the top and in again at the foot. */
  rises: boolean;
}

/**
 * BUTTERFLIES are the flight as it always was: every number here is the
 * constant it used to be.
 *
 * LOVEBIRDS are seen from the side with their wings spread, so there is no
 * beat to give them. They glide: a little slower, wider turns, a longer rise
 * and fall, the nose up a few degrees on a climb and down on a descent, and
 * always facing the way they are going. They do not hang in a margin; a bird
 * with its wings out, stopped in the air, has been pinned there.
 *
 * DRAGONFLIES are seen from above, as the butterflies are. They dart: a short
 * straight hop at nearly twice a butterfly's speed, a sharp turn, and then
 * they hang where they have stopped for a moment with the wings shimmering,
 * unless that is on a line of writing, where they do not stop.
 *
 * HEARTS do not fly anywhere. Each goes up its own side of the card, slowly,
 * swaying, turning a little with the sway, and is faded out as it nears the
 * top and in again at the foot. Up a margin, so they are never on the writing.
 */
const MANNERS: Record<"butterflies" | "lovebirds" | "dragonflies" | "hearts", Manner> = {
  butterflies: {
    cruise: 1,
    turn: TURN,
    maxTurn: MAX_TURN,
    pace: 1.6,
    maxTilt: MAX_TILT,
    bob: BOB,
    wing: "lifafa-butterfly-wing",
    wingBeat: 1,
    faces: false,
    level: false,
    hops: null,
    pause: null,
    rests: true,
    rises: false,
  },
  lovebirds: {
    cruise: 0.82,
    turn: 1,
    maxTurn: 1.2,
    pace: 1.2,
    maxTilt: 11,
    bob: 5,
    wing: null,
    wingBeat: 1,
    faces: true,
    level: true,
    hops: null,
    pause: null,
    rests: false,
    rises: false,
  },
  dragonflies: {
    cruise: 1.8,
    turn: 5,
    maxTurn: 5.5,
    pace: 6,
    maxTilt: 46,
    bob: 1.5,
    wing: "lifafa-dragonfly-wing",
    wingBeat: 0.2,
    faces: false,
    level: false,
    hops: [70, 170],
    pause: [500, 1300],
    rests: false,
    rises: false,
  },
  hearts: {
    cruise: 0.42,
    turn: 1,
    maxTurn: 1,
    pace: 1,
    maxTilt: 10,
    bob: 0,
    wing: null,
    wingBeat: 1,
    faces: false,
    level: true,
    hops: null,
    pause: null,
    rests: false,
    rises: true,
  },
};

/**
 * FIREFLIES are not in this table, because they are not flown at all. See
 * FIREFLIES below: they are points of light on short loops of their own.
 */

/** A kind this build cannot fly yet is flown as butterflies; see `flyingKind`. */
function mannerOf(kind: FlyingKind): Manner {
  return kind === "lovebirds" || kind === "dragonflies" || kind === "hearts"
    ? MANNERS[kind]
    : MANNERS.butterflies;
}

/** How far a rising heart sways either side of its line, at most, in px. */
const RISE_SWAY = 20;
/** The shares of the band's height it is faded in over at the foot, and out over at the top. */
const RISE_FADE_IN = 0.14;
const RISE_FADE_OUT = 0.2;

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
 *
 * TRANSFORM ONLY. The keyframes carry nothing else, so every frame of a flight,
 * a rest and a slow exit alike is the compositor moving a layer it already has.
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
  /** Since when it has been over a line of text, or 0 while it is not. */
  overSince: number;
  /**
   * Flying away. `leaveUntil` is 0 on a butterfly that never has; the curve is
   * from where it was, round `leaveVia`, to `leaveTo`, which is past the edge.
   */
  leaveStart: number;
  leaveUntil: number;
  leaveFromX: number;
  leaveFromY: number;
  leaveViaX: number;
  leaveViaY: number;
  leaveToX: number;
  leaveToY: number;
  /** The edge it left over, and comes back in over. */
  leaveEdge: Edge;
  /** Off the card: leaving, or gone and waiting out `awayUntil`. */
  gone: boolean;
  awayUntil: number;
  /** On its way back in, and not yet far enough in to be kept in. */
  entering: boolean;
  /**
   * For a kind seen from the side: 1 facing right, -1 facing left, and on its
   * way between the two for the quarter second a turn takes. `faceTo` is
   * which it is turning to.
   */
  face: number;
  faceTo: number;
  /** How solid it is drawn. 1 always, but for a kind that rises and fades. */
  alpha: number;
}

type Edge = "left" | "right" | "top";

/** A line of text on the band, in band px: left, top, right, bottom. */
type TextBox = readonly [number, number, number, number];

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
  /** The text under it was measured again, so its segment is planned on old news. */
  stale: boolean;
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
  manner: Manner,
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
  /*
    Where the writing is on the band right now, line by line, and whether that
    is known: it is not while the page is scrolling, and nothing leaves on
    account of text it cannot place.
  */
  let textBoxes: TextBox[] = [];
  let textKnown = false;
  let scrolledAt = 0;
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
      cruise: CRUISE * manner.cruise * (0.85 + Math.random() * 0.3),
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
        overSince: 0,
        leaveStart: 0,
        leaveUntil: 0,
        leaveFromX: 0,
        leaveFromY: 0,
        leaveViaX: 0,
        leaveViaY: 0,
        leaveToX: 0,
        leaveToY: 0,
        leaveEdge: "left",
        gone: false,
        awayUntil: 0,
        entering: false,
        face: 1,
        faceTo: 1,
        alpha: 1,
      },
      plan: [],
      motion: null,
      appliedFlap: 1,
      stale: false,
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
   * flight, so it takes the first that is a fair way off. And never a line of
   * text, where it would only have to leave again: a draw that lands on one is
   * passed over, unless every draw does.
   */
  function pickTarget(body: Body): void {
    const sim = body.sim;
    const [minX, maxX, minY, maxY] = targetBounds(body);
    const hops = manner.hops;
    const farEnough =
      hops === null ? Math.min(width, height) * 0.35 : hops[0] * 0.8;
    let bestDistance = -1;
    let bestClear = false;

    for (let draw = 0; draw < 8; draw += 1) {
      let x = minX + Math.random() * (maxX - minX);
      let y = minY + Math.random() * (maxY - minY);

      /* A hop: any direction, a short way off, and still on the band. */
      if (hops !== null) {
        const angle = Math.random() * Math.PI * 2;
        const reach = between(hops);
        x = clamp(sim.x + Math.cos(angle) * reach, minX, maxX);
        y = clamp(sim.y + Math.sin(angle) * reach, minY, maxY);
      }

      const distance = Math.hypot(x - sim.x, y - sim.y);
      const clear = !onText(body, x, y);

      /* A clear draw beats any that is not; between two alike, the further. */
      if (
        bestDistance < 0 ||
        (clear && !bestClear) ||
        (clear === bestClear && distance > bestDistance)
      ) {
        sim.targetX = x;
        sim.targetY = y;
        bestDistance = distance;
        bestClear = clear;
      }

      if (bestClear && bestDistance >= farEnough) {
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
  function overColumn(sim: Sim): boolean {
    return sim.x > columnLeft && sim.x < columnRight;
  }

  /**
   * Whether a butterfly centred on (x, y) would be on a line of text: within
   * TEXT_REACH of its own half size of one. Arithmetic on boxes measured
   * earlier, so it is free to ask from inside the simulation.
   */
  function onText(body: Body, x: number, y: number): boolean {
    if (!textKnown) {
      return false;
    }

    const reachX = body.halfW * TEXT_REACH;
    const reachY = body.halfH * TEXT_REACH;

    for (const [left, top, right, bottom] of textBoxes) {
      if (
        x > left - reachX &&
        x < right + reachX &&
        y > top - reachY &&
        y < bottom + reachY
      ) {
        return true;
      }
    }

    return false;
  }

  /** How far past an edge its centre has to be for none of it to show, at any lean. */
  function hiddenReach(body: Body): number {
    return Math.hypot(body.halfW, body.halfH) + 4;
  }

  /**
   * Sends it off the card: one slow curve to an edge, and out of sight.
   *
   * The nearest of the two sides and the top, so it is never asked to cross
   * the whole card to go. Given a finger to get away from, the nearest that is
   * not back past the finger. Out of a side it climbs as it goes, the way a
   * butterfly leaves a flower; out of the top it drifts a little to one side.
   * The curve bows off the straight line between the two, upward where it can.
   */
  function beginLeave(body: Body, awayX?: number, awayY?: number): void {
    const sim = body.sim;
    const reach = hiddenReach(body);
    const rise = between(LEAVE_RISE);

    const exits: { edge: Edge; x: number; y: number }[] = [
      { edge: "left", x: -reach, y: sim.y - rise },
      { edge: "right", x: width + reach, y: sim.y - rise },
      {
        edge: "top",
        x: clamp(sim.x + (Math.random() - 0.5) * 160, 0, width),
        y: -reach,
      },
    ];
    exits.sort(
      (a, b) =>
        Math.hypot(a.x - sim.x, a.y - sim.y) -
        Math.hypot(b.x - sim.x, b.y - sim.y),
    );

    const exit =
      awayX === undefined || awayY === undefined
        ? exits[0]
        : (exits.find(
            (option) =>
              (option.x - sim.x) * (sim.x - awayX) +
                (option.y - sim.y) * (sim.y - awayY) >=
              0,
          ) ?? exits[0]);

    /* Run on past the edge, so it is out of sight before the curve's slow end. */
    const toX = sim.x + (exit.x - sim.x) / LEAVE_HIDDEN_SHARE;
    const toY = sim.y + (exit.y - sim.y) / LEAVE_HIDDEN_SHARE;
    const length = Math.hypot(toX - sim.x, toY - sim.y) || 1;
    const bow = clamp(length * LEAVE_BOW, LEAVE_BOW_RANGE[0], LEAVE_BOW_RANGE[1]);
    /* The normal to the line, turned to point up the card; either way for a line straight up. */
    let normalX = -(toY - sim.y) / length;
    let normalY = (toX - sim.x) / length;
    if (normalY > 0 || (Math.abs(normalY) < 0.05 && Math.random() < 0.5)) {
      normalX = -normalX;
      normalY = -normalY;
    }

    sim.leaveFromX = sim.x;
    sim.leaveFromY = sim.y;
    sim.leaveViaX = (sim.x + toX) / 2 + normalX * bow;
    sim.leaveViaY = (sim.y + toY) / 2 + normalY * bow;
    sim.leaveToX = toX;
    sim.leaveToY = toY;
    sim.leaveEdge = exit.edge;
    sim.leaveStart = sim.t;
    sim.leaveUntil = sim.t + between(LEAVE_FOR) / LEAVE_HIDDEN_AT;
    sim.awayUntil = sim.leaveUntil + between(AWAY_FOR);
    sim.gone = true;
    sim.entering = false;
    sim.overSince = 0;
    sim.restUntil = 0;
    sim.restPending = false;
  }

  /**
   * Brings it back in over the edge it left by, somewhere new along it.
   *
   * Placed while it is still out of sight, so the move to its new place along
   * the edge is never drawn. Over the top it comes back above a margin, not
   * above the writing.
   */
  function comeBack(body: Body): void {
    const sim = body.sim;
    const reach = hiddenReach(body);
    const [minX, maxX, minY, maxY] = targetBounds(body);

    /* One that rises comes back the way it always arrives: from under the foot of its line. */
    if (manner.rises) {
      sim.x = riseLine(body);
      sim.y = height + reach;
      sim.heading = -Math.PI / 2;
      sim.speed = body.cruise;
      sim.gone = false;
      sim.entering = false;
      sim.overSince = 0;
      return;
    }

    if (sim.leaveEdge === "top") {
      sim.x =
        Math.random() < 0.5
          ? clamp(columnLeft - body.halfW, minX, maxX)
          : clamp(columnRight + body.halfW, minX, maxX);
      sim.y = -reach;
      sim.heading = Math.PI / 2;
    } else {
      sim.x = sim.leaveEdge === "left" ? -reach : width + reach;
      sim.y = minY + Math.random() * (maxY - minY);
      sim.heading = sim.leaveEdge === "left" ? 0 : Math.PI;
    }

    sim.speed = body.cruise;
    sim.gone = false;
    sim.entering = true;
    sim.overSince = 0;
    sim.nextRest = sim.t + between(REST_EVERY);
    pickTarget(body);
  }

  /**
   * The line a rising heart goes up: the middle of the margin on its own side
   * of the card. Where the margin is narrower than the heart and its sway, a
   * phone's, the line is far enough in that the outward swing still leaves
   * all but a sliver of it on the card. Arithmetic on sizes already measured.
   */
  function riseLine(body: Body): number {
    const onLeft = body.flyer.left < 50;
    const room = onLeft ? columnLeft : width - columnRight;
    const inset = Math.max(body.halfW + riseSway(body) - 2, room / 2);

    return onLeft ? inset : width - inset;
  }

  /** How far it sways either side of that line: a quarter of its margin, within reason. */
  function riseSway(body: Body): number {
    const room = body.flyer.left < 50 ? columnLeft : width - columnRight;

    return clamp(room / 4, 4, RISE_SWAY);
  }

  /**
   * One step of a rise: up at its own slow pace, swaying about its line, and
   * back under the foot of the band once it is over the top. That jump is the
   * height of the band in one sample, and is not seen: it is fully faded at
   * both ends of it, see `fade`.
   */
  function stepRise(body: Body, dt: number): void {
    const sim = body.sim;
    const sway = riseSway(body);
    const swing = sim.t * 0.0011 + body.phase;
    const wantX = riseLine(body) + Math.sin(swing) * sway;
    const reach = hiddenReach(body);

    sim.x += (wantX - sim.x) * ease(1.4, dt);
    sim.y -= body.cruise * dt;
    sim.speed = body.cruise;
    sim.heading = -Math.PI / 2;

    if (sim.y < -reach) {
      sim.y = height + reach;
    }
  }

  /** How solid a rising heart is at its height: nothing at the foot and at the top, whole between. */
  function fade(sim: Sim): number {
    if (height === 0) {
      return 1;
    }

    return clamp(
      Math.min(
        (height - sim.y) / (height * RISE_FADE_IN),
        sim.y / (height * RISE_FADE_OUT),
      ),
      0,
      1,
    );
  }

  /**
   * Keeps the butterfly on the band, turning it back off whichever edge it
   * met. Rare — targets are well inside. At most a quarter of it may cross the
   * side edges, which is what lets a phone's narrow margins hold a resting
   * butterfly at all; top and bottom keep all of it.
   *
   * Not one that has left the card, which is past the edge on purpose, and not
   * one on its way back until it is far enough in to be kept in.
   */
  function contain(body: Body): void {
    const sim = body.sim;
    const minX = Math.min(body.halfW * 0.5, width / 2);
    const maxX = Math.max(width - body.halfW * 0.5, width / 2);
    const minY = Math.min(body.halfH, height / 2);
    const maxY = Math.max(height - body.halfH, height / 2);

    /* Nor one that rises, which comes in under the foot and goes out over the top. */
    if (sim.gone || manner.rises) {
      return;
    }

    if (sim.entering) {
      if (sim.x < minX || sim.x > maxX || sim.y < minY) {
        return;
      }

      sim.entering = false;
    }

    if (sim.x < minX || sim.x > maxX) {
      const inward = sim.x < minX ? 1 : -1;
      sim.x = clamp(sim.x, minX, maxX);
      if (Math.cos(sim.heading) * inward < 0) {
        sim.heading = wrapAngle(Math.PI - sim.heading);
      }
    }

    if (sim.y < minY || sim.y > maxY) {
      const inward = sim.y < minY ? 1 : -1;
      sim.y = clamp(sim.y, minY, maxY);
      if (Math.sin(sim.heading) * inward < 0) {
        sim.heading = -sim.heading;
      }
    }
  }

  /**
   * One step of a flight off the card: its place on the curve at this moment,
   * on an ease-out, and its heading and speed read back off the move it made.
   * Once the curve is done it waits where it ended, out of sight.
   */
  function stepAway(body: Body, dt: number): void {
    const sim = body.sim;

    if (sim.t >= sim.leaveUntil) {
      sim.speed = 0;
      return;
    }

    const share = clamp(
      (sim.t - sim.leaveStart) / (sim.leaveUntil - sim.leaveStart),
      0,
      1,
    );
    const along = 1 - (1 - share) * (1 - share);
    const rest = 1 - along;
    const x =
      rest * rest * sim.leaveFromX +
      2 * rest * along * sim.leaveViaX +
      along * along * sim.leaveToX;
    const y =
      rest * rest * sim.leaveFromY +
      2 * rest * along * sim.leaveViaY +
      along * along * sim.leaveToY;
    const moved = Math.hypot(x - sim.x, y - sim.y);

    if (moved > 0.01) {
      /* Banked round to the curve rather than snapped onto it. */
      sim.heading = wrapAngle(
        sim.heading +
          wrapAngle(Math.atan2(y - sim.y, x - sim.x) - sim.heading) *
            ease(6, dt),
      );
    }

    sim.speed = moved / dt;
    sim.x = x;
    sim.y = y;
  }

  /** One step of the steering, `dt` seconds long, on the body's own sim. */
  function step(body: Body, dt: number): void {
    const sim = body.sim;
    sim.t += dt * 1000;

    if (sim.gone && sim.t >= sim.awayUntil) {
      comeBack(body);
    }

    if (sim.gone) {
      stepAway(body, dt);
    } else if (manner.rises) {
      stepRise(body, dt);
    } else {
      let heading = sim.heading;
      let speed = body.cruise;
      let pace = manner.pace;

      if (sim.t < sim.restUntil) {
        speed = 0;
        pace = manner.pace * 1.75;
      } else {
        if (
          manner.rests &&
          !sim.restPending &&
          !sim.entering &&
          sim.t >= sim.nextRest &&
          !pickRestSpot(body)
        ) {
          sim.nextRest = sim.t + between(REST_EVERY);
        }

        const distance = Math.hypot(sim.targetX - sim.x, sim.targetY - sim.y);

        if (sim.restPending) {
          /* Only once its centre is clear of the text, however close it is. */
          if (distance < REST_ARRIVE && !overColumn(sim)) {
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
          /* The end of a hop: it hangs there a moment, unless there is on the writing. */
          if (manner.pause !== null && !onText(body, sim.x, sim.y)) {
            sim.restUntil = sim.t + between(manner.pause);
          }
          pickTarget(body);
        }

        heading = Math.atan2(sim.targetY - sim.y, sim.targetX - sim.x);
      }

      const steer = wrapAngle(heading - sim.heading) * ease(manner.turn, dt);
      sim.heading = wrapAngle(
        sim.heading + clamp(steer, -manner.maxTurn * dt, manner.maxTurn * dt),
      );
      sim.speed += (speed - sim.speed) * ease(pace, dt);
      sim.x += Math.cos(sim.heading) * sim.speed * dt;
      sim.y += Math.sin(sim.heading) * sim.speed * dt;
      contain(body);

      /*
        On the writing, flying or hanging in the air: given LINGER_MS to be on
        its way past, and then it goes. Not while it is still coming in over
        the edge, which is a margin.
      */
      if (!sim.entering && onText(body, sim.x, sim.y)) {
        if (sim.overSince === 0) {
          sim.overSince = sim.t;
        } else if (sim.t - sim.overSince >= LINGER_MS) {
          beginLeave(body);
        }
      } else {
        sim.overSince = 0;
      }
    }

    /*
      Leans into the direction of travel rather than pointing along it: the
      photograph is a butterfly seen from above, head up, and one flying down
      the card upside down reads as falling. Straight up or down it stays
      upright; sideways it leans the full MAX_TILT.
    */
    const pace01 = Math.min(1, sim.speed / body.cruise);
    let lean = Math.cos(sim.heading) * manner.maxTilt * Math.max(0.35, pace01);

    if (manner.faces) {
      /*
        Turned to face the way it is going, once it is clearly going that way:
        straight up or down it keeps the side it had, so it does not flicker.
        Its lean is its nose, up on a climb and down on a descent, and the
        mirror turns that with it.
      */
      const across = Math.cos(sim.heading);
      if (Math.abs(across) > 0.25) {
        sim.faceTo = across > 0 ? 1 : -1;
      }
      sim.face += (sim.faceTo - sim.face) * ease(7, dt);
      lean = Math.sin(sim.heading) * manner.maxTilt * sim.faceTo * pace01;
    } else if (manner.rises) {
      /* A gentle turn with the sway, a quarter of a swing ahead of it. */
      lean = Math.cos(sim.t * 0.0011 + body.phase) * manner.maxTilt;
    }

    sim.tilt += (lean - sim.tilt) * ease(3.5, dt);
    sim.alpha = manner.rises && !sim.gone ? fade(sim) : 1;
    sim.drawnScale += (body.scale - sim.drawnScale) * ease(1.5, dt);

    /* Slow, even strokes on the way off the card, however fast it is going. */
    const flap = sim.gone
      ? LEAVE_FLAP
      : clamp(MIN_FLAP + 0.6 * (sim.speed / body.cruise), MIN_FLAP, MAX_FLAP);
    sim.flap += (flap - sim.flap) * ease(4, dt);
  }

  /** The transform for the body's sim as it stands. */
  function pose(body: Body): string {
    const sim = body.sim;
    const pace01 = Math.min(1, sim.speed / body.cruise);
    /* A little rise and fall, softer while it hangs in the air. */
    const bob =
      Math.sin(sim.t * 0.0042 + body.phase) * manner.bob * (0.4 + 0.6 * pace01);
    const x = sim.x - body.layoutHalfW - body.baseX;
    const y = sim.y + bob - body.layoutHalfH - body.baseY;
    /*
      The middle span already turns it by the table's heading, and both turn
      about the same centre, so this adds only the difference.
    */
    const turn = sim.tilt - body.flyer.rotate;

    /* The mirror is innermost, so the lean above is applied to the bird as it faces. */
    const mirror = manner.faces ? ` scaleX(${sim.face.toFixed(3)})` : "";

    return `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${turn.toFixed(2)}deg) scale(${sim.drawnScale.toFixed(3)})${mirror}`;
  }

  /**
   * One keyframe: the transform, and for a kind that fades its opacity too.
   * Those two and nothing else, so every frame is still the compositor's.
   */
  function frame(body: Body): Keyframe {
    return manner.rises
      ? { transform: pose(body), opacity: body.sim.alpha.toFixed(3) }
      : { transform: pose(body) };
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
    const keyframes: Keyframe[] = [frame(body)];

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
      keyframes.push(frame(body));
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
    body.stale = false;
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
    /*
      The page has held still since the last scroll, so the writing is where it
      is going to be read: measured once, here, and every flight planned before
      it is planned again, a couple at a time like any other.
    */
    if (!textKnown && performance.now() - scrolledAt >= TEXT_SETTLE_MS) {
      measureText();
      for (const body of bodies) {
        body.stale = true;
      }
    }

    const now = flightNow();
    const due = bodies
      .filter(
        (body) =>
          body.plan.length > 0 &&
          (body.stale || now - body.plan[0].t >= REPLAN_AFTER_MS),
      )
      .sort(
        (a, b) =>
          Number(b.stale) - Number(a.stale) || a.plan[0].t - b.plan[0].t,
      )
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

  /**
   * Where each line of text sits on the band, as it is drawn.
   *
   * A range over each run of text, which reports the ink and not the box it
   * was set in: a short name centred in a full-width line is as wide as the
   * name. Only the sections that are on screen are walked. The band is pinned
   * and the card scrolls under it, so this is true until the next scroll and
   * no longer — it is taken again once the page has held still (see `check`),
   * and when something resizes, and never from inside a flight.
   */
  function measureText(): void {
    textBoxes = [];
    textKnown = true;

    if (content === null || width === 0 || height === 0) {
      return;
    }

    const bandBox = band.getBoundingClientRect();
    const scale = bandBox.width / width || 1;
    const range = document.createRange();

    for (const section of Array.from(content.children)) {
      const box = section.getBoundingClientRect();
      if (box.bottom < bandBox.top || box.top > bandBox.bottom) {
        continue;
      }

      const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);

      for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        /* A line kept for screen readers alone is not drawn. */
        if (
          (node.textContent ?? "").trim().length === 0 ||
          node.parentElement?.closest(".sr-only") != null
        ) {
          continue;
        }

        range.selectNodeContents(node);
        const ink = range.getBoundingClientRect();

        if (
          ink.width < 1 ||
          ink.height < 1 ||
          ink.bottom < bandBox.top ||
          ink.top > bandBox.bottom
        ) {
          continue;
        }

        textBoxes.push([
          (ink.left - bandBox.left) / scale,
          (ink.top - bandBox.top) / scale,
          (ink.right - bandBox.left) / scale,
          (ink.bottom - bandBox.top) / scale,
        ]);
      }
    }
  }

  /** Sizes, read when something resizes — never while flying. */
  function measure(): void {
    width = band.clientWidth;
    height = band.clientHeight;
    rect = null;
    measureColumn();
    measureText();

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
      if (manner.rises) {
        body.node.style.opacity = body.sim.alpha.toFixed(3);
      }
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
   * it flies off the card, slowly, the way one that has drifted onto the
   * writing does — see `beginLeave`. One already on its way is left to go.
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
      if (sample.gone) {
        continue;
      }

      const distance = Math.hypot(sample.x - pointerX, sample.y - pointerY);
      const reach = SHOO_RADIUS + Math.max(body.halfW, body.halfH);

      if (distance > reach) {
        continue;
      }

      body.sim = { ...sample };
      beginLeave(body, pointerX, pointerY);
      plan(body, body.sim);
      updateFlap(body, body.sim);
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

  /* A scroll moves the band on the page and the writing under the band. */
  function staleRect(): void {
    rect = null;
    textKnown = false;
    scrolledAt = performance.now();
  }

  function staleBand(): void {
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
  window.addEventListener("resize", staleBand, passive);
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
    window.removeEventListener("resize", staleBand, passive);
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
 * heading, the innermost beats its wings. The wingbeat's keyframe
 * transform would replace any transform written on the same element, so the
 * two cannot share one. The middle heading is what the server draws and what a
 * guest who asked for less movement keeps; the flight leans away from it.
 */
function Butterfly({
  flyer,
  piece,
  manner,
  still,
  nodeRef,
}: {
  flyer: Flyer;
  /** What it is: a butterfly of the host's colour, or another kind's picture. */
  piece: FlyingPiece;
  manner: Manner;
  /** Reduced motion: no flight and no wingbeat. It stays where the table puts it. */
  still: boolean;
  nodeRef: (node: HTMLSpanElement | null) => void;
}): ReactElement {
  /* The table's width is a butterfly's; another kind is drawn to its own. */
  const size = flyer.size * piece.scale;
  const width = Math.round(size * GROW);
  /*
    No beat at all for a guest who asked for less movement: every floating
    element is fully still for them. A butterfly's wings used to go on opening
    and closing slowly, which was still a card with something moving on it.
  */
  const beat = manner.wing === null || still ? null : manner.wing;
  const beatSeconds = flyer.wing * manner.wingBeat;

  const travel: CSSProperties = {
    left: `${flyer.left}%`,
    top: `${flyer.top}%`,
    willChange: still ? undefined : "transform",
  };

  const wing: CSSProperties = {
    /* The span directly around the image, so a fluid card can grow it. */
    ...artWidth(width),
    "--butterfly-width": String(Math.round(size * 100) / 100),
    animationName: beat ?? "none",
    animationDuration: `${beatSeconds.toFixed(3)}s`,
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
      {/* No opacity anywhere on a butterfly: it is fully opaque wherever it is. */}
      <span
        className="block"
        style={{ transform: `rotate(${flyer.rotate}deg)` }}
      >
        <span
          data-wing=""
          className="lifafa-card-art lifafa-butterfly-art block"
          style={wing}
        >
          <img
            src={piece.src}
            alt=""
            aria-hidden="true"
            decoding="async"
            width={width}
            height={Math.round(width / piece.aspect)}
            className="block max-w-none select-none"
            style={{ filter: SHADOW }}
          />
        </span>
      </span>
    </span>
  );
}

interface Glow {
  /** Where its loop starts, as percentages within the band. */
  left: number;
  top: number;
  /** The point of light itself, in px: 4 to 7. Its halo is drawn round that. */
  core: number;
  /** Which of the three loops in globals.css it wanders. */
  path: "a" | "b" | "c";
  /** Seconds for one circuit of it, and for one pulse. */
  travel: number;
  pulse: number;
  delay: number;
}

/**
 * The fireflies, hand authored like every other table here.
 *
 * NOT FLOWN BY THE SCRIPT, AND NOT SHOOED. A butterfly is something a guest
 * reaches for; a firefly is a light in the air, and there is nothing to send
 * away. So each is two CSS animations the compositor plays: a slow closed
 * loop on the outer span, and a pulse of opacity on the inner one, each of
 * its own length, so they twinkle out of step.
 *
 * Further in from the edges than the butterflies start. A butterfly leaves
 * the writing because it would cover a word; a firefly is a few px of light,
 * dim half the time, and a card with every one of them pinned to its margins
 * has two columns of dots. They keep to the outer third all the same, clear
 * of the names. The first two are a "subtle" card's, on opposite sides.
 */
const FIREFLIES: readonly Glow[] = [
  { left: 9, top: 24, core: 6, path: "a", travel: 26, pulse: 3.1, delay: 0 },
  { left: 86, top: 60, core: 5, path: "b", travel: 31, pulse: 4.3, delay: 1.3 },
  /* Joins at "normal". */
  { left: 82, top: 16, core: 4, path: "c", travel: 23, pulse: 2.6, delay: 0.6 },
  { left: 12, top: 72, core: 7, path: "b", travel: 34, pulse: 3.7, delay: 2.2 },
  /* Only at "lively". */
  { left: 90, top: 86, core: 5, path: "a", travel: 28, pulse: 4.9, delay: 1.7 },
  { left: 5, top: 47, core: 4, path: "c", travel: 21, pulse: 2.9, delay: 0.9 },
];

/** How solid a firefly is held for a guest who asked for less movement: lit, and still. */
const FIREFLY_STILL_OPACITY = 0.8;

/**
 * A firefly: the outer span wanders, the inner one is the light and pulses.
 * Two spans because an animation's opacity and another's transform could
 * share one, but the box is centred on its place with a transform of its own.
 */
function Firefly({
  glow,
  onLight,
  still,
}: {
  glow: Glow;
  onLight: boolean;
  /** Reduced motion: lit steadily where the table puts it. */
  still: boolean;
}): ReactElement {
  const light = fireflyGlow(glow.core, onLight);

  const wander: CSSProperties = {
    left: `${glow.left}%`,
    top: `${glow.top}%`,
    ...(still
      ? null
      : {
          animationName: `lifafa-firefly-${glow.path}`,
          animationDuration: `${glow.travel}s`,
          animationDelay: `${-glow.delay * 4}s`,
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
        }),
  };

  const pulse: CSSProperties = {
    width: light.size,
    height: light.size,
    /* Centred on its place, so a bigger halo grows round the point and not away from it. */
    margin: -light.size / 2,
    background: light.background,
    borderRadius: "50%",
    ...(still
      ? { opacity: FIREFLY_STILL_OPACITY }
      : {
          animationName: "lifafa-firefly-pulse",
          animationDuration: `${glow.pulse}s`,
          /* Negative, so each is already somewhere in its own pulse on the first frame. */
          animationDelay: `${-glow.delay}s`,
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
        }),
  };

  return (
    <span className="absolute block" style={wander}>
      <span className="block" style={pulse} />
    </span>
  );
}

/**
 * How each thing that drifts is timed against the table, which was written
 * for a leaf: a seed is carried a little slower, and a feather's fall is one
 * pass and not a circuit, so it takes about half as long. Only a leaf turns
 * over in the air; a seed hardly spins, and a feather's lean is in its swing.
 * The paths themselves are keyframes in globals.css, named for the motion.
 */
const LEAF_MOTIONS: Record<NaturePiece["motion"], { travel: number; turns: boolean }> = {
  leaf: { travel: 1, turns: true },
  seed: { travel: 0.9, turns: false },
  feather: { travel: 0.56, turns: false },
};

/**
 * A leaf, built the way a butterfly is and for the same reason.
 *
 * Three spans: the outer drifts, the middle holds the heading and the alpha,
 * the inner turns. An animation's transform replaces the element's own, so the
 * three cannot share one element. Hidden outright under reduced motion — a
 * leaf is nothing but its drift.
 */
function Leaf({
  drifter,
  piece,
}: {
  drifter: Drifter;
  piece: NaturePiece;
}): ReactElement {
  /* The table's width is the green leaf's; another kind is drawn to its own. */
  const width = Math.round(drifter.size * piece.scale);
  const motion = LEAF_MOTIONS[piece.motion];

  const travel: CSSProperties = {
    left: `${drifter.left}%`,
    top: `${drifter.top}%`,
    animationName: `lifafa-${piece.motion}-${drifter.path}`,
    animationDuration: `${(drifter.travel * motion.travel).toFixed(1)}s`,
    animationDelay: `${drifter.delay}s`,
    animationTimingFunction: "ease-in-out",
    animationIterationCount: "infinite",
    animationFillMode: "both",
  };

  const turn: CSSProperties = {
    animationName: motion.turns ? "lifafa-leaf-turn" : "none",
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
        style={{ opacity: LEAF_OPACITY, transform: `rotate(${drifter.rotate}deg)` }}
      >
        <span className="block" style={turn}>
          <img
            src={piece.src}
            alt=""
            aria-hidden="true"
            decoding="async"
            width={width}
            height={Math.round(width / piece.aspect)}
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
  kind,
  onLight,
  leaves,
  nature,
  intensity,
  bandHeight,
}: {
  /**
   * Which butterflies the host picked, or "none" on a card that carries only
   * leaves. The canvas does not mount this layer when both are off.
   */
  style: ButterflyStyle;
  /**
   * Which kind flies, already read through `flyingKind`. `style` is still
   * what says whether anything does, and is the colour when it is butterflies.
   */
  kind: FlyingKind;
  /**
   * Whether the card's ground is light. Only the fireflies ask: they are
   * drawn in code, and a gold light on cream is drawn as an amber one.
   */
  onLight: boolean;
  /** Whether leaves drift with them, or on their own. */
  leaves: boolean;
  /** Which leaf: the host's kind, already read through `natureKind`. */
  nature: NatureKind;
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
  /* The wingbeat, the leaves and the fireflies are CSS loops: held while unseen. */
  const pauseRef = useFloatingPause();
  const flyerNodes = useRef<(HTMLSpanElement | null)[]>([]);

  /* Lights, not flyers: none of the flight below is started for them. */
  const fireflies = kind === "fireflies" && style !== "none";
  const pieces = style === "none" ? [] : flyingPieces(kind, style);
  const manner = mannerOf(kind);
  const flyers = manner.level ? LEVEL_FLYERS : FLYERS;
  const flyerCount = style === "none" || fireflies ? 0 : COUNT[intensity];
  const leafCount = leaves ? LEAF_COUNT[intensity] : 0;
  /* A change of kind swaps each image and leaves every leaf where it is in its drift. */
  const leaf = naturePiece(nature);

  /*
    Keyed on the count, the kind and the motion preference only. A change of
    colour swaps each image's src and leaves every butterfly exactly where it
    is in the air; a change of kind is a different flight, and starts again.
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

    return startFlight(band, nodes, flyers, manner);
  }, [prefersReducedMotion, flyerCount, flyers, manner]);

  return (
    <div
      ref={pauseRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[17] overflow-clip"
    >
      <div
        ref={bandRef}
        className="sticky top-0 w-full overflow-clip"
        style={{ height: bandHeight }}
      >
        {flyers.slice(0, flyerCount).map((flyer, index) => (
          <Butterfly
            /* A new kind is new spans: nothing of the last one's flight is left on them. */
            key={`${kind}-${flyer.left}-${flyer.top}`}
            flyer={flyer}
            manner={manner}
            /*
              Cycled by position rather than authored per flyer, the way
              DecorLayer cycles its motifs and its rotations — and the same
              cycle covers both cases, because a single colour arrives as a list
              of one and every place lands on it.
            */
            piece={pieces[index % pieces.length]}
            still={prefersReducedMotion}
            nodeRef={(node) => {
              flyerNodes.current[index] = node;
            }}
          />
        ))}

        {/* As many as there would be butterflies, at the same Amount. */}
        {fireflies
          ? FIREFLIES.slice(0, COUNT[intensity]).map((glow) => (
              <Firefly
                key={`firefly-${glow.left}-${glow.top}`}
                glow={glow}
                onLight={onLight}
                still={prefersReducedMotion}
              />
            ))
          : null}

        {LEAVES.slice(0, leafCount).map((drifter) => (
          <Leaf key={`leaf-${drifter.left}-${drifter.top}`} drifter={drifter} piece={leaf} />
        ))}
      </div>
    </div>
  );
}
