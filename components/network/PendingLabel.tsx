import type { ReactElement, ReactNode } from "react";

/**
 * A link's label that turns into a spinner and "Opening…" the moment the link
 * is tapped, before or after React runs: the stylesheet shows it from the
 * mark NavProgress (or the early script) puts on a tapped link,
 * data-nav-pending. No state and no hook, so it works in a plain <a> as well
 * as a <Link>. Same width either way, so nothing moves.
 */
export default function PendingLabel({
  children,
  busyText = "Opening…",
}: {
  children: ReactNode;
  busyText?: string;
}): ReactElement {
  return (
    <span data-own-pending="" className="grid place-items-center">
      <span className="lifafa-pending-idle col-start-1 row-start-1">{children}</span>
      {/* Hidden in its own style too, so it never shows before the stylesheet has come. */}
      <span
        aria-hidden="true"
        className="lifafa-pending-busy col-start-1 row-start-1 inline-flex items-center gap-2"
        style={{ visibility: "hidden" }}
      >
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" />
        {busyText}
      </span>
    </span>
  );
}

/** The same mark as a spinner over a picture, for a link that is a picture. Its box must be `relative`. */
export function PendingOverlay(): ReactElement {
  return (
    <span
      data-own-pending=""
      aria-hidden="true"
      className="lifafa-card-pending pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/35"
      style={{ visibility: "hidden" }}
    >
      <span className="flex flex-col items-center gap-2 rounded-2xl bg-black/60 px-4 py-3 text-sm font-semibold text-white">
        <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-white border-r-transparent motion-reduce:animate-none" />
        Opening…
      </span>
    </span>
  );
}
