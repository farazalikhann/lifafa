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

/**
 * Breathing room the covering keeps around the text it hides, in CSS pixels.
 *
 * The panel used to be `inset-0` over a section box that is a whole screen
 * tall, which drew a grey slab across the card rather than a scratch card's
 * silver strip. These two numbers are what make it a sticker instead: the host
 * container shrinks to the children's own size, and the covering is that box
 * plus this much on each side — enough that the text is not touching the edge,
 * not so much that the patch starts sprawling again.
 */
const PAD_X = 12;
const PAD_Y = 8;

/** Corner rounding of the patch, in CSS pixels. A sticker, not a patch of tape. */
const RADIUS = 12;

/** How far inside the edge the hairline border sits. */
const BORDER_INSET = 3;

/** Faint enough to define the edge without drawing attention to itself. */
const BORDER_ALPHA = 0.22;

/** Side of the repeating motif tile at full size, in CSS pixels. */
const TILE = 26;

/**
 * The tile never shrinks below this.
 *
 * The motif has to scale with the patch — a 26px tile across a 30px strip is
 * one giant half cut diamond and reads as a rendering fault — but past a point
 * the shapes stop being a motif and turn into noise, so the scaling stops here.
 */
const TILE_MIN = 10;

/** The diamond and the corner dots, as fractions of the tile's side. */
const DIAMOND_RATIO = 4.5 / 26;
const DOT_RATIO = 1.6 / 26;

/** Faint enough to read as texture rather than as a picture. */
const MOTIF_ALPHA = 0.16;

/**
 * Label widths. Below the first the sentence is dropped for one word; below the
 * second there is no honest way to set any text at all and the pattern is left
 * to say "there is something under here" on its own.
 */
const LABEL_FULL_MIN = 200;
const LABEL_NONE_MAX = 120;

/** What the label degrades to when the patch is too narrow for the sentence. */
const SHORT_LABEL = "Scratch";

/** Type sizes for the label, in CSS pixels. */
const LABEL_MAX_SIZE = 21;
const LABEL_MIN_SIZE = 11;

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
 * Everything a section needs to put one of its own lines behind a panel.
 *
 * Passed down as a single object rather than four props, because a section
 * either has a panel or it does not — `null` is the whole "no scratch here"
 * case, and there is no way to spread three of the four by accident.
 */
export interface ScratchConfig {
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
 * What the label says at this width, or null when there is no room for words.
 *
 * A sentence set across a 130px sticker is either four lines of nothing or one
 * line clipped at both ends. Dropping to a single word, and then to no word at
 * all, is what lets the same component cover a whole date line and a three
 * digit countdown unit without either looking like a mistake.
 */
function labelFor(label: string, width: number): string | null {
  if (width < LABEL_NONE_MAX) {
    return null;
  }

  return width < LABEL_FULL_MIN ? SHORT_LABEL : label;
}

/**
 * The tile side for a patch this size.
 *
 * Roughly three repeats across the shorter edge, so the texture reads as a
 * pattern at every size the panel is asked to cover, clamped at both ends.
 */
function motifSide(width: number, height: number): number {
  const fitted = Math.min(width, height) / 3;
  return Math.round(Math.max(TILE_MIN, Math.min(TILE, fitted)));
}

/**
 * Traces the patch's outline on the current path.
 *
 * `roundRect` is the whole reason this exists rather than a `rect` call, and
 * the fallback is the reason it is a function: Safari only grew the method in
 * 16, and on an older phone a square path under the element's CSS rounding
 * still produces a rounded sticker — the corners are simply clipped rather
 * than drawn, which costs the inner hairline its curve and nothing else.
 */
function tracePatch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath();

  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.rect(x, y, width, height);
  }
}

/**
 * One tile of the motif, drawn at device resolution.
 *
 * Built at `ratio` scale rather than at 1x and stretched, because the point of
 * the devicePixelRatio work below is that the panel is not the one soft
 * rectangle on an otherwise crisp card. `side` is passed in rather than read
 * from TILE so the shapes scale with the patch instead of being cropped by it.
 */
function motifTile(
  accent: string,
  ratio: number,
  side: number,
): HTMLCanvasElement | null {
  const tile = document.createElement("canvas");
  tile.width = Math.max(1, Math.round(side * ratio));
  tile.height = tile.width;

  const ctx = tile.getContext("2d");

  if (ctx === null) {
    return null;
  }

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.globalAlpha = MOTIF_ALPHA;
  ctx.fillStyle = accent;

  /* A diamond in the middle of the tile. */
  const centre = side / 2;
  const radius = side * DIAMOND_RATIO;
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
    { x: side, y: 0 },
    { x: 0, y: side },
    { x: side, y: side },
  ];

  const dot = side * DOT_RATIO;

  for (const corner of corners) {
    ctx.beginPath();
    ctx.arc(corner.x, corner.y, dot, 0, TAU);
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
 * SIZE. The host is an inline-block that shrinks to whatever it is given, so
 * the panel is the size of the words underneath it and not the size of the
 * screen. That is a change of contract as much as of styling: callers pass the
 * lines they want hidden, not the section those lines live in. A whole section
 * handed to this component would be a screen-tall slab again, whatever the
 * host's width does.
 *
 * SCROLLING. This canvas sits on a page whose entire job is to be scrolled, so
 * the risk is not that scratching fails but that scrolling does.
 * `touch-action: pan-y` is what resolves it: a vertical drag is claimed by the
 * browser as a scroll before a single `pointermove` reaches this component — we
 * get `pointercancel` instead — while a sideways drag, the gesture a scratch
 * card asks for anyway, is delivered here. `preventDefault` is called only on
 * moves arriving inside a scratch already in progress, so a gesture this
 * component is not handling is never one it can block.
 */
export default function ScratchPanel({
  accent,
  surface,
  label,
  preCleared,
  onCoveredChange,
  children,
}: ScratchConfig & {
  /**
   * Told whenever the content underneath goes from hidden to visible.
   *
   * The countdown is the caller that needs it: a per-second interval running
   * behind an opaque cover is spent battery, and the number it leaves in the
   * DOM is stale by the time anybody sees it. Optional, because every other
   * caller hides text that does not change.
   */
  onCoveredChange?: (covered: boolean) => void;
  children: ReactNode;
}): ReactElement {
  const hostRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
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
    Covered means "nobody can read this yet", which stops at the start of the
    fade rather than at the end of it: by then the canvas is on its way out and
    a caller waiting to do something on reveal has a full 400ms to do it before
    the content is actually legible.
  */
  const isCovered = phase === "hiding";

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

  /* Fires on mount as well as on reveal, so a caller never has to guess. */
  useEffect(() => {
    onCoveredChange?.(isCovered);
  }, [isCovered, onCoveredChange]);

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

    /**
     * Narrows the covering from the text's box to the text itself.
     *
     * A paragraph is a block: it fills the column it is in whether or not its
     * words do. The card's date line is the case that proves it — its
     * `max-w-[16ch]` comes to 315px, which at 360px is wider than the 304px
     * column, so the block takes the full width and the two balanced lines
     * inside it sit 34px short of each edge. Covering the block would leave
     * that as empty patch on both sides.
     *
     * So the text nodes are walked and their client rects unioned. Per text
     * node and per rect, because a Range spanning elements reports their border
     * boxes — the very blocks being escaped — while `getClientRects` on a text
     * node reports one rect per line box, which is the shape a scratch card's
     * foil actually has.
     *
     * The host box remains the fallback and the ceiling: text that cannot be
     * measured, or that reaches wider than the box, means covering the whole
     * box, never less than it. Height is deliberately left to the box, because
     * a line box is the type's own extent and would crop the leading it is set
     * with.
     */
    const fitToInk = (): void => {
      const hostRect = host.getBoundingClientRect();
      const content = contentRef.current;

      let inkLeft = Infinity;
      let inkRight = -Infinity;

      if (content !== null) {
        const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
        const range = document.createRange();

        for (
          let node = walker.nextNode();
          node !== null;
          node = walker.nextNode()
        ) {
          if ((node.textContent ?? "").trim().length === 0) {
            continue;
          }

          range.selectNodeContents(node);

          for (const rect of range.getClientRects()) {
            if (rect.width < 1) {
              continue;
            }

            inkLeft = Math.min(inkLeft, rect.left);
            inkRight = Math.max(inkRight, rect.right);
          }
        }
      }

      const inkWidth = inkRight - inkLeft;
      const fits = inkWidth >= 1 && inkWidth <= hostRect.width;

      const left = fits ? inkLeft - hostRect.left - PAD_X : -PAD_X;
      const width = (fits ? inkWidth : hostRect.width) + PAD_X * 2;

      canvas.style.left = left + "px";
      canvas.style.width = width + "px";
    };

    const paint = (): void => {
      /*
        Fitted first, then measured. The canvas rather than the host is what is
        read here: the host is the text's box and the canvas is the covering
        over it, which after `fitToInk` is neither the same width nor the same
        position. Measuring the host would paint a covering that missed on
        every side.
      */
      fitToInk();

      const rect = canvas.getBoundingClientRect();

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

      /* Never more than half the shorter side, or the corners cross over. */
      const radius = Math.min(RADIUS, rect.width / 2, rect.height / 2);

      tracePatch(ctx, 0, 0, rect.width, rect.height, radius);
      ctx.fillStyle = surface;
      ctx.fill();

      const tile = motifTile(accent, ratio, motifSide(rect.width, rect.height));
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
        tracePatch(ctx, 0, 0, rect.width, rect.height, radius);
        ctx.fill();
      }

      /*
        A hairline just inside the edge, following the same curve.

        The dashed inset rule this replaces was set 10px in, which was legible
        across a whole section and absurd across a 30px strip — on a short patch
        the two dashed edges met in the middle. One faint line hugging the
        rounding says the same thing at every size the panel now has to work at.
      */
      ctx.globalAlpha = BORDER_ALPHA;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      tracePatch(
        ctx,
        BORDER_INSET + 0.5,
        BORDER_INSET + 0.5,
        Math.max(0, rect.width - BORDER_INSET * 2 - 1),
        Math.max(0, rect.height - BORDER_INSET * 2 - 1),
        Math.max(0, radius - BORDER_INSET),
      );
      ctx.stroke();

      const text = labelFor(label, rect.width);

      if (text !== null) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = labelColour(accent, surface);
        /* Resolved off the host, so the label is set in the card's own face. */
        const family = window.getComputedStyle(host).fontFamily;
        const face = family.length > 0 ? family : "sans-serif";

        /*
          Sized from the patch and then shrunk until it actually fits, rather
          than sized and hoped for. The width test is the one that matters —
          the height cap only bites on a strip too short to set the type at all
          — and the floor is what stops a very narrow patch chasing the text
          down to something unreadable instead of having dropped it already.
        */
        let size = Math.round(
          Math.min(
            LABEL_MAX_SIZE,
            Math.max(LABEL_MIN_SIZE, rect.width * 0.051),
            Math.max(LABEL_MIN_SIZE, rect.height * 0.5),
          ),
        );

        const room = rect.width - PAD_X * 2;
        ctx.font = size + "px " + face;

        while (size > LABEL_MIN_SIZE && ctx.measureText(text).width > room) {
          size -= 1;
          ctx.font = size + "px " + face;
        }

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, rect.width / 2, rect.height / 2);
      }

      ctx.globalAlpha = 1;
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

      Observing the host and not the canvas is deliberate too. The host is the
      text's own box — it is what actually changes size when the type reflows —
      and the canvas follows it by construction, so this fires exactly once per
      real change rather than twice.
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
    /*
      NO LAYOUT SHIFT, BY CONSTRUCTION.

      The children are laid out normally and always have been, so this box is
      exactly their height before the canvas ever mounts. Everything the panel
      adds — the covering, the escape hatch under it — is absolutely positioned
      and contributes no height at all, so the moment it is revealed nothing
      moves. That is also what lets `paint()` read a real bounding box on its
      first run rather than a zero-height one it would have to be re-run for.

      `inline-block` with `w-fit` is the shrink to fit, written twice on
      purpose: a flex item has its display blockified, so the `inline-block`
      alone would be dropped in exactly the place this component is used most.
      `max-w-full` keeps a long line inside the card at 360px, and `align-top`
      stops the inline box reserving descender space it has no text in.
    */
    <div
      ref={hostRef}
      className="relative inline-block w-fit max-w-full align-top"
    >
      {/*
        A plain wrapper, and the only reason it exists is that `fitToInk` needs
        a node holding the caller's content and nothing else. A Range taken over
        the host would take in the canvas that is being sized from it, which is
        as circular as it sounds. It fills the host and adds no box of its own.
      */}
      <div ref={contentRef}>{children}</div>

      {showCanvas ? (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute select-none"
          style={{
            /*
              Explicit width and height rather than paired insets. A canvas is a
              replaced element with an intrinsic size, so `left` and `right`
              together with `width: auto` would resolve to the backing store's
              own width and ignore the right edge entirely.

              The width here is the whole content box, which `fitToInk` then
              narrows to the words. Starting wide and tightening — rather than
              starting at nothing and growing — is what stops the content being
              legible for the frame between mount and the first paint.
            */
            left: -PAD_X,
            top: -PAD_Y,
            width: `calc(100% + ${PAD_X * 2}px)`,
            height: `calc(100% + ${PAD_Y * 2}px)`,
            borderRadius: RADIUS,
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

      {/*
        Required, not a nicety. A guest using a switch, a head pointer, or a
        trackpad they cannot drag accurately still has to be able to read where
        the wedding is, and "scratch harder" is not an answer. Visible rather
        than sr-only for the same reason.

        Directly beneath the patch and out of flow, so it takes no height with
        it when it goes. Small and muted because it is the second thing to try,
        not the first — but the tap target stays 44px however small the words
        are, since the guests most likely to need it are the ones least able to
        hit something smaller.
      */}
      {showCanvas ? (
        <div
          className="absolute left-1/2 z-10 flex -translate-x-1/2 justify-center whitespace-nowrap"
          style={{
            top: `calc(100% + ${PAD_Y + 6}px)`,
            opacity: phase === "fading" ? 0 : 1,
            transition: "opacity " + FADE_MS + "ms ease-out",
          }}
        >
          <button
            type="button"
            onClick={revealNow}
            className="min-h-11 rounded-full px-3 text-xs font-medium underline decoration-transparent underline-offset-4 opacity-70 transition-opacity duration-150 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2"
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
