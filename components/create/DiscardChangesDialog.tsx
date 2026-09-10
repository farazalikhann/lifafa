"use client";

import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type ReactElement,
} from "react";

/**
 * "Discard your changes?"
 *
 * The one thing standing between a host who has edited a saved invitation and
 * a click that would throw the edit away. It is raised by the two controls that
 * deliberately leave the editor — Cancel, and the link back to the list — and
 * by nothing else.
 *
 * IT DOES NOT BLOCK NAVIGATION. There is no router interception here and no
 * history manipulation: the back button, the wordmark and a typed URL all leave
 * exactly as they always did. A modal a host cannot get out of is worse than a
 * lost edit, and a guard that fires on every route change is a guard that will
 * one day fire on the wrong one. The browser's own beforeunload prompt covers
 * closing the tab; this covers the two buttons that exist to walk away.
 *
 * KEEP EDITING IS THE DEFAULT and holds the focus on open, because it is the
 * safe half of the choice. Escape and a click on the backdrop both mean the
 * same thing as pressing it.
 */
export default function DiscardChangesDialog({
  onKeepEditing,
  onDiscard,
}: {
  onKeepEditing: () => void;
  onDiscard: () => void;
}): ReactElement {
  const keepRef = useRef<HTMLButtonElement>(null);
  const discardRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    keepRef.current?.focus();
  }, []);

  /*
    Two buttons and nothing else is focusable, so the trap is a wrap rather than
    a sweep of the subtree: Tab off the end of one goes to the other. Escape is
    handled here too, on the container rather than on the window, because the
    focus is inside it — a keydown anywhere in this dialog reaches this handler.
  */
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      onKeepEditing();
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
      document.activeElement === keepRef.current
        ? discardRef.current
        : keepRef.current;

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
      onClick={onKeepEditing}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--lifafa-ink)]/80 px-5 backdrop-blur-sm"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="discard-dialog-title"
        aria-describedby="discard-dialog-body"
        /* The panel is not the backdrop; a click inside it is not a dismissal. */
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-[26rem] rounded-2xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-5 py-5 shadow-2xl sm:px-6 sm:py-6"
      >
        <h2
          id="discard-dialog-title"
          className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--lifafa-cream)]"
        >
          Discard your changes?
        </h2>
        <p
          id="discard-dialog-body"
          className="mt-2 text-sm leading-relaxed text-[var(--lifafa-muted)]"
        >
          Your edits to this invitation have not been saved yet. Leaving now
          will lose them.
        </p>

        {/*
          Wraps at 360px rather than shrinking two 44px controls onto one line.
          Keep editing sits first in the reading order and last in the visual
          one, which is where a confirming action goes on this platform.
        */}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            ref={keepRef}
            type="button"
            onClick={onKeepEditing}
            className="min-h-11 flex-1 rounded-full bg-[var(--lifafa-marigold)] px-5 text-[0.8125rem] font-semibold whitespace-nowrap text-[var(--lifafa-ink)] transition-transform duration-150 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] sm:flex-none"
          >
            Keep editing
          </button>
          <button
            ref={discardRef}
            type="button"
            onClick={onDiscard}
            className="min-h-11 flex-1 rounded-full border border-[var(--lifafa-hairline)] px-5 text-[0.8125rem] font-medium whitespace-nowrap text-[var(--lifafa-cream)] transition-colors duration-150 hover:border-[var(--lifafa-rose)] hover:text-[var(--lifafa-rose)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] sm:flex-none"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}
