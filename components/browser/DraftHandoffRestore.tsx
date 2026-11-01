"use client";

import { useEffect, useState, type ReactElement } from "react";
import { claimDraftHandoff } from "@/lib/handoff/actions";
import { writePendingCard } from "@/lib/pendingCard";

/** The query parameter the Chrome link carries the card's id in. */
export const HANDOFF_PARAM = "handoff";

/**
 * On /login, opened from Instagram with `?handoff=<id>`: takes the card saved
 * there (lib/handoff/actions.ts) and puts it in this browser's storage, where
 * /create looks for a card after sign in. Then takes the id off the address,
 * so a reload does not try again.
 *
 * Renders nothing without the parameter. With it, one short line: while it
 * fetches, once the card is here, or when it is not.
 */
export default function DraftHandoffRestore(): ReactElement | null {
  const [state, setState] = useState<"idle" | "loading" | "done" | "missing">("idle");

  useEffect(() => {
    const url = new URL(window.location.href);
    const id = url.searchParams.get(HANDOFF_PARAM);

    if (id === null) {
      return;
    }

    url.searchParams.delete(HANDOFF_PARAM);
    window.history.replaceState(window.history.state, "", url.pathname + url.search);
    setState("loading");

    /*
      No cancel on unmount: the id is off the address already, so a second run
      (React's strict mode runs effects twice) finds nothing, and this first
      claim is the only one that can bring the card back.
    */
    void claimDraftHandoff(id)
      .then((result) => {
        setState(result.ok && writePendingCard(result.card) ? "done" : "missing");
      })
      .catch(() => setState("missing"));
  }, []);

  if (state === "idle") {
    return null;
  }

  return (
    <p
      role="status"
      className="mb-4 rounded-xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-4 py-3 text-sm leading-relaxed text-[var(--lifafa-muted)]"
    >
      {state === "loading"
        ? "Bringing your card over from Instagram…"
        : state === "done"
          ? "Your card is here. Sign in to save it."
          : "We could not bring your card over from Instagram. It may have expired, so you may need to start it again."}
    </p>
  );
}
