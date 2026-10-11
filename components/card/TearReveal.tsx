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
 * The date under a strip of handmade paper that the guest tears off.
 *
 * WHAT THE GUEST DOES. They drag a finger, or the mouse, across the strip,
 * and the paper rips along the path of the finger as it moves: a thin slit
 * with a white, fibrous rim, jagged a little differently every time. Once the
 * rip has crossed three fifths of the strip, or the finger lifts with two
 * fifths crossed, it runs on to both edges by itself; the piece above it
 * curls away and falls off the screen, the piece below slides down and fades,
 * and the date is there, with a soft glow. A tap that is not a drag tears it
 * along a gentle wave. A rip given up short of two fifths mends.
 *
 * ONE SECRET, KEPT FOR THE VISIT. It reads and writes the card's reveal state
 * for the date (ScratchReveal), so a date torn open stays open on a reload in
 * the same session, and whatever else on the card waits for the date to be
 * shown stops waiting.
 *
 * THE CANVASES ARE THE STRIP'S SIZE AND NO MORE: one while the paper is
 * whole, and one for each piece once it parts. The canvas is drawn only when
 * the finger moves, never in a loop of its own, except for the third of a
 * second a tap's rip takes to cross. Once the paper has parted nothing is
 * drawn at all: the two pieces are moved by the browser, transform and
 * opacity only (the Web Animations API).
 *
 * SCROLLING STILL WORKS. The strip takes pointer events and leaves vertical
 * panning to the browser (`touch-action: pan-y`): a swipe up or down scrolls
 * the page as it does anywhere on the card, and only a drag that is mostly
 * sideways tears. What is under the paper cannot be reached until it is
 * gone, and once it is gone the strip is not in the page at all, so nothing
 * is ever over the calendar button.
 *
 * UNDER REDUCED MOTION a tap fades the paper away, with no rip, no sound and
 * nothing falling.
 */

/** A point of the rip, in CSS px from the strip's top left. */
interface Point {
  x: number;
  y: number;
}

/** A fibre standing off the rip: from a point of it, this far. */
interface Fibre extends Point {
  dx: number;
  dy: number;
}

/** How far a finger moves before it is a drag and not a tap, in px. */
const DRAG_START = 8;
/** How much more sideways than up or down a drag must be to tear. */
const SIDEWAYS = 1.2;
/** The rip finishes itself at this share of the width, or at the lesser one when the finger lifts. */
const FINISH_AT = 0.6;
const FINISH_ON_LIFT = 0.4;
/** The rip is drawn in steps of about this many px, each knocked off the line by up to JAG. */
const STEP = 4;
const JAG = 3;
/** How long a tap's rip takes to cross the strip, in ms. */
const AUTO_MS = 380;
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

/** The rim along the rip: a soft white line, and fibres standing off it. */
function drawRim(
  context: CanvasRenderingContext2D,
  points: readonly Point[],
  fibres: readonly Fibre[],
): void {
  context.lineJoin = "round";
  context.lineCap = "round";
  context.strokeStyle = "rgb(255 255 255 / 0.94)";
  context.lineWidth = 2.6;
  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) {
      context.moveTo(point.x, point.y);
    } else {
      context.lineTo(point.x, point.y);
    }
  });
  context.stroke();

  context.strokeStyle = "rgb(255 255 255 / 0.85)";
  context.lineWidth = 0.8;
  context.beginPath();
  for (const fibre of fibres) {
    context.moveTo(fibre.x, fibre.y);
    context.lineTo(fibre.x + fibre.dx, fibre.y + fibre.dy);
  }
  context.stroke();
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
  const liveRef = useRef<HTMLCanvasElement>(null);
  const upperRef = useRef<HTMLCanvasElement>(null);
  const lowerRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const pauseRef = useFloatingPause();

  /* Everything a gesture touches, kept off React's state: none of it is drawn by React. */
  const work = useRef({
    width: 0,
    height: 0,
    dpr: 1,
    sheet: null as HTMLCanvasElement | null,
    tile: null as HTMLImageElement | null,
    points: [] as Point[],
    fibres: [] as Fibre[],
    drag: null as {
      id: number;
      startX: number;
      startY: number;
      left: number;
      top: number;
      tearing: boolean;
      direction: 1 | -1;
    } | null,
    frame: 0,
    done: false,
    animations: [] as Animation[],
  });

  /** The paper, whole, at the strip's size: the colour, with the tile's grain laid into it. */
  const makeSheet = useCallback((): void => {
    const state = work.current;

    if (state.width < 1 || state.height < 1) {
      return;
    }

    const sheet = document.createElement("canvas");
    sheet.width = Math.round(state.width * state.dpr);
    sheet.height = Math.round(state.height * state.dpr);
    const context = sheet.getContext("2d");

    if (context === null) {
      return;
    }

    context.fillStyle = paper;
    context.fillRect(0, 0, sheet.width, sheet.height);

    if (state.tile !== null) {
      const pattern = context.createPattern(state.tile, "repeat");

      if (pattern !== null) {
        const scale = (TEAR_PAPER_TILE * state.dpr) / state.tile.naturalWidth;
        pattern.setTransform(new DOMMatrix().scale(scale));
        /* A tile that averages the middle grey leaves the colour as it is and adds its grain. */
        context.globalCompositeOperation = "overlay";
        context.fillStyle = pattern;
        context.fillRect(0, 0, sheet.width, sheet.height);
        /* Twice: once is a grain too faint to see on a phone. */
        context.globalAlpha = 0.6;
        context.fillRect(0, 0, sheet.width, sheet.height);
        context.globalAlpha = 1;
        context.globalCompositeOperation = "source-over";
      }
    }

    /* A paper is a shade lighter where the light falls and darker at its foot. */
    const light = context.createLinearGradient(0, 0, 0, sheet.height);
    light.addColorStop(0, "rgb(255 255 255 / 0.1)");
    light.addColorStop(0.5, "rgb(255 255 255 / 0)");
    light.addColorStop(1, "rgb(0 0 0 / 0.12)");
    context.fillStyle = light;
    context.fillRect(0, 0, sheet.width, sheet.height);

    state.sheet = sheet;
  }, [paper]);

  /** The strip as it stands: the paper, and the rip so far. */
  const drawLive = useCallback((): void => {
    const state = work.current;
    const canvas = liveRef.current;
    const context = canvas?.getContext("2d") ?? null;

    if (canvas === null || context === null || state.sheet === null) {
      return;
    }

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(state.sheet, 0, 0);

    if (state.points.length < 2) {
      return;
    }

    context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    drawRim(context, state.points, state.fibres);

    /* The slit itself: the paper is gone along it, and the date shows through. */
    context.globalCompositeOperation = "destination-out";
    context.lineWidth = 1.5;
    context.strokeStyle = "#000";
    context.beginPath();
    state.points.forEach((point, index) => {
      if (index === 0) {
        context.moveTo(point.x, point.y);
      } else {
        context.lineTo(point.x, point.y);
      }
    });
    context.stroke();
    context.globalCompositeOperation = "source-over";
  }, []);

  const scheduleDraw = useCallback((): void => {
    const state = work.current;

    if (state.frame === 0) {
      state.frame = window.requestAnimationFrame(() => {
        state.frame = 0;
        drawLive();
      });
    }
  }, [drawLive]);

  /** Carries the rip on to (x, y) in jagged steps, growing a fibre here and there. */
  const ripTo = useCallback((x: number, y: number): void => {
    const state = work.current;
    const last = state.points[state.points.length - 1];

    if (last === undefined) {
      state.points.push({ x, y });
      return;
    }

    const steps = Math.max(1, Math.round(Math.abs(x - last.x) / STEP));

    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      const point = {
        x: last.x + (x - last.x) * t,
        y: Math.min(state.height - 6, Math.max(6, last.y + (y - last.y) * t + jitter(JAG))),
      };

      state.points.push(point);

      /* A fibre or two at most points: short, and mostly up or down from the rip. */
      for (let count = Math.random() < 0.8 ? (Math.random() < 0.4 ? 2 : 1) : 0; count > 0; count -= 1) {
        state.fibres.push({ ...point, dx: jitter(2.4), dy: jitter(6) });
      }
    }
  }, []);

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

      state.width = width;
      state.height = height;
      state.dpr = Math.min(2, window.devicePixelRatio || 1);

      for (const canvas of [liveRef.current, upperRef.current, lowerRef.current]) {
        if (canvas !== null) {
          canvas.width = Math.round(width * state.dpr);
          canvas.height = Math.round(height * state.dpr);
        }
      }

      /* A rip half made on a strip that has changed size is not where the finger was. */
      state.points = [];
      state.fibres = [];
      makeSheet();
      drawLive();
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
          drawLive();
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
  }, [open, makeSheet, drawLive]);

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

  /** The rip runs on to both edges, and the two pieces leave. */
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

      /* Left to right, whichever way it was torn, and out to both edges. */
      if (state.points[0].x > state.points[state.points.length - 1].x) {
        state.points.reverse();
      }

      const first = state.points[0];
      const torn = state.points;
      state.points = [{ x: -2, y: first.y + jitter(6) }];
      ripTo(first.x, first.y);
      state.points.push(...torn.slice(1));
      const end = state.points[state.points.length - 1];
      ripTo(state.width + 2, end.y + jitter(6));

      const piece = (canvas: HTMLCanvasElement, edge: number): void => {
        const context = canvas.getContext("2d");

        if (context === null || state.sheet === null) {
          return;
        }

        context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
        context.clearRect(0, 0, state.width, state.height);
        context.beginPath();
        context.moveTo(-2, edge);
        state.points.forEach((point) => context.lineTo(point.x, point.y));
        context.lineTo(state.width + 2, edge);
        context.closePath();
        context.clip();
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.drawImage(state.sheet, 0, 0);
        context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
        drawRim(context, state.points, state.fibres);
      };

      piece(upper, -2);
      piece(lower, state.height + 2);

      if (liveRef.current !== null) {
        liveRef.current.style.display = "none";
      }
      upper.style.display = "block";
      lower.style.display = "block";
      strip.style.boxShadow = "none";
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

      /* How far down the foot of the screen is: read once, here, and never again. */
      const fall = Math.max(240, window.innerHeight - strip.getBoundingClientRect().top + 80);
      const lean = Math.random() < 0.5 ? -1 : 1;

      /* The upper piece lifts off its torn edge, curls back, and drops out of the screen, turning. */
      const away = upper.animate(
        [
          { transform: "perspective(700px) translate3d(0, 0, 0) rotateX(0deg) rotate(0deg)" },
          {
            offset: 0.28,
            transform: `perspective(700px) translate3d(0, -12px, 0) rotateX(34deg) rotate(${-2 * lean}deg)`,
            easing: "cubic-bezier(0.5, 0, 0.9, 0.6)",
          },
          {
            transform: `perspective(700px) translate3d(${-26 * lean}px, ${fall}px, 0) rotateX(64deg) rotate(${-13 * lean}deg)`,
          },
        ],
        { duration: 980, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)", fill: "forwards" },
      );

      /* The lower piece slides down a little and fades. */
      const down = lower.animate(
        [
          { transform: "translate3d(0, 0, 0)", opacity: 1 },
          { transform: "translate3d(0, 44px, 0) rotate(1.5deg)", opacity: 0 },
        ],
        { duration: 560, easing: "cubic-bezier(0.3, 0, 0.6, 1)", fill: "forwards" },
      );

      state.animations = [away, down];
      void Promise.all([away.finished, down.finished]).then(finish, () => undefined);
    },
    [finish, ripTo],
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

    const base = state.height * (0.4 + Math.random() * 0.2);
    const swell = state.height * 0.05;
    const phaseShift = Math.random() * Math.PI * 2;
    const waves = 0.9 + Math.random() * 0.6;
    const yAt = (x: number): number =>
      base + swell * Math.sin((x / state.width) * Math.PI * 2 * waves + phaseShift);

    state.points = [];
    state.fibres = [];
    ripTo(-2, yAt(0));

    if (stripRef.current !== null) {
      stripRef.current.style.backgroundColor = "transparent";
    }
    if (labelRef.current !== null) {
      labelRef.current.style.opacity = "0";
    }

    playTearSound();

    const started = performance.now();

    const step = (now: number): void => {
      const reach = Math.min(1, (now - started) / AUTO_MS) * (state.width + 2);
      const last = state.points[state.points.length - 1];

      if (reach - last.x >= STEP || reach >= state.width + 2) {
        ripTo(reach, yAt(reach));
      }

      drawLive();

      if (reach >= state.width + 2) {
        state.frame = 0;
        part(false);
      } else {
        state.frame = window.requestAnimationFrame(step);
      }
    };

    state.frame = window.requestAnimationFrame(step);
  }, [drawLive, fadeAway, part, ripTo]);

  /** A rip given up too soon: the paper is whole again. */
  const mend = useCallback((): void => {
    const state = work.current;

    state.points = [];
    state.fibres = [];
    drawLive();

    if (labelRef.current !== null) {
      labelRef.current.style.opacity = "1";
    }
  }, [drawLive]);

  /** How far across the strip the rip has got, as a share of its width. */
  const crossed = (): number => {
    const state = work.current;
    const first = state.points[0];
    const last = state.points[state.points.length - 1];

    return first === undefined || last === undefined || state.width < 1
      ? 0
      : Math.abs(last.x - first.x) / state.width;
  };

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
      direction: 1,
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
      drag.direction = dx > 0 ? 1 : -1;
      state.points = [];
      state.fibres = [];
      ripTo(drag.startX - drag.left, drag.startY - drag.top);

      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* Not captured: the rip follows the finger while it is over the strip. */
      }

      event.currentTarget.style.backgroundColor = "transparent";

      if (labelRef.current !== null) {
        labelRef.current.style.opacity = "0";
      }
    }

    const x = Math.min(state.width, Math.max(0, event.clientX - drag.left));
    const y = event.clientY - drag.top;
    const last = state.points[state.points.length - 1];

    /* Only ever onward, the way the drag set out: a rip does not go back on itself. */
    if ((x - last.x) * drag.direction >= 3) {
      ripTo(x, y);
      scheduleDraw();
    }

    if (crossed() >= FINISH_AT) {
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
      if (crossed() >= FINISH_ON_LIFT) {
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

  return (
    <div className="relative inline-flex max-w-full flex-col items-center px-6 py-6">
      {/* What is under the paper. In the page from the first paint; not to be reached until the paper is off. */}
      <div
        inert={covered}
        className={`relative flex flex-col items-center ${
          phase === "parting" || (phase === "gone" && revealed === "live") ? "lifafa-tear-date-in" : ""
        }`}
        style={{ gap: "calc(1.1 * var(--card-rem, 1rem))" }}
      >
        {phase === "parting" ? (
          <span
            aria-hidden="true"
            className="lifafa-tear-glow pointer-events-none absolute -inset-8 rounded-full"
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
          className="absolute inset-0 cursor-grab rounded-[3px] select-none focus-visible:outline-2 focus-visible:outline-offset-4"
          style={
            {
              /* The paper's colour until the canvas has it, so the date is never seen first. */
              backgroundColor: paper,
              outlineColor: paper,
              touchAction: "pan-y",
              WebkitTapHighlightColor: "transparent",
              boxShadow:
                "0 14px 26px -14px rgb(0 0 0 / 0.5), 0 3px 8px -2px rgb(0 0 0 / 0.22)",
            } as CSSProperties
          }
        >
          <canvas ref={liveRef} aria-hidden="true" className="absolute inset-0 h-full w-full rounded-[3px]" />
          <canvas
            ref={lowerRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 hidden h-full w-full"
            style={{ willChange: phase === "parting" ? "transform, opacity" : undefined }}
          />
          <canvas
            ref={upperRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 hidden h-full w-full origin-top"
            style={{ willChange: phase === "parting" ? "transform" : undefined }}
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
