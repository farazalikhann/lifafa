"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { cardCopy } from "@/lib/cardLanguage";
import { saveShareMessage } from "@/lib/db/events";
import { whatsappShareUrl } from "@/lib/shareMessage";
import type { CardLanguage, SavedShareMessage } from "@/types/card";

type SaveState = "idle" | "saving" | "saved" | "failed";

type CopyState = "idle" | "copied" | "unavailable";

const COPY_LABEL: Record<CopyState, string> = {
  idle: "Copy message",
  copied: "Copied",
  unavailable: "Press Ctrl+C",
};

/** How long typing has to pause before the edit is kept. */
const SAVE_DELAY_MS = 800;

/*
  Past this, a wa.me link nears the 8 KB request line many servers stop at,
  and the message may arrive cut short. Hindi costs nine characters a letter
  once encoded, so the longest default (Hindi, five functions, both families)
  is still only about 4,900.
*/
const LONG_LINK = 7000;

/**
 * The WhatsApp message, shown before it is sent.
 *
 * The host reads it in a text box they can change, because it goes out in
 * their name to people they know: a cousin's nickname, a line about parking,
 * a warmer greeting. What they write is kept for this invitation and this
 * language, and "Reset to default" goes back to the message built from the
 * card, which also forgets the edit.
 *
 * A native <dialog>, opened modal: the browser traps the focus, closes it on
 * Escape and puts it above everything, so none of that is written here.
 *
 * The link stays in the message the host sends, wherever they move it: it is
 * what WhatsApp turns into the card's preview, so the sheet says so if an
 * edit takes it out.
 */
export default function ShareMessageSheet({
  eventId,
  language,
  link,
  defaultMessage,
  saved,
  isPaid,
  onSaved,
  onClose,
}: {
  eventId: string;
  language: CardLanguage;
  /** The invite link in this language, which the message should carry. */
  link: string;
  /** The message built from the card as it is now. */
  defaultMessage: string;
  /** The host's own wording, if they kept one for this language. */
  saved: SavedShareMessage | undefined;
  isPaid: boolean;
  /** Told what is now stored, so reopening the sheet shows it. */
  onSaved: (message: SavedShareMessage | null) => void;
  onClose: () => void;
}): ReactElement {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const [text, setText] = useState(saved?.text ?? defaultMessage);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const titleId = useId();
  const noteId = useId();

  /* What is stored now, so a save that would change nothing is not sent. */
  const storedText = useRef<string>(saved?.text ?? defaultMessage);
  /* One save at a time, in the order they were asked for. */
  const queue = useRef<Promise<void>>(Promise.resolve());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog !== null && !dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (copyTimer.current !== null) {
        clearTimeout(copyTimer.current);
      }
    };
  }, []);

  /**
   * Keeps `value` as the host's message, or forgets the edit when it is the
   * default again. Queued, so two quick edits land in the order they were made.
   */
  const persist = (value: string): void => {
    if (saveTimer.current !== null) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }

    if (value === storedText.current) {
      return;
    }

    storedText.current = value;
    const message =
      value === defaultMessage ? null : { text: value, basedOn: defaultMessage };

    setSaveState("saving");
    queue.current = queue.current.then(async () => {
      const result = await saveShareMessage(eventId, language, message);

      if (result.ok) {
        onSaved(message);
        setSaveState("saved");
      } else {
        /* Let the next edit, send or copy try again. */
        storedText.current = "";
        setSaveState("failed");
      }
    });
  };

  const change = (value: string): void => {
    setText(value);

    if (saveTimer.current !== null) {
      clearTimeout(saveTimer.current);
    }

    saveTimer.current = setTimeout(() => persist(value), SAVE_DELAY_MS);
  };

  const close = (): void => {
    persist(text);
    dialogRef.current?.close();
  };

  const reset = (): void => {
    setText(defaultMessage);
    persist(defaultMessage);
    textRef.current?.focus();
  };

  const flashCopy = (state: CopyState): void => {
    if (copyTimer.current !== null) {
      clearTimeout(copyTimer.current);
    }

    setCopyState(state);
    copyTimer.current = setTimeout(() => setCopyState("idle"), 2000);
  };

  const copy = async (): Promise<void> => {
    persist(text);

    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      textRef.current?.select();
      flashCopy("unavailable");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      flashCopy("copied");
    } catch {
      textRef.current?.select();
      flashCopy("unavailable");
    }
  };

  const isDefault = text === defaultMessage;
  /* The card changed after the host rewrote the message: their date may be old. */
  const outOfDate =
    !isDefault && saved !== undefined && saved.basedOn !== defaultMessage;
  const linkMissing = !text.includes(link);
  const sendHref = whatsappShareUrl(text);
  const copyLang = cardCopy(language).lang;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={noteId}
      /* The browser's own close, from Escape or close() above. */
      onClose={onClose}
      onCancel={() => persist(text)}
      /* A click on the backdrop lands on the dialog itself, not on the panel. */
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}
      className="mx-auto mt-auto mb-0 w-full max-w-none rounded-t-2xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] p-0 text-[var(--lifafa-cream)] shadow-2xl backdrop:bg-[var(--lifafa-ink)]/80 backdrop:backdrop-blur-sm sm:my-auto sm:max-w-[34rem] sm:rounded-2xl"
    >
      <div className="flex max-h-[90dvh] flex-col gap-4 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id={titleId}
              className="font-[family-name:var(--font-display)] text-lg font-semibold"
            >
              Your WhatsApp message
            </h2>
            <p
              id={noteId}
              className="mt-1 text-[0.8125rem] leading-relaxed text-[var(--lifafa-muted)]"
            >
              Change anything you like. Your version is kept for this
              invitation.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="min-h-11 shrink-0 rounded-full px-3 text-[0.8125rem] font-medium text-[var(--lifafa-muted)] transition-colors duration-150 hover:text-[var(--lifafa-cream)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
          >
            Close
          </button>
        </div>

        {isPaid ? null : (
          <p className="rounded-xl border border-[var(--lifafa-marigold)]/40 bg-[var(--lifafa-marigold)]/10 px-4 py-3 text-[0.8125rem] leading-relaxed">
            Guests can open this link after payment.
          </p>
        )}

        <label htmlFor={`${titleId}-text`} className="sr-only">
          Message
        </label>
        <textarea
          id={`${titleId}-text`}
          ref={textRef}
          value={text}
          lang={copyLang}
          dir="auto"
          rows={14}
          onChange={(event) => change(event.currentTarget.value)}
          className="w-full resize-y rounded-xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink)] px-4 py-3 text-sm leading-relaxed text-[var(--lifafa-cream)] focus:border-[var(--lifafa-marigold)] focus:ring-2 focus:ring-[var(--lifafa-marigold)]/30 focus:outline-none"
        />

        {/* Only what is true right now, and only one line of each. */}
        <div aria-live="polite" className="flex flex-col gap-1 text-xs leading-relaxed">
          {linkMissing ? (
            <p className="text-[var(--lifafa-rose)]">
              The invitation link is no longer in your message. Guests need it
              to open the card.
            </p>
          ) : null}
          {outOfDate ? (
            <p className="text-[var(--lifafa-marigold)]">
              Your invitation has changed since you edited this message. Check
              the date and venue, or reset to the new default.
            </p>
          ) : null}
          {sendHref.length > LONG_LINK ? (
            <p className="text-[var(--lifafa-marigold)]">
              This message is long. If WhatsApp opens with only part of it, use
              Copy message and paste it into the chat.
            </p>
          ) : null}
          {saveState === "failed" ? (
            <p className="text-[var(--lifafa-rose)]">
              Could not save your edit. It will still send as it is.
            </p>
          ) : saveState === "saved" && !isDefault ? (
            <p className="text-[var(--lifafa-muted)]">Saved for next time.</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {/*
            A link rather than a button that opens a window, so no popup
            blocker stands between the tap and WhatsApp. wa.me opens the app on
            a phone and WhatsApp Web or Desktop on a computer.
          */}
          <a
            href={sendHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => persist(text)}
            className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-[var(--lifafa-marigold)] px-4 text-[0.8125rem] font-semibold whitespace-nowrap text-[var(--lifafa-ink)] transition-transform duration-150 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] sm:text-sm"
          >
            Send on WhatsApp
          </a>
          <button
            type="button"
            onClick={() => void copy()}
            className="min-h-11 flex-1 rounded-xl border border-[var(--lifafa-hairline)] px-4 text-[0.8125rem] font-medium whitespace-nowrap transition-colors duration-150 hover:border-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] sm:text-sm"
          >
            {COPY_LABEL[copyState]}
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={isDefault}
            className="min-h-11 flex-1 rounded-xl px-4 text-[0.8125rem] font-medium whitespace-nowrap text-[var(--lifafa-muted)] transition-colors duration-150 hover:text-[var(--lifafa-cream)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] disabled:opacity-50 disabled:hover:text-[var(--lifafa-muted)] sm:text-sm"
          >
            Reset to default
          </button>
        </div>
      </div>
    </dialog>
  );
}
