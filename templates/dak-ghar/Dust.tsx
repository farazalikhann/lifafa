"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactElement } from "react";
import styles from "@/templates/dak-ghar/dak.module.css";

/* The brush, as a share of the clock's width, and how much dust must be left for the rest to blow away. */
const BRUSH = 0.11;
const LEFT_TO_FINISH = 0.38;
/* Pixels per CSS pixel: at most 2, so a big phone does not draw a huge canvas. */
const MAX_DPR = 2;
/* A grid of samples, not every pixel, when measuring what is left. */
const SAMPLE_STEP = 6;

/** A small seeded random, so the dust falls the same way every time. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/**
 * Dust settled on the clock, drawn in code on a canvas the size of the clock
 * (never the screen): a fine film in uneven drifts over the face and the
 * brass case, heavier at the upper left, thin or gone at the lower right, so it reads as fallen rather than painted on;
 * darker and lighter specks in it, a few fibres, and a soft edge round the
 * clock's case.
 */
function drawDust(context: CanvasRenderingContext2D, width: number, height: number): void {
  const random = seeded(20261212);
  const unit = width;
  context.clearRect(0, 0, width, height);
  context.globalCompositeOperation = "source-over";

  /* The drifts: soft blobs, most of them toward the upper left and the foot, a gap left at the lower right. */
  const drifts: [number, number, number, number][] = [
    [0.36, 0.34, 0.38, 0.7],
    [0.62, 0.26, 0.32, 0.58],
    [0.28, 0.64, 0.32, 0.62],
    [0.52, 0.52, 0.28, 0.5],
    [0.76, 0.46, 0.22, 0.38],
    [0.46, 0.84, 0.24, 0.48],
    [0.14, 0.4, 0.2, 0.5],
    [0.4, 0.1, 0.2, 0.45],
  ];

  for (const [x, y, r, a] of drifts) {
    const cx = x * width;
    const cy = y * height;
    const radius = r * unit;
    const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, `rgba(176, 158, 128, ${a})`);
    gradient.addColorStop(0.6, `rgba(176, 158, 128, ${a * 0.55})`);
    gradient.addColorStop(1, "rgba(176, 158, 128, 0)");
    context.fillStyle = gradient;
    context.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  }

  /* Specks, only where there is dust to hold them. */
  context.globalCompositeOperation = "source-atop";

  for (let index = 0; index < 1400; index += 1) {
    const x = random() * width;
    const y = random() * height;
    const size = (0.6 + random() * 1.8) * (unit / 300);
    const dark = random() < 0.55;
    context.fillStyle = dark
      ? `rgba(98, 80, 58, ${0.25 + random() * 0.4})`
      : `rgba(236, 226, 206, ${0.3 + random() * 0.45})`;
    context.beginPath();
    context.arc(x, y, size, 0, Math.PI * 2);
    context.fill();
  }

  /* A few fibres. */
  context.lineCap = "round";

  for (let index = 0; index < 9; index += 1) {
    const x = (0.2 + random() * 0.6) * width;
    const y = (0.2 + random() * 0.6) * height;
    const length = (0.04 + random() * 0.06) * unit;
    const angle = random() * Math.PI * 2;
    context.strokeStyle = `rgba(90, 74, 54, ${0.25 + random() * 0.25})`;
    context.lineWidth = Math.max(0.6, unit / 420);
    context.beginPath();
    context.moveTo(x, y);
    context.quadraticCurveTo(
      x + Math.cos(angle + 0.8) * length * 0.6,
      y + Math.sin(angle + 0.8) * length * 0.6,
      x + Math.cos(angle) * length,
      y + Math.sin(angle) * length,
    );
    context.stroke();
  }

  /* Kept to the clock: a soft round edge at its case (centre 50%, 50%). */
  context.globalCompositeOperation = "destination-in";
  /* Out over the brass case to its edge, softly. */
  const edge = context.createRadialGradient(width / 2, height / 2, unit * 0.43, width / 2, height / 2, unit * 0.53);
  edge.addColorStop(0, "rgba(0, 0, 0, 1)");
  edge.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = edge;
  context.fillRect(0, 0, width, height);
  context.globalCompositeOperation = "source-over";
}

/** How much dust is on the canvas, as the summed alpha of a sample grid. */
function dustLeft(context: CanvasRenderingContext2D, width: number, height: number): number {
  const { data } = context.getImageData(0, 0, width, height);
  let total = 0;

  for (let y = 0; y < height; y += SAMPLE_STEP) {
    for (let x = 0; x < width; x += SAMPLE_STEP) {
      total += data[(y * width + x) * 4 + 3];
    }
  }

  return total;
}

/**
 * Dust over the countdown's clock, which the guest brushes away with a
 * finger (or the mouse) to reveal it: then the hands sweep round to the hour
 * (`onClear`). Each stroke clears a soft path; once most of it is gone, the
 * rest blows away in a fade. "Brush away the dust" under the clock does the
 * same for a guest who cannot swipe, or a keyboard.
 *
 * A canvas the clock's own size. Strokes are drawn at most once a frame, and
 * what is left is measured once, when a stroke ends, never while it moves.
 * The dust takes the clock's touches (`touch-action: none`) until it has
 * gone. Not drawn at all on the printed copy (the caller leaves it out).
 */
export default function Dust({
  onClear,
  label,
}: {
  onClear: () => void;
  label: string;
}): ReactElement | null {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"dusty" | "going" | "gone">("dusty");
  const size = useRef({ width: 0, height: 0, scale: 1, start: 0 });
  const stroke = useRef<{ pointer: number; points: [number, number][]; last: [number, number] | null; frame: number }>({
    pointer: -1,
    points: [],
    last: null,
    frame: 0,
  });

  /* Sized to its box, and drawn, when the box changes size: never while anything moves. */
  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas === null || state !== "dusty") {
      return;
    }

    const draw = (): void => {
      const box = canvas.getBoundingClientRect();
      const scale = Math.min(MAX_DPR, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.round(box.width * scale));
      const height = Math.max(1, Math.round(box.height * scale));

      if (width === size.current.width && height === size.current.height) {
        return;
      }

      canvas.width = width;
      canvas.height = height;
      size.current = { width, height, scale, start: 0 };
      const context = canvas.getContext("2d", { willReadFrequently: false });

      if (context === null) {
        return;
      }

      drawDust(context, width, height);
      size.current.start = dustLeft(context, width, height);
    };

    draw();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(draw) : null;
    observer?.observe(canvas);
    return () => observer?.disconnect();
  }, [state]);

  const finish = (): void => {
    if (state !== "dusty") {
      return;
    }

    setState("going");
    onClear();
    /* Taken out after its fade, or anyway, should no transition end arrive. */
    window.setTimeout(() => setState("gone"), 1200);
  };

  /* The points gathered since the last frame, brushed out in one go. */
  const paint = (): void => {
    const run = stroke.current;
    run.frame = 0;
    const context = canvasRef.current?.getContext("2d");

    if (context === null || context === undefined || run.points.length === 0) {
      return;
    }

    const { width } = size.current;
    const radius = width * BRUSH;
    context.globalCompositeOperation = "destination-out";

    for (const point of run.points) {
      const from = run.last ?? point;
      const distance = Math.hypot(point[0] - from[0], point[1] - from[1]);
      const steps = Math.max(1, Math.ceil(distance / (radius * 0.35)));

      for (let step = 1; step <= steps; step += 1) {
        const x = from[0] + ((point[0] - from[0]) * step) / steps;
        const y = from[1] + ((point[1] - from[1]) * step) / steps;
        const brush = context.createRadialGradient(x, y, 0, x, y, radius);
        brush.addColorStop(0, "rgba(0, 0, 0, 0.5)");
        brush.addColorStop(0.6, "rgba(0, 0, 0, 0.22)");
        brush.addColorStop(1, "rgba(0, 0, 0, 0)");
        context.fillStyle = brush;
        context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }

      run.last = point;
    }

    run.points = [];
    context.globalCompositeOperation = "source-over";
  };

  const at = (event: PointerEvent<HTMLCanvasElement>): [number, number] => {
    const box = event.currentTarget.getBoundingClientRect();
    const { scale } = size.current;
    return [(event.clientX - box.left) * scale, (event.clientY - box.top) * scale];
  };

  const onDown = (event: PointerEvent<HTMLCanvasElement>): void => {
    if (state !== "dusty") {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    const run = stroke.current;
    run.pointer = event.pointerId;
    run.last = null;
    run.points.push(at(event));
    run.frame ||= window.requestAnimationFrame(paint);
  };

  const onMove = (event: PointerEvent<HTMLCanvasElement>): void => {
    const run = stroke.current;

    if (event.pointerId !== run.pointer) {
      return;
    }

    run.points.push(at(event));
    run.frame ||= window.requestAnimationFrame(paint);
  };

  const onUp = (event: PointerEvent<HTMLCanvasElement>): void => {
    const run = stroke.current;

    if (event.pointerId !== run.pointer) {
      return;
    }

    run.pointer = -1;

    if (run.frame !== 0) {
      window.cancelAnimationFrame(run.frame);
    }

    paint();
    run.last = null;

    /* Measured once, now the stroke has ended. */
    const context = canvasRef.current?.getContext("2d");
    const { width, height, start } = size.current;

    if (context !== null && context !== undefined && start > 0 && dustLeft(context, width, height) < start * LEFT_TO_FINISH) {
      finish();
    }
  };

  if (state === "gone") {
    return null;
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`${styles.dust} ${state === "going" ? styles.dustGoing : ""}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onTransitionEnd={() => setState("gone")}
      />
      <button type="button" className={`${styles.dustHint} ${state === "going" ? styles.dustHintGoing : ""}`} onClick={finish}>
        {label}
      </button>
    </>
  );
}
