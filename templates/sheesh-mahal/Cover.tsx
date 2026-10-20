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
  DOOR,
  MEDALLION,
  RIPPLE_FROM,
  WALL_ASPECT,
  WALL_GLINTS,
} from "@/templates/sheesh-mahal/art";
import { DURATION } from "@/templates/sheesh-mahal/coverTiming";
import Glints from "@/templates/sheesh-mahal/Glints";
import { useCoverArt } from "@/templates/sheesh-mahal/picture";
import { isLite } from "@/templates/sheesh-mahal/lite";
import styles from "@/templates/sheesh-mahal/sheesh.module.css";
import { whenIdle } from "@/templates/sheesh-mahal/shared";

/**
 * Sheesh Mahal's opening: the guest taps a palace door of mirrors, and walks
 * in.
 *
 * ONLY THE DRAWING. The tap, the tick on Android, the guard against a second
 * tap, the wait for the pictures and the fonts, the loader in the card's
 * indigo, the wait for fullscreen (at most SETTLE_LIMIT), the sound and what a
 * guest who asked for less motion gets are all CoverShell's: this is handed a
 * phase and draws it. Under reduced motion the shell never hands over
 * "opening": the closed doors crossfade to page 2 in 300ms, with no sound, no
 * ripple and no zoom.
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
 *     the glow        soft gold round the medallion, breathing with it
 *     the wall        its doorway truly transparent
 *     the glints      forty stars on its mirror-work (Glints.tsx), which
 *                     answer the phone's tilt
 *   the prompt        "Tap to open" on a small indigo pill over the doors' foot
 *
 * The whole screen is the shell's button; the medallion, breathing until the
 * tap, is where the eye goes.
 *
 * THE OPENING, 3.3 seconds, to the sound's own timeline (NOTES.md, 19 Oct):
 *
 *   0 to 800      a ripple of light runs out across the mirrors from the
 *                 medallion, as the chimes ring
 *   600           the medallion splits along the seam
 *   750 to 2300   the doors swing open into the hall, as they creak
 *   2100 to 3000  the camera moves in: the wall and the doors grow and fade
 *                 and the hall settles from 1.15 to 1
 *   3000 to 3250  the cover's hall fades into page 2's own beneath it
 *   3300          the card is let go (`revealAt`): page 2's words make their
 *                 entrance now, in front of the guest
 *
 * EVERY ANIMATION IS MADE BEFORE THE TAP, in an idle moment once the closed
 * cover is showing, and held at its first frame; the tap only plays them.
 * Transform and opacity only; what waits out of sight waits at 1%, already
 * painted.
 */

const SOFT = "cubic-bezier(0.22, 1, 0.36, 1)";
/* Slow start, glide, soft stop: the doors' swing. */
const SWING = "cubic-bezier(0.45, 0.05, 0.25, 1)";
/* The camera: gathering pace as it goes through. */
const ONWARD = "cubic-bezier(0.5, 0, 0.7, 0.6)";

const SPLIT_AT = 600;
const DOORS_AT = 750;
const DOORS_END = 2300;
const CAMERA_AT = 2100;
const CAMERA_END = 3000;
const HALL_GONE = 3250;
/* The ripple: the nearest glint lights at once, the farthest by 450, each for 350. */
const RIPPLE_SPREAD = 450;
const RIPPLE_EACH = 350;

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
  glints: HTMLElement;
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

  /* The medallion's glow goes as the light leaves it for the mirrors. */
  add(parts.glow, [
    { offset: 0, opacity: 1, easing: "ease-out" },
    { offset: at(450), opacity: 0 },
    { offset: 1, opacity: 0 },
  ]);

  /* The ripple: each glint's warm star, lit in turn by how far it is from the medallion. */
  const narrow = window.matchMedia("(max-width: 399.98px)").matches;
  const lite = isLite();
  /* The farthest a glint is: a top corner of the wall's middle. */
  const far = Math.hypot(0.38, (RIPPLE_FROM.y - 0.04) / WALL_ASPECT);

  for (const flash of flashes) {
    const index = Number(flash.dataset.flash);
    const glint = WALL_GLINTS[index];

    if (glint === undefined || (narrow && !glint.core) || (lite && index % 2 === 1)) {
      continue;
    }

    const reach = Math.hypot(glint.x - RIPPLE_FROM.x, (glint.y - RIPPLE_FROM.y) / WALL_ASPECT) / far;
    const start = Math.min(1, reach) * RIPPLE_SPREAD;

    add(flash, [
      { offset: 0, opacity: 0.01, transform: "scale(0.2) rotate(0deg)" },
      { offset: at(start), opacity: 0.01, transform: "scale(0.2) rotate(0deg)", easing: "ease-out" },
      { offset: at(start + RIPPLE_EACH * 0.35), opacity: 1, transform: "scale(1.5) rotate(25deg)", easing: "ease-in" },
      { offset: at(start + RIPPLE_EACH), opacity: 0.01, transform: "scale(0.5) rotate(45deg)" },
      { offset: 1, opacity: 0.01, transform: "scale(0.5) rotate(45deg)" },
    ]);
  }

  /* The glints go before the camera moves, so none is ever drawn growing. */
  add(parts.glints, [
    { offset: 0, opacity: 1 },
    { offset: at(CAMERA_AT - 150), opacity: 1, easing: "ease-in" },
    { offset: at(CAMERA_AT + 100), opacity: 0 },
    { offset: 1, opacity: 0 },
  ]);

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

  /* The hall settles to page 2's own size, then fades into page 2's own hall beneath it. */
  add(parts.hall, [
    { offset: 0, transform: "scale(1.15)", opacity: 1 },
    { offset: at(CAMERA_AT), transform: "scale(1.15)", opacity: 1, easing: SOFT },
    { offset: at(CAMERA_END), transform: "scale(1)", opacity: 1, easing: "ease-in-out" },
    { offset: at(HALL_GONE), transform: "scale(1)", opacity: 0 },
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
  /* The set this guest's connection was given; none until the page wakes (the loader is over it until then). */
  const art = useCoverArt();
  const groundRef = useRef<HTMLDivElement>(null);
  const hallRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const doorLeftRef = useRef<HTMLDivElement>(null);
  const doorRightRef = useRef<HTMLDivElement>(null);
  const halfLeftRef = useRef<HTMLDivElement>(null);
  const halfRightRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const preparedRef = useRef<Animation[] | null>(null);
  const startedRef = useRef(false);

  const prepare = (): Animation[] | null => {
    if (preparedRef.current !== null) {
      return preparedRef.current;
    }

    const scene = sceneRef.current;
    const refs = {
      ground: groundRef.current,
      hall: hallRef.current,
      scene,
      doorLeft: doorLeftRef.current,
      doorRight: doorRightRef.current,
      halfLeft: halfLeftRef.current,
      halfRight: halfRightRef.current,
      glow: glowRef.current,
      glints: scene?.querySelector<HTMLElement>("[data-glints]") ?? null,
    };

    if (scene === null || Object.values(refs).some((element) => element === null)) {
      return null;
    }

    const flashes = [...scene.querySelectorAll<HTMLElement>("[data-flash]")];
    preparedRef.current = buildOpening(refs as Parts, flashes);
    return preparedRef.current;
  };

  /*
    Made ahead, in an idle moment once the closed cover is showing, a few
    frames after it was first painted. Nothing in them is measured: every
    distance is a share of its own box, so a screen that changes size (going
    fullscreen at the tap) changes nothing.
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

  /* The tap, once the screen has settled: everything played. */
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
      <div
        ref={groundRef}
        className={styles.coverGround}
        style={art === null ? undefined : ({ "--sm-wall": `url("${art.wall}")` } as CSSProperties)}
      />

      {/* The hall, laid exactly as page 2 lays its ground. */}
      <div className={styles.coverHallColumn}>
        <div ref={hallRef} className={styles.coverHall}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={art?.hall} alt="" draggable={false} className={styles.roomArt} />
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
            <img src={art?.doorLeft} alt="" draggable={false} className={styles.doorArt} />
            <div ref={halfLeftRef} className={`${styles.medallion} ${styles.medallionLeft}`} style={medallionBox("right")}>
              <div className={styles.medallionFace}>{medallion}</div>
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
            <img src={art?.doorRight} alt="" draggable={false} className={styles.doorArt} />
            <div ref={halfRightRef} className={`${styles.medallion} ${styles.medallionRight}`} style={medallionBox("left")}>
              <div className={styles.medallionFace}>{medallion}</div>
            </div>
          </div>

          {/* The medallion's soft gold glow, breathing with it until the tap. */}
          <div
            ref={glowRef}
            className={styles.medallionGlow}
            style={{ left: pc(MEDALLION.x), top: pc(MEDALLION.y), width: pc(MEDALLION.size * 3.2) }}
          >
            <span className={styles.medallionGlowPulse} />
          </div>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={art?.wall} alt="" draggable={false} fetchPriority="high" className={styles.wallArt} />

        <Glints glints={WALL_GLINTS} listen={ready && !opening} flashes />
      </div>

      {/* Over the foot of the doors, where a thumb already is; clear of Skip. */}
      <p
        className={`${styles.coverPrompt} ${opening ? "" : styles.coverPromptIdle}`}
        style={{
          ...headingFont,
          opacity: opening ? 0 : undefined,
          transition: opening ? "opacity 220ms ease-out" : undefined,
        }}
      >
        <span className={styles.coverPromptPill}>{prompt}</span>
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
