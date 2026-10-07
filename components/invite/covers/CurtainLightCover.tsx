"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from "react";
import type { CoverVisualState } from "@/components/invite/CoverShell";
import CurtainRevealCover from "@/components/invite/covers/CurtainRevealCover";
import { curtainArt } from "@/lib/curtainArt";
import {
  CURTAIN_LIGHT_FILM as FILM,
  CURTAIN_LIGHT_STALL_MS,
  CURTAIN_LIGHT_WAIT_MS,
} from "@/lib/curtainLightFilm";

/** How long the still takes to give way to the card when there is nothing to play. */
const PLAIN_FADE_MS = 300;

/** How long a film that is in hand is given to start once asked. */
const START_WATCHDOG_MS = 450;

/**
 * How long after the cover is on screen the film is given before the drawn
 * curtains' pictures are sent for as well. On a good connection it is in well
 * inside this, and the guest downloads one still and one film.
 */
const STAND_IN_AFTER_MS = 1200;

/**
 * How long the film's last frame takes to leave the light under it. They are
 * the same colour, so this is seen by nobody; it only keeps the swap off a
 * single frame.
 */
const SWAP_MS = 160;

/** How long the still takes to clear the drawn curtains when they open in its place. */
const DRAWN_SWAP_MS = 250;

/** A film that starts this long after the tap has left its sound behind. */
const LATE_START_MS = 400;

/**
 * Where the open is. "film" is the film playing; "light" is the flat light
 * giving way to the card; "drawn" is the curtains drawn in code opening in
 * the film's place; "plain" is the still fading, with neither in hand.
 */
type Stage = "closed" | "film" | "light" | "drawn" | "plain";

/** A connection on which a guest should not be sent a film for a flourish. */
function onSlowNetwork(): boolean {
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;

  return (
    connection?.saveData === true ||
    connection?.effectiveType === "2g" ||
    connection?.effectiveType === "slow-2g"
  );
}

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * The curtain cover as a film: velvet curtains opening on a golden light that
 * grows to fill the screen, and the card coming out of the light.
 *
 * CLOSED, it is the film's first frame as a still, so the closed cover and
 * the film's first frame are one picture and nothing jumps when it starts.
 * The still is in the shell's loading gate; the film is not. It is asked for
 * only once the cover is on screen, which is after the card's own first
 * screen has loaded, so it never holds the card up.
 *
 * THE FILM IS FOLLOWED, NOT TIMED. The hand-over starts when the film itself
 * says it has reached its flat last frames, not so many milliseconds after
 * the tap, so a phone that plays it slowly still crosses from light to card
 * and never from half-open curtains. Three layers do it: the film on top, a
 * layer of exactly the film's last colour under it, and the card under that.
 * The film is taken off the light, which nobody can see, and the light is
 * faded off the card: 0.8 seconds onto a light card, 1.1 onto a dark one,
 * where the change is the bigger. Opacity only. The shell's Skip is sent
 * away as the film's light starts to flood, so it never stands on the light.
 *
 * WHEN THE FILM CANNOT PLAY, the curtains drawn in code open instead
 * (CurtainRevealCover, untouched): if the film has failed, if it has not
 * arrived a second and a half after the tap, if the browser will not start
 * it, or on a connection it was never sent over. They are mounted out of
 * sight as soon as the film looks late, so they have a closed state to open
 * from. With neither in hand the still fades to the card.
 *
 * Under reduced motion the shell never hands this the "opening" phase: the
 * still crossfades to the card as one layer, and no film is requested.
 */
export default function CurtainLightCover(state: CoverVisualState): ReactElement {
  const { phase, option, reducedMotion, colors, ready, retime, dismissSkip } = state;
  const opening = phase === "opening";
  const fadeMs = colors.isLight ? FILM.fadeMs : FILM.fadeToDarkMs;

  const videoRef = useRef<HTMLVideoElement>(null);
  /* The film has failed, or was never asked for: there is nothing to wait for. */
  const filmOut = useRef(false);
  /* Whether the drawn curtains' pictures are decoded, for the tap to ask. */
  const drawnReady = useRef(false);
  const drawnSent = useRef(false);
  /* The drawn curtains are in the tree, under the still. */
  const [standIn, setStandIn] = useState(false);
  const [stage, setStage] = useState<Stage>("closed");
  /* The film has drawn a frame: the still over it can go. */
  const [filmShowing, setFilmShowing] = useState(false);
  /* The film stalled short of the light, so it is faded with it, not swapped out. */
  const [stalled, setStalled] = useState(false);

  const sendForDrawn = useCallback((): void => {
    if (drawnSent.current) {
      return;
    }

    drawnSent.current = true;
    setStandIn(true);

    void Promise.all(
      curtainArt().images.map((src) => {
        const image = new Image();
        image.src = src;
        return typeof image.decode === "function"
          ? image.decode()
          : new Promise<void>((resolve, reject) => {
              image.onload = () => resolve();
              image.onerror = () => reject(new Error(src));
            });
      }),
    ).then(
      () => {
        drawnReady.current = true;
      },
      () => undefined,
    );
  }, []);

  /*
    The film, asked for once the closed cover is on screen. `ready` comes
    after the card's own fonts and first pictures, so the film is behind them
    in the queue, and long after hydration, so `reducedMotion` is the guest's
    real answer by now and not the server's false.
  */
  useEffect(() => {
    if (!ready || reducedMotion) {
      return;
    }

    const video = videoRef.current;

    if (video === null || onSlowNetwork()) {
      filmOut.current = true;
      sendForDrawn();
      return;
    }

    const failed = (): void => {
      filmOut.current = true;
      sendForDrawn();
    };

    /* WebM where the browser plays it; MP4 everywhere else, which is every iPhone. */
    video.preload = "auto";
    video.src =
      video.canPlayType('video/webm; codecs="vp9"') === "probably" ? FILM.webm : FILM.mp4;
    video.addEventListener("error", failed, { once: true });
    video.load();

    const late = window.setTimeout(() => {
      if (video.readyState < 3) {
        sendForDrawn();
      }
    }, STAND_IN_AFTER_MS);

    return () => {
      window.clearTimeout(late);
      video.removeEventListener("error", failed);
    };
  }, [ready, reducedMotion, sendForDrawn]);

  /*
    The tap. Before paint, so the frame that follows it is already the chosen
    path's and never the bare still with nothing under way.
  */
  useIsomorphicLayoutEffect(() => {
    if (!opening || stage !== "closed") {
      return;
    }

    const tappedAt = performance.now();
    const video = videoRef.current;
    /* Asked to play, playing, and done with: each happens once. */
    let asked = false;
    let playing = false;
    let settled = false;
    /* The film's light has started to flood the frame. */
    let glowing = false;
    let wait = 0;
    let watchdog = 0;
    let stall = 0;
    let frame = 0;

    /* The drawn curtains, or failing those the still fading. */
    const standDown = (): void => {
      if (settled || playing) {
        return;
      }

      settled = true;
      window.clearTimeout(wait);
      window.clearTimeout(watchdog);
      video?.pause();

      if (drawnReady.current) {
        setStage("drawn");
        retime({
          durationMs: option.durationMs,
          revealAt: option.revealAt,
          burstAt: option.burstAt,
          sound: "restart",
        });
      } else {
        setStage("plain");
        retime({ durationMs: PLAIN_FADE_MS, revealAt: 0, sound: "stop" });
      }
    };

    /* The light giving way to the card, and the shell told how long that takes. */
    const toLight = (short: boolean): void => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(stall);
      window.cancelAnimationFrame(frame);
      dismissSkip();
      setStalled(short);
      setStage("light");
      retime({ durationMs: fadeMs, revealAt: 0, sound: "keep" });
    };

    /* One read of the film's clock a frame, while it plays: no layout, nothing written. */
    const follow = (): void => {
      if (video === null) {
        return;
      }

      if (video.ended || video.currentTime * 1000 >= FILM.lightAtMs) {
        toLight(false);
        return;
      }

      /*
        Skip goes as the light starts to flood, so it is not left standing on
        a screen of plain light. Only on this path: the drawn curtains never
        show that screen and keep Skip to the end.
      */
      if (!glowing && video.currentTime * 1000 >= FILM.glowAtMs) {
        glowing = true;
        dismissSkip();
      }

      frame = window.requestAnimationFrame(follow);
    };

    const started = (): void => {
      if (settled || playing) {
        return;
      }

      playing = true;
      window.clearTimeout(watchdog);
      setFilmShowing(true);
      setStage("film");

      /* A film that was waited for starts its sound again, to go with it. */
      if (performance.now() - tappedAt > LATE_START_MS) {
        const netMs = FILM.lengthMs + CURTAIN_LIGHT_STALL_MS + fadeMs;
        retime({ durationMs: netMs, revealAt: 1 - fadeMs / netMs, sound: "restart" });
      }

      frame = window.requestAnimationFrame(follow);
      /* A film that stops part way, or a tab put away: the card is not kept behind it. */
      stall = window.setTimeout(() => toLight(true), FILM.lengthMs + CURTAIN_LIGHT_STALL_MS);
    };

    const failed = (): void => {
      if (playing) {
        toLight(true);
      } else {
        standDown();
      }
    };

    const begin = (): void => {
      if (asked || settled || video === null) {
        return;
      }

      asked = true;
      window.clearTimeout(wait);
      video.addEventListener("playing", started, { once: true });
      watchdog = window.setTimeout(standDown, START_WATCHDOG_MS);
      /* A browser that refuses to play — an iPhone in Low Power Mode — rejects here. */
      void video.play()?.then(undefined, standDown);
    };

    if (video === null || filmOut.current || video.error !== null) {
      standDown();
      return;
    }

    video.addEventListener("error", failed, { once: true });

    /* Enough of it buffered to play on from here, or it is waited for. */
    if (video.readyState >= 3) {
      begin();
    } else {
      sendForDrawn();
      video.addEventListener("canplay", begin, { once: true });
      wait = window.setTimeout(standDown, CURTAIN_LIGHT_WAIT_MS);
    }

    return () => {
      window.clearTimeout(wait);
      window.clearTimeout(watchdog);
      window.clearTimeout(stall);
      window.cancelAnimationFrame(frame);
      video.removeEventListener("playing", started);
      video.removeEventListener("canplay", begin);
      video.removeEventListener("error", failed);
    };
    /* Everything else here is read once, on the tap. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opening]);

  /*
    The film's place on the screen, as one width everything is laid out from.
    It covers a phone, centred. On a screen wider than it is tall the whole of
    it is shown instead, with its surround either side, rather than a strip of
    its middle blown up. The same arithmetic as VideoCover.
  */
  const rootStyle = {
    "--fl": "calc(50cqw - var(--fw) / 2)",
    "--ft": "calc(50cqh - var(--fw) * 16 / 18)",
  } as CSSProperties;

  const frameBox: CSSProperties = {
    left: "var(--fl)",
    top: "var(--ft)",
    width: "var(--fw)",
    height: "calc(var(--fw) * 16 / 9)",
  };

  /* Everything of the film's, as one: faded whole only when there is no film to play. */
  const blockStyle: CSSProperties = {
    transition:
      stage === "plain"
        ? `opacity ${PLAIN_FADE_MS}ms ease-in-out`
        : stage === "drawn"
          ? `opacity ${DRAWN_SWAP_MS}ms ease-out`
          : undefined,
    opacity: stage === "plain" || stage === "drawn" ? 0 : 1,
  };

  /* The light: the film's last colour, between the film and the card. */
  const lightStyle: CSSProperties = {
    backgroundColor: FILM.light,
    transition: stage === "light" ? `opacity ${fadeMs}ms ease-in-out` : undefined,
    opacity: stage === "light" ? 0 : 1,
    willChange: "opacity",
  };

  /* Velvet beside the film on a wide screen, cleared as the film's own light floods. */
  const surroundStyle: CSSProperties = {
    backgroundColor: FILM.surround,
    transition:
      stage === "light" && stalled
        ? `opacity ${fadeMs}ms ease-in-out`
        : filmShowing
          ? `opacity ${FILM.glowMs}ms ease-in ${FILM.glowAtMs}ms`
          : undefined,
    opacity: filmShowing ? 0 : 1,
  };

  /* The film, taken off the light once it is the light's own colour. */
  const filmStyle: CSSProperties = {
    transition:
      stage === "light"
        ? `opacity ${stalled ? fadeMs : SWAP_MS}ms ${stalled ? "ease-in-out" : "linear"}`
        : undefined,
    opacity: stage === "light" ? 0 : 1,
    willChange: "opacity",
  };

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden [container-type:size]"
    >
      {/* Inside the container: a container's own units cannot be read on the container itself. */}
      <div
        className="absolute inset-0 [--fw:max(100cqw,56.25cqh)] [@container_(min-aspect-ratio:4/5)]:[--fw:56.25cqh]"
        style={rootStyle}
      >
        {/*
          The drawn curtains, under everything and out of sight until they are
          needed. Held closed unless they are the path, and timed as they
          always were.
        */}
        {standIn && (stage === "closed" || stage === "drawn") ? (
          <div
            className="absolute inset-0"
            style={{ visibility: stage === "drawn" ? "visible" : "hidden" }}
          >
            <CurtainRevealCover {...state} phase={stage === "drawn" ? "opening" : "closed"} />
          </div>
        ) : null}

        <div className="absolute inset-0" style={blockStyle}>
          {/* Not over the drawn curtains: they have the card to show between them. */}
          {stage !== "drawn" ? (
            <>
              <div className="absolute inset-0" style={lightStyle} />
              <div className="absolute inset-0" style={surroundStyle} />
            </>
          ) : null}

          <div className="absolute inset-0" style={filmStyle}>
            {/*
              Muted and inline, which is what lets a phone play it on the tap
              without taking over the screen. No source and nothing preloaded
              in the markup: both are set once the cover is on screen. Never a
              tap target and never in the accessibility tree.
            */}
            <video
              ref={videoRef}
              muted
              playsInline
              preload="none"
              disablePictureInPicture
              tabIndex={-1}
              className="absolute max-w-none select-none"
              style={frameBox}
            />
            {/*
              The still, over the film until the film is drawing. Decoded
              before it is painted: the shell's loader has already waited for
              it.
            */}
            <img
              src={FILM.poster}
              alt=""
              decoding="sync"
              draggable={false}
              className="absolute max-w-none select-none"
              style={{ ...frameBox, opacity: filmShowing ? 0 : 1 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
