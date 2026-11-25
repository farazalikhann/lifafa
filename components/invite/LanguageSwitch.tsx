"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import { contrastRatio } from "@/lib/contrast";
import type { Palette } from "@/lib/palettes";
import type { CardLanguage } from "@/types/card";

/**
 * The two languages as the switch names them, each in its own script, so a
 * guest looking for Hindi finds it written in Hindi.
 */
const LABELS: readonly { id: CardLanguage; label: string; lang: string }[] = [
  { id: "en", label: "English", lang: "en-IN" },
  { id: "hi", label: "हिंदी", lang: "hi-IN" },
];

/**
 * The switch's own face: the site's sans for "English", and for "हिंदी" the
 * phone's built-in Devanagari, which every phone that can show Hindi has.
 *
 * Deliberately not a card face. The switch is on English cards too, and a
 * webfont here would download a Devanagari font for five letters on a card
 * whose guest may never switch. The card's own Hindi faces load only once the
 * guest does, when the card starts drawing Hindi.
 */
const SWITCH_FACE = "var(--font-sans), system-ui, sans-serif";

/**
 * How much of the top of the screen the switch takes, for a cover to keep its
 * drawing clear of: its offset from the top, its 44px buttons inside a 4px
 * inset and a border, and a little air. See `topClearance` on CoverShell.
 */
export const LANGUAGE_SWITCH_CLEARANCE =
  "calc(max(12px, env(safe-area-inset-top)) + 64px + var(--lifafa-preview-h, 0px))";

/** Scrolled less than this, the switch always shows: the top of the page is its place. */
const ALWAYS_SHOWN_ABOVE_PX = 96;

/** The card's headings, which the switch never sits over once the guest has scrolled. */
const HEADINGS = "h1, h2, h3";

/** Room kept round the switch's place, so a heading just touching it counts. */
const HEADING_ROOM_PX = 6;

/** After the last scroll event, when the page is taken to have stopped and is looked at again. */
const SETTLED_MS = 180;

/**
 * Whether any heading's words would be under the switch where it shows. Its
 * place from its offsets, which leave out the slide (a transform), so a
 * switch tucked away or halfway there is measured where it would stand. The
 * words, not the heading's box: a centred "Will you join us?" spans the
 * screen but its letters stop short of the corner.
 */
function coversHeading(group: HTMLElement): boolean {
  const top = group.offsetTop - HEADING_ROOM_PX;
  const bottom = group.offsetTop + group.offsetHeight + HEADING_ROOM_PX;
  const left = group.offsetLeft - HEADING_ROOM_PX;
  const right = group.offsetLeft + group.offsetWidth + HEADING_ROOM_PX;

  return [...document.querySelectorAll<HTMLElement>(HEADINGS)].some((heading) => {
    if (group.contains(heading)) {
      return false;
    }

    const outer = heading.getBoundingClientRect();

    /* One for screen readers only (sr-only, a 1px box) is not on screen to cover. */
    if (outer.width <= 1 || outer.height <= 1 || outer.bottom < top || outer.top > bottom) {
      return false;
    }

    const range = document.createRange();
    range.selectNodeContents(heading);

    return [...range.getClientRects()].some(
      (line) => line.width > 0 && line.left < right && line.right > left && line.top < bottom && line.bottom > top,
    );
  });
}

/** A palette hex with an alpha appended, or the colour as given if it is not #rrggbb. */
function withAlpha(hex: string, alpha: string): string {
  return /^#[0-9a-f]{6}$/i.test(hex) ? `${hex}${alpha}` : hex;
}

/**
 * "English | हिंदी", fixed at the top of the guest page.
 *
 * Above the cover as well as the card, so a guest can pick their language
 * before they tap in. Top right, away from the Skip button in the bottom
 * corner and the names at the foot of the cover.
 *
 * ONCE THE CARD IS OPEN it steps out of the way while the guest reads: it
 * slides up as they scroll down and comes back as soon as they scroll up, or
 * are near the top, or tab to it. A pill parked over the text for the whole
 * scroll would be covering the invitation it is there to translate. While the
 * cover is up the page cannot scroll (CoverShell locks it), so it stays put.
 *
 * NEVER OVER A HEADING. Scrolled past the top, it does not come back, and does
 * not stay, while the words of a section's heading ("Will you join us?" over
 * the reply form, and every other) are under its place: it waits up until the
 * heading has gone by. Looked at as the guest scrolls, once a frame at most,
 * and again when the page stops, since a section rises into place as it is
 * revealed.
 *
 * "top" (a template's choice, `page.languageSwitch`): compact, and at the top
 * of the page rather than of the screen, so it scrolls away with the page and
 * never comes back over a heading or a picture further down. A guest who
 * wants it scrolls back to the top. Its buttons are 32px to look at, with a
 * 44px tap target each.
 */
export default function LanguageSwitch({
  value,
  onChange,
  palette,
  accent,
  placement = "fixed",
}: {
  value: CardLanguage;
  onChange: (language: CardLanguage) => void;
  palette: Palette;
  /** The card's accent: the host's own, or the palette's. */
  accent: string;
  /** Pinned to the screen ("fixed"), or at the top of the page only ("top"). See above. */
  placement?: "fixed" | "top";
}): ReactElement {
  const atTop = placement === "top";
  const [isTucked, setIsTucked] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);
  /* The scroll handler's view of isTucked, which a tab to the switch also changes. */
  const tuckedRef = useRef(false);
  tuckedRef.current = isTucked;

  /*
    How much of the top right corner the switch is taking, for the card's
    names header to keep its names out of (see NamesHeader): its own width
    and the gap beside it while it is showing, nothing once it has tucked
    itself away. Re-measured when the selection changes, since the two labels
    are not the same width at every size.
  */
  useEffect(() => {
    const root = document.documentElement;
    const group = groupRef.current;

    root.style.setProperty(
      "--lifafa-header-clear",
      isTucked || group === null ? "0px" : `${Math.ceil(group.offsetWidth) + 12}px`,
    );

    return () => {
      root.style.removeProperty("--lifafa-header-clear");
    };
  }, [isTucked, value]);

  useEffect(() => {
    /* At the top of the page it scrolls away by itself. */
    if (atTop) {
      return;
    }

    let last = window.scrollY;
    let frame = 0;
    let settled = 0;

    const tuck = (next: boolean): void => {
      tuckedRef.current = next;
      setIsTucked(next);
    };

    /* Whether, wanting to show, it must stay up: a heading is under its place. */
    const blocked = (): boolean => {
      const group = groupRef.current;
      return group !== null && coversHeading(group);
    };

    const update = (): void => {
      frame = 0;
      const y = window.scrollY;

      if (y < ALWAYS_SHOWN_ABOVE_PX) {
        tuck(false);
      } else if (Math.abs(y - last) > 4) {
        tuck(y > last || blocked());
      } else if (!tuckedRef.current && blocked()) {
        tuck(true);
      }

      last = y;
    };

    /* The page at rest: a heading may have risen into the switch's place as its section was revealed. */
    const settle = (): void => {
      if (window.scrollY >= ALWAYS_SHOWN_ABOVE_PX && !tuckedRef.current && blocked()) {
        tuck(true);
      }
    };

    const handleScroll = (): void => {
      if (frame === 0) {
        frame = window.requestAnimationFrame(update);
      }

      window.clearTimeout(settled);
      settled = window.setTimeout(settle, SETTLED_MS);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settled);
    };
  }, [atTop]);

  /*
    The selected side is filled with the accent, and its text is whichever of
    the card's two ends reads better on it: an ink card's gold wants dark
    text, a cream card's deep accent wants light.
  */
  const selectedText =
    contrastRatio(accent, palette.background) >=
    contrastRatio(accent, palette.textPrimary)
      ? palette.background
      : palette.textPrimary;

  return (
    <div
      ref={groupRef}
      data-language-switch=""
      role="group"
      aria-label="Language / भाषा"
      onFocusCapture={() => setIsTucked(false)}
      className={
        atTop
          ? "absolute z-[60] flex rounded-full border p-0.5 shadow-[0_2px_8px_rgba(0,0,0,0.14)]"
          : "fixed z-[60] flex rounded-full border p-1 shadow-[0_4px_18px_rgba(0,0,0,0.25)] backdrop-blur-md transition-transform duration-300 ease-out motion-reduce:transition-none"
      }
      style={{
        /* Below the host's preview banner when there is one; see HostPreviewBanner. */
        top: "calc(max(12px, env(safe-area-inset-top)) + var(--lifafa-preview-h, 0px))",
        right: "max(12px, env(safe-area-inset-right))",
        transform: isTucked && !atTop ? "translateY(calc(-100% - 24px))" : "none",
        backgroundColor: withAlpha(palette.surface, atTop ? "F2" : "E6"),
        borderColor: withAlpha(accent, "59"),
        fontFamily: SWITCH_FACE,
      }}
    >
      {LABELS.map((option) => {
        const isSelected = option.id === value;

        return (
          <button
            key={option.id}
            type="button"
            lang={option.lang}
            aria-pressed={isSelected}
            onClick={() => {
              if (!isSelected) {
                onChange(option.id);
              }
            }}
            /*
              A little tighter below 400px, so on a 360px phone the switch
              still clears the crest the curtain cover hangs at the middle of
              the top. The 44px tap target holds at every width.
            */
            className={
              atTop
                ? "relative h-8 min-w-11 rounded-full px-2.5 text-xs leading-none font-medium transition-colors duration-150 after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2"
                : "min-h-11 min-w-11 rounded-full px-2.5 text-xs leading-none font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 min-[400px]:px-4 min-[400px]:text-[0.8125rem]"
            }
            style={{
              backgroundColor: isSelected ? accent : "transparent",
              color: isSelected ? selectedText : palette.textPrimary,
              opacity: isSelected ? 1 : 0.8,
              outlineColor: accent,
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
