"use client";

import type { ReactElement, ReactNode } from "react";
import { useLinkStatus } from "next/link";

/**
 * A Create button's label, which becomes a spinner and "Opening…" the moment
 * the button is tapped, so the tap is answered before the next page (or its
 * skeleton, app/create/loading.tsx) has come down a slow connection.
 *
 * Goes inside the <Link>: useLinkStatus reads the link it is in. Both labels
 * sit in the same grid cell, the one not showing kept invisible, so the
 * button keeps the width of the wider and does not change size on the tap.
 */
export default function LinkPending({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const { pending } = useLinkStatus();

  return (
    <span className="grid place-items-center">
      <span className={`col-start-1 row-start-1 ${pending ? "invisible" : ""}`}>
        {children}
      </span>
      <span
        className={`col-start-1 row-start-1 inline-flex items-center gap-2 ${
          pending ? "" : "invisible"
        }`}
      >
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
        />
        Opening…
      </span>
    </span>
  );
}
