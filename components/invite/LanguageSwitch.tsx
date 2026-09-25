"use client";

import { useEffect, useState, type ReactElement } from "react";
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
 */
export default function LanguageSwitch({
  value,
  onChange,
  palette,
  accent,
}: {
  value: CardLanguage;
  onChange: (language: CardLanguage) => void;
  palette: Palette;
  /** The card's accent: the host's own, or the palette's. */
  accent: string;
}): ReactElement {
  const [isTucked, setIsTucked] = useState(false);

  useEffect(() => {
    let last = window.scrollY;

    const handleScroll = (): void => {
      const y = window.scrollY;

      if (y < ALWAYS_SHOWN_ABOVE_PX) {
        setIsTucked(false);
      } else if (Math.abs(y - last) > 4) {
        setIsTucked(y > last);
      }

      last = y;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
      role="group"
      aria-label="Language / भाषा"
      onFocusCapture={() => setIsTucked(false)}
      className="fixed z-[60] flex rounded-full border p-1 shadow-[0_4px_18px_rgba(0,0,0,0.25)] backdrop-blur-md transition-transform duration-300 ease-out motion-reduce:transition-none"
      style={{
        /* Below the host's preview banner when there is one; see HostPreviewBanner. */
        top: "calc(max(12px, env(safe-area-inset-top)) + var(--lifafa-preview-h, 0px))",
        right: "max(12px, env(safe-area-inset-right))",
        transform: isTucked ? "translateY(calc(-100% - 24px))" : "none",
        backgroundColor: withAlpha(palette.surface, "E6"),
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
            className="min-h-11 min-w-11 rounded-full px-2.5 text-xs leading-none font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 min-[400px]:px-4 min-[400px]:text-[0.8125rem]"
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
