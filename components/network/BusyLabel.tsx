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
  children,
}: {
  busy: boolean;
  busyText?: string;
  children: ReactNode;
}): ReactElement {
  return (
    <span className="grid place-items-center">
      <span className={`col-start-1 row-start-1 ${busy ? "invisible" : ""}`}>{children}</span>
      <span
        aria-hidden={!busy}
        className={`col-start-1 row-start-1 inline-flex items-center gap-2 ${busy ? "" : "invisible"}`}
      >
        {/* Turning only while busy: a hidden spinner left turning costs a style update every frame. */}
        <span
          aria-hidden="true"
          className={`h-4 w-4 rounded-full border-2 border-current border-r-transparent ${
            busy ? "animate-spin motion-reduce:animate-none" : ""
          }`}
        />
        {busyText}
      </span>
    </span>
  );
}
