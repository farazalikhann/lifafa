"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactElement,
} from "react";
import GoldFlower from "@/components/invite/covers/GoldFlower";
import { initialOf, initialsOf } from "@/components/invite/covers/initials";
import { cardLanguage } from "@/lib/cardLanguage";
import {
  ART,
  KEY_ASPECT,
  KEY_TIP,
  KEYHOLE,
  coverPoint,
} from "@/templates/shahi-darwaza/art";
import {
  DRAGGED,
  END_FADE_MS,
  FALLBACK_MS,
  FILM_RATE,
  FLY_MS,
  KEY_FADE_MS,
  TURN_MS,
} from "@/templates/shahi-darwaza/coverTiming";
import styles from "@/templates/shahi-darwaza/darwaza.module.css";
import { tapPrompt } from "@/templates/shahi-darwaza/shared";
import type { TemplateCoverProps } from "@/templates/types";

/**
 * Shahi Darwaza's opening: a gold key on maroon velvet, which the guest
 * drags to the lock of a palace door.
 *
 * THE SHELL STILL OWNS THE OPEN. The loader, the wait for the key and the
 * door, the sound, the music, Skip, the guard against a second open and what
 * a guest who asked for no motion gets are CoverShell's. What is here is the
 * key and what the guest does with it; it opens the cover through the shell
 * (`open`), from inside the guest's own gesture, and tells the shell when the
 * film has really ended (`retime`).
 *
 * CLOSED: the velvet, the couple's initials, the key swaying on its cord and
 * "Drag the key to the lock" under it. After three seconds with nothing
 * touched, the key pulses gently.
 *
 * THE DRAG. The key alone takes the finger (touch-action: none on it and
 * nothing else): it shrinks a little as it is picked up, with a tick of the
 * motor, and the door fades in behind it. Brought within SNAP_PX of the
 * keyhole it snaps in and stays; lifting the finger then opens the cover,
 * which is the gesture the browser lets the sound and the screen start in.
 * Let go anywhere else, it springs back to its cord and the door fades
 * away again. Where the keyhole is was measured once, from the door's box,
 * when the key was picked up: nothing is read while it moves, and each move
 * is written once a frame.
 *
 * A TAP opens the cover too, on the key or anywhere: the key flies to the
 * lock by itself (FLY_MS).
 *
 * IN THE LOCK: the click, the key turns (squashed across and back) with a
 * little gold light on the lock, the key fades and the film plays over the
 * door, exactly in its frame. It ends on the courtyard, which is the card's
 * hero; the cover fades onto it and the card's words come in. Where the film
 * is not ready, fails or stalls, the door crossfades and slowly zooms into
 * the courtyard instead (FALLBACK_MS).
 *
 * Transform and opacity only. Under reduced motion the shell keeps this
 * closed and fades the whole cover onto the card in 300ms: the key hangs
 * still, takes no finger, and the prompt says "Tap to open".
 */

/* How near the keyhole the key's tip must come to snap in, in px. */
const SNAP_PX = 40;
/* How far a press may move and still be a tap, in px, and how long it may last. */
const TAP_SLOP_PX = 10;
const TAP_MS = 600;
/* How small the key is held, of its size on the cord. */
const HELD_SCALE = 0.72;
/* How tall the key is in the lock, as a share of the door's drawn height. */
const LOCKED_HEIGHT = 0.24;
/* How long the key waits untouched before it pulses. */
const HINT_AFTER_MS = 3000;
/* How long the film may hold still mid-play before the courtyard is crossfaded in instead. */
const STALL_MS = 1500;

const GLIDE = "cubic-bezier(0.45, 0.05, 0.2, 1)";
const EASE_OUT = "cubic-bezier(0.2, 0.7, 0.2, 1)";
/* A spring back to the cord: past it a little, and settling. */
const SPRING = "cubic-bezier(0.34, 1.45, 0.55, 1)";

interface Point {
  x: number;
  y: number;
}

/** Where things are, read once when the key is picked up or flown. */
interface Geometry {
  /** The key's tip on its cord, in the page's px. */
  tip: Point;
  /** The keyhole, in the page's px. */
  hole: Point;
  /** The keyhole, in the door box's own px, for the light on the lock. */
  holeInStage: Point;
  /** The key's scale in the lock. */
  lockScale: number;
}

type Stage = "rest" | "held" | "locked" | "flying" | "turning" | "film" | "fallback";

export default function ShahiDarwazaCover({
  phase,
  ready,
  reducedMotion,
  pair,
  title,
  headingFont,
  prompt,
  config,
  open,
  retime,
  dismissSkip,
}: TemplateCoverProps): ReactElement {
  const language = cardLanguage(config?.language);
  const stageRef = useRef<HTMLDivElement>(null);
  const restRef = useRef<HTMLDivElement>(null);
  const moveRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef<HTMLDivElement>(null);
  const pulseRef = useRef<HTMLDivElement>(null);
  const swayRef = useRef<HTMLDivElement>(null);
  const turnRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLSpanElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [stage, setStage] = useState<Stage>("rest");
  const [doorIn, setDoorIn] = useState<boolean>(false);
  const [filmIn, setFilmIn] = useState<boolean>(false);
  const [ending, setEnding] = useState<boolean>(false);
  const stageNow = useRef<Stage>("rest");
  const geometry = useRef<Geometry | null>(null);
  const press = useRef<{
    id: number;
    start: Point;
    offset: Point;
    at: number;
    moved: boolean;
  } | null>(null);
  const frame = useRef<number | null>(null);
  const pending = useRef<Point | null>(null);
  const timers = useRef<number[]>([]);
  const sway = useRef<Animation | null>(null);
  const pulse = useRef<Animation | null>(null);
  const hintTimer = useRef<number | null>(null);
  const finished = useRef<boolean>(false);
  const started = useRef<boolean>(false);

  const go = useCallback((next: Stage): void => {
    stageNow.current = next;
    setStage(next);
  }, []);

  const later = useCallback((ms: number, run: () => void): void => {
    timers.current.push(window.setTimeout(run, ms));
  }, []);

  /* ───── The key's three moving layers: written straight to the DOM, never through a render. ───── */

  const place = useCallback((delta: Point, ms = 0, ease = EASE_OUT): void => {
    const element = moveRef.current;

    if (element !== null) {
      element.style.transition = ms > 0 ? `transform ${ms}ms ${ease}` : "none";
      element.style.transform = `translate3d(${delta.x}px, ${delta.y}px, 0)`;
    }
  }, []);

  const size = useCallback((scale: number, ms: number, ease = EASE_OUT): void => {
    const element = scaleRef.current;

    if (element !== null) {
      element.style.transition = ms > 0 ? `transform ${ms}ms ${ease}` : "none";
      element.style.transform = `scale(${scale})`;
    }
  }, []);

  /* ───── The sway on the cord, and the pulse that says "pick me up". ───── */

  const startSway = useCallback((): void => {
    const element = swayRef.current;

    if (element === null || reducedMotion || typeof element.animate !== "function") {
      return;
    }

    sway.current?.cancel();
    sway.current = element.animate(
      [{ transform: "rotate(-2.2deg)" }, { transform: "rotate(2.2deg)" }],
      {
        duration: 2600,
        iterations: Infinity,
        direction: "alternate",
        easing: "ease-in-out",
        /* From the middle of a swing, which is where the key hangs still. */
        iterationStart: 0.5,
      },
    );
  }, [reducedMotion]);

  /** Stops the sway where it is and lets the key hang straight, rather than jumping there. */
  const stopSway = useCallback((): void => {
    const element = swayRef.current;
    const running = sway.current;

    if (element === null || running === null) {
      return;
    }

    const now = getComputedStyle(element).transform;
    running.cancel();
    sway.current = null;

    if (now !== "none" && typeof element.animate === "function") {
      element.animate([{ transform: now }, { transform: "rotate(0deg)" }], {
        duration: 220,
        easing: "ease-out",
      });
    }
  }, []);

  const stopHint = useCallback((): void => {
    if (hintTimer.current !== null) {
      window.clearTimeout(hintTimer.current);
      hintTimer.current = null;
    }

    pulse.current?.cancel();
    pulse.current = null;
  }, []);

  const armHint = useCallback((): void => {
    stopHint();

    if (reducedMotion) {
      return;
    }

    hintTimer.current = window.setTimeout(() => {
      hintTimer.current = null;
      const element = pulseRef.current;

      if (element === null || typeof element.animate !== "function" || stageNow.current !== "rest") {
        return;
      }

      pulse.current = element.animate(
        [
          { transform: "scale(1)", offset: 0 },
          { transform: "scale(1.05)", offset: 0.3 },
          { transform: "scale(1)", offset: 0.6 },
          { transform: "scale(1)", offset: 1 },
        ],
        { duration: 2200, iterations: Infinity, easing: "ease-in-out" },
      );
    }, HINT_AFTER_MS);
  }, [reducedMotion, stopHint]);

  /* Swaying, and waiting to hint, from the moment the cover is shown. */
  useEffect(() => {
    if (!ready || reducedMotion) {
      return;
    }

    startSway();
    armHint();

    return () => {
      sway.current?.cancel();
      sway.current = null;
      stopHint();
    };
  }, [ready, reducedMotion, startSway, armHint, stopHint]);

  /* No loop runs in a tab nobody is looking at. */
  useEffect(() => {
    const onVisibility = (): void => {
      const hidden = document.visibilityState === "hidden";

      for (const running of [sway.current, pulse.current]) {
        if (running !== null) {
          if (hidden) {
            running.pause();
          } else {
            running.play();
          }
        }
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  /* Every pending step, and a frame not yet written, go with the cover. */
  useEffect(
    () => () => {
      for (const timer of timers.current) {
        window.clearTimeout(timer);
      }

      if (frame.current !== null) {
        window.cancelAnimationFrame(frame.current);
      }
    },
    [],
  );

  /** Where the key's tip hangs and where the keyhole is drawn: read once, never while anything moves. */
  const measure = useCallback((): Geometry | null => {
    const rest = restRef.current;
    const door = stageRef.current;

    if (rest === null || door === null) {
      return null;
    }

    const keyBox = rest.getBoundingClientRect();
    const doorBox = door.getBoundingClientRect();
    const holeInStage = coverPoint(doorBox, KEYHOLE);
    const drawnDoorHeight = Math.max(doorBox.height, (doorBox.width * 1935) / 1080);

    const next: Geometry = {
      tip: {
        x: keyBox.left + KEY_TIP.x * keyBox.width,
        y: keyBox.top + KEY_TIP.y * keyBox.height,
      },
      hole: { x: doorBox.left + holeInStage.x, y: doorBox.top + holeInStage.y },
      holeInStage,
      lockScale:
        keyBox.height > 0
          ? (LOCKED_HEIGHT * drawnDoorHeight) / keyBox.height
          : 0.5,
    };

    geometry.current = next;
    return next;
  }, []);

  const toLock = (at: Geometry): Point => ({
    x: at.hole.x - at.tip.x,
    y: at.hole.y - at.tip.y,
  });

  /* ───── The end: the film, or the crossfade in its place, then the fade onto the card. ───── */

  const finish = useCallback((): void => {
    if (finished.current) {
      return;
    }

    finished.current = true;
    /* The card is let go now, under the fade, so its words come in over the courtyard. */
    retime({ durationMs: END_FADE_MS, revealAt: 0, sound: "keep" });
    dismissSkip();
    setEnding(true);
  }, [retime, dismissSkip]);

  const fallBack = useCallback((): void => {
    if (finished.current || stageNow.current === "fallback") {
      return;
    }

    videoRef.current?.pause();
    setFilmIn(false);
    go("fallback");
    retime({ durationMs: FALLBACK_MS + END_FADE_MS + 400, revealAt: 1, sound: "keep" });
    later(FALLBACK_MS, finish);
  }, [finish, go, later, retime]);

  const playFilm = useCallback((): void => {
    const video = videoRef.current;

    /* Not enough of it to play on from here: the crossfade, rather than a film that stops. */
    if (video === null || video.error !== null || video.readyState < 3) {
      fallBack();
      return;
    }

    let stall: number | null = null;
    const clearStall = (): void => {
      if (stall !== null) {
        window.clearTimeout(stall);
        stall = null;
      }
    };

    video.addEventListener("playing", () => {
      clearStall();
      setFilmIn(true);
    });
    video.addEventListener("waiting", () => {
      clearStall();
      stall = window.setTimeout(fallBack, STALL_MS);
    });
    video.addEventListener("ended", () => {
      clearStall();
      if (stageNow.current === "film") {
        finish();
      }
    });
    video.addEventListener("error", () => {
      clearStall();
      fallBack();
    });

    go("film");
    video.defaultPlaybackRate = FILM_RATE;
    video.playbackRate = FILM_RATE;

    try {
      void video.play().catch(fallBack);
    } catch {
      fallBack();
    }
  }, [fallBack, finish, go]);

  /** The key in the lock: the turn, the light, the key going, the film. */
  const turn = useCallback(
    (at: Geometry): void => {
      go("turning");
      const key = turnRef.current;
      const glow = glowRef.current;

      if (key !== null && typeof key.animate === "function") {
        key.animate(
          [
            { transform: "scaleX(1)" },
            { transform: "scaleX(0.22)", offset: 0.5 },
            { transform: "scaleX(1)" },
          ],
          { duration: TURN_MS, easing: "ease-in-out" },
        );
      }

      if (glow !== null && typeof glow.animate === "function") {
        glow.style.left = `${at.holeInStage.x}px`;
        glow.style.top = `${at.holeInStage.y}px`;
        glow.animate(
          [
            { opacity: 0, transform: "translate3d(-50%, -50%, 0) scale(0.5)" },
            { opacity: 0.9, transform: "translate3d(-50%, -50%, 0) scale(1)", offset: 0.4 },
            { opacity: 0, transform: "translate3d(-50%, -50%, 0) scale(1.35)" },
          ],
          { duration: TURN_MS + 380, easing: "ease-out" },
        );
      }

      later(TURN_MS, () => {
        const move = moveRef.current;

        if (move !== null) {
          move.style.transition = `opacity ${KEY_FADE_MS}ms ease-out`;
          move.style.opacity = "0";
        }

        playFilm();
      });
    },
    [go, later, playFilm],
  );

  /* The open, once the shell has started it: a tap flies the key first, a drag has put it there. */
  useEffect(() => {
    if (phase !== "opening" || started.current || reducedMotion) {
      return;
    }

    started.current = true;
    stopHint();
    setDoorIn(true);

    /* Measured again: going fullscreen on the tap may have moved the door. */
    const at = measure();

    if (at === null) {
      fallBack();
      return;
    }

    if (stageNow.current === "locked") {
      place(toLock(at));
      size(at.lockScale, 0);
      turn(at);
      return;
    }

    stopSway();
    go("flying");
    place(toLock(at), FLY_MS, GLIDE);
    size(at.lockScale, FLY_MS, GLIDE);
    later(FLY_MS, () => turn(at));
  }, [phase, reducedMotion, fallBack, go, later, measure, place, size, stopHint, stopSway, turn]);

  /* ───── The finger. ───── */

  const write = useCallback((): void => {
    frame.current = null;
    const tip = pending.current;
    const at = geometry.current;
    const held = press.current;

    if (tip === null || at === null || held === null || stageNow.current !== "held") {
      return;
    }

    pending.current = null;

    if (Math.hypot(tip.x - at.hole.x, tip.y - at.hole.y) <= SNAP_PX) {
      /* In. It stays, whatever the finger does now; lifting it opens the door. */
      go("locked");
      place(toLock(at), 140);
      size(at.lockScale, 200);
      return;
    }

    /* Eased for the first moment, while the key shrinks to the finger; then exactly under it. */
    place(
      { x: tip.x - at.tip.x, y: tip.y - at.tip.y },
      performance.now() - held.at < 220 ? 120 : 0,
    );
  }, [go, place, size]);

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>): void => {
      if (!ready || reducedMotion || phase !== "closed" || stageNow.current !== "rest") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const at = measure();
      const key = scaleRef.current;

      if (at === null || key === null) {
        return;
      }

      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* Followed without capture: the key still moves while the finger is on it. */
      }

      /* Where the tip is drawn now: on its cord, or on its way back to it. */
      const drawn = key.getBoundingClientRect();
      const tipNow = {
        x: drawn.left + KEY_TIP.x * drawn.width,
        y: drawn.top + KEY_TIP.y * drawn.height,
      };
      const finger = { x: event.clientX, y: event.clientY };
      const ratio = drawn.height > 0 ? (restRef.current?.getBoundingClientRect().height ?? 0) / drawn.height : 1;

      /* The finger keeps hold of the same part of the key as it shrinks to HELD_SCALE. */
      press.current = {
        id: event.pointerId,
        start: finger,
        offset: {
          x: (finger.x - tipNow.x) * HELD_SCALE * (ratio > 0 ? ratio : 1),
          y: (finger.y - tipNow.y) * HELD_SCALE * (ratio > 0 ? ratio : 1),
        },
        at: performance.now(),
        moved: false,
      };

      stopHint();
      stopSway();
      place({ x: tipNow.x - at.tip.x, y: tipNow.y - at.tip.y });
      size(HELD_SCALE, 220);
      go("held");
      setDoorIn(true);

      if (typeof navigator.vibrate === "function") {
        try {
          navigator.vibrate(10);
        } catch {
          /* Picked up without a tick. */
        }
      }
    },
    [go, measure, phase, place, ready, reducedMotion, size, stopHint, stopSway],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>): void => {
      const held = press.current;

      if (held === null || held.id !== event.pointerId || stageNow.current !== "held") {
        return;
      }

      if (
        !held.moved &&
        Math.hypot(event.clientX - held.start.x, event.clientY - held.start.y) > TAP_SLOP_PX
      ) {
        held.moved = true;
      }

      pending.current = {
        x: event.clientX - held.offset.x,
        y: event.clientY - held.offset.y,
      };

      if (frame.current === null) {
        frame.current = window.requestAnimationFrame(write);
      }
    },
    [write],
  );

  const springBack = useCallback((): void => {
    go("rest");
    place({ x: 0, y: 0 }, 560, SPRING);
    size(1, 420);
    setDoorIn(false);
    later(560, () => {
      if (stageNow.current === "rest") {
        startSway();
        armHint();
      }
    });
  }, [armHint, go, later, place, size, startSway]);

  const onPointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>): void => {
      const held = press.current;

      if (held === null || held.id !== event.pointerId) {
        return;
      }

      press.current = null;
      event.stopPropagation();

      if (frame.current !== null) {
        window.cancelAnimationFrame(frame.current);
        frame.current = null;
        write();
      }

      if (stageNow.current === "locked") {
        /* Lifted in the lock: the open starts here, inside the gesture. */
        open(DRAGGED);
        return;
      }

      if (!held.moved && performance.now() - held.at < TAP_MS) {
        /* A tap: the key flies to the lock by itself. */
        open();
        return;
      }

      springBack();
    },
    [open, springBack, write],
  );

  const onPointerCancel = useCallback(
    (event: PointerEvent<HTMLDivElement>): void => {
      const held = press.current;

      if (held === null || held.id !== event.pointerId) {
        return;
      }

      press.current = null;

      if (stageNow.current === "locked") {
        open(DRAGGED);
      } else {
        springBack();
      }
    },
    [open, springBack],
  );

  /* ───── Drawing. ───── */

  /* Two letters for two names, or the first two of whatever the card is titled. */
  const initials =
    pair !== undefined
      ? `${initialOf(pair[0])} & ${initialOf(pair[1])}`
      : title !== undefined
        ? initialsOf(title)
        : "";
  const touched = stage !== "rest";
  const inLock = stage === "turning" || stage === "film" || stage === "fallback";
  const fallingBack = stage === "fallback";
  /* The film and its poster, and the courtyard, are asked for once the cover is up, never under reduced motion. */
  const fetchFilm = ready && !reducedMotion;

  const picture: CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    maxWidth: "none",
    objectFit: "cover",
    userSelect: "none",
  };

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        opacity: ending ? 0 : undefined,
        transition: ending ? `opacity ${END_FADE_MS}ms ease-in-out` : undefined,
      }}
    >
      <div className={`${styles.velvet} absolute inset-0`} />

      {/*
        The door's frame: the screen's height, and as wide as the card's first
        screen, so the film and the courtyard lie exactly where the hero's
        courtyard does. Velvet either side of it on a wide screen.
      */}
      <div ref={stageRef} className={`${styles.stage} absolute top-0 left-1/2 h-dvh w-full overflow-hidden`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ART.door}
          alt=""
          draggable={false}
          style={{
            ...picture,
            opacity: doorIn || inLock ? 1 : 0,
            transform: fallingBack ? "scale(1.12)" : "scale(1)",
            transition: fallingBack
              ? `opacity ${FALLBACK_MS}ms ease-in-out, transform ${FALLBACK_MS}ms ease-out`
              : "opacity 360ms ease-out",
          }}
        />

        {fetchFilm ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ART.courtyard}
            alt=""
            draggable={false}
            decoding="async"
            style={{
              ...picture,
              opacity: fallingBack ? 1 : 0,
              transform: fallingBack ? "scale(1)" : "scale(1.06)",
              transition: fallingBack
                ? `opacity ${FALLBACK_MS}ms ease-in-out, transform ${FALLBACK_MS}ms ease-out`
                : undefined,
            }}
          />
        ) : null}

        {fetchFilm ? (
          <video
            ref={(element) => {
              videoRef.current = element;

              if (element !== null) {
                /* As a property too: the attribute alone does not make every phone treat it as silent. */
                element.muted = true;
                element.defaultMuted = true;
              }
            }}
            src={ART.film}
            poster={ART.filmPoster}
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            disableRemotePlayback
            style={{
              ...picture,
              opacity: filmIn && !fallingBack ? 1 : 0,
            }}
          />
        ) : null}

        {/* The little light on the lock as the key turns; placed at the keyhole then. */}
        <span ref={glowRef} className={styles.lockGlow} />
      </div>

      {/* The couple's initials, over the key. */}
      <div
        className="absolute inset-x-0 flex flex-col items-center gap-2 text-center"
        style={{
          top: "calc(var(--cover-top-h, 0px) + 9dvh)",
          opacity: touched ? 0 : 1,
          transition: "opacity 300ms ease-out",
        }}
      >
        {initials.length > 0 ? (
          <span
            className={styles.initials}
            style={{
              ...headingFont,
              letterSpacing: /[ऀ-ॿ]/.test(initials) ? undefined : "0.16em",
            }}
          >
            {initials}
          </span>
        ) : (
          /* Nobody named yet: a small flower, never a symbol of anybody's faith. */
          <GoldFlower hi="#ecd08f" body="#d9b36c" lo="#9a7426" className="w-9" />
        )}
        <span aria-hidden="true" className={styles.initialsRule} />
      </div>

      {/*
        The key, on its cord. Its box is where it hangs; inside it, one layer
        each for where it is moved, how large it is (about its tip), the
        pulse, the sway (about the top of its cord) and the turn (about its
        shaft), so no two of them ever write the same transform.
      */}
      <div
        ref={restRef}
        className={`${styles.keyBox} absolute`}
        style={{ "--key-aspect": String(KEY_ASPECT) } as CSSProperties}
      >
        <div ref={moveRef} className="absolute inset-0" style={{ willChange: touched && !inLock ? "transform" : undefined }}>
          <div ref={scaleRef} className={`${styles.keyScale} absolute inset-0`}>
            <div ref={pulseRef} className={`${styles.keyPulse} absolute inset-0`}>
              <div ref={swayRef} className={`${styles.keySway} absolute inset-0`}>
                <div ref={turnRef} className={`${styles.keyTurn} absolute inset-0`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ART.key}
                    alt=""
                    draggable={false}
                    className={`${styles.keyArt} absolute inset-0 h-full w-full select-none`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/*
          What the finger takes: the key on its cord, and only while the cover
          is closed and the key can move. Under reduced motion it takes nothing,
          and a tap here reaches the shell's button under it.
        */}
        <div
          className={styles.keyGrip}
          style={{
            pointerEvents: ready && !reducedMotion && phase === "closed" ? "auto" : "none",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onContextMenu={(event) => event.preventDefault()}
        />
      </div>

      {/* Under the key, where a thumb already is. */}
      <p
        className={`${styles.prompt} absolute inset-x-6 text-center`}
        style={{
          ...headingFont,
          letterSpacing: /[ऀ-ॿ]/.test(prompt) ? undefined : "0.14em",
          opacity: touched || phase !== "closed" ? 0 : 1,
          transition: "opacity 260ms ease-out",
        }}
      >
        {reducedMotion ? tapPrompt(language) : prompt}
      </p>
    </div>
  );
}
