"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from "react";
import type { CoverVisualState } from "@/components/invite/CoverShell";
import GoldFlower from "@/components/invite/covers/GoldFlower";
import { initialOf, initialsOf } from "@/components/invite/covers/initials";
import { filmFor, type CoverFilmSet } from "@/lib/coverVideos";

/** How long the still takes to give way to the card when there is nothing to play. */
const PLAIN_FADE_MS = 300;

/**
 * How long the film is given to start once asked. A phone that has not begun
 * to play by then is not going to in time to matter, and the guest is looking
 * at a still.
 */
const START_WATCHDOG_MS = 450;

/**
 * How long the film is given to arrive before the drawn cover's pictures are
 * sent for as well. On a good connection it is in well inside this, and the
 * guest downloads one still and one film and nothing else.
 */
const STAND_IN_AFTER_MS = 2500;

/** When the initials start to go, after the tap: as the film's own action starts. */
const MARK_EXIT_DELAY_MS = 250;

/** What the open is played with. Decided at the tap, from what is in hand at that moment. */
type Path = "film" | "drawn" | "plain";

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
 * The cover as it was drawn in code before there was a film of it: what
 * stands in when the film cannot play. It runs to the option's own length and
 * shares, which are its timings and always were.
 */
export interface DrawnCover {
  Component: (state: CoverVisualState) => ReactElement | null;
  /** The pictures it is drawn from, to have in hand before it is shown. */
  images: (isLight: boolean) => readonly string[];
}

/**
 * A cover that is a film of the real thing opening.
 *
 * ONE COMPONENT FOR ALL FOUR. The curtain, the envelope, the petals and the
 * gatefold differ in their footage and in where their initials sit, which is
 * data (lib/coverVideos.ts), and in nothing this file does.
 *
 * CLOSED, it is the film's first frame as a still, filling the screen, with
 * the couple's initials lettered on its seal, oval or medallion. The still is
 * in the shell's loading gate; the film is not. It starts loading in the
 * background as the page opens, and the cover never waits for it. A light
 * card gets the light film and a dark card the dark one, and only that one is
 * ever requested.
 *
 * THE TAP DECIDES, from what has arrived by then, so a guest is never left
 * looking at a frozen still:
 *
 *   film    The film is ready: it plays once, muted and inline, under the
 *           still, which is taken away on the first frame the film reports.
 *   drawn   It is not, or it will not play: the cover as it was drawn in code
 *           opens instead. It is mounted, out of sight, once the film is
 *           late, failing or not wanted, so it has a closed state to move
 *           from and its pictures are in.
 *   plain   Neither is in hand: the still fades to the card.
 *
 * A guest on a slow connection, or one who has asked their browser to save
 * data, is never sent the film at all and gets the drawn cover.
 *
 * THE FILM IS NOT TRANSPARENT. Behind its curtains or its doors is the
 * film's own backdrop, not the card. So it is faded out across the stretch in
 * which the cover clears, and the card is what shows through; it has gone
 * before it could show an empty frame. Opacity, and for the envelope a
 * transform that carries its blank card up to fill the screen as it fades.
 *
 * THE INITIALS are placed by the film's own measurements through the same
 * arithmetic the film is placed by, so they sit on the seal at any screen
 * size. They leave with the action: faded off the seal as it breaks, carried
 * outward with the petals, slid down with the ribbon.
 *
 * Under reduced motion the shell never hands this the "opening" phase: the
 * still and its initials crossfade to the card as one layer, and nothing is
 * played or requested.
 */
export default function VideoCover({
  films,
  drawn,
  ...state
}: CoverVisualState & { films: CoverFilmSet; drawn: DrawnCover }): ReactElement {
  const { phase, option, reducedMotion, colors, title, pair, headingFont, retime } = state;
  const opening = phase === "opening";
  const film = filmFor(films, colors.isLight);

  const videoRef = useRef<HTMLVideoElement>(null);
  /* Whether the drawn cover's pictures are decoded, for the tap to ask. */
  const drawnReady = useRef(false);
  /* The drawn cover is in the tree, under the still: it has been sent for. */
  const [standIn, setStandIn] = useState(false);
  const [path, setPath] = useState<Path | null>(null);
  /* The film has drawn a frame: the still over it can go. */
  const [filmShowing, setFilmShowing] = useState(false);

  /*
    After mount, in the browser, where the connection can be asked. A moment
    after it, not on it: `reducedMotion` is the server's false on the first
    pass and the real answer on the next, and a guest who will never be shown
    the film should not be sent it.
  */
  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    let live = true;
    const video = videoRef.current;

    const sendForDrawn = (): void => {
      if (!live) {
        return;
      }

      setStandIn(true);

      void Promise.all(
        drawn.images(colors.isLight).map((src) => {
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
          if (live) {
            drawnReady.current = true;
          }
        },
        () => undefined,
      );
    };

    let late = 0;

    const timer = window.setTimeout(() => {
      if (video === null || onSlowNetwork()) {
        sendForDrawn();
        return;
      }

      /* WebM where the browser plays it; MP4 everywhere else, which is every iPhone. */
      video.src =
        video.canPlayType('video/webm; codecs="vp9"') === "probably" ? film.webm : film.mp4;
      video.addEventListener("error", sendForDrawn, { once: true });
      video.load();

      late = window.setTimeout(() => {
        if (video.readyState < 3) {
          sendForDrawn();
        }
      }, STAND_IN_AFTER_MS);
    }, 300);

    return () => {
      live = false;
      window.clearTimeout(timer);
      window.clearTimeout(late);
      video?.removeEventListener("error", sendForDrawn);
    };
  }, [reducedMotion, film, drawn, colors.isLight]);

  /*
    The tap. Before paint, so the frame that follows it is already the chosen
    path's and never the bare still with nothing under way.
  */
  useIsomorphicLayoutEffect(() => {
    if (!opening || path !== null) {
      return;
    }

    const standDown = (): void => {
      if (standIn && drawnReady.current) {
        setPath("drawn");
        retime({
          durationMs: option.durationMs,
          revealAt: option.revealAt,
          burstAt: option.burstAt,
          sound: "restart",
        });
      } else {
        setPath("plain");
        retime({ durationMs: PLAIN_FADE_MS, revealAt: 0, sound: "stop" });
      }
    };

    const video = videoRef.current;

    /* Enough of it buffered to play through, or it is not played at all. */
    if (video === null || video.readyState < 3 || video.error !== null) {
      standDown();
      return;
    }

    setPath("film");

    let settled = false;
    const giveUp = (): void => {
      if (!settled) {
        settled = true;
        video.pause();
        standDown();
      }
    };
    const started = (): void => {
      if (!settled) {
        settled = true;
        setFilmShowing(true);
      }
    };

    video.currentTime = 0;
    video.addEventListener("playing", started, { once: true });
    video.addEventListener("error", giveUp, { once: true });

    const watchdog = window.setTimeout(giveUp, START_WATCHDOG_MS);
    /* A browser that refuses to play — an iPhone in Low Power Mode — rejects here. */
    const playing = video.play();
    void playing?.then(undefined, giveUp);

    return () => {
      window.clearTimeout(watchdog);
      video.removeEventListener("playing", started);
      video.removeEventListener("error", giveUp);
    };
    /* Everything else here is read once, on the tap. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opening]);

  /* The monogram: the same rules on every cover. */
  const pairLetters = pair?.map(initialOf).filter((letter) => letter.length > 0) ?? [];
  const lineLetters = pairLetters.length === 0 ? initialsOf(title) : "";

  /*
    The film's place on the screen, as one width everything is laid out from.
    It covers a phone, centred. On a screen wider than it is tall the whole of
    it is shown instead, with its own backdrop's colour either side, rather
    than a strip of its middle blown up.
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

  /* The film and its surround, faded out as the cover clears. */
  const going = path === "film" || path === "plain";
  const filmStyle: CSSProperties = {
    backgroundColor: film.surround,
    transformOrigin:
      film.grow !== undefined
        ? `calc(var(--fl) + var(--fw) * ${film.grow.x}) calc(var(--ft) + var(--fw) * 16 / 9 * ${film.grow.y})`
        : undefined,
    transition:
      path === "film"
        ? [
            `opacity ${film.fadeMs}ms ease-in-out ${film.fadeStartMs}ms`,
            film.grow !== undefined
              ? `transform ${film.fadeMs}ms cubic-bezier(0.4,0,0.2,1) ${film.fadeStartMs}ms`
              : null,
          ]
            .filter((entry) => entry !== null)
            .join(", ")
        : path === "plain"
          ? `opacity ${PLAIN_FADE_MS}ms ease-in-out`
          : undefined,
    opacity: going ? 0 : 1,
    transform:
      path === "film" && film.grow !== undefined ? `scale(${film.grow.scale})` : undefined,
    willChange: "opacity, transform",
  };

  const mark = film.mark;
  const ink = film.ink;
  const exit = films.markExit ?? "fade";
  const exitMs = exit === "fade" ? 200 : 400;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden [container-type:size]"
    >
      {/*
        Inside the container, because a container's own units cannot be read
        on the container itself, and asked of the container rather than the
        window so the editor's small preview is laid out as a phone is.
      */}
      <div
        className="absolute inset-0 [--fw:max(100cqw,56.25cqh)] [@container_(min-aspect-ratio:4/5)]:[--fw:56.25cqh]"
        style={rootStyle}
      >
      {/*
        The drawn cover, under everything and out of sight until it is needed.
        Held closed unless it is the path, and timed as it always was. Kept
        while the film is trying to start, so that a film which then will not
        has a closed drawing to open from rather than one mounted already open.
      */}
      {standIn && path !== "plain" ? (
        <div className="absolute inset-0" style={{ visibility: path === "drawn" ? "visible" : "hidden" }}>
          {/* The prompt is the shell's, on its plaque; the drawing is not asked to letter it again. */}
          <drawn.Component
            {...state}
            phase={path === "drawn" ? "opening" : "closed"}
            prompt=""
          />
        </div>
      ) : null}

      {path !== "drawn" ? (
        <div className="absolute inset-0" style={filmStyle}>
          {/*
            Muted and inline, which is what lets a phone play it without a
            gesture of its own and without taking over the screen. No source
            in the markup: it is set after mount, once the network has been
            asked. Never a tap target and never in the accessibility tree.
          */}
          <video
            ref={videoRef}
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            tabIndex={-1}
            className="absolute max-w-none select-none"
            style={frameBox}
          />
          {/*
            The still, over the film until the film is drawing. Decoded before
            it is painted: the shell's loader has already waited for it.
          */}
          <img
            src={film.poster}
            alt=""
            decoding="sync"
            draggable={false}
            className="absolute max-w-none select-none"
            style={{ ...frameBox, opacity: filmShowing ? 0 : 1 }}
          />

          {mark !== undefined && ink !== undefined ? (
            /*
              A box the width of the mark's clear face, centred on it. A size
              container, so the lettering is sized off the mark itself.
            */
            <div
              className="absolute flex items-center justify-center [container-type:inline-size]"
              style={{
                left: `calc(var(--fl) + var(--fw) * ${(mark.x - mark.width / 2).toFixed(4)})`,
                top: `calc(var(--ft) + var(--fw) * 16 / 9 * ${mark.y.toFixed(4)} - var(--fw) * ${(mark.width / 2).toFixed(4)})`,
                width: `calc(var(--fw) * ${mark.width.toFixed(4)})`,
                height: `calc(var(--fw) * ${mark.width.toFixed(4)})`,
                transition: opening
                  ? `opacity ${exitMs}ms ease-out ${MARK_EXIT_DELAY_MS}ms, transform ${exitMs}ms ease-in ${MARK_EXIT_DELAY_MS}ms`
                  : undefined,
                opacity: opening && !reducedMotion ? 0 : 1,
                transform:
                  !opening || reducedMotion
                    ? "none"
                    : exit === "drift"
                      ? "scale(1.18)"
                      : exit === "drop"
                        ? "translate3d(0, 120%, 0)"
                        : "none",
              }}
            >
              {/*
                The widest pair a card can carry, "M & W" in a wide capital
                face, is about 3.3 ems across. At 24% of the mark's width
                that is four fifths of it, so every pair fits with air.
              */}
              {pairLetters.length === 2 ? (
                <span
                  data-cover-monogram=""
                  className="leading-none whitespace-nowrap"
                  style={{ ...headingFont, fontSize: "24cqw", color: ink.body, textShadow: ink.shadow }}
                >
                  {pairLetters[0]}
                  <span className="mx-[0.14em] text-[0.72em]" style={{ color: ink.hi }}>
                    &amp;
                  </span>
                  {pairLetters[1]}
                </span>
              ) : pairLetters.length === 1 || lineLetters.length > 0 ? (
                <span
                  data-cover-monogram=""
                  className="leading-none whitespace-nowrap"
                  style={{
                    ...headingFont,
                    letterSpacing: "0.04em",
                    fontSize: pairLetters.length === 1 || lineLetters.length === 1 ? "42cqw" : "32cqw",
                    color: ink.body,
                    textShadow: ink.shadow,
                  }}
                >
                  {pairLetters[0] ?? lineLetters}
                </span>
              ) : (
                /* Nobody named: a small flower in the same ink. See GoldFlower. */
                <GoldFlower hi={ink.hi} body={ink.body} lo={ink.lo} className="w-[46%]" />
              )}
            </div>
          ) : null}
        </div>
      ) : null}
      </div>
    </div>
  );
}
