"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { useScratchReveal } from "@/components/card/ScratchReveal";
import { useCardStill } from "@/hooks/useCardStill";
import { useFloatingPause } from "@/hooks/useFloatingPause";
import { TEAR_PAPER_SRC, TEAR_PAPER_TILE, type TearConfig } from "@/lib/tearReveal";
import { playTearSound } from "@/lib/tearSound";

/**
 * The date under a strip of handmade paper that the guest tears in two.
 *
 * THE STRIP. As wide as the section's column and as tall as the month, the
 * day and the weekday, which are all it covers. It is a strip torn from a
 * sheet: its top and bottom edges are rough from the start, a little
 * different on every card, with the white of the paper's fibre showing along
 * them.
 *
 * WHAT THE GUEST DOES. They drag a finger, or the mouse, across it, and the
 * paper comes apart along the path of the finger: the rip opens from the edge
 * behind the finger up to the finger itself, the two pieces drawing apart
 * behind it until the gap is a centimetre or so and the date shows through.
 * Both torn edges carry a thick, uneven white rim with loose fibres standing
 * off it into the gap. The upper piece lifts as it comes away, turned a few
 * degrees toward the guest about the point the finger is at, with a soft
 * shadow under it on the date in the gap; the lower piece sags. Once the finger has gone three
 * fifths of the way across, or lifts with two fifths crossed, the rip runs on
 * to the far edge by itself: the upper piece curls up and flies off, turning,
 * the lower drops away, and the date comes up to size over a glow. A tap that
 * is not a drag tears it along a gentle wave. A rip given up short of two
 * fifths mends.
 *
 * ONE SECRET, KEPT FOR THE VISIT. It reads and writes the card's reveal state
 * for the date (ScratchReveal), so a date torn open stays open on a reload in
 * the same session, and whatever else on the card waits for the date to be
 * shown stops waiting.
 *
 * TWO CANVASES, THE STRIP'S SIZE AND A MARGIN: one for each piece, with room
 * above and below for the pieces to part into. They are drawn only when the
 * finger moves, never in a loop of their own, except for the third of a
 * second a tap's rip takes to cross. The lift is a transform on the upper
 * canvas. Once the paper has parted nothing is drawn at all: the two pieces
 * are moved by the browser, transform and opacity only (the Web Animations
 * API).
 *
 * SCROLLING STILL WORKS. The strip takes pointer events and leaves vertical
 * panning to the browser (`touch-action: pan-y`): a swipe up or down scrolls
 * the page as it does anywhere on the card, and only a drag that is mostly
 * sideways tears. Once the paper is gone the strip is not in the page at all.
 *
 * UNDER REDUCED MOTION a tap or a swipe fades the paper away, with no rip,
 * no sound and nothing flying.
 */

/** A point of the rip, in CSS px from the strip's top left, with the rim it carries. */
interface RipPoint {
  x: number;
  y: number;
  /** How thick the white rim is here, on the upper piece and on the lower. */
  rimUp: number;
  rimDown: number;
  /** Loose fibres off the upper edge (hanging down) and off the lower (standing up). */
  fibresUp: readonly Fibre[];
  fibresDown: readonly Fibre[];
}

/** A fibre: where along the rip it starts, how far it leans, how long it is. */
interface Fibre {
  at: number;
  lean: number;
  length: number;
}

/** Room above and below the strip, in px, for the two pieces to part into. */
const MARGIN = 22;
/** How far a finger moves before it is a drag and not a tap, in px. */
const DRAG_START = 8;
/** How much more sideways than up or down a drag must be to tear. */
const SIDEWAYS = 1.2;
/** The rip finishes itself at this share of the width, or at the lesser one when the finger lifts. */
const FINISH_AT = 0.6;
const FINISH_ON_LIFT = 0.4;
/** The rip is laid in steps of about this many px, each knocked off the line by up to JAG. */
const STEP = 4;
const JAG = 3.2;
/** How far behind the finger the gap takes to open fully, in px. */
const OPENING = 68;
/** Of the gap, how much is the upper piece lifting and how much the lower sagging. */
const LIFT_SHARE = 0.62;
/** How wide a column the pieces are drawn in, in CSS px. */
const SLICE = 2;
/** How long a tap's rip takes to cross the strip, in ms. */
const AUTO_MS = 420;
/** How long the paper takes to fade under reduced motion, in ms. */
const FADE_MS = 300;

function reducedMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function jitter(amount: number): number {
  return (Math.random() * 2 - 1) * amount;
}

function between(low: number, high: number): number {
  return low + Math.random() * (high - low);
}

function fibres(): Fibre[] {
  const roll = Math.random();
  const count = roll < 0.3 ? 0 : roll < 0.85 ? 1 : 2;

  return Array.from({ length: count }, () => ({
    at: jitter(STEP / 2),
    lean: jitter(2.2),
    length: between(1.5, 5),
  }));
}

/** A rough edge across the strip: a height for every few px, wandering about a line. */
function roughEdge(width: number): number[] {
  const edge: number[] = [];
  let drift = 0;

  for (let x = 0; x <= width + 4; x += 4) {
    drift = Math.max(-3.2, Math.min(3.2, drift + jitter(1.5)));
    edge.push(drift + jitter(0.9));
  }

  return edge;
}

export default function TearReveal({
  paper,
  ink,
  label,
  openLabel,
  preCleared,
  hindi,
  children,
}: TearConfig & {
  /** The label is Devanagari: set larger, and never letter spaced. */
  hindi: boolean;
  children: ReactNode;
}): ReactElement {
  const { revealed, reveal } = useScratchReveal("date");
  const still = useCardStill();
  /* covered: whole, or being torn. parting: the two pieces are leaving. gone: not in the page. */
  const [phase, setPhase] = useState<"covered" | "parting" | "gone">("covered");

  const open = preCleared || still || revealed === "restored" || phase === "gone";

  const stripRef = useRef<HTMLDivElement>(null);
  const upperRef = useRef<HTMLCanvasElement>(null);
  const lowerRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const pauseRef = useFloatingPause();

  /* Everything a gesture touches, kept off React's state: none of it is drawn by React. */
  const work = useRef({
    width: 0,
    height: 0,
    dpr: 1,
    /** The whole strip, rough edges and all, at the canvases' size. */
    sheet: null as HTMLCanvasElement | null,
    tile: null as HTMLImageElement | null,
    topEdge: [] as number[],
    bottomEdge: [] as number[],
    /** The rip, from the edge it started at to the finger. */
    points: [] as RipPoint[],
    /** Which way it is going: 1 to the right, -1 to the left. */
    direction: 1 as 1 | -1,
    /** How wide the gap opens on this tear, in px. */
    gap: 13,
    /** The rip has reached the far edge: the gap is open all the way along. */
    through: false,
    drag: null as {
      id: number;
      startX: number;
      startY: number;
      left: number;
      top: number;
      tearing: boolean;
    } | null,
    frame: 0,
    done: false,
    animations: [] as Animation[],
  });

  /** The strip, whole: the colour with the tile's grain in it, cut to its rough edges, rimmed in white. */
  const makeSheet = useCallback((): void => {
    const state = work.current;

    if (state.width < 1 || state.height < 1) {
      return;
    }

    const { width, height, dpr } = state;
    const sheet = document.createElement("canvas");
    sheet.width = Math.round(width * dpr);
    sheet.height = Math.round((height + 2 * MARGIN) * dpr);
    const context = sheet.getContext("2d");

    if (context === null) {
      return;
    }

    const top = (index: number): number => MARGIN + 5 + state.topEdge[index];
    const bottom = (index: number): number => MARGIN + height - 5 + state.bottomEdge[index];
    const outline = (): void => {
      context.beginPath();
      state.topEdge.forEach((_, index) => context.lineTo(index * 4 - 2, top(index)));
      for (let index = state.bottomEdge.length - 1; index >= 0; index -= 1) {
        context.lineTo(index * 4 - 2, bottom(index));
      }
      context.closePath();
    };

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.save();
    outline();
    context.clip();

    context.fillStyle = paper;
    context.fillRect(0, 0, width, height + 2 * MARGIN);

    if (state.tile !== null) {
      const pattern = context.createPattern(state.tile, "repeat");

      if (pattern !== null) {
        pattern.setTransform(new DOMMatrix().scale(TEAR_PAPER_TILE / state.tile.naturalWidth));
        /* A tile that averages the middle grey leaves the colour as it is and adds its grain. */
        context.globalCompositeOperation = "overlay";
        context.fillStyle = pattern;
        context.fillRect(0, 0, width, height + 2 * MARGIN);
        /* Twice: once is a grain too faint to see on a phone. */
        context.globalAlpha = 0.6;
        context.fillRect(0, 0, width, height + 2 * MARGIN);
        context.globalAlpha = 1;
        context.globalCompositeOperation = "source-over";
      }
    }

    /* A paper is a shade lighter where the light falls and darker at its foot. */
    const light = context.createLinearGradient(0, MARGIN, 0, MARGIN + height);
    light.addColorStop(0, "rgb(255 255 255 / 0.1)");
    light.addColorStop(0.5, "rgb(255 255 255 / 0)");
    light.addColorStop(1, "rgb(0 0 0 / 0.14)");
    context.fillStyle = light;
    context.fillRect(0, 0, width, height + 2 * MARGIN);

    /* The white of the fibre along both rough edges: an uneven line, inside the paper. */
    context.strokeStyle = "rgb(255 255 255 / 0.9)";
    context.lineJoin = "round";
    for (const edge of [top, bottom]) {
      for (let index = 0; index < state.topEdge.length - 1; index += 1) {
        context.lineWidth = between(2, 5.5);
        context.beginPath();
        context.moveTo(index * 4 - 2, edge(index));
        context.lineTo(index * 4 + 2, edge(index + 1));
        context.stroke();
      }
    }
    context.restore();

    /* And a few fibres standing off them. */
    context.strokeStyle = "rgb(255 255 255 / 0.8)";
    context.lineWidth = 0.8;
    context.beginPath();
    state.topEdge.forEach((_, index) => {
      if (Math.random() < 0.5) {
        context.moveTo(index * 4 - 2, top(index) + 1);
        context.lineTo(index * 4 - 2 + jitter(2), top(index) - between(1.5, 4.5));
      }
      if (Math.random() < 0.5) {
        context.moveTo(index * 4 - 2, bottom(index) - 1);
        context.lineTo(index * 4 - 2 + jitter(2), bottom(index) + between(1.5, 4.5));
      }
    });
    context.stroke();

    state.sheet = sheet;
  }, [paper]);

  /**
   * Both pieces as they stand. Whole, the strip is the lower canvas's. Torn,
   * the part the rip has not reached stays there with the lower piece under
   * the rip, and the upper canvas has the piece above it; each is laid in
   * narrow columns, moved up or down by the gap where that column is.
   */
  const drawPieces = useCallback((): void => {
    const state = work.current;
    const upper = upperRef.current?.getContext("2d") ?? null;
    const lower = lowerRef.current?.getContext("2d") ?? null;
    const sheet = state.sheet;

    if (upper === null || lower === null || sheet === null) {
      return;
    }

    const { width, dpr, points } = state;
    const deviceWidth = sheet.width;
    const deviceHeight = sheet.height;

    for (const context of [upper, lower]) {
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, deviceWidth, deviceHeight);
    }

    if (points.length < 2) {
      lower.drawImage(sheet, 0, 0);
      return;
    }

    /* Left to right, whichever way the rip is going. */
    const across = state.direction > 0 ? points : [...points].reverse();
    const tip = points[points.length - 1];
    const from = Math.max(0, Math.min(width, across[0].x));
    const to = Math.max(0, Math.min(width, across[across.length - 1].x));

    /* How far apart the pieces are at x: nothing at the finger, all of it a way behind. */
    const gapAt = (x: number): number => {
      if (state.through) {
        return state.gap;
      }

      const t = Math.min(1, Math.abs(x - tip.x) / OPENING);

      return state.gap * t * t * (3 - 2 * t);
    };

    /* The part not yet torn, whole. */
    const whole = state.direction > 0 ? [to, width] : [0, from];
    const wholeLeft = Math.round(whole[0] * dpr);
    const wholeWidth = Math.round(whole[1] * dpr) - wholeLeft;

    if (wholeWidth > 0) {
      lower.drawImage(sheet, wholeLeft, 0, wholeWidth, deviceHeight, wholeLeft, 0, wholeWidth, deviceHeight);
    }

    /* The torn part, a column at a time. */
    const step = Math.max(1, Math.round(SLICE * dpr));
    let index = 0;

    for (let column = Math.round(from * dpr); column < Math.round(to * dpr); column += step) {
      const middle = (column + step / 2) / dpr;

      while (index < across.length - 2 && across[index + 1].x < middle) {
        index += 1;
      }

      const a = across[index];
      const b = across[index + 1];
      const t = Math.max(0, Math.min(1, (middle - a.x) / (b.x - a.x || 1)));
      const cut = Math.round((MARGIN + a.y + (b.y - a.y) * t) * dpr);
      const gap = gapAt(middle);
      const up = Math.round(gap * LIFT_SHARE * dpr);
      const down = Math.round(gap * (1 - LIFT_SHARE) * dpr);

      upper.drawImage(sheet, column, 0, step, cut, column, -up, step, cut);
      lower.drawImage(sheet, column, cut, step, deviceHeight - cut, column, cut + down, step, deviceHeight - cut);
    }

    /* The rims: a thick, uneven band of white on each torn edge, and fibres off it into the gap. */
    const rim = (context: CanvasRenderingContext2D, side: 1 | -1): void => {
      const edge = (point: RipPoint): number =>
        MARGIN + point.y + side * gapAt(point.x) * (side < 0 ? LIFT_SHARE : 1 - LIFT_SHARE);

      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      /* Under the rim, the paper a shade darker: the torn layer stands a little proud of the sheet. */
      context.fillStyle = "rgb(0 0 0 / 0.16)";
      context.beginPath();
      across.forEach((point) => context.lineTo(point.x, edge(point)));
      for (let at = across.length - 1; at >= 0; at -= 1) {
        const point = across[at];
        context.lineTo(point.x, edge(point) + side * ((side < 0 ? point.rimUp : point.rimDown) + 1.6));
      }
      context.closePath();
      context.fill();

      context.fillStyle = "rgb(255 253 248 / 0.97)";
      context.beginPath();
      across.forEach((point) => context.lineTo(point.x, edge(point) - side * 0.6));
      for (let at = across.length - 1; at >= 0; at -= 1) {
        const point = across[at];
        context.lineTo(point.x, edge(point) + side * (side < 0 ? point.rimUp : point.rimDown));
      }
      context.closePath();
      context.fill();

      context.strokeStyle = "rgb(255 255 255 / 0.88)";
      context.lineWidth = 0.9;
      context.lineCap = "round";
      context.beginPath();
      for (const point of across) {
        /* Shorter where the gap has hardly opened: a fibre does not reach across to the other piece. */
        const room = Math.min(1, 0.15 + gapAt(point.x) / state.gap);

        for (const fibre of side < 0 ? point.fibresUp : point.fibresDown) {
          context.moveTo(point.x + fibre.at, edge(point));
          context.lineTo(point.x + fibre.at + fibre.lean, edge(point) - side * fibre.length * room);
        }
      }
      context.stroke();
    };

    /*
      The upper piece's shadow, on the date in the gap: darkest under its
      edge, gone by the lower piece. Drawn here, in the gap alone, so it is
      not also laid over the part of the strip that is still whole; and not
      once the pieces have parted, when it would leave with the lower one.
    */
    if (!state.through) {
      lower.setTransform(dpr, 0, 0, dpr, 0, 0);
      lower.save();
      lower.beginPath();
      across.forEach((point) =>
        lower.lineTo(point.x, MARGIN + point.y - gapAt(point.x) * LIFT_SHARE),
      );
      for (let at = across.length - 1; at >= 0; at -= 1) {
        const point = across[at];
        lower.lineTo(point.x, MARGIN + point.y + gapAt(point.x) * (1 - LIFT_SHARE));
      }
      lower.closePath();
      lower.clip();

      /* The piece's own shape above its edge, filled where nothing shows, for the shadow it throws. */
      lower.shadowColor = "rgb(0 0 0 / 0.42)";
      lower.shadowBlur = 7 * dpr;
      lower.shadowOffsetY = 3 * dpr;
      lower.fillStyle = "#000";
      lower.beginPath();
      across.forEach((point) =>
        lower.lineTo(point.x, MARGIN + point.y - gapAt(point.x) * LIFT_SHARE - 1),
      );
      lower.lineTo(across[across.length - 1].x, -40);
      lower.lineTo(across[0].x, -40);
      lower.closePath();
      lower.fill();
      lower.restore();
    }

    rim(upper, -1);
    rim(lower, 1);

    /*
      The upper piece lifts toward the guest, turned about the point the
      finger is at, so it has not moved there, where it is still joined.
    */
    const canvas = upperRef.current;

    if (canvas !== null && !state.through) {
      const torn = Math.abs(tip.x - points[0].x);
      const turn = state.direction * Math.min(11, 2 + torn * 0.04);

      canvas.style.transformOrigin = `${tip.x.toFixed(1)}px ${(MARGIN + tip.y).toFixed(1)}px`;
      canvas.style.transform = `perspective(520px) rotateY(${turn.toFixed(2)}deg)`;
    }
  }, []);

  const scheduleDraw = useCallback((): void => {
    const state = work.current;

    if (state.frame === 0) {
      state.frame = window.requestAnimationFrame(() => {
        state.frame = 0;
        drawPieces();
      });
    }
  }, [drawPieces]);

  /** Carries the rip on to (x, y) in jagged steps, each with its own rim and fibres. */
  const ripTo = useCallback((x: number, y: number): void => {
    const state = work.current;
    const point = (px: number, py: number): RipPoint => ({
      x: px,
      y: Math.min(state.height - 16, Math.max(16, py)),
      rimUp: between(2.6, 6),
      rimDown: between(2.6, 6),
      fibresUp: fibres(),
      fibresDown: fibres(),
    });
    const last = state.points[state.points.length - 1];

    if (last === undefined) {
      state.points.push(point(x, y));
      return;
    }

    const steps = Math.max(1, Math.round(Math.abs(x - last.x) / STEP));

    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;

      state.points.push(point(last.x + (x - last.x) * t, last.y + (y - last.y) * t + jitter(JAG)));
    }
  }, []);

  /** The rip begins: at the edge behind the finger, and already up to the finger. */
  const beginRip = useCallback(
    (direction: 1 | -1, x: number, y: number): void => {
      const state = work.current;

      state.direction = direction;
      state.gap = between(14, 17);
      state.through = false;
      state.points = [];
      ripTo(direction > 0 ? -2 : state.width + 2, y + jitter(8));
      ripTo(x, y);

      if (labelRef.current !== null) {
        labelRef.current.style.opacity = "0";
      }
    },
    [ripTo],
  );

  /* --- The strip's size, its paper, and the tile: none of it in a loop. --- */
  useEffect(() => {
    const strip = stripRef.current;
    const state = work.current;

    if (open || strip === null) {
      return;
    }

    const fit = (): void => {
      const width = strip.clientWidth;
      const height = strip.clientHeight;

      if (width < 1 || height < 1 || state.done) {
        return;
      }

      if (width !== state.width) {
        state.topEdge = roughEdge(width);
        state.bottomEdge = roughEdge(width);
      }

      state.width = width;
      state.height = height;
      state.dpr = Math.min(2, window.devicePixelRatio || 1);

      for (const canvas of [upperRef.current, lowerRef.current]) {
        if (canvas !== null) {
          canvas.width = Math.round(width * state.dpr);
          canvas.height = Math.round((height + 2 * MARGIN) * state.dpr);
        }
      }

      /* A rip half made on a strip that has changed size is not where the finger was. */
      state.points = [];
      state.drag = null;

      if (upperRef.current !== null) {
        upperRef.current.style.transform = "none";
      }

      makeSheet();
      drawPieces();

      /* The canvas has the strip now, rough edges and all: the plain colour that stood in for it goes. */
      if (state.sheet !== null) {
        strip.style.backgroundColor = "transparent";
      }
    };

    fit();

    const resize = typeof ResizeObserver === "function" ? new ResizeObserver(fit) : null;
    resize?.observe(strip);

    /* The tile is fetched when the strip is within a screen of being seen. */
    const fetchTile = (): void => {
      if (state.tile !== null) {
        return;
      }

      const image = new Image();
      image.decoding = "async";
      image.onload = () => {
        state.tile = image;

        if (!state.done && state.points.length === 0) {
          makeSheet();
          drawPieces();
        }
      };
      image.src = TEAR_PAPER_SRC;
    };

    const near =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver(
            (entries) => {
              if (entries.some((entry) => entry.isIntersecting)) {
                fetchTile();
                near?.disconnect();
              }
            },
            { rootMargin: "100% 0px" },
          )
        : null;

    if (near !== null) {
      near.observe(strip);
    } else {
      fetchTile();
    }

    return () => {
      resize?.disconnect();
      near?.disconnect();
    };
  }, [open, makeSheet, drawPieces]);

  useEffect(() => {
    const state = work.current;

    return () => {
      window.cancelAnimationFrame(state.frame);
      state.animations.forEach((animation) => animation.cancel());
    };
  }, []);

  /** The paper is off: remembered for the visit, and out of the page. */
  const finish = useCallback((): void => {
    setPhase("gone");
    reveal();
  }, [reveal]);

  /** The rip runs on to the far edge, and the two pieces leave. */
  const part = useCallback(
    (sound: boolean): void => {
      const state = work.current;
      const strip = stripRef.current;
      const upper = upperRef.current;
      const lower = lowerRef.current;

      if (state.done || strip === null || upper === null || lower === null || state.sheet === null) {
        return;
      }

      state.done = true;
      window.cancelAnimationFrame(state.frame);
      state.frame = 0;

      const tip = state.points[state.points.length - 1];
      ripTo(state.direction > 0 ? state.width + 2 : -2, tip.y + jitter(8));
      state.through = true;
      drawPieces();

      strip.style.pointerEvents = "none";

      if (sound) {
        playTearSound();
      }

      try {
        navigator.vibrate?.(10);
      } catch {
        /* No vibration, and the paper tears all the same. */
      }

      setPhase("parting");

      if (typeof upper.animate !== "function") {
        finish();
        return;
      }

      /* How far the top and the foot of the screen are: read once, here, and never again. */
      const box = strip.getBoundingClientRect();
      const rise = box.bottom + 120;
      const fall = Math.max(240, window.innerHeight - box.top + 120);
      const lean = state.direction;
      /* From where the lift left it, about the same point, so it does not jump as it goes. */
      const lifted =
        upper.style.transform === "" || upper.style.transform === "none"
          ? "perspective(520px) rotateY(0deg)"
          : upper.style.transform;

      /* The upper piece curls up off its torn edge and flies away over the top, turning. */
      const away = upper.animate(
        [
          { transform: lifted },
          {
            offset: 0.3,
            transform: `perspective(520px) translate3d(0, -22px, 0) rotateX(50deg) rotate(${-4 * lean}deg)`,
            easing: "cubic-bezier(0.45, 0, 0.85, 0.5)",
          },
          {
            transform: `perspective(520px) translate3d(${70 * lean}px, ${-rise}px, 0) rotateX(76deg) rotate(${-26 * lean}deg)`,
          },
        ],
        { duration: 920, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)", fill: "forwards" },
      );

      /* The lower piece drops away, tipping as it goes. */
      const down = lower.animate(
        [
          { transform: "translate3d(0, 0, 0) rotate(0deg)", opacity: 1 },
          { offset: 0.7, opacity: 1 },
          { transform: `translate3d(${-18 * lean}px, ${fall}px, 0) rotate(${9 * lean}deg)`, opacity: 0 },
        ],
        { duration: 820, easing: "cubic-bezier(0.5, 0, 0.9, 0.55)", fill: "forwards" },
      );

      state.animations = [away, down];
      void Promise.all([away.finished, down.finished]).then(finish, () => undefined);
    },
    [drawPieces, finish, ripTo],
  );

  /** The paper fades away: reduced motion, and a browser with no canvas. */
  const fadeAway = useCallback((): void => {
    const state = work.current;
    const strip = stripRef.current;

    if (state.done || strip === null) {
      return;
    }

    state.done = true;
    strip.style.pointerEvents = "none";
    strip.style.transition = `opacity ${FADE_MS}ms ease-out`;
    strip.style.opacity = "0";
    window.setTimeout(finish, FADE_MS);
  }, [finish]);

  /** A tap: the rip crosses by itself, along a gentle wave. */
  const tearItself = useCallback((): void => {
    const state = work.current;

    if (state.done || state.frame !== 0) {
      return;
    }

    if (reducedMotion() || state.sheet === null) {
      fadeAway();
      return;
    }

    const base = state.height * between(0.42, 0.58);
    const swell = state.height * 0.07;
    const shift = Math.random() * Math.PI * 2;
    const waves = between(0.9, 1.5);
    const yAt = (x: number): number =>
      base + swell * Math.sin((x / state.width) * Math.PI * 2 * waves + shift);

    beginRip(1, 0, yAt(0));
    playTearSound();

    const started = performance.now();

    const step = (now: number): void => {
      const t = Math.min(1, (now - started) / AUTO_MS);
      /* Eased in: a rip starts slowly and then goes. */
      const reach = t * t * (3 - 2 * t) * state.width;
      const last = state.points[state.points.length - 1];

      if (reach - last.x >= STEP) {
        ripTo(reach, yAt(reach));
      }

      drawPieces();

      if (t >= 1) {
        state.frame = 0;
        part(false);
      } else {
        state.frame = window.requestAnimationFrame(step);
      }
    };

    state.frame = window.requestAnimationFrame(step);
  }, [beginRip, drawPieces, fadeAway, part, ripTo]);

  /** A rip given up too soon: the paper is whole again. */
  const mend = useCallback((): void => {
    const state = work.current;

    state.points = [];

    if (upperRef.current !== null) {
      upperRef.current.style.transform = "none";
    }

    drawPieces();

    if (labelRef.current !== null) {
      labelRef.current.style.opacity = "1";
    }
  }, [drawPieces]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const state = work.current;

    if (state.done || state.frame !== 0 || state.drag !== null || !event.isPrimary) {
      return;
    }

    /* One read of where the strip is, at the start of a gesture. */
    const box = event.currentTarget.getBoundingClientRect();

    state.drag = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: box.left,
      top: box.top,
      tearing: false,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const state = work.current;
    const drag = state.drag;

    if (drag === null || drag.id !== event.pointerId || state.done) {
      return;
    }

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (!drag.tearing) {
      if (Math.hypot(dx, dy) < DRAG_START) {
        return;
      }

      /* Up or down: the page's to scroll, and nothing of ours. */
      if (Math.abs(dx) < Math.abs(dy) * SIDEWAYS) {
        state.drag = null;
        return;
      }

      /* A swipe with the paper held still, or with no paper drawn to rip: it fades, as for a tap. */
      if (reducedMotion() || state.sheet === null) {
        state.drag = null;
        fadeAway();
        return;
      }

      drag.tearing = true;
      beginRip(dx > 0 ? 1 : -1, drag.startX - drag.left, drag.startY - drag.top);

      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* Not captured: the rip follows the finger while it is over the strip. */
      }
    }

    const x = Math.min(state.width, Math.max(0, event.clientX - drag.left));
    const y = event.clientY - drag.top;
    const last = state.points[state.points.length - 1];

    /* Only ever onward, the way the drag set out: a rip does not go back on itself. */
    if ((x - last.x) * state.direction >= 3) {
      ripTo(x, y);
    }

    scheduleDraw();

    /* Far enough, or at the far edge already: it goes the rest of the way by itself. */
    const atEdge = state.direction > 0 ? x >= state.width - 6 : x <= 6;

    if (Math.abs(dx) / state.width >= FINISH_AT || atEdge) {
      state.drag = null;
      part(true);
    }
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>, lifted: boolean): void => {
    const state = work.current;
    const drag = state.drag;

    if (drag === null || drag.id !== event.pointerId) {
      return;
    }

    state.drag = null;

    if (state.done) {
      return;
    }

    if (drag.tearing) {
      if (Math.abs(event.clientX - drag.startX) / state.width >= FINISH_ON_LIFT) {
        part(true);
      } else {
        mend();
      }
      return;
    }

    /* Lifted where it came down: a tap. A touch the browser took to scroll with is not one. */
    if (
      lifted &&
      Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < DRAG_START
    ) {
      tearItself();
    }
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      tearItself();
    }
  };

  const covered = !open && phase === "covered";
  const canvasStyle: CSSProperties = {
    top: -MARGIN,
    height: `calc(100% + ${2 * MARGIN}px)`,
  };

  return (
    <div className="relative flex w-full flex-col items-center self-stretch py-5">
      {/* What is under the paper. In the page from the first paint; not read out or reached until the paper is off. */}
      <div
        inert={covered}
        className={`relative flex flex-col items-center ${
          phase === "parting" || (phase === "gone" && revealed === "live") ? "lifafa-tear-date-in" : ""
        }`}
        style={{ gap: "calc(0.5 * var(--card-rem, 1rem))" }}
      >
        {phase === "parting" ? (
          <span
            aria-hidden="true"
            className="lifafa-tear-glow pointer-events-none absolute -inset-x-16 -inset-y-6 rounded-full"
            style={{
              background: `radial-gradient(closest-side, ${paper}66, ${paper}22 55%, transparent)`,
            }}
          />
        ) : null}
        {children}
      </div>

      {open ? null : (
        <div
          ref={stripRef}
          role="button"
          tabIndex={phase === "covered" ? 0 : -1}
          aria-label={openLabel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(event) => endDrag(event, true)}
          onPointerCancel={(event) => endDrag(event, false)}
          onKeyDown={onKeyDown}
          className="absolute inset-0 cursor-grab select-none focus-visible:outline-2 focus-visible:outline-offset-4"
          style={
            {
              /* The paper's colour until the canvas has drawn the strip, so the date is never seen first. */
              backgroundColor: paper,
              outlineColor: paper,
              touchAction: "pan-y",
              WebkitTapHighlightColor: "transparent",
            } as CSSProperties
          }
        >
          {/* The lower piece, and the whole strip until it is torn. Its shadow is the strip's on the card. */}
          <canvas
            ref={lowerRef}
            aria-hidden="true"
            className="lifafa-tear-piece pointer-events-none absolute inset-x-0 w-full"
            style={{
              ...canvasStyle,
              willChange: phase === "parting" ? "transform, opacity" : undefined,
            }}
          />
          {/* The upper piece, over the lower. Its shadow in the gap is drawn with the lower piece. */}
          <canvas
            ref={upperRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 w-full"
            style={{ ...canvasStyle, willChange: "transform" }}
          />

          {/* The words and the arrow, on the paper: gone the moment it starts to rip. */}
          <div
            ref={(node) => {
              labelRef.current = node;
              return pauseRef(node);
            }}
            aria-hidden="true"
            className="lifafa-tear-label pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 transition-opacity duration-150"
            style={{ color: ink }}
          >
            <p
              lang={hindi ? "hi" : undefined}
              className={
                hindi
                  ? "text-[calc(1*var(--card-rem,1rem))] leading-[1.5]"
                  : "pl-[0.3em] text-[calc(0.75*var(--card-rem,1rem))] font-medium tracking-[0.3em] uppercase"
              }
            >
              {label}
            </p>
            <svg
              viewBox="0 0 44 12"
              focusable="false"
              className="lifafa-tear-arrow h-3 w-11"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 6h38M35 1.5 40 6l-5 4.5" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
