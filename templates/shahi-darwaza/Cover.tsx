"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
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
 * Shahi Darwaza's opening: a gold key on maroon velvet, which flies to the
 * lock of a palace door at the guest's first touch.
 *
 * THE SHELL STILL OWNS THE OPEN. The loader, the wait for the key and the
 * door, the sound, the music, Skip, the guard against a second open and what
 * a guest who asked for no motion gets are CoverShell's. What is here is the
 * key and the touch that sends it; it opens the cover through the shell
 * (`open`), from inside the guest's own gesture, and tells the shell when the
 * film has really ended (`retime`).
 *
 * CLOSED: the velvet, the couple's initials, the key swaying on its cord and
 * "Tap the key to unlock" under it. After three seconds with nothing touched,
 * the key pulses gently.
 *
 * ANY TOUCH, ANYWHERE ON THE COVER: a tap on the key, a tap on the velvet, a
 * click, a quick swipe. Listened for on the shell's whole layer
 * (pointerdown, and touchstart for an app's browser that is slow to send
 * pointer events), not on the key: the touch is taken at once (the page does
 * not scroll, nothing is zoomed, the prompt goes, a 10ms tick where the phone
 * allows it) and the opening starts as the finger lifts, which is the moment
 * a browser counts as a gesture and lets the click, the music and the full
 * screen start. A touch the browser calls off (an app taking the swipe for
 * itself) opens it all the same. Skip is the shell's own button and is left
 * alone; the language switch and the sample's strip are not on the cover at
 * all. Once it has started, more touches do nothing.
 *
 * THE KEY FLIES to the lock by itself (FLY_MS), and in the lock: the click,
 * the key turns (squashed across and back) with a little gold light on the
 * lock, the key fades and the film plays over the door, exactly in its frame.
 * It ends on the courtyard, which is the card's hero; the cover fades onto it
 * and the card's words come in. Where the film is not ready, fails or stalls,
 * the door crossfades and slowly zooms into the courtyard instead
 * (FALLBACK_MS).
 *
 * Transform and opacity only. Under reduced motion the shell keeps this
 * closed and fades the whole cover onto the card in 300ms: the key hangs
 * still and the prompt says "Tap to open".
 */

/* How tall the key is in the lock, as a share of the door's drawn height. */
const LOCKED_HEIGHT = 0.24;
/* How long the key waits untouched before it pulses. */
const HINT_AFTER_MS = 3000;
/* How long the film may hold still mid-play before the courtyard is crossfaded in instead. */
const STALL_MS = 1500;

const GLIDE = "cubic-bezier(0.45, 0.05, 0.2, 1)";
const EASE_OUT = "cubic-bezier(0.2, 0.7, 0.2, 1)";

/** What on the cover keeps its own tap: any control but the shell's open button, which is the whole screen. */
const CONTROLS = "button, a, input, select, textarea, [role='button']";

interface Point {
  x: number;
  y: number;
}

/** Where things are, read once when the key is flown. */
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

type Stage = "rest" | "flying" | "turning" | "film" | "fallback";

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
  /* A finger is down on the cover: the prompt and the initials go at once. */
  const [pressed, setPressed] = useState<boolean>(false);
  const stageNow = useRef<Stage>("rest");
  const geometry = useRef<Geometry | null>(null);
  /* The touch that opens the cover: taken (down), and spent (the open asked for). Refs, so a re-render between the two loses neither. */
  const claimed = useRef<boolean>(false);
  const spent = useRef<boolean>(false);
  /* The tick was felt; a phone that refused it on the first touch is asked again on the lift. */
  const buzzed = useRef<boolean>(false);
  /* The shell's `open` and the phase, for listeners attached once. */
  const openRef = useRef(open);
  openRef.current = open;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
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

  /* Every pending step goes with the cover. */
  useEffect(
    () => () => {
      for (const timer of timers.current) {
        window.clearTimeout(timer);
      }
    },
    [],
  );

  /** Where the key's tip hangs and where the keyhole is drawn: read once, before anything moves. */
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

  /* The open, once the shell has started it (from a touch here, or the keyboard on the shell's button): the key flies to the lock. */
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

    stopSway();
    go("flying");
    place(toLock(at), FLY_MS, GLIDE);
    size(at.lockScale, FLY_MS, GLIDE);
    later(FLY_MS, () => turn(at));
  }, [phase, reducedMotion, fallBack, go, later, measure, place, size, stopHint, stopSway, turn]);

  /* ───── The touch, anywhere on the cover. ───── */

  useEffect(() => {
    const layer = stageRef.current?.closest<HTMLElement>("[data-phase]") ?? null;

    if (!ready || layer === null) {
      return;
    }

    /* The shell's open button is the whole screen; its first button. Skip is the other. */
    const openButton = layer.querySelector<HTMLButtonElement>(":scope > button");

    /** A touch that is the cover's to take: on the layer, and not on a control with a tap of its own. */
    const ours = (target: EventTarget | null): boolean => {
      if (!(target instanceof Element) || !layer.contains(target)) {
        return false;
      }

      const control = target.closest(CONTROLS);
      return control === null || control === openButton;
    };

    const buzz = (): void => {
      if (buzzed.current || reducedMotion || typeof navigator.vibrate !== "function") {
        return;
      }

      try {
        buzzed.current = navigator.vibrate(10);
      } catch {
        /* Opened without a tick. */
      }
    };

    const begin = (event: Event): void => {
      if (!ours(event.target)) {
        return;
      }

      /* No scroll, no zoom, no second (synthesised) click: whatever the touch was, it is the cover's. */
      if (event.cancelable) {
        event.preventDefault();
      }

      if (claimed.current || spent.current || phaseRef.current !== "closed") {
        return;
      }

      claimed.current = true;
      setPressed(true);
      stopHint();
      buzz();
    };

    const release = (): void => {
      if (!claimed.current || spent.current) {
        return;
      }

      spent.current = true;
      buzz();
      openRef.current();
    };

    const previousTouchAction = layer.style.touchAction;
    layer.style.touchAction = "none";
    layer.addEventListener("pointerdown", begin, { passive: false });
    layer.addEventListener("touchstart", begin, { passive: false });
    /* On the window, so a swipe that ends off the cover still opens it. */
    window.addEventListener("pointerup", release);
    window.addEventListener("touchend", release);
    window.addEventListener("pointercancel", release);
    window.addEventListener("touchcancel", release);

    return () => {
      layer.style.touchAction = previousTouchAction;
      layer.removeEventListener("pointerdown", begin);
      layer.removeEventListener("touchstart", begin);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("touchend", release);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("touchcancel", release);
    };
  }, [ready, reducedMotion, stopHint]);

  /* ───── Drawing. ───── */

  /* Two letters for two names, or the first two of whatever the card is titled. */
  const initials =
    pair !== undefined
      ? `${initialOf(pair[0])} & ${initialOf(pair[1])}`
      : title !== undefined
        ? initialsOf(title)
        : "";
  const touched = pressed || stage !== "rest";
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
