"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type RefObject,
} from "react";
import { useCoverOpen } from "@/hooks/useCoverOpen";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cardCopy } from "@/lib/cardLanguage";
import type { Theme } from "@/lib/themes";
import type { CardLanguage } from "@/types/card";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** How long after the card is in front of the guest the cue fades in. */
const APPEAR_AFTER_MS = 1000;

/** How long a guest back at the top waits before the cue comes back. */
const RETURN_AFTER_MS = 6000;

/**
 * Scrolled no further than this, the guest is still at the top. A few pixels
 * of give, so iOS's rubber band at the top edge does not count as a scroll.
 */
const AT_TOP_PX = 12;

/** Air between the cue and the element it stands clear of, in px. */
const CLEAR_GAP_PX = 8;

/** How far the arrow drops on its bounce, in px: lifafa-cue-bounce in globals.css. */
const BOUNCE_PX = 4;

/** How far below its place the hidden cue rests, in px: `translate-y-2` on the button. */
const HIDDEN_DROP_PX = 8;

/** The cue's own inset under its arrow, in px, above the safe area. */
const ARROW_FOOT_PX = 18;

/** Air between the arrow at the bottom of its bounce and a frame's rule under it, in px. */
const RAIL_GAP_PX = 2;

/**
 * How far up the screen the cue reaches, in px, above the safe area: its
 * bottom inset, the arrow and the word. The card keeps this much of its first
 * screen, and a little over, free for the cue, so the divider that opens the
 * next section shows above the word rather than under it. Kept in step with
 * the sizes below by hand; see FIRST_SCREEN_PEEK in
 * components/card/CardCanvas.tsx.
 *
 * Where the cue cannot sit at the very foot of the screen, or something else
 * is pinned there with it, it says how much of the foot is taken through
 * --lifafa-cue-h on the root, and the card's first screen follows that.
 */
export const INVITED_CUE_HEIGHT = 48;

/** Read by the card's first screen in place of INVITED_CUE_HEIGHT; see above. */
const CUE_HEIGHT_VARIABLE = "--lifafa-cue-h";

/**
 * Set by CardCanvas on the screen the guest lands on. Tapping the cue scrolls
 * to its foot, which is where the next section starts.
 */
export const FIRST_SCREEN_ATTRIBUTE = "data-first-screen";

/**
 * "Scroll", and under it a small arrow that bounces, pinned to the foot of the
 * screen in the card's accent. It was two lines of words and a chevron, which
 * was more to read than the thing it asks for and stood on a ground wide
 * enough to wash over a frame's bottom corners. One word and an arrow is read
 * at a glance and is narrower than the gap between any two corner pieces.
 *
 * WHY IT IS NOT PART OF THE CARD. A card with a religious opening lands on a
 * Bismillah, a greeting and a dua, centred and complete, and nothing on that
 * screen said there was more. The cue that used to try sat inside the card,
 * pinned to the foot of the opening's own box, and that box grows with what is
 * in it: on a phone the opening runs past the bottom of the screen, so the cue
 * went with it, off the screen or into the dissolve at the bottom edge. Fixed
 * to the screen instead, it is where the guest's eye is whatever the card
 * holds, and it is never in the card's content, so nothing is placed above or
 * among the sacred lines.
 *
 * WHAT IT STANDS CLEAR OF. The card's first screen stops short of the cue, so
 * the divider under it, a garland or the arabesque band, shows whole above the
 * word (CardCanvas, FIRST_SCREEN_PEEK), and on the rare phone where the opening
 * outgrows that screen and the divider ends up under the cue's place anyway,
 * the cue is not shown. It is centred and narrow, so a frame's
 * bottom corners are either side of it, and where the frame draws a rule right
 * across the foot of the screen it stands above the rule (`footDepth`). And on
 * a card that shows the watermark
 * pill it goes in the room under the pill where there is room, above the pill
 * where there is not, and tells the card how much of the foot the two take.
 *
 * It waits for the cover to finish opening, then fades in a second later. It
 * leaves the moment the guest scrolls, and a guest who comes back to the top
 * and stays there for six seconds gets it back. Tapping it takes them to the
 * next section. Under reduced motion it neither fades nor bounces; it still
 * comes and goes.
 *
 * ON THE GUEST'S PAGE AND IN THE EDITOR'S FULL-SCREEN PREVIEW. The page scrolls
 * the window; the preview scrolls a box of its own inside an overlay, which at
 * desktop width has a bar above it and a line under it. `scroller` is that
 * box: its scroll is the one listened to, and the cue sits at its foot.
 */
export default function InvitedCue({
  language,
  theme,
  clearOf,
  scroller,
  footDepth = 0,
}: {
  language: CardLanguage;
  /** The card's composed theme, so the cue is in the card's own colours and faces. */
  theme: Theme;
  /**
   * A selector for something fixed at the foot of the screen the cue must not
   * touch: the watermark pill on an unpaid card. Measured rather than assumed,
   * because the pill wraps to two lines on a narrow phone and its height
   * changes with the language.
   */
  clearOf?: string;
  /**
   * The box the card scrolls in, where that is not the window: the editor's
   * full-screen preview. Absent on the guest's page.
   */
  scroller?: RefObject<HTMLElement | null>;
  /**
   * How far up from the foot of the screen the card's frame draws across it,
   * in px: `borderFootDepth` of the card's border. The cue sits above that.
   */
  footDepth?: number;
}): ReactElement {
  const copy = cardCopy(language);
  const coverOpen = useCoverOpen();
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const [shown, setShown] = useState(false);
  /** How far off the bottom of the screen it sits, in px. */
  const [lift, setLift] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);

  /*
    Where the cue sits, and how much of the screen's foot the card is to leave.
    Measured on mount, on resize and when the pill changes size: never in a
    loop, and never while anything is moving.
  */
  useEffect(() => {
    const box = scroller?.current ?? null;
    const target = clearOf === undefined ? null : document.querySelector(clearOf);

    /* What the arrow, at the bottom of its bounce, has to rise to be over the frame's rule. */
    const overRail = Math.max(
      0,
      footDepth + RAIL_GAP_PX - (ARROW_FOOT_PX - BOUNCE_PX),
    );

    /* The guest's page with nothing at its foot to stand clear of: the stylesheet's own numbers stand. */
    if (box === null && target === null && overRail === 0) {
      setLift(0);
      return;
    }

    const root = document.documentElement;

    const measure = (): void => {
      const screen = window.innerHeight;
      const boxRect = box?.getBoundingClientRect() ?? null;
      /* The foot the cue is pinned to: the screen's, or the scrolling box's. */
      const foot = (boxRect === null ? screen : boxRect.bottom) - overRail;
      const own = buttonRef.current?.offsetHeight ?? INVITED_CUE_HEIGHT;
      let cueBottom = foot;
      /* The highest point the two reach: the card's first screen ends above it. */
      let reach = foot - own;

      if (target !== null) {
        const pill = target.getBoundingClientRect();

        if (foot - pill.bottom >= own + BOUNCE_PX) {
          /* Room under the pill: the cue takes it, and the pill is the top of the pair. */
          reach = pill.top - CLEAR_GAP_PX;
        } else {
          cueBottom = pill.top - CLEAR_GAP_PX;
          reach = cueBottom - own;
        }
      }

      setLift(Math.max(0, Math.ceil(screen - cueBottom)));
      /*
        The first screen is the screen less this, measured from the top of the
        screen; in a box that starts lower, what is above the box counts too.
      */
      root.style.setProperty(
        CUE_HEIGHT_VARIABLE,
        `${Math.max(0, Math.ceil(screen - reach + (boxRect?.top ?? 0)))}px`,
      );
    };

    measure();
    const observer = new ResizeObserver(measure);

    if (target !== null) {
      observer.observe(target);
    }

    if (box !== null) {
      observer.observe(box);
    }

    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      root.style.removeProperty(CUE_HEIGHT_VARIABLE);
    };
  }, [clearOf, scroller, language, footDepth]);

  useEffect(() => {
    if (!coverOpen) {
      return;
    }

    const box = scroller?.current ?? null;
    const source: HTMLElement | Window = box ?? window;
    let timer: number | null = null;
    const atTop = (): boolean =>
      (box === null ? window.scrollY : box.scrollTop) <= AT_TOP_PX;

    /*
      The last word on "never over the divider". The card's first screen stops
      short of the cue, but it is a least height and not a limit: an opening
      too tall for a short phone grows, and takes the divider down with it. So
      before the cue shows it looks, once, at where the divider under the
      first screen has come to rest, and where that is under the cue it stays
      away. The guest on that phone has a line of the next section in sight
      already. Read when the timer fires, never on a scroll or in a loop.
    */
    const overDivider = (): boolean => {
      const button = buttonRef.current;
      const divider = (box ?? document).querySelector(`[${FIRST_SCREEN_ATTRIBUTE}]`)
        ?.nextElementSibling;

      if (button === null || divider === null || divider === undefined) {
        return false;
      }

      /* Hidden, the cue rests HIDDEN_DROP_PX lower than it is shown. */
      const shownTop = button.getBoundingClientRect().top - HIDDEN_DROP_PX;

      return divider.getBoundingClientRect().bottom > shownTop;
    };

    /* One pending timer at a time; a scroll away cancels it. */
    const showAfter = (ms: number): void => {
      if (timer !== null) {
        return;
      }

      timer = window.setTimeout(() => {
        timer = null;

        if (atTop() && !overDivider()) {
          setShown(true);
        }
      }, ms);
    };

    const cancel = (): void => {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    };

    showAfter(APPEAR_AFTER_MS);

    const handleScroll = (): void => {
      if (atTop()) {
        showAfter(RETURN_AFTER_MS);
      } else {
        cancel();
        setShown(false);
      }
    };

    source.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      cancel();
      source.removeEventListener("scroll", handleScroll);
      /* A cover that closes again (Replay, in the preview) takes the cue with it. */
      setShown(false);
    };
  }, [coverOpen, scroller]);

  const handleTap = (): void => {
    const box = scroller?.current ?? null;
    const first = (box ?? document).querySelector(`[${FIRST_SCREEN_ATTRIBUTE}]`);
    const behavior = reducedMotion ? "auto" : "smooth";

    setShown(false);

    if (box !== null) {
      const top =
        first !== null
          ? first.getBoundingClientRect().bottom -
            box.getBoundingClientRect().top +
            box.scrollTop
          : box.clientHeight;

      box.scrollTo({ top, behavior });
      return;
    }

    const top =
      first !== null
        ? first.getBoundingClientRect().bottom + window.scrollY
        : window.innerHeight;

    window.scrollTo({ top, behavior });
  };

  /* A touch translucent, so the card reads as still being there under it. */
  const veil = `color-mix(in srgb, ${theme.background} 92%, transparent)`;

  return (
    /*
      z-40: over the card's text, ornaments, border, butterflies and the
      watermark (z-30 at most), under the cover (z-50) and the language switch
      (z-60). Bottom centre, and the switch is top right, so the two never meet.
    */
    <div
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center"
      style={{ bottom: `${lift}px` }}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={handleTap}
        /* The whole sentence for a screen reader; the one word is for the eye. */
        aria-label={copy.scrollCue.label}
        /* Hidden means gone: no taps, no focus, nothing read out. */
        inert={!shown}
        className={`relative isolate flex min-w-24 flex-col items-center rounded-2xl px-5 text-center transition-[opacity,transform] duration-[600ms] ease-out motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] ${
          shown
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0"
        }`}
        style={{
          paddingBottom: `calc(${ARROW_FOOT_PX}px + env(safe-area-inset-bottom, 0px))`,
          color: theme.accent,
          outlineColor: theme.accent,
        }}
      >
        {/*
          The ground the word stands on: the card's own colour in a small soft
          dome rising off the bottom edge, so it reads over the royal texture
          or a petal that has landed there. No wider than the button, so a
          frame's bottom corners are left as they are, and no blur: it is under
          one word now, and a blurred backdrop is paint a slow phone can do
          without.
        */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 -z-10"
          style={{
            /* Under the word and the arrow, and not under the inset below them, where a frame's rule may be. */
            bottom: ARROW_FOOT_PX - BOUNCE_PX - RAIL_GAP_PX,
            background: `radial-gradient(ellipse 50% 100% at 50% 100%, ${veil} 0%, ${veil} 45%, transparent 100%)`,
          }}
        />

        <span
          lang={copy.lang}
          className={
            copy.script === "devanagari"
              ? "text-[0.9375rem] leading-[1.2] whitespace-nowrap"
              : /* The left padding is the tracking after the last letter, so the word is centred over the arrow. */
                "pl-[0.24em] text-[0.8125rem] leading-[1.4] tracking-[0.24em] whitespace-nowrap uppercase"
          }
          style={{
            fontFamily: theme.displayFontFamily ?? theme.fontFamily,
            fontWeight: theme.displayFontWeight,
          }}
        >
          {copy.scrollCue.word}
        </span>

        {/*
          The arrow: a short stem and a head, bouncing 4px. Transform only, and
          only while the cue is on screen, so a hidden cue costs nothing.
        */}
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 12 14"
          className={`h-3 w-3 motion-reduce:animate-none ${
            shown ? "animate-[lifafa-cue-bounce_1.8s_ease-in-out_infinite]" : ""
          }`}
        >
          <path
            d="M6 1 V12 M1.5 7.5 L6 12 L10.5 7.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
