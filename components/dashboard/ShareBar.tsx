"use client";

import { useRef, useState, type ReactElement } from "react";

type CopyState = "idle" | "copied" | "unavailable";

const COPY_LABEL: Record<CopyState, string> = {
  idle: "Copy link",
  copied: "Copied",
  unavailable: "Press Ctrl+C",
};

const WHATSAPP_MESSAGE = "You are invited! Here are the details:";

export default function ShareBar({
  inviteUrl,
}: {
  inviteUrl: string;
}): ReactElement {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      await navigator.clipboard.writeText(inviteUrl);
      flash("copied");
    } catch {
      inputRef.current?.select();
      flash("unavailable");
    }
  };

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    `${WHATSAPP_MESSAGE} ${inviteUrl}`,
  )}`;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] p-3 sm:flex-row sm:items-center">
      <label htmlFor="invite-url" className="sr-only">
        Invite link
      </label>
      <input
        id="invite-url"
        ref={inputRef}
        type="text"
        value={inviteUrl}
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
    </section>
  );
}
