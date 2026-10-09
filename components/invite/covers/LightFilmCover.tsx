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
import GoldFlower from "@/components/invite/covers/GoldFlower";
import { initialOf, initialsOf } from "@/components/invite/covers/initials";
import type { DrawnCover } from "@/components/invite/covers/VideoCover";
import { coverDebug, watchFilmEvents } from "@/lib/coverDebug";
import {
  LIGHT_FILM_CUT_MS,
  LIGHT_FILM_SMALL_BELOW_MBPS,
  LIGHT_FILM_STALL_MS,
  LIGHT_FILM_START_MS,
  LIGHT_FILM_SWITCH_MS,
  LIGHT_FILM_WAIT_MS,
  type LightFilm,
} from "@/lib/lightFilm";

/** How long the still takes to give way to the card when there is nothing to play. */
const PLAIN_FADE_MS = 300;

/**
 * A film whose clock has not moved for this long while it plays has stopped,
 * whatever it says of itself.
 */
const FROZEN_MS = 700;

/**
 * How long a film that reports it is waiting is given to carry on. A healthy
 * one says so for a few milliseconds as it starts, with every byte in hand,
 * and that is not a film to give up on; one still waiting after this is.
 */
const WAITING_GRACE_MS = 250;

/**
 * What a browser is asked before it is sent a film: H.264 in MP4 first, which
 * every phone decodes in hardware, then VP9 in WebM for a browser without it.
 */
const MP4 = { mime: "video/mp4", ask: 'video/mp4; codecs="avc1.64001F"' };
const WEBM = { mime: "video/webm", ask: 'video/webm; codecs="vp9"' };

/** One file the film can be had from. */
interface FilmSource {
  /** For the log. */
  name: string;
  url: string;
  mime: string;
}

/**
 * How long after the cover is on screen the film is given before the drawn
 * cover's pictures are sent for as well. On a good connection it is in well
 * inside this, and the guest downloads one still and one film.
 */
const STAND_IN_AFTER_MS = 1200;

/**
 * How long the film's last frame takes to leave the light under it. They are
 * the same colour, so this is seen by nobody; it only keeps the swap off a
 * single frame.
 */
const SWAP_MS = 160;

/** How long the still takes to clear the drawn cover when it opens in its place. */
const DRAWN_SWAP_MS = 250;

/** A film that starts this long after the tap has left its sound behind. */
const LATE_START_MS = 400;

/** How quickly the initials leave their seal on the tap: gone before it has cracked. */
const MARK_EXIT_MS = 180;

/** How quickly the band under a film's words goes on the tap: with the words. */
const BAND_EXIT_MS = 360;

/**
 * Where the open is. "film" is the film playing; "light" is the flat light
 * giving way to the card; "drawn" is the cover drawn in code opening in the
 * film's place; "plain" is the still fading, with neither in hand.
 */
type Stage = "closed" | "film" | "light" | "drawn" | "plain";

/**
 * Where the film itself is. "loading" is on its way; "ready" is the whole of
 * it in hand, as a Blob the <video> plays from; "out" is not coming.
 */
type FilmState = "loading" | "ready" | "out";

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

/**
 * A connection the full film would not cross in time: 3g by the browser's own
 * reckoning, or under a megabit and a half. It is sent the small film.
 */
function onModestNetwork(): boolean {
  const connection = (
    navigator as Navigator & {
      connection?: { effectiveType?: string; downlink?: number };
    }
  ).connection;

  return (
    connection?.effectiveType === "3g" ||
    (typeof connection?.downlink === "number" &&
      connection.downlink < LIGHT_FILM_SMALL_BELOW_MBPS)
  );
}

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * A cover as a film that ends in light: velvet curtains parting, or an
 * envelope breaking its seal, on a golden light that grows to fill the
 * screen, and the card coming out of the light.
 *
 * ONE COMPONENT FOR EVERY SUCH FILM. They differ in their footage, in what
 * was measured on it and in what is drawn when it cannot play, which is data
 * (lib/lightFilm.ts and each film's own file), and in nothing this file does.
 *
 * CLOSED, it is the film's first frame as a still, so the closed cover and
 * the film's first frame are one picture and nothing jumps when it starts.
 * The still is in the shell's loading gate; the film is not. It is asked for
 * only once the cover is on screen, which is after the card's own first
 * screen has loaded, so it never holds the card up.
 *
 * THE WHOLE FILM, OR NONE OF IT. It is fetched entire into a Blob and played
 * from that, never streamed: a film started on the part of it that had
 * arrived ran into the part that had not, and stopped half way. A tap before
 * it is in waits for it on the still, under a small shimmer, for two and a
 * half seconds and no longer.
 *
 * TWO WEIGHTS OF IT. The full film is 1.2 MB, which a slow 4G line does not
 * carry in the time a guest takes to tap. So each film has a small cut, a
 * third of the weight, and a guest gets that one when their connection says
 * it is slow, or when the full film has not arrived two seconds after the
 * cover did: its download is dropped and the small one's started.
 *
 * THE STILL STAYS UNTIL THE FILM IS ON SCREEN. A <video> says it is playing
 * before it has drawn anything, by a quarter of a second on a slow phone, and
 * a still taken away on its word left that long of nothing: black, on a phone
 * that gives video its own surface. So the still comes off only when the film
 * reports a frame presented.
 *
 * A film with a seal has
 * the couple's initials lettered on it, placed by the film's own measurements
 * through the same arithmetic the film is placed by, so they sit on the seal
 * at any screen size, and they are gone before the seal has cracked.
 *
 * THE FILM IS FOLLOWED, NOT TIMED. The hand-over starts when the film itself
 * says it has reached its flat last frames, not so many milliseconds after
 * the tap, so a phone that plays it slowly still crosses from light to card
 * and never from a cover half open. Three layers do it: the film on top, a
 * layer of exactly the film's last colour under it, and the card under that.
 * The film is taken off the light, which nobody can see, and the light is
 * faded off the card: 0.8 seconds onto a light card, 1.1 onto a dark one,
 * where the change is the bigger. Opacity only. The shell's Skip is sent
 * away as the film's light starts to flood, so it never stands on the light.
 *
 * WHEN THE FILM CANNOT PLAY, the cover drawn in code opens instead, as it
 * always did: if the film has failed, if it has not arrived in time after the
 * tap, if the browser will not start it, or on a connection it was never sent
 * over. A film that stops once it is playing is not left on its stopped
 * frame either: the frame gives way to the light and the light to the card.
 * And whatever happens the cover comes down: at the light, at the film's
 * end, or a second and a half past its length, whichever is first.
 * `?coverdebug=1` on the link puts all of this on screen; see
 * lib/coverDebug.ts. It is mounted out of sight as soon as the film looks
 * late, so it has a closed state to open from. With neither in hand the
 * still fades to the card, and for a film that never had a drawn cover that
 * soft fade is the whole of its fallback.
 *
 * NOTHING HERE STARTS ON THE TAP ITSELF. The shell holds the cover closed,
 * the still and the words as they were, until the browser has finished going
 * into fullscreen and has painted at the new size, and hands this "opening"
 * only then: a film started while the screen was still changing was a black
 * screen on an Android phone. See enterFullscreenThen in lib/fullscreen.ts.
 *
 * Under reduced motion the shell never hands this the "opening" phase: the
 * still crossfades to the card as one layer, and no film is requested.
 */
export default function LightFilmCover({
  film: FILM,
  drawn,
  ...state
}: CoverVisualState & { film: LightFilm; drawn?: DrawnCover }): ReactElement {
  const { phase, option, reducedMotion, colors, ready, retime, dismissSkip } = state;
  const { title, pair, headingFont } = state;
  const opening = phase === "opening";
  const fadeMs = colors.isLight ? FILM.fadeMs : FILM.fadeToDarkMs;
  const plainMs = FILM.plainFadeMs ?? PLAIN_FADE_MS;

  const videoRef = useRef<HTMLVideoElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  /* Where the film is, why it is out when it is, and what the tap left waiting to hear. */
  const filmState = useRef<FilmState>("loading");
  const filmOutWhy = useRef("");
  const onFilmSettled = useRef<(() => void) | null>(null);
  /* The tap has asked the film to play: what it does from here is the tap's to deal with. */
  const filmAsked = useRef(false);
  /* Whether the drawn cover's pictures are decoded, for the tap to ask. */
  const drawnReady = useRef(false);
  const drawnSent = useRef(false);
  /* The drawn cover is in the tree, under the still. */
  const [standIn, setStandIn] = useState(false);
  const [stage, setStage] = useState<Stage>("closed");
  /* The film has drawn a frame: the still over it can go. */
  const [filmShowing, setFilmShowing] = useState(false);
  /* The film stopped short of the light, so it is faded to the light, not swapped out on it. */
  const [cutShort, setCutShort] = useState(false);

  const sendForDrawn = useCallback((): void => {
    if (drawnSent.current || drawn === undefined) {
      return;
    }

    drawnSent.current = true;
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
        drawnReady.current = true;
      },
      () => undefined,
    );
  }, [drawn, colors.isLight]);

  /*
    The film, fetched whole once the closed cover is on screen. `ready` comes
    after the card's own fonts and first pictures, so the film is behind them
    in the queue, and long after hydration, so `reducedMotion` is the guest's
    real answer by now and not the server's false.
  */
  useEffect(() => {
    if (!ready || reducedMotion) {
      return;
    }

    const video = videoRef.current;

    const settle = (state: FilmState, why: string): void => {
      filmState.current = state;
      filmOutWhy.current = state === "out" ? why : "";
      coverDebug(`film ${state}: ${why}`);

      if (state === "out") {
        sendForDrawn();
      }

      onFilmSettled.current?.();
    };

    if (video === null) {
      settle("out", "no video element");
      return;
    }

    if (onSlowNetwork()) {
      settle("out", "data saver or a 2g connection, film not requested");
      return;
    }

    let live = true;
    let blobUrl: string | null = null;
    /* The download under way, and which turn of the queue it belongs to. */
    let fetching: AbortController | null = null;
    let turn = 0;
    /* Which of the queue is in the <video>, for an error there to move on from. */
    let current = -1;

    filmState.current = "loading";
    const unwatch = watchFilmEvents(video);

    /*
      Said on the element as well as in the markup. React writes `muted` as a
      property and not as an attribute, and a browser deciding whether a film
      may start without a gesture of its own reads either.
    */
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");

    const playsMp4 = video.canPlayType(MP4.ask) !== "";
    const full: FilmSource[] = [
      ...(playsMp4 ? [{ name: "mp4", url: FILM.mp4, mime: MP4.mime }] : []),
      ...(video.canPlayType(WEBM.ask) !== ""
        ? [{ name: "webm", url: FILM.webm, mime: WEBM.mime }]
        : []),
    ];
    const small: FilmSource | null =
      playsMp4 && FILM.mp4Small !== undefined
        ? { name: "mp4 480p", url: FILM.mp4Small, mime: MP4.mime }
        : null;
    /* The small film first on a slow connection, with the full ones behind it should it fail. */
    const smallFirst = small !== null && onModestNetwork();
    let sources = smallFirst ? [small, ...full] : full;

    if (smallFirst) {
      coverDebug("slow connection: the small film");
    }

    const load = async (index: number): Promise<void> => {
      const mine = turn;
      const source = sources[index];

      if (source === undefined) {
        settle("out", sources.length === 0 ? "no format this browser plays" : "no source loaded");
        return;
      }

      try {
        coverDebug(`fetch ${source.name}`);
        fetching = new AbortController();
        const response = await fetch(source.url, { signal: fetching.signal });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const body = await response.blob();

        if (!live || mine !== turn) {
          return;
        }

        /* A server that mislabels it does not get to stop it playing. */
        const blob = body.type.startsWith("video/") ? body : body.slice(0, body.size, source.mime);

        if (blobUrl !== null) {
          URL.revokeObjectURL(blobUrl);
        }

        blobUrl = URL.createObjectURL(blob);
        current = index;
        video.preload = "auto";
        video.src = blobUrl;
        video.load();
        settle("ready", `${source.name}, ${Math.round(blob.size / 1024)} KB in hand`);
      } catch (error) {
        /* Dropped for the small film, or the cover has gone: not a failure to move on from. */
        if (!live || mine !== turn) {
          return;
        }

        coverDebug(`${source.name} failed: ${error instanceof Error ? error.message : "unknown"}`);
        await load(index + 1);
      }
    };

    /* A file the browser cannot decode after all, found before the tap: the next one. */
    const undecodable = (): void => {
      if (!live || filmAsked.current || current < 0) {
        return;
      }

      const next = current + 1;
      current = -1;
      filmState.current = "loading";
      void load(next);
    };

    video.addEventListener("error", undecodable);
    void load(0);

    /*
      The full film, still not in: its download is dropped and the small
      one's started, which is a third of the wait from here.
    */
    const swap = window.setTimeout(() => {
      if (small === null || smallFirst || filmState.current !== "loading") {
        return;
      }

      coverDebug(`full film not in after ${LIGHT_FILM_SWITCH_MS} ms: the small film`);
      turn += 1;
      fetching?.abort();
      sources = [small, ...full];
      void load(0);
    }, LIGHT_FILM_SWITCH_MS);

    const late = window.setTimeout(() => {
      if (filmState.current !== "ready") {
        sendForDrawn();
      }
    }, STAND_IN_AFTER_MS);

    return () => {
      live = false;
      fetching?.abort();
      window.clearTimeout(late);
      window.clearTimeout(swap);
      video.removeEventListener("error", undecodable);
      unwatch();

      if (blobUrl !== null) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [ready, reducedMotion, sendForDrawn, FILM]);

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
    let grace = 0;
    let frame = 0;
    let firstFrame = 0;
    /* The film's clock when it last moved, and when that was. */
    let clock = 0;
    let clockAt = 0;

    /* Which way the cover opened, for the log and for a test to read. */
    const took = (path: string): void => {
      coverDebug(`PATH ${path}`);

      if (rootRef.current !== null) {
        rootRef.current.dataset.coverPath = path;
      }
    };

    /* The drawn cover, or failing that the still fading. */
    const standDown = (why: string): void => {
      if (settled || playing) {
        return;
      }

      settled = true;
      window.clearTimeout(wait);
      window.clearTimeout(watchdog);
      video?.pause();

      if (drawnReady.current) {
        took(`fallback (drawn cover): ${why}`);
        setStage("drawn");
        retime({
          durationMs: option.durationMs,
          revealAt: option.revealAt,
          burstAt: option.burstAt,
          sound: "restart",
        });
      } else {
        /*
          A film with nothing drawn behind it keeps its sound over the fade,
          which is its opening; one that has lost its drawing as well has
          nothing left for a sound to go with.
        */
        took(`fallback (still fades): ${why}`);
        setStage("plain");
        retime({
          durationMs: plainMs,
          revealAt: 0,
          sound: drawn === undefined ? "keep" : "stop",
        });
      }
    };

    /*
      The light giving way to the card, and the shell told how long that
      takes. `why` is given for a film cut short: its stopped frame goes to
      the light first, and then the light to the card.
    */
    const toLight = (why?: string): void => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(stall);
      window.clearTimeout(grace);
      window.cancelAnimationFrame(frame);
      dismissSkip();

      if (why === undefined) {
        took("video, played to the light");
        setStage("light");
        retime({ durationMs: fadeMs, revealAt: 0, sound: "keep" });
        return;
      }

      took(`fallback (frame to light to card) at ${video?.currentTime.toFixed(2) ?? "?"}s: ${why}`);
      video?.pause();
      setCutShort(true);
      setStage("light");
      retime({
        durationMs: LIGHT_FILM_CUT_MS + fadeMs,
        revealAt: LIGHT_FILM_CUT_MS / (LIGHT_FILM_CUT_MS + fadeMs),
        sound: "keep",
      });
    };

    /* One read of the film's clock a frame, while it plays: no layout, nothing written. */
    const follow = (): void => {
      if (video === null) {
        return;
      }

      if (video.ended || video.currentTime * 1000 >= FILM.lightAtMs) {
        toLight();
        return;
      }

      /* A clock that has stood still: the film has stopped, whatever it reports. */
      const now = performance.now();

      if (video.currentTime !== clock) {
        clock = video.currentTime;
        clockAt = now;
      } else if (now - clockAt >= FROZEN_MS) {
        toLight(`clock stood still for ${FROZEN_MS} ms`);
        return;
      }

      /*
        Skip goes as the light starts to flood, so it is not left standing on
        a screen of plain light. Only on this path: the drawn cover never
        shows that screen and keeps Skip to the end.
      */
      if (!glowing && video.currentTime * 1000 >= FILM.glowAtMs) {
        glowing = true;
        dismissSkip();
      }

      frame = window.requestAnimationFrame(follow);
    };

    /* The film says it is short of data. Believed only if it is still short a moment later. */
    const starved = (event: Event): void => {
      if (!playing || settled || video === null) {
        return;
      }

      const said = event.type;
      const from = video.currentTime;
      window.clearTimeout(grace);
      grace = window.setTimeout(() => {
        if (video.currentTime === from && !video.ended) {
          toLight(`"${said}" and no frame since`);
        }
      }, WAITING_GRACE_MS);
    };

    const ended = (): void => toLight();

    /* The film has put a frame on the screen: only now does its still come off it. */
    const started = (): void => {
      if (settled || playing || video === null) {
        return;
      }

      playing = true;
      window.clearTimeout(watchdog);
      coverDebug(`first frame on screen, ${Math.round(performance.now() - tappedAt)} ms after the tap`);
      setFilmShowing(true);
      setStage("film");

      /*
        The shell's net, from now: the film, its grace and the hand-over. A
        film that was waited for starts its sound again, to go with it.
      */
      const lengthMs =
        Number.isFinite(video.duration) && video.duration > 0
          ? video.duration * 1000
          : FILM.lengthMs;
      const netMs = lengthMs + LIGHT_FILM_STALL_MS + LIGHT_FILM_CUT_MS + fadeMs;
      retime({
        durationMs: netMs,
        revealAt: 1 - fadeMs / netMs,
        sound: performance.now() - tappedAt > LATE_START_MS ? "restart" : "keep",
      });

      clock = video.currentTime;
      clockAt = performance.now();
      video.addEventListener("waiting", starved);
      video.addEventListener("stalled", starved);
      video.addEventListener("ended", ended);
      frame = window.requestAnimationFrame(follow);
      /* A film that never gets there, or a tab put away: the card is not kept behind it. */
      stall = window.setTimeout(
        () => toLight("past its own length and not at the light"),
        lengthMs + LIGHT_FILM_STALL_MS,
      );
    };

    const failed = (): void => {
      const why = `video error ${video?.error?.code ?? "?"}`;

      if (playing) {
        toLight(why);
      } else {
        standDown(why);
      }
    };

    /* Without requestVideoFrameCallback: "playing", and a frame for it to be drawn in. */
    const playingSaid = (): void => {
      frame = window.requestAnimationFrame(started);
    };

    const begin = (): void => {
      if (asked || settled || video === null) {
        return;
      }

      asked = true;
      filmAsked.current = true;
      window.clearTimeout(wait);
      video.addEventListener("error", failed, { once: true });

      if (typeof video.requestVideoFrameCallback === "function") {
        firstFrame = video.requestVideoFrameCallback(started);
      } else {
        video.addEventListener("playing", playingSaid, { once: true });
      }

      watchdog = window.setTimeout(
        () => standDown(`no frame ${LIGHT_FILM_START_MS} ms after play()`),
        LIGHT_FILM_START_MS,
      );

      /*
        A browser that refuses to play, an iPhone in Low Power Mode or a
        phone saving data, rejects here, and the drawn cover opens.
      */
      try {
        const answer = video.play();
        coverDebug("play() called");
        void answer?.then(
          () => coverDebug("play() resolved"),
          (error: unknown) => {
            const name = error instanceof Error ? error.name : "unknown";
            coverDebug(`play() rejected: ${name}`);
            standDown(`play() rejected (${name})`);
          },
        );
      } catch {
        standDown("play() threw");
      }
    };

    /* The film's answer, now or when it comes: play it, or stand down. */
    const decide = (): boolean => {
      if (video === null || filmState.current === "out") {
        standDown(filmOutWhy.current || "no film");
        return true;
      }

      if (filmState.current === "ready") {
        begin();
        return true;
      }

      return false;
    };

    coverDebug(`OPENING (the screen has settled), film ${filmState.current}`);

    /* Not in yet: waited for on the still, under the shimmer, and not for long. */
    if (!decide()) {
      sendForDrawn();
      onFilmSettled.current = decide;
      wait = window.setTimeout(
        () => standDown(`film not in ${LIGHT_FILM_WAIT_MS} ms after the tap`),
        LIGHT_FILM_WAIT_MS,
      );
    }

    return () => {
      onFilmSettled.current = null;
      window.clearTimeout(wait);
      window.clearTimeout(watchdog);
      window.clearTimeout(stall);
      window.clearTimeout(grace);
      window.cancelAnimationFrame(frame);

      if (video !== null) {
        if (firstFrame !== 0) {
          video.cancelVideoFrameCallback(firstFrame);
        }

        video.removeEventListener("playing", playingSaid);
        video.removeEventListener("error", failed);
        video.removeEventListener("waiting", starved);
        video.removeEventListener("stalled", starved);
        video.removeEventListener("ended", ended);
      }
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
        ? `opacity ${plainMs}ms ease-in-out`
        : stage === "drawn"
          ? `opacity ${DRAWN_SWAP_MS}ms ease-out`
          : undefined,
    opacity: stage === "plain" || stage === "drawn" ? 0 : 1,
  };

  /*
    The light: the film's last colour, between the film and the card. Under a
    film cut short it holds until the stopped frame has gone to it.
  */
  const lightStyle: CSSProperties = {
    backgroundColor: FILM.light,
    transition:
      stage === "light"
        ? `opacity ${fadeMs}ms ease-in-out ${cutShort ? LIGHT_FILM_CUT_MS : 0}ms`
        : undefined,
    opacity: stage === "light" ? 0 : 1,
    willChange: "opacity",
  };

  /* The film's own edge colour beside it on a wide screen, cleared as its light floods. */
  const surroundStyle: CSSProperties = {
    backgroundColor: FILM.surround,
    transition:
      stage === "light" && cutShort
        ? `opacity ${LIGHT_FILM_CUT_MS}ms ease-in-out`
        : filmShowing
          ? `opacity ${FILM.glowMs}ms ease-in ${FILM.glowAtMs}ms`
          : undefined,
    opacity: filmShowing ? 0 : 1,
  };

  /* The film, taken off the light once it is the light's own colour. */
  const filmStyle: CSSProperties = {
    transition:
      stage === "light"
        ? `opacity ${cutShort ? LIGHT_FILM_CUT_MS : SWAP_MS}ms ${cutShort ? "ease-in-out" : "linear"}`
        : undefined,
    opacity: stage === "light" ? 0 : 1,
    willChange: "opacity",
  };

  /* The monogram: the same rules on every cover. */
  const pairLetters = pair?.map(initialOf).filter((letter) => letter.length > 0) ?? [];
  const lineLetters = pairLetters.length === 0 ? initialsOf(title) : "";
  const mark = FILM.mark;
  const ink = FILM.ink;
  const Drawn = drawn?.Component;
  /* Tapped, and nothing moving yet: the film is on its way, or about to draw. */
  const waiting = opening && stage === "closed";

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden [container-type:size]"
    >
      {/* Inside the container: a container's own units cannot be read on the container itself. */}
      <div
        className="absolute inset-0 [--fw:max(100cqw,56.25cqh)] [@container_(min-aspect-ratio:4/5)]:[--fw:56.25cqh]"
        style={rootStyle}
      >
        {/*
          The drawn cover, under everything and out of sight until it is
          needed. Held closed unless it is the path, and timed as it always
          was. The prompt is the shell's, on its plaque; the drawing is not
          asked to letter it again.
        */}
        {Drawn !== undefined && standIn && (stage === "closed" || stage === "drawn") ? (
          <div
            className="absolute inset-0"
            style={{ visibility: stage === "drawn" ? "visible" : "hidden" }}
          >
            <Drawn
              {...state}
              phase={stage === "drawn" ? "opening" : "closed"}
              prompt=""
            />
          </div>
        ) : null}

        <div className="absolute inset-0" style={blockStyle}>
          {/* Not over the drawn cover: it has the card to show through it. */}
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
              in the markup: the film is fetched once the cover is on screen.
              Its still is its poster too and its ground is clear, so a frame
              it has not drawn yet is the still and never black. Filled to its
              box: the small film is 480x854, a third of a pixel off 9:16.
              Never a tap target and never in the accessibility tree.
            */}
            <video
              ref={videoRef}
              muted
              playsInline
              preload="none"
              poster={FILM.poster}
              disablePictureInPicture
              tabIndex={-1}
              className="absolute max-w-none bg-transparent object-fill select-none"
              style={frameBox}
            />
            {/*
              The still, over the film until the film has put a frame on the
              screen. Decoded before it is painted: the shell's loader has
              already waited for it.
            */}
            <img
              src={FILM.poster}
              alt=""
              decoding="sync"
              draggable={false}
              className="absolute max-w-none select-none"
              style={{ ...frameBox, opacity: filmShowing ? 0 : 1 }}
            />

            {mark !== undefined && ink !== undefined ? (
              /*
                A box the width of the seal's clear face, centred on it, laid
                out from the film's own place on the screen. A size container,
                so the lettering is sized off the seal itself. It goes on the
                tap, at once and quickly: the seal under it is about to crack.
              */
              <div
                data-cover-mark=""
                className="absolute flex items-center justify-center [container-type:inline-size]"
                style={{
                  left: `calc(var(--fl) + var(--fw) * ${(mark.x - mark.width / 2).toFixed(4)})`,
                  top: `calc(var(--ft) + var(--fw) * 16 / 9 * ${mark.y.toFixed(4)} - var(--fw) * ${(mark.width / 2).toFixed(4)})`,
                  width: `calc(var(--fw) * ${mark.width.toFixed(4)})`,
                  height: `calc(var(--fw) * ${mark.width.toFixed(4)})`,
                  transition: opening ? `opacity ${MARK_EXIT_MS}ms ease-out` : undefined,
                  opacity: opening && !reducedMotion ? 0 : 1,
                }}
              >
                {/*
                  The widest pair a card can carry, "M & W" in a wide capital
                  face, is about 3.3 ems across. At 24% of the face's width
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
                      fontSize:
                        pairLetters.length === 1 || lineLetters.length === 1 ? "42cqw" : "32cqw",
                      color: ink.body,
                      textShadow: ink.shadow,
                    }}
                  >
                    {pairLetters[0] ?? lineLetters}
                  </span>
                ) : (
                  /* Nobody named: a small flower in the same ink. See GoldFlower. */
                  <GoldFlower hi={ink.hi} body={ink.body} lo={ink.lo} className="w-[46%] max-w-16" />
                )}
              </div>
            ) : null}
          </div>

          {/*
            Tapped, and the film not on screen yet: a hairline of the film's
            own light with a glint running along it, where the prompt was.
            Late in, so a film that starts at once never shows it.
          */}
          {waiting ? (
            <div
              data-cover-wait=""
              className="absolute inset-x-0 bottom-[14%] flex animate-[lifafa-cover-loader-in_300ms_ease-out_220ms_both] justify-center"
            >
              <div className="relative h-[3px] w-16 overflow-hidden rounded-full bg-black/30">
                <div
                  className="absolute inset-y-0 left-0 w-2/5 animate-[lifafa-cover-film-wait_1.1s_ease-in-out_infinite] rounded-full"
                  style={{ backgroundColor: FILM.light }}
                />
              </div>
            </div>
          ) : null}

          {/*
            The ground the shell's words are read on, for a film that has
            them at its foot: its own shade, solid at the foot and thinning
            upwards, as the breeze cover lays one down from the head.
          */}
          {FILM.band !== undefined ? (
            <div
              className="absolute inset-x-0 bottom-0 h-[44%]"
              style={{
                backgroundImage: `linear-gradient(0deg, ${FILM.band}E6 0%, ${FILM.band}B8 46%, ${FILM.band}00 100%)`,
                transition: opening ? `opacity ${BAND_EXIT_MS}ms ease-out` : undefined,
                opacity: opening && !reducedMotion ? 0 : 1,
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
