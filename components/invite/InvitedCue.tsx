"use client";

import { useEffect, useState, type ReactElement } from "react";
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

/**
 * How far up the screen the cue's words reach, in px, above the safe area:
 * its bottom inset, the chevron, the prompt and the heading. The card keeps
 * this much of its first screen, and a little over, free for the cue, so the
 * top of the next section shows above the words rather than under them.
 * Kept in step with the sizes below by hand; see FIRST_SCREEN_PEEK in
 * components/card/CardCanvas.tsx. On a screen under 700px tall the cue drops
 * its prompt and --lifafa-cue-h in globals.css says so instead.
 */
export const INVITED_CUE_HEIGHT = 68;

/**
 * Set by CardCanvas on the screen the guest lands on. Tapping the cue scrolls
 * to its foot, which is where the next section starts.
 */
export const FIRST_SCREEN_ATTRIBUTE = "data-first-screen";

/** A short rule ending in a diamond, pointing in at the heading. */
function Ornament({ mirrored = false }: { mirrored?: boolean }): ReactElement {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 28 8"
      className={`h-2 w-7 shrink-0 ${mirrored ? "-scale-x-100" : ""}`}
    >
      <path d="M0 4 H17" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      <path d="M22.5 0.5 L26 4 L22.5 7.5 L19 4 Z" fill="currentColor" />
    </svg>
  );
}

/**
 * "You are invited", and under it "Scroll to view the invitation" and a
 * chevron, pinned to the foot of the guest's screen.
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
 * It waits for the cover to finish opening, then fades in a second later. It
 * leaves the moment the guest scrolls, and a guest who comes back to the top
 * and stays there for six seconds gets it back. Tapping it takes them to the
 * next section. Under reduced motion it neither fades nor bounces; it still
 * comes and goes. On a screen under 700px tall it is only the heading and the
 * chevron, so it takes as little of the opening's room as it can.
 */
export default function InvitedCue({
  language,
  theme,
  clearOf,
}: {
  language: CardLanguage;
  /** The card's composed theme, so the cue is in the card's own colours and faces. */
  theme: Theme;
  /**
   * A selector for something fixed at the foot of the screen the cue must sit
   * above: the watermark pill on the host's unpaid preview. Measured rather
   * than assumed, because the pill wraps to two lines on a narrow phone and
   * its height changes with the language.
   */
  clearOf?: string;
}): ReactElement {
  const copy = cardCopy(language);
  const coverOpen = useCoverOpen();
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const [shown, setShown] = useState(false);
  /** How far off the bottom of the screen it sits, in px. */
  const [lift, setLift] = useState(0);

  useEffect(() => {
    if (clearOf === undefined) {
      setLift(0);
      return;
    }

    const target = document.querySelector(clearOf);

    if (target === null) {
      return;
    }

    const measure = (): void => {
      const top = target.getBoundingClientRect().top;
      setLift(Math.max(0, Math.ceil(window.innerHeight - top + CLEAR_GAP_PX)));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(target);
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [clearOf, language]);

  useEffect(() => {
    if (!coverOpen) {
      return;
    }

    let timer: number | null = null;
    const atTop = (): boolean => window.scrollY <= AT_TOP_PX;

    /* One pending timer at a time; a scroll away cancels it. */
    const showAfter = (ms: number): void => {
      if (timer !== null) {
        return;
      }

      timer = window.setTimeout(() => {
        timer = null;

        if (atTop()) {
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

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      cancel();
      window.removeEventListener("scroll", handleScroll);
    };
  }, [coverOpen]);

  const handleTap = (): void => {
    const first = document.querySelector(`[${FIRST_SCREEN_ATTRIBUTE}]`);
    const top =
      first !== null
        ? first.getBoundingClientRect().bottom + window.scrollY
        : window.innerHeight;

    setShown(false);
    window.scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" });
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
        type="button"
        onClick={handleTap}
        /* Both lines, even where a short screen shows only the first. */
        aria-label={`${copy.scrollCue.heading}. ${copy.scrollCue.prompt}`}
        /* Hidden means gone: no taps, no focus, nothing read out. */
        inert={!shown}
        className={`relative isolate flex w-[min(22rem,calc(100vw-2rem))] flex-col items-center px-4 pt-6 text-center [@media(max-height:699px)]:pt-4 transition-[opacity,transform] duration-[600ms] ease-out motion-reduce:transition-none rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-[-2px] ${
          shown
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0"
        }`}
        style={{
          paddingBottom: "calc(10px + env(safe-area-inset-bottom, 0px))",
          fontFamily: theme.fontFamily,
          outlineColor: theme.accent,
        }}
      >
        {/*
          The ground the words stand on: the card's own colour in a soft dome
          rising off the bottom edge, with a light blur under it, so they read
          over a flower frame, a lantern or a line of the card alike. A dome and
          not a bar, so a frame's bottom corners are left as they are.
        */}
        <span
          aria-hidden="true"
          className="absolute -inset-x-10 -top-2 bottom-0 -z-10"
          style={{
            background: `radial-gradient(ellipse 50% 100% at 50% 100%, ${veil} 0%, ${veil} 58%, transparent 100%)`,
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            maskImage:
              "radial-gradient(ellipse 50% 100% at 50% 100%, #000 55%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 50% 100% at 50% 100%, #000 55%, transparent 100%)",
          }}
        />

        <span className="flex items-center gap-2.5" style={{ color: theme.accent }}>
          <Ornament />
          <span
            /* The trailing tracking is balanced with the same on the left, so the line sits centred. */
            className="ps-[0.2em] text-[0.9375rem] leading-[1.6] tracking-[0.2em] uppercase"
            style={{
              fontFamily: theme.displayFontFamily,
              fontWeight: theme.displayFontWeight,
            }}
          >
            {copy.scrollCue.heading}
          </span>
          <Ornament mirrored />
        </span>

        <span
          className="text-[0.75rem] leading-[1.6] [@media(max-height:699px)]:hidden"
          style={{ color: theme.textMuted }}
        >
          {copy.scrollCue.prompt}
        </span>

        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 16 10"
          className="mt-1 h-2.5 w-4 animate-[lifafa-cue-bounce_1.8s_ease-in-out_infinite] motion-reduce:animate-none"
          style={{ color: theme.accent }}
        >
          <path
            d="M1.5 1.5 L8 8 L14.5 1.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
