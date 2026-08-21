"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { contrastRatio } from "@/lib/contrast";

/** Set when a guest has asked, at the OS level, not to be shown effects. */
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Erase radius in CSS pixels — roughly a fingertip. */
const SCRATCH_RADIUS = 24;

/**
 * How much has to be gone before the rest is given away.
 *
 * Well under half, because a guest scratches to *see* something, not to clean a
 * rectangle: past this point they have already read the answer, and every
 * further stroke is a chore.
 */
const CLEARED_THRESHOLD = 0.45;

/** Pointer moves between alpha samples. Reading pixels is the expensive part. */
const MOVES_PER_SAMPLE = 5;

/** Spacing of the alpha sample grid, in CSS pixels. */
const SAMPLE_STEP = 8;

/** Below this the pixel counts as gone. Half of 255. */
const CLEAR_ALPHA = 128;

/** Must match the CSS transition on the canvas, or it unmounts mid-fade. */
const FADE_MS = 400;

/** Side of the repeating motif tile, in CSS pixels. */
const TILE = 26;

/** Faint enough to read as texture rather than as a picture. */
const MOTIF_ALPHA = 0.16;

const TAU = Math.PI * 2;

/**
 * "hiding" is the panel doing its job, "fading" the 400ms hand-off, "gone" the
 * canvas unmounted and the content simply on the page.
 */
type ScratchPhase = "hiding" | "fading" | "gone";

interface Point {
  x: number;
  y: number;
}

/**
 * A colour for the label that is legible on the surface it sits on.
 *
 * The accent is tried first, because the panel should look like part of the
 * card. But a palette is free to pair an accent with a surface close to it —
 * midnight's green on its near-black surface — and a label nobody can read is
 * worse than one that is off-palette. 3:1 is the WCAG threshold for large text,
 * which is what this is.
 */
function labelColour(accent: string, surface: string): string {
  if (contrastRatio(accent, surface) >= 3) {
    return accent;
  }

  return contrastRatio("#FFFFFF", surface) >= contrastRatio("#000000", surface)
    ? "#FFFFFF"
    : "#000000";
}

/**
 * One tile of the motif, drawn at device resolution.
 *
 * Built at `ratio` scale rather than at 1x and stretched, because the point of
 * the devicePixelRatio work below is that the panel is not the one soft
 * rectangle on an otherwise crisp card.
 */
function motifTile(accent: string, ratio: number): HTMLCanvasElement | null {
  const tile = document.createElement("canvas");
  tile.width = Math.max(1, Math.round(TILE * ratio));
  tile.height = tile.width;

  const ctx = tile.getContext("2d");

  if (ctx === null) {
    return null;
  }

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.globalAlpha = MOTIF_ALPHA;
  ctx.fillStyle = accent;

  /* A diamond in the middle of the tile. */
  const centre = TILE / 2;
  const radius = 4.5;
  ctx.beginPath();
  ctx.moveTo(centre, centre - radius);
  ctx.lineTo(centre + radius, centre);
  ctx.lineTo(centre, centre + radius);
  ctx.lineTo(centre - radius, centre);
  ctx.closePath();
  ctx.fill();

  /*
    Dots on the four corners. Once repeated they meet as one dot per lattice
    point, which reads as a second grid offset half a tile from the diamonds —
    a lot of texture for four arcs.
  */
  const corners: readonly Point[] = [
    { x: 0, y: 0 },
    { x: TILE, y: 0 },
    { x: 0, y: TILE },
    { x: TILE, y: TILE },
  ];

  for (const corner of corners) {
    ctx.beginPath();
    ctx.arc(corner.x, corner.y, 1.6, 0, TAU);
    ctx.fill();
  }

  return tile;
}

/**
 * Content a guest has to scratch open.
 *
 * The children are laid out normally and stay in the document the whole time —
 * never conditionally rendered, never `hidden`, never moved off screen. What
 * hides them is one opaque canvas positioned over the top, which means a screen
 * reader, a search engine and a print stylesheet all get the date or the venue
 * exactly as they would on a card with no panel at all. Only a sighted guest is
 * asked to do anything, and even they are given a way out.
 *
 * SCROLLING. This canvas covers a whole section of a page whose entire job is
 * to be scrolled, so the risk is not that scratching fails but that scrolling
 * does. `touch-action: pan-y` is what resolves it: a vertical drag is claimed
 * by the browser as a scroll before a single `pointermove` reaches this
 * component — we get `pointercancel` instead — while a sideways drag, the
 * gesture a scratch card asks for anyway, is delivered here. `preventDefault`
 * is called only on moves arriving inside a scratch already in progress, so a
 * gesture this component is not handling is never one it can block.
 */
export default function ScratchPanel({
  accent,
  surface,
  label,
  preCleared,
  children,
}: {
  accent: string;
  surface: string;
  /** Drawn across the panel, e.g. "Scratch to see the date". */
  label: string;
  /**
   * Render the content already uncovered.
   *
   * For the editor preview, which repaints on every keystroke: a host fixing a
   * typo in the venue must not have to scratch the panel open again to check
   * their own spelling.
   */
  preCleared: boolean;
  children: ReactNode;
}): ReactElement {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const prefersReducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const interactive = !preCleared && !prefersReducedMotion;

  const [phase, setPhase] = useState<ScratchPhase>(
    interactive ? "hiding" : "gone",
  );
  const [announcement, setAnnouncement] = useState<string>("");

  /* True while fading as well as while hiding — the fade is still the panel. */
  const showCanvas = phase !== "gone";

  /*
    Follows a change of mode after mount. `useMediaQuery` reports false on the
    server and on the first client paint by design, so a guest with reduced
    motion set arrives here as interactive and is corrected on the next commit;
    the same line covers a host switching the reveal effect in the editor.
    Setting the value it already holds is a no-op React bails out of.
  */
  useEffect(() => {
    setPhase(interactive ? "hiding" : "gone");
    setAnnouncement("");
  }, [interactive]);

  /* Handed to the canvas effect, so a finished scratch can start the fade. */
  const handleCleared = useCallback((): void => {
    setPhase("fading");
    setAnnouncement("Revealed.");
  }, []);

  const revealNow = useCallback((): void => {
    setPhase("gone");
    setAnnouncement("Revealed.");
  }, []);

  /* The fade itself is a CSS transition; this is only the unmount after it. */
  useEffect(() => {
    if (phase !== "fading") {
      return;
    }

    const timer = window.setTimeout(() => {
      setPhase("gone");
    }, FADE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [phase]);

  /*
    Everything the canvas does: size itself, paint itself, and erase.

    One effect rather than several, because they share mutable state that has no
    business being React state — the last pointer position, the moves since the
    last sample — and because they have to be torn down together. `phase` is
    deliberately not a dependency: the fade must not re-run this and repaint the
    panel the guest has just cleared.
  */
  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;

    if (host === null || canvas === null) {
      return;
    }

    /*
      `willReadFrequently` earns its place here: the completion check reads the
      whole buffer back, and without the hint a browser keeps the canvas on the
      GPU and pays for a readback every time it is asked.
    */
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (ctx === null) {
      return;
    }

    let ratio = 1;
    let scratching = false;
    let finished = false;
    let last: Point = { x: 0, y: 0 };
    let movesSinceSample = 0;

    const paint = (): void => {
      const rect = host.getBoundingClientRect();

      if (rect.width < 1 || rect.height < 1) {
        return;
      }

      /*
        Backing store in device pixels, CSS box in CSS pixels, and one transform
        so every drawing call below can be written in CSS pixels regardless.
      */
      ratio = window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, rect.width, rect.height);

      ctx.fillStyle = surface;
      ctx.fillRect(0, 0, rect.width, rect.height);

      const tile = motifTile(accent, ratio);
      const pattern = tile === null ? null : ctx.createPattern(tile, "repeat");

      if (pattern !== null) {
        /* The tile is at device scale; this puts it back into CSS pixels. */
        pattern.setTransform({
          a: 1 / ratio,
          b: 0,
          c: 0,
          d: 1 / ratio,
          e: 0,
          f: 0,
        });
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, rect.width, rect.height);
      }

      /* A dashed inset edge, so the panel reads as a thing to be acted on. */
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(10.5, 10.5, rect.width - 21, rect.height - 21);
      ctx.setLineDash([]);

      ctx.globalAlpha = 1;
      ctx.fillStyle = labelColour(accent, surface);
      const size = Math.round(Math.min(17, Math.max(13, rect.width * 0.042)));
      /* Resolved off the host, so the label is set in the card's own face. */
      const family = window.getComputedStyle(host).fontFamily;
      ctx.font = size + "px " + (family.length > 0 ? family : "sans-serif");
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, rect.width / 2, rect.height / 2);

      movesSinceSample = 0;
    };

    const positionOf = (event: PointerEvent): Point => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const erase = (to: Point, from: Point | null): void => {
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = 1;

      /*
        The line is what makes a fast swipe a stroke rather than a dotted trail:
        pointer moves arrive once a frame at best, and a finger crossing 300px
        inside one frame would otherwise leave two dots and a gap between them.
      */
      if (from !== null) {
        ctx.lineWidth = SCRATCH_RADIUS * 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(to.x, to.y, SCRATCH_RADIUS, 0, TAU);
      ctx.fill();
    };

    /** Fraction of the panel erased, measured on a coarse grid. */
    const clearedFraction = (): number => {
      const { width, height } = canvas;

      if (width === 0 || height === 0) {
        return 0;
      }

      const { data } = ctx.getImageData(0, 0, width, height);
      const step = Math.max(1, Math.round(SAMPLE_STEP * ratio));
      let sampled = 0;
      let cleared = 0;

      for (let y = 0; y < height; y += step) {
        const row = y * width;

        for (let x = 0; x < width; x += step) {
          sampled += 1;

          if (data[(row + x) * 4 + 3] < CLEAR_ALPHA) {
            cleared += 1;
          }
        }
      }

      return sampled === 0 ? 0 : cleared / sampled;
    };

    const checkForCompletion = (): void => {
      if (finished) {
        return;
      }

      if (clearedFraction() >= CLEARED_THRESHOLD) {
        finished = true;
        scratching = false;
        handleCleared();
      }
    };

    const handlePointerDown = (event: PointerEvent): void => {
      if (finished || !event.isPrimary) {
        return;
      }

      scratching = true;
      last = positionOf(event);

      /*
        Capture keeps the rest of the gesture coming here even once the finger
        leaves the panel, which is how a stroke that runs off the edge stays one
        stroke instead of ending and restarting.
      */
      canvas.setPointerCapture(event.pointerId);

      /*
        A touch is not committed to being a scratch yet — the browser may still
        claim the gesture as a scroll — so nothing is erased until a move
        actually arrives. Erasing on contact would mean every scroll that
        happened to start on the panel took a bite out of it. A mouse has no
        such ambiguity, and a plain click on a scratch panel should mark it.
      */
      if (event.pointerType === "mouse") {
        erase(last, null);
      }
    };

    const handlePointerMove = (event: PointerEvent): void => {
      if (!scratching || finished) {
        return;
      }

      /*
        Only ever reached inside a scratch the browser has already declined to
        turn into a scroll, so this cannot swallow a page gesture.
      */
      event.preventDefault();

      const point = positionOf(event);
      erase(point, last);
      last = point;
      movesSinceSample += 1;

      if (movesSinceSample >= MOVES_PER_SAMPLE) {
        movesSinceSample = 0;
        checkForCompletion();
      }
    };

    const handlePointerEnd = (event: PointerEvent): void => {
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }

      if (!scratching) {
        return;
      }

      scratching = false;
      /*
        The end of a stroke is the likeliest moment to have crossed the
        threshold, and the sampler may have skipped the last few moves, so it is
        always checked here rather than left to the next stroke.
      */
      checkForCompletion();
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    canvas.addEventListener("pointerup", handlePointerEnd);
    canvas.addEventListener("pointercancel", handlePointerEnd);

    /*
      A resize repaints from scratch, losing whatever had been cleared. That is
      the deliberate trade: the alternative is rescaling a snapshot of the
      erased mask, and a stretched mask on a rotated phone looks worse than a
      fresh panel does.
    */
    const observer = new ResizeObserver(() => {
      if (!finished) {
        paint();
      }
    });
    observer.observe(host);

    paint();

    return () => {
      observer.disconnect();
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerEnd);
      canvas.removeEventListener("pointercancel", handlePointerEnd);
    };
    /*
      `showCanvas` is a dependency and `phase` is not, which is the distinction
      that matters: the fade must not repaint the panel the guest just cleared,
      but a canvas that mounts again — a guest turning reduced motion off
      mid-session — must be painted rather than left as a transparent sheet over
      the content.
    */
  }, [accent, surface, label, handleCleared, showCanvas]);

  return (
    <div>
      <div ref={hostRef} className="relative">
        {children}

        {showCanvas ? (
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="absolute inset-0 h-full w-full select-none"
            style={{
              /*
                The whole scroll story in one declaration: the browser keeps
                vertical drags for itself and hands sideways ones to the
                pointer handlers above.
              */
              touchAction: "pan-y",
              opacity: phase === "fading" ? 0 : 1,
              transition: "opacity " + FADE_MS + "ms ease-out",
            }}
          />
        ) : null}
      </div>

      {/*
        Required, not a nicety. A guest using a switch, a head pointer, or a
        trackpad they cannot drag accurately still has to be able to read where
        the wedding is, and "scratch harder" is not an answer. Visible rather
        than sr-only for the same reason.
      */}
      {showCanvas ? (
        <div className="flex justify-center pb-6">
          <button
            type="button"
            onClick={revealNow}
            className="min-h-11 rounded-full px-4 text-[0.8125rem] font-medium underline decoration-transparent underline-offset-4 transition-colors duration-150 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: accent, outlineColor: accent }}
          >
            Reveal without scratching
          </button>
        </div>
      ) : null}

      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
