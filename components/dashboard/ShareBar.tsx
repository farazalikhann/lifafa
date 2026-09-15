"use client";

import { useId, useRef, useState, type ReactElement } from "react";
import Link from "next/link";
import { CARD_LANGUAGES, cardCopy } from "@/lib/cardLanguage";
import { inviteLinkIn } from "@/lib/cardTranslation";
import { fontFamilyOf } from "@/lib/fontPairs";
import type { CardLanguage } from "@/types/card";

type CopyState = "idle" | "copied" | "unavailable";

const COPY_LABEL: Record<CopyState, string> = {
  idle: "Copy link",
  copied: "Copied",
  unavailable: "Press Ctrl+C",
};

/** The editor's sans with the Devanagari face behind it, for "हिन्दी". */
const LABEL_FACE = fontFamilyOf("--font-sans", "system-ui, sans-serif");

/**
 * The invitation's link, in whichever language the host is sending it in.
 *
 * ONE INVITATION, ONE LINK PER LANGUAGE. A host with relatives who read Hindi
 * and colleagues who read English sends each the same card, opened in their own
 * language: the language pills change the link in the box, what Copy copies and
 * what the WhatsApp message says, and nothing else. There is no second
 * invitation to keep in step, and every reply lands in the one guest list.
 *
 * Every language is always offered. A card the host never translated still
 * reads in the other language — its dates, headings and reply form do — with
 * the host's own words shown as written, and a line under the box says so,
 * with the way to add them.
 */
export default function ShareBar({
  inviteUrl,
  language,
  wordsWritten,
  editHref,
}: {
  /** The card's link with no language on it. */
  inviteUrl: string;
  /** The language the card is written in, which the bar starts on. */
  language: CardLanguage;
  /** How many of the host's words are written in each other language. */
  wordsWritten: Partial<Record<CardLanguage, number>>;
  /** The editor, where those words are added. */
  editHref: string;
}): ReactElement {
  const [shareLanguage, setShareLanguage] = useState<CardLanguage>(language);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickerLabelId = useId();

  /* The link the host is actually sending, and the one line that goes with it. */
  const link = inviteLinkIn(inviteUrl, shareLanguage);
  const option = CARD_LANGUAGES.find((entry) => entry.id === shareLanguage);
  const untranslated =
    shareLanguage !== language && (wordsWritten[shareLanguage] ?? 0) === 0;

  const flash = (state: CopyState): void => {
    if (resetTimer.current !== null) {
      clearTimeout(resetTimer.current);
    }
    setCopyState(state);
    resetTimer.current = setTimeout(() => setCopyState("idle"), 2000);
  };

  const handleCopy = async (): Promise<void> => {
    // The Clipboard API is missing on older browsers and is unavailable on
    // insecure origins, so fall back to selecting the text for a manual copy.
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      inputRef.current?.select();
      flash("unavailable");
      return;
    }

    try {
      await navigator.clipboard.writeText(link);
      flash("copied");
    } catch {
      inputRef.current?.select();
      flash("unavailable");
    }
  };

  /* In the language being shared in: it is the guests who read it. */
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    `${cardCopy(shareLanguage).shareMessage} ${link}`,
  )}`;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-1">
        <span
          id={pickerLabelId}
          className="text-[0.8125rem] text-[var(--lifafa-muted)]"
        >
          Share in
        </span>

        <div
          role="group"
          aria-labelledby={pickerLabelId}
          className="flex flex-wrap gap-2"
        >
          {CARD_LANGUAGES.map((entry) => {
            const isSelected = entry.id === shareLanguage;

            return (
              <button
                key={entry.id}
                type="button"
                lang={entry.id}
                aria-pressed={isSelected}
                onClick={() => {
                  setShareLanguage(entry.id);
                  setCopyState("idle");
                }}
                style={{ fontFamily: LABEL_FACE }}
                className={[
                  "min-h-11 rounded-full border px-4 text-[0.8125rem] font-medium transition-colors duration-150",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]",
                  isSelected
                    ? "border-transparent bg-[var(--lifafa-ink)] text-[var(--lifafa-cream)] ring-2 ring-[var(--lifafa-marigold)]"
                    : "border-[var(--lifafa-hairline)] text-[var(--lifafa-muted)] hover:text-[var(--lifafa-cream)]",
                ].join(" ")}
              >
                {entry.nativeLabel}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label htmlFor="invite-url" className="sr-only">
          Invite link in {option?.englishLabel ?? shareLanguage}
        </label>
        <input
          id="invite-url"
          ref={inputRef}
          type="text"
          value={link}
          readOnly
          onFocus={(event) => event.currentTarget.select()}
          className="min-h-11 w-full flex-1 rounded-xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink)] px-4 text-[0.8125rem] text-[var(--lifafa-cream)] focus:border-[var(--lifafa-marigold)] focus:ring-2 focus:ring-[var(--lifafa-marigold)]/30 focus:outline-none sm:text-sm"
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleCopy()}
            aria-live="polite"
            className="min-h-11 flex-1 rounded-xl bg-[var(--lifafa-marigold)] px-4 text-[0.8125rem] font-semibold whitespace-nowrap text-[var(--lifafa-ink)] transition-transform duration-150 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] sm:flex-none sm:text-sm"
          >
            {COPY_LABEL[copyState]}
          </button>

          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 flex-1 items-center justify-center rounded-xl border border-[var(--lifafa-hairline)] px-4 text-[0.8125rem] font-medium whitespace-nowrap text-[var(--lifafa-cream)] transition-colors duration-150 hover:border-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] sm:flex-none sm:text-sm"
          >
            Share on WhatsApp
          </a>
        </div>
      </div>

      {/*
        Only when it is true, and said as what the guest will see rather than
        as a warning: the card works, it just shows the host's own words.
      */}
      {untranslated ? (
        <p
          aria-live="polite"
          className="px-1 text-xs leading-relaxed text-[var(--lifafa-muted)]"
        >
          The card will open in {option?.englishLabel}, but your names and
          details will show as you wrote them.{" "}
          <Link
            href={editHref}
            className="rounded font-medium text-[var(--lifafa-marigold)] underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
          >
            Add {option?.englishLabel} words
          </Link>
        </p>
      ) : null}
    </section>
  );
}
