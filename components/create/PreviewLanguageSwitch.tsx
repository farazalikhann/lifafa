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
 *
 * TWO LOOKS, for the two places it sits. Beside the card — above the editor's
 * phone frame, in the full screen preview's header — it is editor chrome, like
 * everything around it. Floated over the card itself, it wears the card: pass
 * `onCard` and it draws in the `--chip-*` colours its container sets from the
 * card's palette (see lib/cardChrome.ts), smaller, with the tap area kept at
 * 44px by an invisible band above and below each option.
 */
export default function PreviewLanguageSwitch({
  language,
  onLanguageChange,
  onCard = false,
  className = "",
}: {
  language: CardLanguage;
  onLanguageChange: (language: CardLanguage) => void;
  /** Drawn over the card, in the card's colours, rather than beside it. */
  onCard?: boolean;
  className?: string;
}): ReactElement {
  return (
    <div
      role="group"
      aria-label="Preview language"
      className={[
        "flex items-center gap-1 rounded-full border p-0.5",
        onCard
          ? "border-[var(--chip-edge)] bg-[var(--chip-fill)]"
          : "border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink)]/70 backdrop-blur",
        className,
      ].join(" ")}
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
            className={
              onCard
                ? [
                    "relative h-7 rounded-full px-3 text-[0.75rem] font-medium transition-colors duration-150",
                    "before:absolute before:inset-x-0 before:-inset-y-2 before:content-['']",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--chip-ink-strong)]",
                    isSelected
                      ? "bg-[var(--chip-selected)] text-[var(--chip-ink-strong)]"
                      : "text-[var(--chip-ink)] hover:text-[var(--chip-ink-strong)]",
                  ].join(" ")
                : [
                    "min-h-11 rounded-full px-4 text-[0.8125rem] font-medium transition-colors duration-150",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]",
                    isSelected
                      ? "bg-[var(--lifafa-marigold)] text-[var(--lifafa-ink)]"
                      : "text-[var(--lifafa-muted)] hover:text-[var(--lifafa-cream)]",
                  ].join(" ")
            }
          >
            {option.nativeLabel}
          </button>
        );
      })}
    </div>
  );
}
