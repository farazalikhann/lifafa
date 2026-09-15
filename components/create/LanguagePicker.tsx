"use client";

import { useId, type ReactElement } from "react";
import { CARD_LANGUAGES } from "@/lib/cardLanguage";
import { fontFamilyOf } from "@/lib/fontPairs";
import type { CardLanguage } from "@/types/card";

/**
 * The editor's own sans, with the Devanagari face behind it — the same
 * arrangement the card's faces use, so a language's name is drawn here in the
 * face its card will be drawn in rather than whatever the device has.
 */
const LABEL_FACE = fontFamilyOf("--font-sans", "system-ui, sans-serif");

/**
 * Which language the card is written in.
 *
 * THE FIRST CONTROL IN THE EDITOR, above the occasion. It decides the language
 * of everything a host is about to type and everything the card writes around
 * it, so it is the one choice that is worth making before any other — a host
 * who meets it after filling in the names in English has already made the card
 * in the wrong language.
 *
 * The same tiles as OccasionGrid, because it is the same kind of decision and
 * sits directly above it. Each language is named in its own script first, since
 * that is what somebody who reads it is scanning for, with the English name
 * under any that are not English.
 */
export default function LanguagePicker({
  language,
  onLanguageChange,
}: {
  language: CardLanguage;
  onLanguageChange: (language: CardLanguage) => void;
}): ReactElement {
  const headingId = useId();
  const hintId = useId();

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <h2
          id={headingId}
          className="text-[0.6875rem] tracking-[0.26em] text-[var(--lifafa-marigold)] uppercase"
        >
          Card language
        </h2>
        <p
          id={hintId}
          className="text-xs leading-relaxed text-[var(--lifafa-muted)]"
        >
          The language you write the card in. The date, the headings and the
          reply form follow it. To share the card in another language too, add
          those words at the end of this tab.
        </p>
      </div>

      <div
        role="group"
        aria-labelledby={headingId}
        aria-describedby={hintId}
        className="grid grid-cols-2 gap-2.5 lg:grid-cols-4"
      >
        {CARD_LANGUAGES.map((option) => {
          const isSelected = option.id === language;
          /* English named in English would only say the same word twice. */
          const needsEnglishName = option.nativeLabel !== option.englishLabel;

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onLanguageChange(option.id)}
              className={[
                "flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 transition-colors duration-150",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]",
                isSelected
                  ? "border-transparent bg-[var(--lifafa-ink-raised)] ring-2 ring-[var(--lifafa-marigold)]"
                  : "border-[var(--lifafa-hairline)] hover:border-[var(--lifafa-marigold)]/60",
              ].join(" ")}
            >
              {/*
                Tagged with the language it is written in, so a screen reader
                reads "हिन्दी" in a Hindi voice rather than spelling it out.
              */}
              <span
                lang={option.id}
                className="text-[0.9375rem] font-medium text-[var(--lifafa-cream)]"
                style={{ fontFamily: LABEL_FACE }}
              >
                {option.nativeLabel}
              </span>
              {needsEnglishName ? (
                <span className="text-xs text-[var(--lifafa-muted)]">
                  {option.englishLabel}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
