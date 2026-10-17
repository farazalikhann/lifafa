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
import { fontFamilyOf } from "@/lib/fontPairs";
import {
  ART,
  BODY_ASPECT,
  FLAP_BOX,
  FLAP_TIP,
  LETTER_ASPECT,
  PETAL_ASPECT,
  POCKET_CLIP,
  POCKET_DEPTH,
  SEAL_ASPECT,
  SEAL_DISC,
} from "@/templates/gulab-mahal/art";
import styles from "@/templates/gulab-mahal/gulab.module.css";
import { scriptLeading, whenIdle } from "@/templates/gulab-mahal/shared";
import { useFitInside } from "@/templates/gulab-mahal/useFitInside";

/**
 * Gulab Mahal's opening: a blush envelope under a rose-gold seal.
 *
 * ONLY THE DRAWING. The tap, the tick on Android, the guard against a second
 * tap, the wait for the pictures and the fonts, the loader, the sound (the
 * envelope's own) and what a guest who asked for less motion gets are all
 * CoverShell's: this is handed a phase and draws it. Under reduced motion the
 * shell never hands over "opening", so the closed envelope stays as it is
 * while the whole cover crossfades to the card in 300ms.
 *
 * THE LAYERS, back to front, all in one box the shape of the envelope's body:
 *
 *   the body              the whole envelope, its lining showing at the top
 *   the open flap         the flap's back, darkened, from 90 degrees on
 *   the letter            in a box that ends at the envelope's foot, so the
 *                         part of it still inside is never seen below it
 *   the pocket            the body again, cut to the pocket's front by a
 *                         clip that never changes: the letter slides out
 *                         from behind it
 *   the closed flap       from 0 to 90 degrees
 *   the petals, the seal  the seal whole, and its two halves, each cut along
 *                         the same jagged line by a clip that never changes
 *
 * At rest the envelope leans 4 degrees and bobs gently, the seal's glow
 * breathes, and the prompt is under it.
 *
 * THE 2.8 SECONDS, timed from the moment the phase leaves "closed", every
 * part an animation of transform and opacity:
 *
 *   0 to 150        the seal presses in
 *   150             it cracks: the whole seal gives way to its two halves
 *   150 to 1000     the halves part, spin outward and fall, fading; twelve
 *                   petals burst from the crack
 *   280 to 1080     the flap opens in 3D, turning about its top edge: the
 *                   front to 90 degrees, then its darkened back on to 180,
 *                   behind the letter
 *   300 to 1300     the envelope comes upright
 *   950 to 1750     the letter rises out of the pocket, the couple's names
 *                   on it in wine script
 *   1800 to 2700    the envelope drops away, gone within a quarter of a
 *                   second, while the letter grows to fill the screen
 *   2150 to 2750    the letter and the cover's blush fade; the card was let
 *                   go under them at 2150 (`revealAt` in config.ts), so page
 *                   2 is what they fade to, never a blank frame
 *
 * EVERY ANIMATION IS MADE BEFORE THE TAP, in an idle moment once the closed
 * envelope is showing, and held at its first frame, which is the envelope as
 * it rests; the tap only plays them. And everything that will be seen is
 * already painted: the parts that wait out of sight do so at 1% opacity or
 * hidden behind another part, never at 0, which a browser does not paint.
 */

const DURATION = 2800;
const SPRING = "cubic-bezier(0.34, 1.4, 0.64, 1)";
const SOFT = "cubic-bezier(0.22, 1, 0.36, 1)";
const GLIDE = "cubic-bezier(0.45, 0.05, 0.2, 1)";
const FALL = "cubic-bezier(0.45, 0, 0.8, 0.5)";
/* The flap's two halves of one swing: speeding up to 90 degrees, slowing after, at the same speed where they meet. */
const SWING_IN = "cubic-bezier(0.45, 0, 0.75, 0.6)";
const SWING_OUT = "cubic-bezier(0.25, 0.4, 0.55, 1)";

const CRACK_AT = 150;
const FLAP_AT = 280;
const FLAP_HALF = 400;
const LETTER_AT = 950;
const AWAY_AT = 1800;
const FADE_AT = 2150;
/* By when the envelope has faded and the letter's sleeve has dropped away. */
const SLEEVE_GONE = 2100;
/* The sleeve's drop and the letter's matching rise: speeding away. Then the letter's last stretch, slowing in. */
const LEAVE = "cubic-bezier(0.55, 0, 0.85, 0.45)";
const SETTLE = "cubic-bezier(0.2, 0.6, 0.35, 1)";

/** The seal's width, as a share of the envelope's. */
const SEAL_WIDTH = 0.27;

/** The letter's width, as a share of the envelope's. */
const LETTER_WIDTH = 0.74;

/*
  The letter's sleeve: a box that clips it, whose foot is the envelope's foot
  and which reaches far past the envelope on every other side, so the part of
  the letter still in the pocket is never seen below the envelope and the
  letter can still grow across the screen. In envelope widths across and
  envelope heights up; it drops with the envelope, taking its foot away.
*/
const SLEEVE = { side: 5, above: 8, width: 11, height: 9 };

/* The crack: one jagged line down the seal, as shares of its box. Both halves are cut along it. */
const CRACK: readonly (readonly [number, number])[] = [
  [0.53, 0], [0.47, 0.13], [0.55, 0.26], [0.46, 0.39], [0.54, 0.51],
  [0.45, 0.63], [0.53, 0.76], [0.47, 0.88], [0.51, 1],
];
const pc = (share: number): string => `${(share * 100).toFixed(1)}%`;
const crackLine = CRACK.map(([x, y]) => `${pc(x)} ${pc(y)}`);
const LEFT_HALF = `polygon(0% 0%, ${crackLine.join(", ")}, 0% 100%)`;
const RIGHT_HALF = `polygon(100% 0%, ${crackLine.join(", ")}, 100% 100%)`;

interface Burst {
  petal: number;
  /** Degrees clockwise from straight up. */
  angle: number;
  /** How far it flies, in envelope widths. */
  reach: number;
  /** Its width, in envelope widths. */
  size: number;
  spin: number;
  lag: number;
}

/* Twelve petals from the crack: a written table, so every opening is the same burst. */
const BURST: readonly Burst[] = [
  { petal: 0, angle: -10, reach: 0.34, size: 0.06, spin: 220, lag: 0 },
  { petal: 2, angle: 25, reach: 0.42, size: 0.085, spin: -260, lag: 30 },
  { petal: 1, angle: 60, reach: 0.38, size: 0.07, spin: 300, lag: 10 },
  { petal: 3, angle: 95, reach: 0.46, size: 0.08, spin: -200, lag: 45 },
  { petal: 0, angle: 130, reach: 0.33, size: 0.06, spin: 240, lag: 20 },
  { petal: 2, angle: 160, reach: 0.4, size: 0.085, spin: -320, lag: 55 },
  { petal: 1, angle: 195, reach: 0.37, size: 0.07, spin: 280, lag: 5 },
  { petal: 3, angle: 228, reach: 0.44, size: 0.08, spin: -240, lag: 40 },
  { petal: 0, angle: 262, reach: 0.35, size: 0.06, spin: 200, lag: 15 },
  { petal: 1, angle: 295, reach: 0.41, size: 0.07, spin: -280, lag: 50 },
  { petal: 2, angle: 325, reach: 0.39, size: 0.085, spin: 260, lag: 25 },
  { petal: 3, angle: 350, reach: 0.45, size: 0.08, spin: -220, lag: 35 },
];

interface Parts {
  ground: HTMLElement;
  lean: HTMLElement;
  back: HTMLElement;
  openFlap: HTMLElement;
  sleeve: HTMLElement;
  letter: HTMLElement;
  letterFace: HTMLElement;
  front: HTMLElement;
  closedFlap: HTMLElement;
  glow: HTMLElement;
  press: HTMLElement;
  whole: HTMLElement;
  left: HTMLElement;
  right: HTMLElement;
  petals: readonly HTMLElement[];
}

/** Where things are, read once from the layout (which transforms do not move): all the distances are from it. */
interface Measure {
  /** The envelope's width and height, px. */
  width: number;
  height: number;
  /** The screen. */
  screenW: number;
  screenH: number;
  /** The letter's box at rest, on the screen as laid out, px. */
  letter: { x: number; y: number; w: number; h: number };
  /** And from the envelope's own corner. */
  inside: { x: number; y: number };
}

function measure(parts: Parts, layer: HTMLElement): Measure {
  const box = parts.lean;
  /* Places by offsets, which ignore every transform, the lean and the bob included. */
  const from = (node: HTMLElement, stop: HTMLElement): { x: number; y: number } => {
    let x = 0;
    let y = 0;

    for (let at: HTMLElement | null = node; at !== null && at !== stop; at = at.offsetParent as HTMLElement | null) {
      x += at.offsetLeft;
      y += at.offsetTop;
    }

    return { x, y };
  };
  const onScreen = from(parts.letter, layer);
  const envelope = from(box, layer);

  return {
    width: box.offsetWidth,
    height: box.offsetHeight,
    screenW: layer.offsetWidth,
    screenH: layer.offsetHeight,
    letter: { ...onScreen, w: parts.letter.offsetWidth, h: parts.letter.offsetHeight },
    inside: { x: onScreen.x - envelope.x, y: onScreen.y - envelope.y },
  };
}

/** Every animation of the opening, made now and held at its first frame. */
function buildOpening(parts: Parts, m: Measure): Animation[] {
  const at = (ms: number): number => Math.min(1, Math.max(0, ms / DURATION));
  const timing: KeyframeAnimationOptions = { duration: DURATION, fill: "forwards" };
  const animations: Animation[] = [];
  const add = (element: HTMLElement, keyframes: Keyframe[]): void => {
    const animation = element.animate(keyframes, timing);
    animation.pause();
    animations.push(animation);
  };

  /* How far the letter rises: its top from below the V to well above the envelope. */
  const rise = m.height * (POCKET_DEPTH + 0.02) + m.width * 0.3;
  /* How far the envelope drops as it goes; the letter's sleeve drops a whole screen, which takes its foot off it. */
  const drop = m.screenH * 0.3;
  const away = m.screenH * 1.2;
  /*
    The letter, grown to cover the screen (the phone column on a wide one),
    centred on it; with room to spare in height, so a screen that grows when
    the browser's bars go is still covered.
  */
  const grow = Math.max(Math.min(m.screenW, 480) / m.letter.w, (m.screenH * 1.12) / m.letter.h);
  const toX = m.screenW / 2 - (m.letter.x + m.letter.w / 2);
  const toY = m.screenH / 2 - (m.letter.y + m.letter.h / 2);
  /* The letter's own way from risen to grown, `share` of the way along. */
  const toward = (share: number, under: number): string =>
    `translate3d(${(toX * share).toFixed(1)}px, ${(-rise + (toY + rise) * share - under).toFixed(1)}px, 0) scale(${(
      1 +
      (grow - 1) * share
    ).toFixed(3)})`;

  add(parts.ground, [
    { offset: 0, opacity: 1 },
    { offset: at(FADE_AT), opacity: 1, easing: "ease-in-out" },
    { offset: at(2650), opacity: 0 },
    { offset: 1, opacity: 0 },
  ]);

  add(parts.lean, [
    { offset: 0, transform: "rotate(-4deg)" },
    { offset: at(300), transform: "rotate(-4deg)", easing: GLIDE },
    { offset: at(1300), transform: "rotate(0deg)" },
    { offset: 1, transform: "rotate(0deg)" },
  ]);

  /*
    The envelope's two halves drop away and are gone within a quarter of a
    second, so the letter, which is behind the pocket, is never seen growing
    under it.
  */
  for (const part of [parts.back, parts.front]) {
    add(part, [
      { offset: 0, transform: "translate3d(0, 0, 0)", opacity: 1 },
      { offset: at(AWAY_AT), transform: "translate3d(0, 0, 0)", opacity: 1, easing: FALL },
      { offset: at(SLEEVE_GONE), transform: `translate3d(0, ${(drop * 0.55).toFixed(1)}px, 0)`, opacity: 0, easing: "linear" },
      { offset: at(2500), transform: `translate3d(0, ${drop.toFixed(1)}px, 0)`, opacity: 0 },
      { offset: 1, transform: `translate3d(0, ${drop.toFixed(1)}px, 0)`, opacity: 0 },
    ]);
  }

  /*
    The sleeve drops a screen and more between AWAY_AT and SLEEVE_GONE, and
    for exactly those offsets, with exactly that easing, the letter is put
    back up by the same amount: so on every frame the two cancel, and the
    letter moves only by its own way.
  */
  add(parts.sleeve, [
    { offset: 0, transform: "translate3d(0, 0, 0)" },
    { offset: at(AWAY_AT), transform: "translate3d(0, 0, 0)", easing: LEAVE },
    { offset: at(SLEEVE_GONE), transform: `translate3d(0, ${away.toFixed(1)}px, 0)` },
    { offset: 1, transform: `translate3d(0, ${away.toFixed(1)}px, 0)` },
  ]);

  add(parts.letter, [
    { offset: 0, transform: "translate3d(0, 0, 0) scale(1)" },
    { offset: at(LETTER_AT), transform: "translate3d(0, 0, 0) scale(1)", easing: SOFT },
    { offset: at(1750), transform: toward(0, 0) },
    { offset: at(AWAY_AT), transform: toward(0, 0), easing: LEAVE },
    { offset: at(SLEEVE_GONE), transform: toward(0.3, away), easing: SETTLE },
    { offset: at(2700), transform: toward(1, away) },
    { offset: 1, transform: toward(1, away) },
  ]);

  /* The letter fades into page 2 as it fills the screen: on its face, apart from its journey. */
  add(parts.letterFace, [
    { offset: 0, opacity: 1 },
    { offset: at(2250), opacity: 1, easing: "ease-in-out" },
    { offset: at(2750), opacity: 0 },
    { offset: 1, opacity: 0 },
  ]);

  /* The flap: its front to 90 degrees, then gone; its darkened back from 90 to 180, behind the letter. */
  const flapEnd = FLAP_AT + FLAP_HALF;
  add(parts.closedFlap, [
    { offset: 0, transform: "rotateX(0deg)", opacity: 1 },
    { offset: at(FLAP_AT), transform: "rotateX(0deg)", opacity: 1, easing: SWING_IN },
    { offset: at(flapEnd), transform: "rotateX(90deg)", opacity: 1 },
    { offset: at(flapEnd + 1), transform: "rotateX(90deg)", opacity: 0 },
    { offset: 1, transform: "rotateX(90deg)", opacity: 0 },
  ]);
  add(parts.openFlap, [
    { offset: 0, transform: "rotateX(180deg)", opacity: 0.01 },
    { offset: at(flapEnd - 1), transform: "rotateX(180deg)", opacity: 0.01 },
    { offset: at(flapEnd), transform: "rotateX(90deg)", opacity: 1, easing: SWING_OUT },
    { offset: at(flapEnd + FLAP_HALF), transform: "rotateX(180deg)", opacity: 1 },
    { offset: 1, transform: "rotateX(180deg)", opacity: 1 },
  ]);

  /* The seal: pressed, cracked, and its halves thrown. */
  add(parts.glow, [
    { offset: 0, opacity: 1 },
    { offset: at(260), opacity: 0 },
    { offset: 1, opacity: 0 },
  ]);
  add(parts.press, [
    { offset: 0, transform: "scale(1)", easing: "ease-out" },
    { offset: at(CRACK_AT), transform: "scale(0.93)" },
    { offset: 1, transform: "scale(0.93)" },
  ]);
  add(parts.whole, [
    { offset: 0, opacity: 1 },
    { offset: at(CRACK_AT - 1), opacity: 1 },
    { offset: at(CRACK_AT), opacity: 0 },
    { offset: 1, opacity: 0 },
  ]);

  const seal = m.width * SEAL_WIDTH;
  for (const [element, side] of [
    [parts.left, -1],
    [parts.right, 1],
  ] as const) {
    add(element, [
      { offset: 0, transform: "translate3d(0, 0, 0) rotate(0deg)", opacity: 0.01 },
      { offset: at(CRACK_AT - 1), transform: "translate3d(0, 0, 0) rotate(0deg)", opacity: 0.01 },
      { offset: at(CRACK_AT), transform: "translate3d(0, 0, 0) rotate(0deg)", opacity: 1, easing: "ease-out" },
      {
        offset: at(240),
        transform: `translate3d(${(side * seal * 0.04).toFixed(1)}px, 0, 0) rotate(${side * 4}deg)`,
        opacity: 1,
        easing: FALL,
      },
      {
        offset: at(1000),
        transform: `translate3d(${(side * seal * 0.9).toFixed(1)}px, ${(seal * (side < 0 ? 1.7 : 1.85)).toFixed(1)}px, 0) rotate(${side < 0 ? -58 : 50}deg)`,
        opacity: 0,
      },
      {
        offset: 1,
        transform: `translate3d(${(side * seal * 0.9).toFixed(1)}px, ${(seal * (side < 0 ? 1.7 : 1.85)).toFixed(1)}px, 0) rotate(${side < 0 ? -58 : 50}deg)`,
        opacity: 0,
      },
    ]);
  }

  BURST.forEach((burst, index) => {
    const element = parts.petals[index];

    if (element === undefined) {
      return;
    }

    const radians = (burst.angle * Math.PI) / 180;
    const outX = Math.sin(radians) * burst.reach * m.width;
    const outY = -Math.cos(radians) * burst.reach * m.width;
    const start = CRACK_AT + 10 + burst.lag;
    const rest = `translate3d(0px, 0px, 0) rotate(${burst.angle}deg) scale(1)`;

    add(element, [
      { offset: 0, transform: rest, opacity: 1 },
      { offset: at(start), transform: rest, opacity: 1, easing: SOFT },
      {
        offset: at(start + 520),
        transform: `translate3d(${outX.toFixed(1)}px, ${outY.toFixed(1)}px, 0) rotate(${burst.angle + burst.spin * 0.6}deg) scale(1)`,
        opacity: 1,
        easing: FALL,
      },
      {
        offset: at(start + 1050),
        transform: `translate3d(${(outX * 1.25).toFixed(1)}px, ${(outY * 1.1 + m.width * 0.38).toFixed(1)}px, 0) rotate(${burst.angle + burst.spin}deg) scale(0.9)`,
        opacity: 0,
      },
      {
        offset: 1,
        transform: `translate3d(${(outX * 1.25).toFixed(1)}px, ${(outY * 1.1 + m.width * 0.38).toFixed(1)}px, 0) rotate(${burst.angle + burst.spin}deg) scale(0.9)`,
        opacity: 0,
      },
    ]);
  });

  return animations;
}

export default function GulabMahalCover({
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
  const layerRef = useRef<HTMLDivElement>(null);
  const groundRef = useRef<HTMLDivElement>(null);
  const bobRef = useRef<HTMLDivElement>(null);
  const leanRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const openFlapRef = useRef<HTMLDivElement>(null);
  const sleeveRef = useRef<HTMLDivElement>(null);
  const letterRef = useRef<HTMLDivElement>(null);
  const letterFaceRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const closedFlapRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLSpanElement>(null);
  const pressRef = useRef<HTMLDivElement>(null);
  const wholeRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const petalRefs = useRef<(HTMLImageElement | null)[]>([]);
  const namesBoxRef = useRef<HTMLDivElement>(null);
  const namesRef = useRef<HTMLDivElement>(null);
  const preparedRef = useRef<{ key: string; animations: Animation[] } | null>(null);
  const startedRef = useRef(false);

  /* The cover is lettered in the card's language, which the prompt is already in. */
  const hindi = /[ऀ-ॿ]/.test(prompt);
  /* Lora's italic for an English prompt; Devanagari has no italic and is set upright in the pair's serif. */
  const promptFont: CSSProperties = hindi
    ? headingFont
    : { fontFamily: fontFamilyOf("--font-lora", "Georgia, serif"), fontStyle: "italic" };

  useFitInside(namesBoxRef, namesRef, `${pair?.join("|") ?? ""}|${title ?? ""}`);

  const parts = (): Parts | null => {
    const refs = {
      ground: groundRef.current,
      lean: leanRef.current,
      back: backRef.current,
      openFlap: openFlapRef.current,
      sleeve: sleeveRef.current,
      letter: letterRef.current,
      letterFace: letterFaceRef.current,
      front: frontRef.current,
      closedFlap: closedFlapRef.current,
      glow: glowRef.current,
      press: pressRef.current,
      whole: wholeRef.current,
      left: leftRef.current,
      right: rightRef.current,
    };

    if (Object.values(refs).some((element) => element === null)) {
      return null;
    }

    return {
      ...(refs as { [K in keyof typeof refs]: HTMLElement }),
      petals: petalRefs.current.filter((element): element is HTMLImageElement => element !== null),
    };
  };

  /* A key for the layout the animations were measured on: made again at the tap if it has changed. */
  /*
    Not the screen's height: the browser's bars going as the tap asks for the
    whole screen change it a moment before the opening, and the envelope is
    sized and placed so that this moves the letter's goal by a pixel or two.
  */
  const layoutKey = (m: Measure): string =>
    [m.width, m.height, m.screenW, m.inside.x, m.inside.y].map(Math.round).join(",");

  const prepare = (): Animation[] | null => {
    const found = parts();
    const layer = layerRef.current;

    if (found === null || layer === null) {
      return null;
    }

    const m = measure(found, layer);
    const key = layoutKey(m);

    if (preparedRef.current?.key === key) {
      return preparedRef.current.animations;
    }

    for (const animation of preparedRef.current?.animations ?? []) {
      animation.cancel();
    }

    const animations = buildOpening(found, m);
    preparedRef.current = { key, animations };
    return animations;
  };

  /*
    Made ahead, in an idle moment once the closed envelope is showing, and a
    few frames after it was first painted, so every part has been painted as
    it rests before anything holds it.
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
    }, 400);

    return () => {
      window.clearTimeout(timer);
      cancelIdle?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, opening, reducedMotion]);

  /* The tap: the bob held where it is, and everything played. */
  useEffect(() => {
    if (!opening || startedRef.current) {
      return;
    }

    startedRef.current = true;

    for (const animation of bobRef.current?.getAnimations() ?? []) {
      animation.pause();
    }

    for (const animation of prepare() ?? []) {
      animation.play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opening]);

  /* Kept on their last frame until the shell takes the cover down, and gone with it. */
  useEffect(
    () => () => {
      for (const animation of preparedRef.current?.animations ?? []) {
        animation.cancel();
      }
    },
    [],
  );

  const sealMark = <SealMark pair={pair} title={title} namesFont={namesFont} headingFont={headingFont} />;
  const sealFace = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ART.seal} alt="" draggable={false} className={styles.sealArt} />
      {sealMark}
    </>
  );

  return (
    <div ref={layerRef} aria-hidden="true" className="pointer-events-none absolute inset-0">
      {/* The cover's own ground, which it fades itself; see CoverVisualState. */}
      <div ref={groundRef} className={styles.coverGround} />

      <div className={styles.envelopePlace}>
        <div ref={bobRef} className={styles.envelopeBob}>
          <div
            ref={leanRef}
            className={styles.envelope}
            style={{ aspectRatio: String(BODY_ASPECT) }}
          >
            {/* The back: the body, and the flap once it has turned past 90 degrees. */}
            <div ref={backRef} className={styles.envelopeLayer}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ART.envelopeBody} alt="" draggable={false} className={styles.envelopeArt} />
              <div className={styles.flapHinge}>
                <div
                  ref={openFlapRef}
                  className={styles.flap}
                  /* Turned right back above the envelope at 1%: painted, and unseen until its turn. */
                  style={{ ...flapPlace, transform: "rotateX(180deg)", opacity: 0.01 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ART.envelopeFlap} alt="" draggable={false} className={`${styles.flapArt} ${styles.flapBack}`} />
                </div>
              </div>
            </div>

            {/* The letter, in a box that ends at the envelope's foot. */}
            <div
              ref={sleeveRef}
              className={styles.sleeve}
              style={{
                left: pc(-SLEEVE.side),
                right: pc(-SLEEVE.side),
                top: pc(-SLEEVE.above),
              }}
            >
              <div
                ref={letterRef}
                className={styles.letter}
                style={{
                  aspectRatio: String(LETTER_ASPECT),
                  /*
                    In the sleeve's box (see SLEEVE): 74% of the envelope across,
                    in its middle, and its top a little below the V's lowest
                    point, so it is wholly inside the pocket.
                  */
                  width: pc(LETTER_WIDTH / SLEEVE.width),
                  left: pc((SLEEVE.side + (1 - LETTER_WIDTH) / 2) / SLEEVE.width),
                  top: pc((SLEEVE.above + POCKET_DEPTH + 0.03) / SLEEVE.height),
                }}
              >
                <div ref={letterFaceRef} className={styles.letterFace}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ART.letterPaper} alt="" draggable={false} className={styles.letterArt} />
                  <div ref={namesBoxRef} className={styles.letterNames}>
                    <div ref={namesRef} className="flex w-full flex-col items-center text-center" style={{ gap: "0.15em" }}>
                      <LetterNames pair={pair} title={title} namesFont={namesFont} hindi={hindi} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* The front: the pocket, the closed flap, the petals and the seal. */}
            <div ref={frontRef} className={styles.envelopeLayer}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ART.envelopeBody}
                alt=""
                draggable={false}
                className={styles.envelopeArt}
                style={{ clipPath: POCKET_CLIP }}
              />
              <div className={styles.flapHinge}>
                <div ref={closedFlapRef} className={styles.flap} style={flapPlace}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ART.envelopeFlap} alt="" draggable={false} className={styles.flapArt} />
                </div>
              </div>

              <div
                className={styles.sealPlace}
                style={{
                  left: pc(FLAP_TIP.x),
                  top: pc(FLAP_TIP.y),
                  width: pc(SEAL_WIDTH),
                  aspectRatio: String(SEAL_ASPECT),
                }}
              >
                <span ref={glowRef} className={styles.sealGlow}>
                  <span className={styles.sealGlowPulse} />
                </span>

                {/* The petals the crack lets out: full size behind the seal until then. */}
                {BURST.map((burst, index) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={index}
                    ref={(element) => {
                      petalRefs.current[index] = element;
                    }}
                    src={ART.petals[burst.petal]}
                    alt=""
                    draggable={false}
                    className={styles.burstPetal}
                    style={
                      {
                        width: `${((burst.size / SEAL_WIDTH) * 100).toFixed(1)}%`,
                        aspectRatio: String(PETAL_ASPECT[burst.petal]),
                        /* Its first frame: pointing out along its own way, hidden behind the seal. */
                        transform: `translate3d(0px, 0px, 0) rotate(${burst.angle}deg) scale(1)`,
                      } as CSSProperties
                    }
                  />
                ))}

                <div ref={pressRef} className={styles.sealPress}>
                  <div ref={wholeRef} className={styles.sealFace}>
                    {sealFace}
                  </div>
                  <div ref={leftRef} className={`${styles.sealFace} ${styles.sealHalf}`} style={{ clipPath: LEFT_HALF }}>
                    {sealFace}
                  </div>
                  <div ref={rightRef} className={`${styles.sealFace} ${styles.sealHalf}`} style={{ clipPath: RIGHT_HALF }}>
                    {sealFace}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Under the envelope, where a thumb already is. */}
        <p
          className={`${styles.coverPrompt} ${opening ? "" : styles.coverPromptIdle}`}
          style={{
            ...promptFont,
            opacity: opening ? 0 : undefined,
            transition: opening ? "opacity 220ms ease-out" : undefined,
          }}
        >
          {prompt}
        </p>
      </div>
    </div>
  );
}

/* The flap's box, in shares of the envelope's. */
const flapPlace: CSSProperties = {
  left: pc(FLAP_BOX.left),
  top: pc(FLAP_BOX.top),
  width: pc(FLAP_BOX.width),
  height: pc(FLAP_BOX.height),
};

/**
 * The couple's initials, engraved in the seal's blank disc: the first, a
 * small "&", the second. One name, or a title, gives up to two letters; nobody
 * named yet gives a small flower drawn in code.
 */
function SealMark({
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
  const place: CSSProperties = {
    left: pc(SEAL_DISC.x),
    top: pc(SEAL_DISC.y),
    width: pc(SEAL_DISC.radius * 2),
  };

  if (pair !== undefined) {
    return (
      <span className={styles.sealMark} style={{ ...place, ...namesFont }}>
        <span>{initialOf(pair[0])}</span>
        <span className={styles.sealAnd} style={headingFont}>
          &amp;
        </span>
        <span>{initialOf(pair[1])}</span>
      </span>
    );
  }

  const letters = initialsOf(title);

  return letters.length > 0 ? (
    <span className={styles.sealMark} style={{ ...place, ...namesFont }}>
      {letters}
    </span>
  ) : (
    <span className={styles.sealMark} style={place}>
      <GoldFlower hi="#e7b9a8" body="#a8604f" lo="#7d4236" className="w-[46%]" />
    </span>
  );
}

/** The couple on the letter, in wine script: each name to a line, a rose-gold "&" between. */
function LetterNames({
  pair,
  title,
  namesFont,
  hindi,
}: {
  pair?: readonly [string, string];
  title?: string;
  namesFont: CSSProperties;
  hindi: boolean;
}): ReactElement {
  const script: CSSProperties = {
    ...namesFont,
    lineHeight: scriptLeading(hindi ? "hi" : "en"),
  };

  if (pair !== undefined) {
    return (
      <>
        <p className={`${styles.letterName} wrap-anywhere`} style={script}>
          {pair[0]}
        </p>
        <p className={styles.letterAnd} style={namesFont}>
          &amp;
        </p>
        <p className={`${styles.letterName} wrap-anywhere`} style={script}>
          {pair[1]}
        </p>
      </>
    );
  }

  return title !== undefined && title.length > 0 ? (
    <p className={`${styles.letterName} wrap-anywhere text-balance`} style={script}>
      {title}
    </p>
  ) : (
    <GoldFlower hi="#d39aa2" body="#b76e79" lo="#8e4b57" className="w-[30%]" />
  );
}
