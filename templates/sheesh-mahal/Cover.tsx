"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ReactElement,
} from "react";
import type { CoverVisualState } from "@/components/invite/CoverShell";
import GoldFlower from "@/components/invite/covers/GoldFlower";
import { initialOf, initialsOf } from "@/components/invite/covers/initials";
import {
  ART,
  DIYA_ASPECT,
  DOOR,
  DOORWAY_FOCUS,
  MEDALLION,
  RIPPLE_FROM,
  WALL_ASPECT,
  WALL_GLINTS,
  WICK,
} from "@/templates/sheesh-mahal/art";
import { DURATION } from "@/templates/sheesh-mahal/coverTiming";
import Glints from "@/templates/sheesh-mahal/Glints";
import styles from "@/templates/sheesh-mahal/sheesh.module.css";
import { whenIdle } from "@/templates/sheesh-mahal/shared";

/**
 * Sheesh Mahal's opening: the guest lights a diya before a palace door of
 * mirrors, and walks in.
 *
 * ONLY THE DRAWING. The tap, the tick on Android, the guard against a second
 * tap, the wait for the pictures and the fonts, the loader in the card's
 * indigo, the sound and what a guest who asked for less motion gets are all
 * CoverShell's: this is handed a phase and draws it. Under reduced motion the
 * shell never hands over "opening": the flame is lit by the stylesheet off
 * the shell's own `data-phase` as the whole cover crossfades to page 2 in
 * 300ms, with no sound, no ripple and no zoom.
 *
 * THE LAYERS, back to front:
 *
 *   the ground        indigo, and the wall again darkened beyond it on a
 *                     screen wider than the wall
 *   the hall          laid exactly as page 2 lays it, at 1.15, behind it all
 *   the scene         the wall's box, covering the screen with its doorway in
 *                     the middle and its foot on the screen's foot:
 *     the doors       behind the wall, 650/1024 of it across, each turning
 *                     about its outer edge in 3D, each carrying its half of
 *                     the medallion on the seam
 *     the wall        its doorway truly transparent
 *     the glints      forty stars on its mirror-work (Glints.tsx), which
 *                     answer the phone's tilt
 *   the warm glow     from the diya, over the wall
 *   the diya          at the foot, its flame at the wick, and the prompt
 *
 * THE OPENING, about 3.5 seconds, to the sound's own timeline (NOTES.md):
 *
 *   0             the flame catches at the wick and flickers on; a warm glow
 *                 grows from the diya
 *   450 to 1300   a ripple of light runs out across the mirrors from the diya
 *   1100          the medallion splits along the seam
 *   1250 to 2800  the doors swing open into the hall
 *   2600 to 3500  the camera moves in: the wall and the doors grow and fade,
 *                 the diya passes below, and the hall settles from 1.15 to 1
 *   3300          the card is let go under the cover (`revealAt`), on the
 *                 same hall, so its names arrive as the cover's hall fades
 *                 into page 2's own, never a blank frame
 *
 * EVERY ANIMATION IS MADE BEFORE THE TAP, in an idle moment once the closed
 * cover is showing, and held at its first frame; the tap only plays them.
 * Transform and opacity only; what waits out of sight waits at 1%, already
 * painted.
 */

const SPRING = "cubic-bezier(0.34, 1.5, 0.64, 1)";
const SOFT = "cubic-bezier(0.22, 1, 0.36, 1)";
/* Slow start, glide, soft stop: the doors' swing. */
const SWING = "cubic-bezier(0.45, 0.05, 0.25, 1)";
/* The camera: gathering pace as it goes through. */
const ONWARD = "cubic-bezier(0.5, 0, 0.7, 0.6)";

const DOORS_AT = 1250;
const DOORS_END = 2800;
const SPLIT_AT = 1100;
const CAMERA_AT = 2600;
const CAMERA_END = 3500;
/* The ripple: the first glint lights at 450, the farthest by 1000, each for 380. */
const RIPPLE_AT = 450;
const RIPPLE_SPREAD = 550;
const RIPPLE_EACH = 380;

const pc = (share: number): string => `${(share * 100).toFixed(2)}%`;

interface Parts {
  ground: HTMLElement;
  hall: HTMLElement;
  scene: HTMLElement;
  doorLeft: HTMLElement;
  doorRight: HTMLElement;
  halfLeft: HTMLElement;
  halfRight: HTMLElement;
  glow: HTMLElement;
  diya: HTMLElement;
  flame: HTMLElement;
  halo: HTMLElement;
}

/** Every animation of the opening, made now and held at its first frame. */
function buildOpening(parts: Parts, flashes: readonly HTMLElement[]): Animation[] {
  const at = (ms: number): number => Math.min(1, Math.max(0, ms / DURATION));
  const timing: KeyframeAnimationOptions = { duration: DURATION, fill: "forwards" };
  const animations: Animation[] = [];
  const add = (element: HTMLElement, keyframes: Keyframe[], options = timing): void => {
    const animation = element.animate(keyframes, options);
    animation.pause();
    animations.push(animation);
  };

  /* The flame catches: up from nothing on a spring, and its halo with it. */
  add(parts.flame, [
    { offset: 0, opacity: 0.01, transform: "scale(0.2)", easing: SPRING },
    { offset: at(420), opacity: 1, transform: "scale(1)" },
    { offset: 1, opacity: 1, transform: "scale(1)" },
  ]);
  add(parts.halo, [
    { offset: 0, opacity: 0.01, transform: "scale(0.3)", easing: SOFT },
    { offset: at(700), opacity: 1, transform: "scale(1)" },
    { offset: 1, opacity: 1, transform: "scale(1)" },
  ]);

  /* The warm glow grows from the diya, and goes with the camera. */
  add(parts.glow, [
    { offset: 0, opacity: 0.01, transform: "scale(0.25)", easing: SOFT },
    { offset: at(1300), opacity: 1, transform: "scale(1)" },
    { offset: at(CAMERA_AT), opacity: 1, transform: "scale(1)", easing: "ease-in" },
    { offset: at(3300), opacity: 0, transform: "scale(1.5)" },
    { offset: 1, opacity: 0, transform: "scale(1.5)" },
  ]);

  /* The ripple: each glint's warm star, lit in turn by how far it is from the diya. */
  const narrow = window.matchMedia("(max-width: 399.98px)").matches;
  const far = Math.hypot(0.5, 0.9 / WALL_ASPECT);

  for (const flash of flashes) {
    const glint = WALL_GLINTS[Number(flash.dataset.flash)];

    if (glint === undefined || (narrow && !glint.core)) {
      continue;
    }

    const reach = Math.hypot(glint.x - RIPPLE_FROM.x, (glint.y - RIPPLE_FROM.y) / WALL_ASPECT) / far;
    const start = RIPPLE_AT + Math.min(1, reach) * RIPPLE_SPREAD;

    add(flash, [
      { offset: 0, opacity: 0.01, transform: "scale(0.2) rotate(0deg)" },
      { offset: at(start), opacity: 0.01, transform: "scale(0.2) rotate(0deg)", easing: "ease-out" },
      { offset: at(start + RIPPLE_EACH * 0.35), opacity: 1, transform: "scale(1.5) rotate(25deg)", easing: "ease-in" },
      { offset: at(start + RIPPLE_EACH), opacity: 0.01, transform: "scale(0.5) rotate(45deg)" },
      { offset: 1, opacity: 0.01, transform: "scale(0.5) rotate(45deg)" },
    ]);
  }

  /* The medallion splits along the seam: each half drawn a little apart, then carried off on its door. */
  for (const [half, side] of [
    [parts.halfLeft, -1],
    [parts.halfRight, 1],
  ] as const) {
    add(half, [
      { offset: 0, transform: "translate3d(0, 0, 0) rotate(0deg)" },
      { offset: at(SPLIT_AT), transform: "translate3d(0, 0, 0) rotate(0deg)", easing: SOFT },
      { offset: at(SPLIT_AT + 220), transform: `translate3d(${side * 9}%, 0, 0) rotate(${side * 5}deg)` },
      { offset: 1, transform: `translate3d(${side * 9}%, 0, 0) rotate(${side * 5}deg)` },
    ]);
  }

  /* The doors swing into the hall, each about its outer edge. */
  for (const [door, side] of [
    [parts.doorLeft, 1],
    [parts.doorRight, -1],
  ] as const) {
    add(door, [
      { offset: 0, transform: "rotateY(0deg)" },
      { offset: at(DOORS_AT), transform: "rotateY(0deg)", easing: SWING },
      { offset: at(DOORS_END), transform: `rotateY(${side * 105}deg)` },
      { offset: 1, transform: `rotateY(${side * 105}deg)` },
    ]);
  }

  /* The camera moves in through the doorway: the wall and the doors grow and fade. */
  add(parts.scene, [
    { offset: 0, transform: "scale(1)", opacity: 1 },
    { offset: at(CAMERA_AT), transform: "scale(1)", opacity: 1, easing: ONWARD },
    { offset: at(CAMERA_END), transform: "scale(2.6)", opacity: 0 },
    { offset: 1, transform: "scale(2.6)", opacity: 0 },
  ]);

  /* The diya passes below as we walk past it. */
  add(parts.diya, [
    { offset: 0, transform: "translate3d(0, 0, 0) scale(1)", opacity: 1 },
    { offset: at(CAMERA_AT), transform: "translate3d(0, 0, 0) scale(1)", opacity: 1, easing: ONWARD },
    { offset: at(3350), transform: "translate3d(0, 34vh, 0) scale(1.9)", opacity: 0 },
    { offset: 1, transform: "translate3d(0, 34vh, 0) scale(1.9)", opacity: 0 },
  ]);

  /* The hall settles to page 2's own size, then fades into page 2's own hall beneath it. */
  add(parts.hall, [
    { offset: 0, transform: "scale(1.15)", opacity: 1 },
    { offset: at(CAMERA_AT), transform: "scale(1.15)", opacity: 1, easing: SOFT },
    { offset: at(CAMERA_END), transform: "scale(1)", opacity: 1, easing: "ease-in-out" },
    { offset: at(3850), transform: "scale(1)", opacity: 0 },
    { offset: 1, transform: "scale(1)", opacity: 0 },
  ]);

  /* The ground beyond the column, on a wide screen, goes with the camera. */
  add(parts.ground, [
    { offset: 0, opacity: 1 },
    { offset: at(CAMERA_AT), opacity: 1, easing: "ease-in-out" },
    { offset: at(CAMERA_END), opacity: 0 },
    { offset: 1, opacity: 0 },
  ]);

  return animations;
}

export default function SheeshMahalCover({
  phase,
  pair,
  title,
  prompt,
  namesFont,
  headingFont,
  ready,
  reducedMotion,
}: CoverVisualState): ReactElement {
  const opening = phase !== "closed";
  const groundRef = useRef<HTMLDivElement>(null);
  const hallRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const doorLeftRef = useRef<HTMLDivElement>(null);
  const doorRightRef = useRef<HTMLDivElement>(null);
  const halfLeftRef = useRef<HTMLDivElement>(null);
  const halfRightRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const diyaRef = useRef<HTMLDivElement>(null);
  const flameRef = useRef<HTMLSpanElement>(null);
  const haloRef = useRef<HTMLSpanElement>(null);
  const preparedRef = useRef<Animation[] | null>(null);
  const startedRef = useRef(false);

  const prepare = (): Animation[] | null => {
    if (preparedRef.current !== null) {
      return preparedRef.current;
    }

    const refs = {
      ground: groundRef.current,
      hall: hallRef.current,
      scene: sceneRef.current,
      doorLeft: doorLeftRef.current,
      doorRight: doorRightRef.current,
      halfLeft: halfLeftRef.current,
      halfRight: halfRightRef.current,
      glow: glowRef.current,
      diya: diyaRef.current,
      flame: flameRef.current,
      halo: haloRef.current,
    };

    if (Object.values(refs).some((element) => element === null)) {
      return null;
    }

    const scene = refs.scene as HTMLElement;
    const flashes = [...scene.querySelectorAll<HTMLElement>("[data-flash]")];
    preparedRef.current = buildOpening(refs as Parts, flashes);
    return preparedRef.current;
  };

  /*
    Made ahead, in an idle moment once the closed cover is showing, a few
    frames after it was first painted. Nothing in them is measured: every
    distance is a share of its own box, so a screen that changes size (the
    browser's bars going at the tap) changes nothing.
  */
  useEffect(() => {
    if (!ready || opening || reducedMotion) {
      return;
    }

    let cancelIdle: (() => void) | null = null;
    const timer = window.setTimeout(() => {
      cancelIdle = whenIdle(() => {
        prepare();
      });
    }, 300);

    return () => {
      window.clearTimeout(timer);
      cancelIdle?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, opening, reducedMotion]);

  /* The tap: everything played. */
  useEffect(() => {
    if (!opening || startedRef.current) {
      return;
    }

    startedRef.current = true;

    for (const animation of prepare() ?? []) {
      animation.play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opening]);

  /* Kept on their last frame until the shell takes the cover down, and gone with it. */
  useEffect(
    () => () => {
      for (const animation of preparedRef.current ?? []) {
        animation.cancel();
      }
    },
    [],
  );

  const medallion = (
    <Medallion pair={pair} title={title} namesFont={namesFont} headingFont={headingFont} />
  );
  /* The medallion's box in a door's own box: centred on the seam, at the handles. */
  const medallionBox = (seamAt: "left" | "right"): CSSProperties => {
    const width = MEDALLION.size / DOOR.width;

    return {
      width: pc(width),
      left: seamAt === "right" ? pc(1 - width / 2) : pc(-width / 2),
      top: pc((MEDALLION.y - DOOR.top) / DOOR.height - (width / 2) * (DOOR.width / DOOR.height) * WALL_ASPECT),
    };
  };

  return (
    <div
      aria-hidden="true"
      className={`${styles.cover} ${opening ? styles.coverOpening : ""}`}
    >
      <div ref={groundRef} className={styles.coverGround} />

      {/* The hall, laid exactly as page 2 lays its ground. */}
      <div className={styles.coverHallColumn}>
        <div ref={hallRef} className={styles.coverHall}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ART.hall} alt="" draggable={false} className={styles.roomArt} />
        </div>
      </div>

      <div ref={sceneRef} className={styles.coverScene}>
        <div className={styles.doorStage}>
          <div
            ref={doorLeftRef}
            className={`${styles.door} ${styles.doorLeft}`}
            style={{ left: pc(DOOR.left), top: pc(DOOR.top), width: pc(DOOR.width), height: pc(DOOR.height) }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ART.doorLeft} alt="" draggable={false} className={styles.doorArt} />
            <div ref={halfLeftRef} className={`${styles.medallion} ${styles.medallionLeft}`} style={medallionBox("right")}>
              {medallion}
            </div>
          </div>
          <div
            ref={doorRightRef}
            className={`${styles.door} ${styles.doorRight}`}
            style={{
              left: pc(DOOR.left + DOOR.width),
              top: pc(DOOR.top),
              width: pc(DOOR.width),
              height: pc(DOOR.height),
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ART.doorRight} alt="" draggable={false} className={styles.doorArt} />
            <div ref={halfRightRef} className={`${styles.medallion} ${styles.medallionRight}`} style={medallionBox("left")}>
              {medallion}
            </div>
          </div>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ART.wall} alt="" draggable={false} fetchPriority="high" className={styles.wallArt} />

        <Glints glints={WALL_GLINTS} listen={ready} flashes />
      </div>

      <div className={styles.diyaPlace}>
        <div ref={glowRef} className={styles.diyaGlow} style={{ left: pc(WICK.x), top: pc(WICK.y) }} />
        <div ref={diyaRef} className={styles.diya} style={{ aspectRatio: String(DIYA_ASPECT) }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ART.diya} alt="" draggable={false} className={styles.diyaArt} />
          <span className={styles.wick} style={{ left: pc(WICK.x), top: pc(WICK.y) }}>
            <span ref={haloRef} className={styles.flameHalo} />
            <span ref={flameRef} className={styles.flame}>
              <span className={styles.flameFlicker}>
                <span className={styles.flameBody} />
                <span className={styles.flameCore} />
              </span>
            </span>
          </span>
        </div>
      </div>

      {/* Under the diya, where a thumb already is. */}
      <p
        className={`${styles.coverPrompt} ${opening ? "" : styles.coverPromptIdle}`}
        style={{
          ...headingFont,
          opacity: opening ? 0 : undefined,
          transition: opening ? "opacity 220ms ease-out" : undefined,
        }}
      >
        {prompt}
      </p>
    </div>
  );
}

/**
 * The couple's initials, engraved in gold on the medallion: the first, a
 * small "&", the second. One name, or a title, gives up to two letters;
 * nobody named yet gives a small flower drawn in code.
 */
function Medallion({
  pair,
  title,
  namesFont,
  headingFont,
}: {
  pair?: readonly [string, string];
  title?: string;
  namesFont: CSSProperties;
  headingFont: CSSProperties;
}): ReactElement {
  if (pair !== undefined) {
    return (
      <span className={styles.medallionMark} style={headingFont}>
        <span>{initialOf(pair[0])}</span>
        <span className={styles.medallionAnd}>&amp;</span>
        <span>{initialOf(pair[1])}</span>
      </span>
    );
  }

  const letters = initialsOf(title);

  return letters.length > 0 ? (
    <span className={styles.medallionMark} style={namesFont}>
      {letters}
    </span>
  ) : (
    <span className={styles.medallionMark}>
      <GoldFlower hi="#fff0c8" body="#a8803a" lo="#5e4518" className="w-[58%]" />
    </span>
  );
}
