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
import CurtainRevealCover from "@/components/invite/covers/CurtainRevealCover";
import { stage } from "@/components/invite/covers/timing";
import { curtainArt } from "@/lib/curtainArt";
import {
  CURTAIN_VELVET,
  CURTAIN_VIDEO,
  CURTAIN_VIDEO_FADE,
} from "@/lib/curtainVideo";

/**
 * How the painted curtains are timed when they stand in for the film: the
 * 1.95s they were drawn for, not the film's length.
 */
const PAINTED_MS = 1950;

/** How long the still takes to give way to the card when there is nothing to play. */
const PLAIN_FADE_MS = 300;

/**
 * How long the film is given to start once asked. A phone that has not begun
 * to play by then is not going to in time to matter, and the guest is looking
 * at a still.
 */
const START_WATCHDOG_MS = 450;

/** What the open is played with. Decided at the tap, from what is in hand at that moment. */
type Path = "film" | "painted" | "plain";

/** A connection on which a guest should not be sent 300 KB of video for a flourish. */
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
 * Real velvet curtains, filmed, parting on the invitation.
 *
 * CLOSED, it is the film's first frame as a still, filling the screen. The
 * still is in the shell's loading gate; the film is not. It starts loading in
 * the background as the page opens, and the cover never waits for it.
 *
 * THE TAP DECIDES, from what has arrived by then, and the guest is never left
 * looking at a frozen still:
 *
 *   film      The film is ready: it plays once, muted and inline, under the
 *             still, which is taken away on the first frame the film reports.
 *   painted   It is not, or it will not play: the painted curtains this cover
 *             used to be (CurtainRevealCover) draw apart instead. They are
 *             mounted from the start, out of sight, so they have a closed
 *             state to move from and their pictures are already in.
 *   plain     Neither is in hand: the still fades to the card.
 *
 * A guest on a slow connection, or one who has asked their browser to save
 * data, is never sent the film at all and gets the painted curtains.
 *
 * THE FILM IS NOT TRANSPARENT. Behind its curtains is black, not the card. So
 * it is faded out across the stretch in which the curtains leave the picture,
 * and the card is what shows through them as they go; by the time the film
 * would be showing its black, it is gone. Opacity only.
 *
 * Under reduced motion the shell never hands this the "opening" phase: the
 * still crossfades to the card as one layer, and nothing is played.
 */
export default function CurtainVideoCover(state: CoverVisualState): ReactElement {
  const { phase, option, reducedMotion, colors } = state;
  const opening = phase === "opening";

  const videoRef = useRef<HTMLVideoElement>(null);
  /* Whether the painted curtains' two pictures are decoded, for the tap to ask. */
  const paintedReady = useRef(false);
  const [path, setPath] = useState<Path | null>(null);
  /* The film has drawn a frame: the still over it can go. */
  const [filmShowing, setFilmShowing] = useState(false);

  /*
    After mount, in the browser, where the connection can be asked: the film
    is requested unless the network says not to, and the painted curtains'
    pictures are decoded either way. Neither is waited for by anything.
  */
  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    let live = true;
    const painted = curtainArt(false);

    void Promise.all(
      [painted.panel, painted.valance].map((src) => {
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
          paintedReady.current = true;
        }
      },
      () => undefined,
    );

    /*
      A moment after mount, not on it: `reducedMotion` is the server's false
      on the first pass and the real answer on the next, and a guest who will
      never be shown the film should not be sent it.
    */
    const timer = window.setTimeout(() => {
      const video = videoRef.current;

      if (video !== null && !onSlowNetwork()) {
        /* WebM where the browser plays it; MP4 everywhere else, which is every iPhone. */
        video.src =
          video.canPlayType('video/webm; codecs="vp9"') === "probably"
            ? CURTAIN_VIDEO.webm
            : CURTAIN_VIDEO.mp4;
        video.load();
      }
    }, 300);

    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [reducedMotion]);

  /*
    The tap. Before paint, so the frame that follows it is already the chosen
    path's and never the bare still with nothing under way.
  */
  useIsomorphicLayoutEffect(() => {
    if (!opening || path !== null) {
      return;
    }

    const fallback: Path = paintedReady.current ? "painted" : "plain";
    const video = videoRef.current;

    /* Enough of it buffered to play through, or it is not played at all. */
    if (video === null || video.readyState < 3 || video.error !== null) {
      setPath(fallback);
      return;
    }

    setPath("film");

    let settled = false;
    const giveUp = (): void => {
      if (!settled) {
        settled = true;
        video.pause();
        setPath(fallback);
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
    /* `path` is read once, on the tap, and is what this effect itself sets. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opening]);

  const rootStyle = {
    "--cover-ms": `${option.durationMs}ms`,
  } as CSSProperties;

  /* The film and its surround, faded out as the curtains leave the picture. */
  const filmStyle: CSSProperties = {
    backgroundColor: CURTAIN_VELVET,
    transition:
      path === "film"
        ? stage("opacity", CURTAIN_VIDEO_FADE.share, CURTAIN_VIDEO_FADE.start, "ease-in-out")
        : path === "plain"
          ? `opacity ${PLAIN_FADE_MS}ms ease-in-out`
          : undefined,
    opacity: path === "film" || path === "plain" ? 0 : 1,
  };

  /*
    Filling a phone, centred on the seam, which the film was cropped about. On
    a screen wider than it is tall the whole film is shown, with velvet colour
    either side, rather than a strip of its middle blown up.
  */
  const fill =
    "absolute inset-0 h-full w-full max-w-none select-none object-cover object-center [@media(min-aspect-ratio:4/5)]:object-contain";

  return (
    <div aria-hidden style={rootStyle} className="pointer-events-none absolute inset-0 overflow-hidden">
      {/*
        The painted curtains, under everything and out of sight until they are
        needed. Held closed unless they are the path; given maroon cloth
        whatever the card, to match the still they take over from; and timed
        as they always were.
      */}
      {!reducedMotion && (path === null || path === "painted") ? (
        <div className="absolute inset-0" style={{ visibility: path === "painted" ? "visible" : "hidden" }}>
          <CurtainRevealCover
            {...state}
            phase={path === "painted" ? "opening" : "closed"}
            option={{ ...option, durationMs: PAINTED_MS }}
            colors={{ ...colors, isLight: false }}
          />
        </div>
      ) : null}

      {path !== "painted" ? (
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
            className={fill}
          />
          {/*
            The still, over the film until the film is drawing. Decoded before
            it is painted: the shell's loader has already waited for it.
          */}
          <img
            src={CURTAIN_VIDEO.poster}
            alt=""
            decoding="sync"
            draggable={false}
            className={fill}
            style={{ opacity: filmShowing ? 0 : 1 }}
          />
        </div>
      ) : null}
    </div>
  );
}
