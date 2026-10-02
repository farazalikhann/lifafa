"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import type { ScratchConfig } from "@/components/card/ScratchPanel";
import { useScratchReveal } from "@/components/card/ScratchReveal";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { SCRATCH_FOIL, scratchFrameArt } from "@/lib/cardDecor";
import { cardRem } from "@/lib/cardScale";
import type { ScratchFrame } from "@/types/card";

/** Set when a guest has asked, at the OS level, not to be shown effects. */
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** The brush: a fingertip, in CSS pixels, solid in the middle and soft at its edge. */
const BRUSH_RADIUS = 26;
/** How far apart the brush is stamped along a stroke. Close enough to read as one line. */
const BRUSH_STEP = 7;

/**
 * How much has to be gone before the rest is given away. Past this a guest
 * has read what was under it, and every further stroke is a chore.
 */
const CLEARED_THRESHOLD = 0.55;

/** Pointer moves between measurements. Reading pixels back is the expensive part. */
const MOVES_PER_SAMPLE = 8;
/** Spacing of the grid the foil is measured on, in CSS pixels. */
const SAMPLE_STEP = 8;
/** Below this a pixel counts as scratched away. */
const CLEAR_ALPHA = 110;

/** How long the foil takes to fade once enough of it is gone. */
const FADE_MS = 520;

/**
 * How long after that the canvases are taken away. Longer than the fade,
 * because the burst the foil gives off is drawn on one of them and is still
 * in the air when the foil has gone.
 */
const UNMOUNT_MS = 1700;

/** One tile of foil, in CSS pixels. */
const FOIL_TILE = 190;

/**
 * The backing stores are never more than twice the CSS size. A phone that
 * reports 3 gains nothing a thumb can see from the third, and pays for it on
 * every stroke and every measurement.
 */
const MAX_RATIO = 2;

/** Between two ticks of the phone's motor while scratching, in milliseconds. */
const HAPTIC_GAP_MS = 240;

/** The most dust in the air at once. A long scratch must not pile it up. */
const MAX_DUST = 90;

const TAU = Math.PI * 2;

type Phase = "hiding" | "fading" | "gone";

/** A fleck of gold, or a petal: where it is, how it moves, how long it has. */
interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Seconds lived, and seconds allowed. */
  age: number;
  life: number;
  size: number;
  spin: number;
  angle: number;
  tone: string;
  /** A petal's picture, for the few thrown when the panel opens. */
  image: HTMLImageElement | null;
}

const GOLD = ["#F8E7B0", "#E9C46A", "#D4A636", "#FFF4CF"] as const;

/**
 * Content a guest scratches open, in a frame of roses.
 *
 * The same contract as ScratchPanel, which this is the dressed version of and
 * which still covers the small patches elsewhere on the card: the children
 * are laid out in the document the whole time, never conditionally rendered
 * and never hidden from a screen reader, and only a sighted guest is asked to
 * do anything — with a button under the frame for a guest who cannot. Reveals
 * are shared through ScratchReveal, so scratching this opens every other
 * patch over the same secret, and a reload in the same session does not ask
 * again.
 *
 * THE FRAME DECIDES THE SIZE, not the words. A frame is a picture with one
 * shape, so the panel is as large as the frame is drawn and the words are set
 * inside its opening, brought down a size if they would not fit. That also
 * means nothing moves when it opens: the frame stays, and so does its height.
 *
 * BACK TO FRONT: the words; the foil, a canvas cut to the opening's shape,
 * which is what is scratched away; the shimmer and the hint lying on the
 * foil, which go at the first stroke; a second canvas for the gold dust; and
 * the frame itself on top, so its roses overlap the foil's edge.
 *
 * THE FOIL NEVER SCROLLS THE PAGE. `touch-action: none`: a finger that lands
 * on it is scratching, whichever way it moves. That is the opposite of the
 * small patches, which give vertical drags back to the page — they sit in
 * the middle of running text, and this is an object a guest has come to.
 *
 * LESS MOTION. A guest who asked for it gets the foil still, with "Tap to
 * reveal" on it, and a tap fades it: no brush, no dust, no burst.
 */
export default function FramedScratch({
  frame,
  accent,
  label,
  phrases,
  preCleared,
  target,
  petals,
  onCoveredChange,
  showRevealButton = true,
  children,
}: ScratchConfig & {
  frame: ScratchFrame;
  /** Told whenever the content goes from hidden to readable. See ScratchPanel. */
  onCoveredChange?: (covered: boolean) => void;
  /** The "Reveal without scratching" button under the frame. Off where the caller has its own. */
  showRevealButton?: boolean;
  children: ReactNode;
}): ReactElement {
  const art = scratchFrameArt(frame);
  const isOval = art.foil.round === undefined;

  const stageRef = useRef<HTMLDivElement>(null);
  const foilRef = useRef<HTMLCanvasElement>(null);
  const dustRef = useRef<HTMLCanvasElement>(null);
  const wordsRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const shared = useScratchReveal(target);
  const sharedReveal = shared.reveal;

  const [phase, setPhase] = useState<Phase>(preCleared ? "gone" : "hiding");
  const [announcement, setAnnouncement] = useState<string>("");
  /* The shimmer and the hint lie on the foil until the first stroke. */
  const [touched, setTouched] = useState<boolean>(false);
  /* How far the words are brought down to fit the opening. */
  const [fit, setFit] = useState<number>(1);

  const showFoil = phase !== "gone";
  const isCovered = phase === "hiding";

  useEffect(() => {
    if (preCleared || shared.revealed === "restored") {
      setPhase("gone");
      return;
    }

    if (shared.revealed === null) {
      setPhase("hiding");
      setTouched(false);
      setAnnouncement("");
      return;
    }

    /* Revealed live somewhere else on the card: the same fade a scratch here ends in. */
    setPhase((current) => (current === "hiding" ? "fading" : current));
  }, [preCleared, shared.revealed]);

  useEffect(() => {
    onCoveredChange?.(isCovered);
  }, [isCovered, onCoveredChange]);

  /* The fade is a CSS transition; this is only the unmount after it and after the burst. */
  useEffect(() => {
    if (phase !== "fading") {
      return;
    }

    const timer = window.setTimeout(() => setPhase("gone"), UNMOUNT_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const revealNow = useCallback((): void => {
    setPhase((current) => (current === "hiding" ? "fading" : current));
    setAnnouncement(phrases.revealed);
    sharedReveal();
  }, [phrases.revealed, sharedReveal]);

  /*
    The words, fitted to the opening. Measured, because what is under the foil
    is whatever the section hands over — two lines of a date, a venue and its
    address, a clock — and the opening is one size.
  */
  useEffect(() => {
    const box = wordsRef.current;
    const content = contentRef.current;

    if (box === null || content === null || typeof ResizeObserver !== "function") {
      return;
    }

    const measure = (): void => {
      const roomW = box.clientWidth;
      const roomH = box.clientHeight;

      if (roomW < 1 || roomH < 1 || content.offsetWidth < 1 || content.offsetHeight < 1) {
        return;
      }

      /*
        What the content really reaches to, not the box it was given: a row
        of day, date and time is laid out wider than its own box and runs out
        of it on both sides. A range over the content reports everything in
        it, text included, as it is drawn — so through the scale already on
        it, which is divided back out. Taken as twice the further reach from
        the middle, since what overhangs need not overhang evenly.
      */
      const own = content.getBoundingClientRect();
      const scale = own.width / content.offsetWidth || 1;
      const range = document.createRange();
      range.selectNodeContents(content);
      const ink = range.getBoundingClientRect();
      const midX = own.left + own.width / 2;
      const midY = own.top + own.height / 2;
      const needW = Math.max(
        content.offsetWidth,
        (2 * Math.max(midX - ink.left, ink.right - midX)) / scale,
      );
      const needH = Math.max(
        content.offsetHeight,
        (2 * Math.max(midY - ink.top, ink.bottom - midY)) / scale,
      );

      const next = Math.min(1, roomW / needW, roomH / needH);
      setFit((current) => (Math.abs(current - next) < 0.01 ? current : next));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    observer.observe(content);

    return () => observer.disconnect();
  }, []);

  /*
    Everything the two canvases do. One effect, because the brush, the
    measuring and the dust share state that has no business being React's.
    `phase` is not a dependency: the fade must not repaint foil a guest has
    just cleared.
  */
  useEffect(() => {
    const stage = stageRef.current;
    const foil = foilRef.current;
    const dust = dustRef.current;

    if (stage === null || foil === null || dust === null) {
      return;
    }

    const ctx = foil.getContext("2d", { willReadFrequently: true });
    const air = dust.getContext("2d");

    if (ctx === null || air === null) {
      return;
    }

    let ratio = 1;
    let width = 0;
    let height = 0;
    let scratching = false;
    let started = false;
    let finished = false;
    let last = { x: 0, y: 0 };
    let moves = 0;
    let lastHaptic = 0;
    let frame = 0;
    let lastTick = 0;
    let live = true;
    const motes: Mote[] = [];
    const petalImages: HTMLImageElement[] = [];

    /* The brush, drawn once: solid to two thirds of its radius, then gone by the edge. */
    const brush = document.createElement("canvas");
    const stampBrush = (): void => {
      const side = Math.ceil(BRUSH_RADIUS * 2 * ratio);
      brush.width = side;
      brush.height = side;
      const b = brush.getContext("2d");

      if (b === null) {
        return;
      }

      const soft = b.createRadialGradient(side / 2, side / 2, 0, side / 2, side / 2, side / 2);
      soft.addColorStop(0, "rgba(0,0,0,1)");
      soft.addColorStop(0.62, "rgba(0,0,0,1)");
      soft.addColorStop(1, "rgba(0,0,0,0)");
      b.fillStyle = soft;
      b.fillRect(0, 0, side, side);
    };

    const foilImage = new Image();
    foilImage.decoding = "async";

    const paint = (): void => {
      const rect = foil.getBoundingClientRect();

      if (rect.width < 1 || rect.height < 1) {
        return;
      }

      width = rect.width;
      height = rect.height;
      ratio = Math.min(MAX_RATIO, window.devicePixelRatio > 0 ? window.devicePixelRatio : 1);
      foil.width = Math.round(width * ratio);
      foil.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.globalCompositeOperation = "source-over";

      const pattern =
        foilImage.complete && foilImage.naturalWidth > 0
          ? ctx.createPattern(foilImage, "repeat")
          : null;

      if (pattern !== null) {
        const scale = FOIL_TILE / foilImage.naturalWidth;
        pattern.setTransform({ a: scale, b: 0, c: 0, d: scale, e: 0, f: 0 });
        ctx.fillStyle = pattern;
      } else {
        /* The picture has not come, or will not: a plain gold is still a foil. */
        ctx.fillStyle = "#D4A636";
      }

      ctx.fillRect(0, 0, width, height);

      /* A little shade towards the edge, so the foil sits in the frame rather than on it. */
      const shade = ctx.createRadialGradient(
        width / 2, height / 2, Math.min(width, height) * 0.3,
        width / 2, height / 2, Math.max(width, height) * 0.62,
      );
      shade.addColorStop(0, "rgba(60,30,0,0)");
      shade.addColorStop(1, "rgba(60,30,0,0.28)");
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, width, height);

      /* Painted: the canvas no longer needs the stand-in behind it. See the element. */
      foil.style.background = "none";

      stampBrush();
      moves = 0;

      const stageRect = stage.getBoundingClientRect();
      dust.width = Math.round(stageRect.width * ratio);
      dust.height = Math.round(stageRect.height * ratio);
      air.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    /** Whether a point of the canvas is inside the opening's shape, where there is foil to see. */
    const inShape = (x: number, y: number): boolean => {
      if (!isOval) {
        return true;
      }

      const dx = (x - width / 2) / (width / 2);
      const dy = (y - height / 2) / (height / 2);
      return dx * dx + dy * dy <= 1;
    };

    const clearedFraction = (): number => {
      if (foil.width === 0 || foil.height === 0) {
        return 0;
      }

      const { data } = ctx.getImageData(0, 0, foil.width, foil.height);
      let sampled = 0;
      let cleared = 0;

      for (let y = SAMPLE_STEP / 2; y < height; y += SAMPLE_STEP) {
        for (let x = SAMPLE_STEP / 2; x < width; x += SAMPLE_STEP) {
          if (!inShape(x, y)) {
            continue;
          }

          sampled += 1;
          const at = (Math.round(y * ratio) * foil.width + Math.round(x * ratio)) * 4 + 3;

          if (data[at] < CLEAR_ALPHA) {
            cleared += 1;
          }
        }
      }

      return sampled === 0 ? 0 : cleared / sampled;
    };

    /* --- The dust ------------------------------------------------------ */

    const tick = (now: number): void => {
      frame = 0;

      if (!live) {
        return;
      }

      const dt = Math.min(0.05, lastTick === 0 ? 0.016 : (now - lastTick) / 1000);
      lastTick = now;
      air.clearRect(0, 0, dust.width / ratio, dust.height / ratio);

      for (let i = motes.length - 1; i >= 0; i -= 1) {
        const mote = motes[i];
        mote.age += dt;

        if (mote.age >= mote.life) {
          motes.splice(i, 1);
          continue;
        }

        mote.vy += 520 * dt;
        mote.x += mote.vx * dt;
        mote.y += mote.vy * dt;
        mote.angle += mote.spin * dt;

        const left = 1 - mote.age / mote.life;
        air.globalAlpha = Math.min(1, left * 1.6);

        if (mote.image !== null) {
          if (mote.image.complete && mote.image.naturalWidth > 0) {
            air.save();
            air.translate(mote.x, mote.y);
            air.rotate(mote.angle);
            air.drawImage(mote.image, -mote.size / 2, -mote.size / 2, mote.size, mote.size);
            air.restore();
          }
        } else {
          air.fillStyle = mote.tone;
          air.beginPath();
          air.arc(mote.x, mote.y, mote.size * (0.5 + left * 0.5), 0, TAU);
          air.fill();
        }
      }

      air.globalAlpha = 1;

      if (motes.length > 0) {
        frame = window.requestAnimationFrame(tick);
      } else {
        lastTick = 0;
      }
    };

    const fly = (): void => {
      if (frame === 0 && motes.length > 0) {
        frame = window.requestAnimationFrame(tick);
      }
    };

    /** The foil canvas's corner, in the dust canvas's own coordinates. */
    const foilOrigin = (): { x: number; y: number } => {
      const a = foil.getBoundingClientRect();
      const b = stage.getBoundingClientRect();
      return { x: a.left - b.left, y: a.top - b.top };
    };

    const shed = (x: number, y: number): void => {
      if (motes.length >= MAX_DUST) {
        return;
      }

      const origin = foilOrigin();

      for (let i = 0; i < 2; i += 1) {
        motes.push({
          x: origin.x + x + (Math.random() - 0.5) * BRUSH_RADIUS,
          y: origin.y + y + (Math.random() - 0.5) * BRUSH_RADIUS * 0.6,
          vx: (Math.random() - 0.5) * 60,
          vy: -20 - Math.random() * 50,
          age: 0,
          life: 0.5 + Math.random() * 0.4,
          size: 0.8 + Math.random() * 1.5,
          spin: 0,
          angle: 0,
          tone: GOLD[Math.floor(Math.random() * GOLD.length)],
          image: null,
        });
      }

      fly();
    };

    /* What the foil gives off as the last of it goes: gold from its middle, and a few of the card's petals. */
    const burst = (): void => {
      const origin = foilOrigin();
      const cx = origin.x + width / 2;
      const cy = origin.y + height / 2;

      for (let i = 0; i < 30; i += 1) {
        const angle = Math.random() * TAU;
        const speed = 120 + Math.random() * 260;

        motes.push({
          x: cx + Math.cos(angle) * width * 0.16,
          y: cy + Math.sin(angle) * height * 0.16,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 170,
          age: 0,
          life: 0.8 + Math.random() * 0.6,
          size: 1.4 + Math.random() * 2.4,
          spin: 0,
          angle: 0,
          tone: GOLD[Math.floor(Math.random() * GOLD.length)],
          image: null,
        });
      }

      for (let i = 0; i < Math.min(8, petalImages.length * 4); i += 1) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
        const speed = 160 + Math.random() * 180;

        motes.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 60,
          age: 0,
          life: 1.1 + Math.random() * 0.5,
          size: 16 + Math.random() * 12,
          spin: (Math.random() - 0.5) * 6,
          angle: Math.random() * TAU,
          tone: "",
          image: petalImages[i % petalImages.length],
        });
      }

      fly();
    };

    /* --- The brush ------------------------------------------------------ */

    const stamp = (x: number, y: number): void => {
      ctx.drawImage(brush, x - BRUSH_RADIUS, y - BRUSH_RADIUS, BRUSH_RADIUS * 2, BRUSH_RADIUS * 2);
    };

    const erase = (to: { x: number; y: number }, from: { x: number; y: number } | null): void => {
      ctx.globalCompositeOperation = "destination-out";

      /*
        Stamped along the line, not only at its end: pointer moves arrive once
        a frame at best, and a finger crossing the panel inside one frame would
        otherwise leave two dots and a gap between them.
      */
      if (from !== null) {
        const distance = Math.hypot(to.x - from.x, to.y - from.y);
        const steps = Math.floor(distance / BRUSH_STEP);

        for (let i = 1; i < steps; i += 1) {
          const t = i / steps;
          stamp(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
        }
      }

      stamp(to.x, to.y);
    };

    const check = (): void => {
      if (finished || clearedFraction() < CLEARED_THRESHOLD) {
        return;
      }

      finished = true;
      scratching = false;
      burst();
      revealNow();
    };

    const positionOf = (event: PointerEvent): { x: number; y: number } => {
      const rect = foil.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const handleDown = (event: PointerEvent): void => {
      if (finished || !event.isPrimary) {
        return;
      }

      /* Less motion: the foil is a button, and this is its press. */
      if (reducedMotion) {
        finished = true;
        revealNow();
        return;
      }

      /* A mouse dragged across the panel is scratching it, not selecting the words under it. */
      event.preventDefault();

      scratching = true;
      started = true;
      last = positionOf(event);
      foil.setPointerCapture(event.pointerId);
      setTouched(true);

      /* The card's petals, for the burst: asked for now, when it is clear there will be one. */
      if (petalImages.length === 0 && petals !== undefined) {
        for (const src of petals.slice(0, 2)) {
          const image = new Image();
          image.src = src;
          petalImages.push(image);
        }
      }

      erase(last, null);
      shed(last.x, last.y);
    };

    const handleMove = (event: PointerEvent): void => {
      if (!scratching || finished) {
        return;
      }

      event.preventDefault();

      const point = positionOf(event);
      erase(point, last);
      shed(point.x, point.y);
      last = point;
      moves += 1;

      /* A tick under the finger now and then, where the phone has a motor to give one. */
      if (
        event.pointerType === "touch" &&
        event.timeStamp - lastHaptic > HAPTIC_GAP_MS &&
        typeof navigator.vibrate === "function"
      ) {
        lastHaptic = event.timeStamp;

        try {
          navigator.vibrate(5);
        } catch {
          /* A scratch without a tick is still a scratch. */
        }
      }

      if (moves >= MOVES_PER_SAMPLE) {
        moves = 0;
        check();
      }
    };

    const handleEnd = (event: PointerEvent): void => {
      if (foil.hasPointerCapture(event.pointerId)) {
        foil.releasePointerCapture(event.pointerId);
      }

      if (!scratching) {
        return;
      }

      scratching = false;
      check();
    };

    foil.addEventListener("pointerdown", handleDown);
    foil.addEventListener("pointermove", handleMove, { passive: false });
    foil.addEventListener("pointerup", handleEnd);
    foil.addEventListener("pointercancel", handleEnd);

    /*
      A real change of size repaints from the start, losing what was cleared:
      a stretched mask on a rotated phone looks worse than fresh foil does.
      The first report an observer always makes, of the size it already has,
      is not a change.
    */
    const observer = new ResizeObserver(() => {
      const rect = foil.getBoundingClientRect();

      if (!finished && Math.abs(rect.width - width) > 1) {
        paint();
      }
    });
    observer.observe(stage);

    foilImage.onload = (): void => {
      /* Only if nobody has started on the plain gold it was standing in for. */
      if (live && !finished && !started) {
        paint();
      }
    };
    foilImage.src = SCRATCH_FOIL;
    paint();

    return () => {
      live = false;
      observer.disconnect();
      foilImage.onload = null;

      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }

      foil.removeEventListener("pointerdown", handleDown);
      foil.removeEventListener("pointermove", handleMove);
      foil.removeEventListener("pointerup", handleEnd);
      foil.removeEventListener("pointercancel", handleEnd);
    };
  }, [showFoil, isOval, reducedMotion, revealNow, petals]);

  const pct = (value: number): string => `${(value * 100).toFixed(2)}%`;
  const boxOf = (box: { x: number; y: number; width: number; height: number }): CSSProperties => ({
    left: pct(box.x),
    top: pct(box.y),
    width: pct(box.width),
    height: pct(box.height),
  });

  /* The foil's shape. A rectangle's corners are a share of its height, which border-radius takes as two radii. */
  const foilShape: CSSProperties = isOval
    ? { borderRadius: "50%" }
    : {
        borderRadius: `${(((art.foil.round ?? 0) * art.foil.height) / art.foil.width / art.aspect * 100).toFixed(2)}% / ${((art.foil.round ?? 0) * 100).toFixed(2)}%`,
      };

  const hint = reducedMotion ? phrases.tap : label;

  return (
    <div className="flex max-w-full flex-col items-center">
      {/*
        A width of its own, in the card's rem so it grows with the type it
        frames on a tablet or a laptop, and never more than the column:
        everything inside it is placed absolutely, so it has no content to
        take a width from, and inside a parent that shrinks to fit it would
        otherwise be nothing wide.
      */}
      <div
        ref={stageRef}
        className="relative max-w-full"
        style={{ width: cardRem(art.width / 16), aspectRatio: String(art.aspect) }}
      >
        {/* The words, in the opening. In the document from the first paint, whatever is over them. */}
        <div
          ref={wordsRef}
          className={`absolute flex items-center justify-center ${isCovered ? "select-none" : ""}`}
          style={boxOf(art.words)}
        >
          <div
            ref={contentRef}
            className="flex w-fit min-w-full shrink-0 flex-col items-center text-center transition-transform duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none"
            /*
              As wide as the opening, unless something in it will not wrap — a
              row of day, date and time — in which case it is as wide as that
              needs, so the measurement above sees the whole of it and brings
              it down to fit rather than letting it run under the frame.
            */
            style={{
              /* Brought down to fit, and a touch further while covered, so it comes up as the foil goes. */
              transform: `scale(${(fit * (isCovered && !reducedMotion ? 0.92 : 1)).toFixed(3)})`,
            }}
          >
            {children}
          </div>
        </div>

        {showFoil ? (
          <div
            className="absolute overflow-hidden"
            style={{
              ...boxOf(art.foil),
              ...foilShape,
              opacity: phase === "fading" ? 0 : 1,
              transition: `opacity ${FADE_MS}ms ease-out`,
              /* Faded foil is still in the tree while the burst plays, and must not take a tap meant for what it showed. */
              pointerEvents: phase === "fading" ? "none" : undefined,
            }}
          >
            <canvas
              ref={foilRef}
              aria-hidden="true"
              className="absolute inset-0 h-full w-full select-none"
              style={{
                /*
                  Gold from the first paint, before the script has drawn
                  anything: without it the words would be readable for the
                  moment between the page arriving and the canvas being
                  painted. The script takes it away once it has.
                */
                background: `#D4A636 url(${SCRATCH_FOIL}) center / ${FOIL_TILE}px`,
                touchAction: "none",
                cursor: reducedMotion ? "pointer" : "crosshair",
              }}
            />

            {/* On the foil until the first stroke: light crossing it, and what to do. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden transition-opacity duration-300"
              style={{ opacity: touched ? 0 : 1 }}
            >
              <div
                className="absolute inset-y-0 left-0 w-1/2 animate-[lifafa-cover-sheen_5.5s_ease-in-out_infinite] motion-reduce:hidden"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,250,225,0.5) 50%, rgba(255,255,255,0) 100%)",
                  transform: "translate3d(-130%, 0, 0)",
                }}
              />
              <span
                className="relative px-[12%] text-center text-[calc(0.9375*var(--card-rem,1rem))] leading-snug tracking-[0.06em] text-balance"
                style={{
                  fontFamily: "var(--card-heading)",
                  fontWeight: "var(--card-heading-weight)" as CSSProperties["fontWeight"],
                  color: "#5A3A06",
                  textShadow: "0 1px 0 rgba(255, 240, 190, 0.7)",
                }}
              >
                {hint}
              </span>
            </div>
          </div>
        ) : null}

        {/* The gold dust and the burst, over the foil and under the frame. */}
        {showFoil ? (
          <canvas
            ref={dustRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full"
          />
        ) : null}

        {/* The frame, on top, so its roses overlap the foil's edge. */}
        <img
          src={art.src}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full select-none"
        />
      </div>

      {/*
        Required, not a nicety: a guest using a switch, a head pointer or a
        trackpad they cannot drag still has to be able to read where the
        wedding is. Its row keeps its height when it goes, so nothing under the
        frame moves.
      */}
      {showRevealButton ? (
        <div className="flex min-h-11 items-center justify-center">
          {isCovered ? (
            <button
              type="button"
              onClick={revealNow}
              className="min-h-11 rounded-full px-3 text-xs font-medium underline decoration-transparent underline-offset-4 opacity-70 transition-opacity duration-150 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: accent, outlineColor: accent }}
            >
              {phrases.reveal}
            </button>
          ) : null}
        </div>
      ) : null}

      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
