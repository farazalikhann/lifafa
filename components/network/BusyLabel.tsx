import type { ReactElement, ReactNode } from "react";

/**
 * A button's label that becomes a spinner and a short busy word ("Opening…")
 * while `busy`. Both sit in the same grid cell, the one not showing kept
 * invisible, so the button keeps the width of the wider and does not change
 * size when it is pressed.
 */
export default function BusyLabel({
  busy,
  busyText = "Opening…",
  done = false,
  children,
}: {
  busy: boolean;
  busyText?: string;
  /** The work is done (a card saved, its page on the way): a tick in the spinner's place. */
  done?: boolean;
  children: ReactNode;
}): ReactElement {
  return (
    <span className="grid place-items-center">
      <span className={`col-start-1 row-start-1 ${busy ? "invisible" : ""}`}>{children}</span>
      <span
        aria-hidden={!busy}
        className={`col-start-1 row-start-1 inline-flex items-center gap-2 ${busy ? "" : "invisible"}`}
      >
        {done ? (
          <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8.5l3.2 3L13 4.5" />
          </svg>
        ) : (
          /* Turning only while busy: a hidden spinner left turning costs a style update every frame. */
          <span
            aria-hidden="true"
            className={`h-4 w-4 rounded-full border-2 border-current border-r-transparent ${
              busy ? "animate-spin motion-reduce:animate-none" : ""
            }`}
          />
        )}
        {busyText}
      </span>
    </span>
  );
}
