"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { preload } from "react-dom";
import { CoverOpenContext } from "@/hooks/useCoverOpen";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { BurstGateContext, RevealGateContext } from "@/hooks/useRevealGate";
import { cardCopy } from "@/lib/cardLanguage";
import { whenCardReady, whenPicturesReady, whenVisible } from "@/lib/cardReady";
import { getCoverAnimation } from "@/lib/coverAnimations";
import { fontFamilyOf, getFontPair, namesFaceOf, pairRoleVar } from "@/lib/fontPairs";
import { coverPalette, type CoverPalette } from "@/lib/coverPalette";
import type { Palette } from "@/lib/palettes";
import {
  playCoverSound,
  preloadCoverSound,
  restartCoverSound,
  stopCoverSound,
} from "@/lib/coverSound";
import { enterFullscreen } from "@/lib/fullscreen";
import type { CardLanguage } from "@/types/card";
import type { CoverAnimationOption } from "@/types/coverAnimation";
import type { FontPairId } from "@/types/style";

/** Set when a guest has asked, at the OS level, not to be shown effects. */
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * How long the cover stays mounted after its own animation says it is done.
 *
 * A CSS transition starts on the frame after the phase changes, while the timer
 * below starts on the tap itself, so unmounting at exactly durationMs cuts the
 * last frame or two of every fade. On a fade that is revealing the card, those
 * frames are the difference between the cover dissolving and the cover
 * blinking out. A few frames of grace lets the final one paint.
 */
const UNMOUNT_GRACE_MS = 80;

/**
 * How quickly the names and the prompt leave once the guest has tapped.
 *
 * Quicker than any visual: they asked to be let in, and "Tap seal to open"
 * still sitting there while the seal breaks reads as an instruction nobody
 * has followed yet.
 */
const WORDS_FADE_MS = 360;

/**
 * "You are invited", over the closed cover: how long it takes to arrive once
 * the loader has let the cover through, how long after that it waits to start,
 * and how long it takes to go when the guest taps.
 *
 * Slower in than out. It arrives as the cover does, over a second, so it reads
 * as part of the cover settling and not as a caption switched on; it leaves a
 * little slower than the prompt under it, so it is still going as the seal
 * breaks or the cloth starts to move, and has gone before the card shows.
 */
const INVITE_IN_MS = 1100;
const INVITE_IN_DELAY_MS = 350;
const INVITE_OUT_MS = 600;

/**
 * How long after the cover appears its recorded sound is fetched, if it has one.
 *
 * Not at once, for two reasons. On the first pass `reducedMotion` is still the
 * server's `false` — the real answer lands in the render straight after
 * hydration — and a guest who will never see the cover should not download its
 * sound; waiting lets that render cancel the fetch before it starts. And the
 * first moments belong to the card's own fonts and images. Still far shorter
 * than anyone takes to read a name and tap.
 */
const SOUND_PRELOAD_DELAY_MS = 300;

/**
 * The longest the cover waits for the first screen's fonts and pictures before
 * it appears anyway. See lib/cardReady.ts: the loader is a courtesy, never a
 * place a guest can be left.
 */
const READY_TIMEOUT_MS = 5000;

/**
 * The longest the cover waits for its own artwork, when it is drawn from
 * pictures: the curtain's cloth.
 *
 * Longer than the card's wait, on purpose. A card missing its garland at the
 * five second mark is still a card, and opening onto it beats holding a guest
 * on a loader. A curtain cover missing its curtains is nothing at all — a bare
 * ground with a button on it — so it is worth a longer wait, and the pictures
 * are two files asked for at the front of the queue. Still an end: a picture
 * that fails is let through at once, and past this the cover appears anyway.
 */
const COVER_ART_TIMEOUT_MS = 15000;

/** No pictures to wait for: every cover drawn from the card's own palette. */
const NO_ART: readonly string[] = [];

/** How long the loader takes to give way to the cover, once the card is ready. */
const LOADER_FADE_MS = 420;

/**
 * The opening for a guest who asked for less motion: the closed envelope
 * crossfading to the card, in place of the cover's animation.
 */
const REDUCED_FADE_MS = 300;

/**
 * Where the cover is in its one journey.
 *
 * "closed" is what a guest lands on, "opening" is the animation playing, and
 * "open" is the card. It only ever runs forwards: there is no way back to a
 * sealed envelope once it has been torn.
 */
type CoverPhase = "closed" | "opening" | "open";

/** What the cover layer hands its visual, so the visual owns no state of its own. */
export interface CoverVisualState {
  phase: CoverPhase;
  option: CoverAnimationOption;
  /** True when the guest has asked for no motion; the visual should draw a still frame. */
  reducedMotion: boolean;
  /**
   * The colours to draw in, derived from the card's own palette. A visual must
   * take every fill, stroke and ornament colour from here and hold none of its
   * own — see lib/coverPalette.ts for why the wrapper is made of the same
   * material as the card inside it.
   */
  colors: CoverPalette;
  /**
   * THE VISUAL PAINTS ITS OWN GROUND ONCE THE COVER IS OPENING.
   *
   * The shell's layer is the card's background while "closed" and goes
   * transparent the moment the guest taps, so a visual that draws anything
   * must also draw a full-bleed backdrop in `colors.ground` and fade it on its
   * own schedule. That is what lets the card show through as the envelope
   * falls away or the curtains part, instead of appearing all at once when the
   * shell unmounts. A visual that forgets its backdrop reveals the card on the
   * first frame of the tap.
   *
   * The same title the cover prints, passed on so a visual can letter it into
   * the drawing — initials on a wax seal, a monogram on a curtain. Undefined
   * when the host has not named anyone, and a visual must still draw without it.
   */
  title?: string;
  /**
   * The pair's names face, as the names under the drawing are set in it, so a
   * visual that letters the names into itself — initials pressed into wax, the
   * couple on the letter — writes them in the same hand.
   */
  namesFont: CSSProperties;
  /**
   * The pair's heading face: the card's display face, for a visual that
   * letters something other than the names themselves — a monogram in wax.
   * The names face may be a script, which two capitals and an ampersand are
   * not written in.
   */
  headingFont: CSSProperties;
  /**
   * The two people, when the card names two: for a monogram of their
   * initials. Apart from `title` because the title is one line with the
   * host's own joining word in it, and no rule can tell every joining word
   * from a name. Undefined when the card names one person, or nobody.
   */
  pair?: readonly [string, string];
  /**
   * The prompt, in the card's language, for a visual that letters it into
   * its own artwork (`wordsOn: "visual"`). The shell prints it otherwise.
   */
  prompt: string;
  /**
   * Where on the cover the guest tapped, as shares of its width and height,
   * for a visual that opens from that point. Null until the tap, and for a
   * cover opened from the keyboard, which has no point: open from the middle.
   */
  origin: { x: number; y: number } | null;
  /**
   * For a visual that finds, at the tap, that it cannot open the way the
   * shell was timed for — a film that has not arrived — and opens another way:
   * the shell's timers are started again from now, to this length, with the
   * card let go at `revealAt` of it. The sound, held back for the film, is
   * started at once for an opening that moves on the tap ("restart"), or
   * dropped for one with nothing to go with it ("stop"). Only while opening.
   */
  retime: (next: {
    durationMs: number;
    revealAt: number;
    burstAt?: number;
    sound: "restart" | "stop";
  }) => void;
}

/** For useSyncExternalStore, where the only question is server or browser. */
function subscribeToNothing(): () => void {
  return () => {};
}

/**
 * What a guest sees while the card is still arriving: a small envelope in the
 * card's accent, breathing, over the words "Preparing your invitation", on the
 * card's own ground — never black. It is in the server's HTML, so it is the
 * first thing painted, and it covers the cover until the card is ready, so a
 * tap made before the page can answer it lands on nothing that looks tappable.
 *
 * Painted at once when it arrives with the server's HTML, because that is a
 * guest waiting on a page. Mounted later in the browser — a Replay — its mark
 * and words come in a quarter of a second late instead, so a card that is
 * ready at once hands straight over to its cover with nothing flashing up in
 * between. Not delayed in the first case, because a delayed CSS animation
 * cannot start while the page's scripts hold the main thread, and on a slow
 * phone that left the loader blank for seconds.
 */
function PreparingLoader({
  ready,
  text,
  ground,
  accent,
  muted,
}: {
  ready: boolean;
  text: string;
  ground: string;
  accent: string;
  muted: string;
}): ReactElement {
  /* False for the server's render and the hydration that matches it; true for a later mount. */
  const mountedLater = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  return (
    <div
      data-cover-loading=""
      role="status"
      aria-hidden={ready}
      className="absolute inset-0 z-30 flex items-center justify-center"
      style={{
        backgroundColor: ground,
        opacity: ready ? 0 : 1,
        transition: `opacity ${LOADER_FADE_MS}ms ease-out`,
        pointerEvents: ready ? "none" : "auto",
      }}
    >
      <div
        className={`flex flex-col items-center gap-4 ${
          mountedLater
            ? "animate-[lifafa-cover-loader-in_400ms_ease-out_250ms_both] motion-reduce:animate-none"
            : ""
        }`}
      >
        <svg
          viewBox="0 0 48 36"
          aria-hidden="true"
          focusable="false"
          className="h-9 w-12 animate-[lifafa-cover-loader-pulse_1.8s_ease-in-out_infinite] motion-reduce:animate-none"
          style={{ color: accent }}
        >
          <rect x="2" y="2" width="44" height="32" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3 4 L24 21 L45 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <circle cx="24" cy="21" r="4" fill="currentColor" />
        </svg>
        <p className="text-[0.8125rem] tracking-[0.12em]" style={{ color: muted }}>
          {text}
        </p>
      </div>
    </div>
  );
}

/**
 * The closed cover a guest taps before the invitation itself.
 *
 * Structure and state only at this point. Every animation id behaves the same
 * way here — a cream panel that goes away when tapped — because the phases and
 * the timing are what the visuals will hang off, and those are worth settling
 * before anything moves.
 *
 * The visual arrives through `renderVisual` rather than being chosen in here.
 * A render prop keeps this component free of any one animation's markup, hands
 * the visual a typed snapshot instead of a scattering of stringly attributes,
 * and leaves nothing behind in the DOM when no visual is passed. The layer also
 * carries `data-phase` and `data-animation`, so a visual that would rather be
 * driven by CSS alone can key off an ancestor selector and skip the prop.
 */
export default function CoverShell({
  animationId,
  palette,
  accent,
  title,
  pair,
  fontPairId,
  language,
  topClearance,
  renderVisual,
  children,
}: {
  /**
   * The card's language, which the prompt on the cover and the Skip button are
   * written in. The cover is the first thing a guest reads, so a Hindi card
   * behind an English "Tap seal to open" would be introduced by the wrong
   * language.
   */
  language: CardLanguage;
  /** The raw value off the saved card. Unknown, null and undefined all mean "no cover". */
  animationId: string | null | undefined;
  /**
   * The card's palette, which is also the cover's.
   *
   * Required rather than defaulted. A default would be a cream cover in front
   * of whatever the host actually chose, which is the exact fault this argument
   * exists to remove — and there are only two places that mount a cover, so
   * there is no call site a required prop makes awkward.
   */
  palette: Palette;
  /** The host's own accent when they set one; the palette's otherwise. */
  accent?: string | null;
  /** The couple, or whatever names the event, shown on the closed cover. */
  title?: string;
  /** The two names apart, when there are two. See CoverVisualState. */
  pair?: readonly [string, string];
  /**
   * The card's font pair. The names on the cover are set in its names face,
   * the same one the card's own cover uses, so the guest meets the couple in
   * one hand before and after the tap. Required for the same reason the
   * palette is: a default would be a face the host never chose.
   */
  fontPairId: FontPairId;
  /**
   * A band at the top of the screen the drawing must keep clear of, as a CSS
   * length: the guest page's language switch, when it shows one. Published as
   * --cover-top-h, which ABOVE_WORDS starts below. Absent, the drawing has the
   * whole height above the words, as it always had.
   */
  topClearance?: string;
  renderVisual?: (state: CoverVisualState) => ReactNode;
  children: ReactNode;
}): ReactElement {
  const option = getCoverAnimation(animationId);
  const hasCover = option.id !== "none";
  const colors = coverPalette(palette, accent);
  const copy = cardCopy(language);
  const prompt = option.openPromptText[language];
  const fontPair = getFontPair(fontPairId);
  const namesFace = namesFaceOf(fontPair);
  /* A cover whose artwork fills the screen: the prompt alone, on a plaque. */
  const onPlaque = option.wordsOn === "plaque";
  /*
    The pictures the cover is drawn from, when it is: the set for this card's
    ground, light or dark, and no other. Asked for with the server's HTML and
    ahead of the card's own pictures, because they are the first thing a guest
    is shown and the loader stays up until they are in. React deduplicates the
    hints, so calling it on every render costs nothing.
  */
  const art = hasCover ? (option.art?.(colors.isLight) ?? null) : null;
  /*
    What the open is timed to: the film's own numbers when the cover is played
    from one, for this card's ground, and the option's otherwise.
  */
  const film = option.film?.(colors.isLight);
  const durationMs = film?.durationMs ?? option.durationMs;
  const revealAt = film?.revealAt ?? option.revealAt;
  const burstAt = film !== undefined ? undefined : option.burstAt;
  const soundDelayMs = film?.soundDelayMs ?? 0;
  const artImages = art?.images ?? NO_ART;

  for (const src of artImages) {
    preload(src, { as: "image", fetchPriority: "high" });
  }

  /*
    Seeded rather than corrected in an effect. A card saved with no animation
    has no cover at any point in its life, and starting it "closed" would flash
    a panel over the invitation for one frame before an effect took it away.
  */
  const [phase, setPhase] = useState<CoverPhase>(hasCover ? "closed" : "open");

  /*
    Read through the shared hook, which serves `false` on the server and during
    hydration and only then swaps in the real match. Nothing here touches
    `window` in a render that hydration compares, so there is no mismatch.
  */
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);

  /*
    Whether the card's first screen is ready to be seen: its fonts in, and the
    pictures on that screen loaded and decoded — or five seconds gone. The rest
    of the card goes on loading behind the envelope. Until then the loader
    covers the cover. Waited for on every mount, from nothing stored: each
    fresh open of the link, and each Replay, plays in full.
  */
  const [ready, setReady] = useState<boolean>(false);
  const cardRef = useRef<HTMLDivElement>(null);

  /*
    Up until the cover is gone, whatever the guest's motion setting.

    It used to come down at once for a guest who had asked their device for
    less movement, and since the server cannot know that setting, the envelope
    was painted first and then vanished as the page woke, which is exactly an
    opening that was skipped. Android turns the setting on with "Remove
    animations" and, on some phones, with battery saver — which is a great
    many guests. So they get the envelope too, still and waiting for a tap,
    and the tap crossfades it to the card: no movement, no petal burst.
  */
  const covered = phase !== "open";

  /** The pending hand-off from "opening" to "open", so a skip can cancel it. */
  const timerRef = useRef<number | null>(null);

  /*
    Whether the card underneath has been let go, which happens before the cover
    has finished: at the option's `revealAt`, part way through the open.

    THE CARD ARRIVES WITH THE COVER, NOT AFTER IT. Its reveals are held behind
    the gate below while the cover is up, and the gate used to open only when
    the cover unmounted. So every cover dissolved onto a card with no words on
    it, and then the words arrived — which is a page loading, not an invitation
    opening. Letting the card go at the moment it starts to show through means
    the names are already settling into place under the letter, or between the
    curtains, as the cover leaves them.
  */
  const [cardLetGo, setCardLetGo] = useState<boolean>(false);
  const letGoTimerRef = useRef<number | null>(null);

  /* The card's petal burst, let go at the option's `burstAt` when it has one. See useBurstGate. */
  const [burstLetGo, setBurstLetGo] = useState<boolean>(false);
  const burstTimerRef = useRef<number | null>(null);

  /* Where the guest tapped, for a visual that opens from there. See CoverVisualState. */
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);

  const clearTimer = useCallback((): void => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (letGoTimerRef.current !== null) {
      window.clearTimeout(letGoTimerRef.current);
      letGoTimerRef.current = null;
    }

    if (burstTimerRef.current !== null) {
      window.clearTimeout(burstTimerRef.current);
      burstTimerRef.current = null;
    }
  }, []);

  /*
    The three timers of an open: the card let go, its petals thrown, and the
    cover taken down. Any still pending are dropped first, so calling it again
    — React running an updater twice in development, or a visual retiming the
    open — never leaves one this component has lost track of, which is one a
    skip could not cancel.
  */
  const schedule = useCallback(
    (runMs: number, letGoMs: number, burstMs: number): void => {
      clearTimer();

      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        setPhase("open");
      }, runMs + UNMOUNT_GRACE_MS);

      letGoTimerRef.current = window.setTimeout(() => {
        letGoTimerRef.current = null;
        setCardLetGo(true);
      }, letGoMs);

      burstTimerRef.current = window.setTimeout(() => {
        burstTimerRef.current = null;
        setBurstLetGo(true);
      }, burstMs);
    },
    [clearTimer],
  );

  const retime = useCallback<CoverVisualState["retime"]>(
    (next) => {
      /* Nothing to retime once a skip, or the timer itself, has opened the card. */
      if (timerRef.current === null) {
        return;
      }

      if (next.sound === "restart") {
        restartCoverSound();
      } else {
        stopCoverSound();
      }

      schedule(
        next.durationMs,
        next.durationMs * next.revealAt,
        next.durationMs * (next.burstAt ?? next.revealAt),
      );
    },
    [schedule],
  );

  /**
   * Whether this cover has already made its sound.
   *
   * A ref rather than the phase, and it is not redundant with the guard below.
   * That guard lives inside a state updater, and React calls an updater twice
   * in development and may call it again on a replayed render; a sound
   * scheduled in there would be scheduled twice. This is read and set once, in
   * the handler itself, where a tap happens exactly as often as it happens.
   */
  const soundedRef = useRef(false);

  /*
    How much of the bottom of the screen the names and the prompt take, from
    the top of the names to the foot of the screen, published to the visual as
    --cover-words-h.

    MEASURED, NOT GUESSED. A visual used to be centred on the whole screen and
    sized by its width alone, with the words simply printed under it — which
    held on a tall phone with short names and failed on a short one with long
    ones: two lines of a script face under a browser's own toolbars, and the
    folded card sat on top of the couple's names. Now each visual draws its
    centrepiece in the space above this line and sizes it to that space, so the
    two cannot meet whatever the names, the face or the phone. Re-measured when
    the words change size — a font arriving, a line wrapping — and when the
    screen does.
  */
  const layerRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<HTMLSpanElement>(null);
  const [wordsHeight, setWordsHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const layer = layerRef.current;
    const words = wordsRef.current;

    if (layer === null || words === null || typeof ResizeObserver !== "function") {
      return;
    }

    const measure = (): void => {
      const reach = layer.getBoundingClientRect().bottom - words.getBoundingClientRect().top;
      /* A little air between the centrepiece and the names. */
      setWordsHeight(Math.max(0, Math.round(reach + 20)));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(layer);
    observer.observe(words);

    return () => observer.disconnect();
  }, [title, prompt]);

  const handleOpen = useCallback((event: MouseEvent<HTMLButtonElement>): void => {
    /*
      A click from the keyboard reports no position (its detail is 0), and
      neither does one a screen reader makes.
    */
    const layer = layerRef.current;

    if (layer !== null && event.detail > 0) {
      const bounds = layer.getBoundingClientRect();

      if (bounds.width > 0 && bounds.height > 0) {
        setOrigin({
          x: (event.clientX - bounds.left) / bounds.width,
          y: (event.clientY - bounds.top) / bounds.height,
        });
      }
    }

    /*
      The address bar goes with the tap too, and for the same reason the sound
      does: fullscreen is only ever granted from inside a user gesture, so this
      is the one moment on the whole page where it can be asked for. A guest
      who has just tapped a wax seal is the guest most willing to be handed a
      whole screen of invitation.

      Does nothing on an iPhone, which has no page fullscreen to give — see
      lib/fullscreen.ts. Nothing below depends on the answer.
    */
    enterFullscreen();

    /*
      The sound goes with the tap, not with the phase change.

      Skipped under reduced motion, which opens with a short fade, and for a
      cover with no time to run — a noise with no animation under it is a jump
      scare, not a flourish. playCoverSound swallows everything else: a
      browser with no Web Audio, or one that will not start a context, opens the
      card in silence and says nothing about it.
    */
    if (!soundedRef.current && !reducedMotion && durationMs > 0) {
      soundedRef.current = true;
      playCoverSound(option.sound, soundDelayMs);

      /*
        And a tick under the thumb, where the phone can give one. On the same
        terms as the sound and for the same reason. Guarded twice: an iPhone
        has no `vibrate` at all, and a browser that has one may still refuse.
      */
      if (option.haptic !== undefined && typeof navigator.vibrate === "function") {
        try {
          navigator.vibrate(option.haptic);
        } catch {
          /* A cover that opens without a tick has still opened. */
        }
      }
    }

    /*
      The whole double tap guard. A second tap during "opening" would queue a
      second timeout, and an impatient guest could stack several; the phase
      itself is the lock, so there is no separate flag to keep in step.
    */
    setPhase((current) => {
      if (current !== "closed") {
        return current;
      }

      if (!reducedMotion && durationMs <= 0) {
        return "open";
      }

      /*
        Less motion: the whole layer fades in REDUCED_FADE_MS with the card let
        go at once under it, so the card is what the envelope fades into.
      */
      schedule(
        reducedMotion ? REDUCED_FADE_MS : durationMs,
        reducedMotion ? 0 : durationMs * revealAt,
        reducedMotion ? 0 : durationMs * (burstAt ?? revealAt),
      );

      return "opening";
    });
  }, [
    burstAt,
    durationMs,
    option.haptic,
    option.sound,
    reducedMotion,
    revealAt,
    schedule,
    soundDelayMs,
  ]);

  const handleSkip = useCallback((): void => {
    /* Also a tap, so also a gesture the browser will honour. */
    enterFullscreen();
    clearTimer();
    /* Skipping part way through an open: the sound of it goes with it. */
    stopCoverSound();
    setPhase("open");
  }, [clearTimer]);

  /** A timer outliving the component would call setState on a dead tree. */
  useEffect(() => clearTimer, [clearTimer]);

  /*
    The opening sound runs on for a second or so after its cover has gone, as
    the card settles in, so it is not stopped when the cover leaves — only
    when this shell does: a host pressing Replay, which mounts a new one that
    plays it again from the start, or a page being left.
  */
  useEffect(() => stopCoverSound, []);

  /*
    The wait. Started after hydration, when the card is on the page to be read,
    and finished only while the page is on screen: a link opened in a
    background tab keeps its loader until the guest switches to it, and the
    envelope arrives in front of them rather than for nobody.
  */
  useEffect(() => {
    if (!hasCover) {
      return;
    }

    let live = true;

    void Promise.all([
      whenCardReady(cardRef.current, READY_TIMEOUT_MS),
      whenPicturesReady(artImages, COVER_ART_TIMEOUT_MS),
    ])
      .then(whenVisible)
      .then(() => {
        if (live) {
          setReady(true);
        }
      });

    return () => {
      live = false;
    };
  }, [hasCover, artImages]);

  /*
    The cover's sound is fetched and decoded while the cover is closed, so it
    can start on the frame the guest taps; fetched on the tap, it would land
    after the curtains had parted. Only this cover's own, and on the same terms
    handleOpen plays it, so a cover that will open in silence downloads
    nothing. Nothing waits for it: if it is not ready at the tap, the cover
    opens without it.
  */
  useEffect(() => {
    if (phase !== "closed" || reducedMotion || durationMs <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      preloadCoverSound(option.sound);
    }, SOUND_PRELOAD_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [phase, reducedMotion, durationMs, option.sound]);

  /*
    The cover is a full viewport layer, so the page behind it must not scroll:
    on a phone a stray drag scrolls an invitation the guest cannot see yet. The
    previous value is put back rather than cleared, so this never overwrites a
    lock some other component set.
  */
  useEffect(() => {
    if (!covered) {
      return;
    }

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [covered]);

  const namesFont: CSSProperties = {
    fontFamily: fontFamilyOf(namesFace.variable, namesFace.fallback),
    fontWeight: namesFace.weight,
    letterSpacing: namesFace.tracking,
  };
  /*
    Under reduced motion the drawing is kept closed through the opening — its
    own opened state would be reached without transitions, in one jump — and
    the layer fades as a whole instead, the still envelope crossfading to the
    card.
  */
  const visual = renderVisual?.({
    phase: reducedMotion && phase === "opening" ? "closed" : phase,
    option,
    reducedMotion,
    colors,
    title,
    namesFont,
    headingFont: {
      fontFamily: fontFamilyOf(
        pairRoleVar(fontPair, "heading"),
        fontPair.headingFallback,
      ),
      fontWeight: fontPair.headingWeight,
    },
    pair,
    prompt,
    origin,
    retime,
  });
  const hasVisual = visual !== null && visual !== undefined;
  const fadesWhole = !hasVisual || reducedMotion;
  const fadeMs = reducedMotion ? REDUCED_FADE_MS : durationMs;

  return (
    <>
      {/*
        The card stays mounted underneath the whole time, rather than waiting
        for "open". A reveal has to have something to reveal: curtains that
        part onto an empty page, then pop a card in afterwards, are not a
        reveal. `inert` is what makes that safe — while the cover is up the
        card takes no focus, no clicks and no screen reader cursor, so the only
        thing a guest can reach is the way in. `display: contents` keeps the
        wrapper out of the layout, so the card sits exactly where it would
        without a cover around it.

        A boolean `inert`, which is what React 19 wants: it is handled with the
        other boolean DOM attributes, and the empty string React 18 needed would
        now log a warning and be read as false.

        The gate beside it is what stops the card's scroll reveals from arming
        while it is down here out of sight, and it opens at the hand-off rather
        than when the cover has gone — see `cardLetGo`. The card stays inert
        until the cover has actually unmounted: it is arriving, not yet there.
        See hooks/useRevealGate.ts.
      */}
      <RevealGateContext value={!covered || cardLetGo}>
        {/* Later than the gate: only once the cover has unmounted. */}
        <CoverOpenContext value={!covered}>
          <BurstGateContext value={!covered || burstLetGo}>
            <div ref={cardRef} className="contents" inert={covered}>
              {children}
            </div>
          </BurstGateContext>
        </CoverOpenContext>
      </RevealGateContext>

      {/*
        Unmounted at "open", not hidden. A cover left in the tree keeps its
        button in the tab order and its title in the accessibility tree, both
        sitting in front of an invitation the guest has already opened.
      */}
      {covered ? (
        <div
          /*
            A sibling of the card rather than inside it, so the card's `lang`
            never reaches it and it carries its own.
          */
          lang={copy.lang}
          data-phase={phase}
          data-animation={option.id}
          /*
            The ground is the card's own background, not cream.

            This is the frame before the first frame of the invitation, and for
            nine of the ten palettes a cream one was a lie about what was behind
            it: a guest tapped a white envelope and the screen went black. Now
            the cover and the card start from the same colour, so opening reads
            as paper coming away rather than as the lights being switched.

            Inline rather than a class, for the same reason CardCanvas sets its
            colours inline — the palette is data on a row, not one of a fixed
            set of themes a stylesheet could enumerate.
          */
          style={
            {
              /*
                Handed to the visual from the tap onwards — see the note on
                CoverVisualState. With no visual there is nobody to hand it to,
                so the plain panel fades itself over the same timer instead.
              */
              backgroundColor:
                phase === "closed" || fadesWhole ? colors.ground : "transparent",
              opacity: phase === "opening" && fadesWhole ? 0 : 1,
              transition:
                phase === "opening" && fadesWhole
                  ? `opacity ${fadeMs}ms ease-in-out`
                  : undefined,
              /*
                Published as variables as well as painted, so the controls below
                can use them in states an inline style cannot reach — a hover, a
                focus ring — without each one being handed the palette again.
              */
              /* Over artwork the artwork's own inks, which were chosen against it. */
              "--cover-text": art?.ink ?? colors.text,
              "--cover-muted": art?.inkMuted ?? colors.textMuted,
              "--cover-accent": art?.plaqueEdge ?? colors.accent,
              "--cover-prompt": art?.promptInk ?? "var(--cover-muted)",
              ...(wordsHeight !== null
                ? { "--cover-words-h": `${wordsHeight}px` }
                : null),
              ...(topClearance !== undefined
                ? { "--cover-top-h": topClearance }
                : null),
            } as CSSProperties
          }
          ref={layerRef}
          className="fixed inset-0 z-50 flex min-h-dvh w-full flex-col items-center justify-center"
        >
          {visual}

          {/*
            "You are invited", and the line under it, across the head of the
            closed cover.

            ABOVE THE ARTWORK'S OWN CENTRE, never over it. Every cover keeps its
            seal, oval or medallion at the middle of the screen and its prompt
            at the foot, so the head is the one band left clear — below the
            language switch's own band, which --cover-top-h already publishes.

            Said here and nowhere else: the cue at the foot of the first
            screen (InvitedCue) used to say it again once the cover had gone,
            and now only points down the card. The heading is in the card's
            names face, the script on a pair that has one. In the inks
            the cover's artwork was given to be read in, with a soft shadow of
            the opposite tone under it: a film's first frame is cloth, paper or
            petals, and no single ink clears all of it unaided.

            Opacity and transform only, and a real fade in both directions: in
            once the loader has gone, out on the tap. Under reduced motion it
            neither moves nor fades on its own — it is simply there, and leaves
            with the cover as the whole layer crossfades to the card.

            Never a tap target: the button under it is the whole screen.
          */}
          <div
            data-cover-invite=""
            className="pointer-events-none absolute inset-x-0 z-10 flex flex-col items-center gap-2 px-7 text-center motion-reduce:transition-none"
            style={{
              top: "calc(var(--cover-top-h, 0px) + max(5.5vh, 28px))",
              opacity: reducedMotion || (ready && phase === "closed") ? 1 : 0,
              transform:
                reducedMotion || (ready && phase === "closed")
                  ? "none"
                  : phase === "closed"
                    ? "translate3d(0, 8px, 0)"
                    : "translate3d(0, -6px, 0)",
              transition:
                phase === "closed"
                  ? `opacity ${INVITE_IN_MS}ms ease-out ${INVITE_IN_DELAY_MS}ms, transform ${INVITE_IN_MS}ms cubic-bezier(0.2,0.7,0.2,1) ${INVITE_IN_DELAY_MS}ms`
                  : `opacity ${INVITE_OUT_MS}ms ease-in-out, transform ${INVITE_OUT_MS}ms ease-in`,
              /* The artwork's own tone where it has one; the card's otherwise. */
              textShadow: (art?.tone !== undefined ? art.tone === "light" : colors.isLight)
                ? "0 1px 2px rgba(255, 251, 240, 0.9), 0 0 14px rgba(255, 251, 240, 0.85)"
                : "0 1px 2px rgba(0, 0, 0, 0.6), 0 0 14px rgba(0, 0, 0, 0.55)",
            }}
          >
            <p
              className="text-[calc(1.75rem*var(--cover-names-scale))] text-[var(--cover-text)] text-balance sm:text-[calc(2.125rem*var(--cover-names-scale))]"
              style={
                {
                  "--cover-names-scale": String(namesFace.scale),
                  ...namesFont,
                  lineHeight:
                    copy.script === "devanagari"
                      ? 1.45
                      : Math.max(namesFace.leading, 1.25),
                } as CSSProperties
              }
            >
              {copy.coverInvite.heading}
            </p>
            {/*
              Who from: the couple, or whatever names the event, between the
              heading and its line. Only on a cover whose prompt is on a
              plaque, which is every cover that is cloth, paper or petals from
              edge to edge. Those print the prompt alone at the foot, because
              names set down there lie over the artwork's own gold, and so
              printed the names nowhere: a guest was invited, and not told by
              whom, until the cover had gone. Up here they are in the one band
              the artwork leaves clear. A plain cover prints them with its
              prompt, below, and is left to.

              In the names face, like the heading, a size down from it, and in
              the same ink over the same soft shadow. It leaves with the rest
              of this block on the tap.
            */}
            {title && hasVisual && onPlaque ? (
              <p
                data-cover-names=""
                className="max-w-full text-[calc(1.5rem*var(--cover-names-scale))] text-[var(--cover-text)] wrap-anywhere text-balance sm:text-[calc(1.75rem*var(--cover-names-scale))]"
                style={
                  {
                    "--cover-names-scale": String(namesFace.scale),
                    ...namesFont,
                    lineHeight:
                      copy.script === "devanagari"
                        ? 1.45
                        : Math.max(namesFace.leading, 1.3),
                  } as CSSProperties
                }
              >
                {title}
              </p>
            ) : null}
            <p
              className="max-w-[19rem] text-[0.875rem] leading-[1.55] text-[var(--cover-muted)] text-balance"
              style={{ fontFamily: fontFamilyOf(pairRoleVar(fontPair, "body"), fontPair.bodyFallback) }}
            >
              {copy.coverInvite.line}
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpen}
            disabled={phase !== "closed"}
            style={{
              opacity: phase === "closed" ? 1 : 0,
              transition: `opacity ${WORDS_FADE_MS}ms ease-out`,
            }}
            aria-label={title ? `${prompt}: ${title}` : prompt}
            /*
              A visual owns the middle of the screen, so the words move out from
              under it and sit low. With no visual there is nothing to clear and
              they take the centre, which is where a plain cover wants them.
            */
            /*
              The focus ring is the accent rather than ink: on a dark palette an
              ink outline on an ink ground is a focus ring nobody can see, and
              this is the only control a keyboard guest has.
            */
            className={`relative flex h-full w-full flex-1 cursor-pointer flex-col items-center gap-4 px-6 text-center focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[var(--cover-accent)] disabled:cursor-default ${
              !hasVisual
                ? "justify-center"
                : onPlaque
                  ? "justify-end pb-[max(15vh,104px)] lg:pb-[24vh]"
                  : "justify-end pb-[max(9vh,60px)]"
            }`}
          >
            {/*
              On a plaque: the prompt and nothing else. The whole screen is
              cloth, with two gold borders running down the middle of it, and
              names set over those would be gold on gold. So the couple is met
              when the curtains part, and what is printed here is only the way
              in: small, in the card's heading face, on a plaque that carries
              it over velvet and zari alike, clear above the hem's tassels.
              The whole screen is still the button.
            */}
            {option.wordsOn === "visual" ? null : onPlaque ? (
              <span
                ref={wordsRef}
                className="animate-[lifafa-cover-pulse_2.8s_ease-in-out_infinite] rounded-full border px-5 py-2 text-[0.8125rem] tracking-[0.16em] uppercase shadow-[0_6px_18px_rgba(0,0,0,0.28)] motion-reduce:animate-none"
                style={{
                  backgroundColor: art?.plaque,
                  borderColor: art?.plaqueEdge ?? "var(--cover-accent)",
                  color: art?.plaqueInk ?? "var(--cover-text)",
                  fontFamily: fontFamilyOf(
                    pairRoleVar(fontPair, "heading"),
                    fontPair.headingFallback,
                  ),
                  fontWeight: fontPair.headingWeight,
                }}
              >
                {prompt}
              </span>
            ) : (
              <span ref={wordsRef} className="flex flex-col items-center gap-4">
                {/*
                  The names alone take the pair's names face; the prompt below
                  keeps the page's own. Sized and spaced as the card's cover does
                  it — a script is scaled up so it carries as much as a serif —
                  with leading of at least 1.3, because the names here run as one
                  line that wraps and a script's capitals and descenders need the
                  room. Devanagari takes the cover's 1.45 for its matras.

                  Wrapped together so the shell can measure how far up the screen
                  they reach; see `wordsRef`.
                */}
                {title ? (
                  <span
                    className="text-[calc(1.875rem*var(--cover-names-scale))] text-[var(--cover-text)] wrap-anywhere text-balance sm:text-[calc(2.375rem*var(--cover-names-scale))]"
                    style={
                      {
                        "--cover-names-scale": String(namesFace.scale),
                        fontFamily: fontFamilyOf(
                          namesFace.variable,
                          namesFace.fallback,
                        ),
                        fontWeight: namesFace.weight,
                        letterSpacing: namesFace.tracking,
                        wordSpacing: namesFace.wordSpacing,
                        lineHeight:
                          copy.script === "devanagari"
                            ? 1.45
                            : Math.max(namesFace.leading, 1.3),
                      } as CSSProperties
                    }
                  >
                    {title}
                  </span>
                ) : null}
                {/*
                  A rule of the accent between the names and the way in, and the
                  prompt breathing under it, so a guest reads it as the thing to do
                  rather than as a caption. Small caps spacing, as a card's own
                  small print is set.
                */}
                <span aria-hidden className="flex items-center gap-2 text-[var(--cover-accent)]">
                  <span className="h-px w-8 bg-current opacity-60" />
                  <svg viewBox="0 0 10 10" className="h-2 w-2" focusable="false">
                    <path d="M5 0 L10 5 L5 10 L0 5 Z" fill="currentColor" />
                  </svg>
                  <span className="h-px w-8 bg-current opacity-60" />
                </span>
                <span className="animate-[lifafa-cover-breathe_2.6s_ease-in-out_infinite] text-[0.8125rem] tracking-[0.14em] text-[var(--cover-prompt)] uppercase motion-reduce:animate-none">
                  {prompt}
                </span>
              </span>
            )}
          </button>

          {/*
            Present from the first frame, not revealed once the animation
            starts.

            It reads as a second way in, and that is exactly what it is for. The
            guest it exists for is the one who has opened this card already —
            checking the venue, showing somebody the date — and asking them to
            tap an envelope and then sit through it again every time is how a
            flourish turns into a toll. Offering it only mid-animation helps
            nobody: by then they have already paid.
          */}
          {covered ? (
            <button
              type="button"
              onClick={handleSkip}
              /* Over artwork it sits on tassels, and takes the plaque's ground to be read. */
              style={{ backgroundColor: art?.plaque }}
              className="absolute right-6 bottom-6 rounded-full px-3 py-1.5 text-xs text-[var(--cover-muted)] underline underline-offset-4 transition-colors duration-150 hover:text-[var(--cover-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cover-accent)]"
            >
              {copy.coverSkip}
            </button>
          ) : null}

          <PreparingLoader
            ready={ready}
            text={copy.coverPreparing}
            ground={colors.ground}
            accent={colors.accent}
            muted={colors.textMuted}
          />
        </div>
      ) : null}
    </>
  );
}
