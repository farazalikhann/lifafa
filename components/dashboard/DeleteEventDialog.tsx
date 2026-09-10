"use client";

import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type ReactElement,
} from "react";

/**
 * "Delete this invitation?"
 *
 * The one thing standing between a host and a row that cannot be brought back.
 * Deleting an event cascades to its guests — see deleteEvent — so this is also
 * the only warning anybody gets that the replies are going with it.
 *
 * IT NAMES THE INVITATION, and that is not decoration. A host with eleven cards
 * called "Untitled invitation" is choosing from a list where the rows look
 * alike; a dialog that said only "are you sure?" would be asking them to trust
 * that they clicked the row they meant to. The heading here is the same string
 * the row above it shows, so the two can be read against each other.
 *
 * THE REPLY COUNT IS THE SECOND SENTENCE, and only when there is one. "3
 * replies will be deleted too" is the fact most likely to stop a host who is
 * about to delete the wrong card, and a card nobody has replied to yet should
 * not be dressed up with a warning about nothing.
 *
 * KEEP IT holds the focus on open, because it is the safe half of the choice.
 * Escape and a click on the backdrop both mean the same thing as pressing it.
 * The destructive answer is rose rather than marigold, and is never the default.
 */
export default function DeleteEventDialog({
  heading,
  replyCount,
  isDeleting,
  error,
  onCancel,
  onConfirm,
}: {
  /** What the row calls this invitation, repeated so the two can be matched. */
  heading: string;
  replyCount: number;
  isDeleting: boolean;
  /** What went wrong last time, shown in place of leaving the dialog. */
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}): ReactElement {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  /*
    Two buttons and nothing else is focusable, so the trap is a wrap rather than
    a sweep of the subtree: Tab off the end of one goes to the other. Escape is
    handled on the container rather than on the window, because the focus is
    inside it — a keydown anywhere in this dialog reaches this handler.

    Both are ignored while the delete is in flight. A host who pressed Escape
    at the wrong moment would otherwise close a dialog over a statement that is
    still running, and the next thing they saw would be a list that had quietly
    lost a row.
  */
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Escape") {
      event.preventDefault();

      if (!isDeleting) {
        onCancel();
      }

      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    /*
      With exactly two stops, Tab and Shift+Tab do the same thing: go to the
      other one. Direction only starts to matter at three.
    */
    const next =
      document.activeElement === cancelRef.current
        ? deleteRef.current
        : cancelRef.current;

    event.preventDefault();
    next?.focus();
  };

  return (
    <div
      /*
        The backdrop is the click target for "leave it alone", which is why it
        is a div with an onClick and not a button: it is not in the tab order,
        it is not announced, and the two real answers are both inside the panel.
      */
      onClick={isDeleting ? undefined : onCancel}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--lifafa-ink)]/80 px-5 backdrop-blur-sm"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-body"
        /* The panel is not the backdrop; a click inside it is not a dismissal. */
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-[26rem] rounded-2xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-5 py-5 shadow-2xl sm:px-6 sm:py-6"
      >
        <h2
          id="delete-dialog-title"
          className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--lifafa-cream)]"
        >
          Delete this invitation?
        </h2>

        <p
          id="delete-dialog-body"
          className="mt-2 text-sm leading-relaxed text-[var(--lifafa-muted)]"
        >
          {/*
            The name in the host's own words, quoted rather than run into the
            sentence, so a title that happens to read like a sentence of its own
            cannot be mistaken for one.
          */}
          <span className="text-[var(--lifafa-cream)]">“{heading}”</span> will be
          gone for good, and the link you shared will stop opening.
          {replyCount > 0
            ? ` The ${replyCount} ${replyCount === 1 ? "reply" : "replies"} you have collected will be deleted with it.`
            : ""}
        </p>

        {/*
          A failed delete keeps the dialog open and says why. Closing it would
          leave a host looking at a list that still holds the row with no
          explanation of why their click did nothing.
        */}
        {error === null ? null : (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-[var(--lifafa-rose)]/40 bg-[var(--lifafa-rose)]/10 px-4 py-3 text-sm text-[var(--lifafa-cream)]"
          >
            {error}
          </p>
        )}

        {/*
          Wraps at 360px rather than shrinking two 44px controls onto one line.
          Keep it sits first in the reading order and last in the visual one,
          which is where the safe answer goes on this platform.
        */}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="min-h-11 flex-1 rounded-full bg-[var(--lifafa-marigold)] px-5 text-[0.8125rem] font-semibold whitespace-nowrap text-[var(--lifafa-ink)] transition-transform duration-150 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] disabled:opacity-60 sm:flex-none"
          >
            Keep it
          </button>
          <button
            ref={deleteRef}
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="min-h-11 flex-1 rounded-full border border-[var(--lifafa-rose)]/60 px-5 text-[0.8125rem] font-medium whitespace-nowrap text-[var(--lifafa-rose)] transition-colors duration-150 hover:border-[var(--lifafa-rose)] hover:bg-[var(--lifafa-rose)]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-rose)] disabled:opacity-60 sm:flex-none"
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
