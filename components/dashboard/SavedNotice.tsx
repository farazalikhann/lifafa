"use client";

import { useEffect, type ReactElement } from "react";

/**
 * "Saved." — the sentence a host lands on after editing their invitation.
 *
 * WHY A QUERY PARAMETER. The editor and this dashboard are two pages, and the
 * host arrives here by navigating. There is no state that survives that trip
 * except the URL, and the alternative — a toast raised from a layout, or a
 * value stashed in storage — would be a second mechanism for one sentence.
 *
 * IT REMOVES ITSELF FROM THE URL. `history.replaceState`, not a router call:
 * the notice is already on screen and re-rendering the page to change nothing
 * but the address bar would be wasteful. What it buys is that a refresh, a
 * bookmark or a shared link is the plain dashboard rather than a page that
 * claims something was just saved. The notice stays for this visit because it
 * is React state by then, not a parameter.
 */
export default function SavedNotice({
  /** "details" when the date or venue moved and the guests may need telling. */
  variant,
}: {
  variant: "details" | "plain";
}): ReactElement {
  useEffect(() => {
    const url = new URL(window.location.href);

    if (!url.searchParams.has("saved")) {
      return;
    }

    url.searchParams.delete("saved");
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, []);

  return (
    <p
      /*
        `status`, not `alert`. This is the good news at the end of something the
        host chose to do; an assertive region would interrupt whatever a screen
        reader was in the middle of to deliver it.
      */
      role="status"
      className="rounded-2xl border border-[var(--lifafa-marigold)]/40 bg-[var(--lifafa-marigold)]/10 px-5 py-4 text-sm leading-relaxed text-[var(--lifafa-cream)]"
    >
      {variant === "details"
        ? "Saved. Consider messaging your guests about the change."
        : "Saved. Your invitation is up to date."}
    </p>
  );
}
