"use client";

import type { ReactElement } from "react";
import { CARD_LANGUAGES } from "@/lib/cardLanguage";
import { fontFamilyOf } from "@/lib/fontPairs";
import type { CardLanguage } from "@/types/card";

/** The editor's sans with the Devanagari face behind it, as LanguagePicker sets it. */
const LABEL_FACE = fontFamilyOf("--font-sans", "system-ui, sans-serif");

/**
 * Which language the preview shows the card in.
 *
 * Every card can be shared in every language, so every preview offers each —
 * a host deciding whether to send the English link wants to see the English
 * card first, blanks and all. Small and quiet: it is a lens on the preview, not
 * a setting on the card, and changes nothing that is saved.
 */
export default function PreviewLanguageSwitch({
  language,
  onLanguageChange,
  className = "",
}: {
  language: CardLanguage;
  onLanguageChange: (language: CardLanguage) => void;
  className?: string;
}): ReactElement {
  return (
    <div
      role="group"
      aria-label="Preview language"
      className={`flex items-center gap-1 rounded-full border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink)]/70 p-0.5 backdrop-blur ${className}`}
    >
      {CARD_LANGUAGES.map((option) => {
        const isSelected = option.id === language;

        return (
          <button
            key={option.id}
            type="button"
            lang={option.id}
            aria-pressed={isSelected}
            onClick={() => onLanguageChange(option.id)}
            style={{ fontFamily: LABEL_FACE }}
            className={[
              "min-h-11 rounded-full px-4 text-[0.8125rem] font-medium transition-colors duration-150",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]",
              isSelected
                ? "bg-[var(--lifafa-marigold)] text-[var(--lifafa-ink)]"
                : "text-[var(--lifafa-muted)] hover:text-[var(--lifafa-cream)]",
            ].join(" ")}
          >
            {option.nativeLabel}
          </button>
        );
      })}
    </div>
  );
}
