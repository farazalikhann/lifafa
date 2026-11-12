"use client";

import { useState, type ReactElement } from "react";
import { forgetHandoff } from "@/lib/handoff/seen";

/**
 * Why the card a host stashed before signing in is not in the editor.
 *
 * `elsewhere` is the one where nothing is lost: the card is safe on another of
 * the site's addresses, which this page cannot see into. The rest mean the card
 * cannot be brought back here, for reasons a host can do something about.
 */
export type PendingCardProblem =
  /** Stashed on another of Lifafa's addresses. `origin` is where. */
  | { kind: "elsewhere"; origin: string }
  /** Older than the day a card is kept for. */
  | { kind: "expired" }
  /** There, but it would not open. */
  | { kind: "damaged" }
  /** The browser would not let the page read its storage at all. */
  | { kind: "blocked" }
  /**
   * A card handed over from Instagram's or Facebook's browser that is no
   * longer on the server: past its day, or already saved to an account.
   */
  | { kind: "handoff-gone" }
  /**
   * A handed-over card that is safe on the server but could not be opened
   * just now (the server did not answer). `retryHref` brings it back.
   */
  | { kind: "handoff-unreachable"; retryHref: string }
  /**
   * Back from signing in, and the card this browser was keeping for the trip
   * is not here any more, with nothing else to bring back in its place.
   */
  | { kind: "after-login-empty" }
  /**
   * A card handed over from Instagram's or Facebook's browser that this
   * browser was shown on the sign-in page, still on the server: the host left
   * without signing in. `href` opens it (lib/handoff/seen.ts).
   */
  | { kind: "handoff-waiting"; id: string; href: string };

/** An address as a host would type it: no scheme, no trailing slash. */
export function displayHost(origin: string): string {
  try {
    return new URL(origin).host;
  } catch {
    return origin;
  }
}

interface Message {
  title: string;
  body: string;
}

/**
 * The words, one pair per reason.
 *
 * Written for someone who has never heard of browser storage. Each says what
 * happened in terms of what they did — started a card, signed in, came back —
 * and what to do next, and names addresses exactly as they would type them.
 */
function messageFor(problem: PendingCardProblem, here: string): Message {
  switch (problem.kind) {
    case "elsewhere": {
      const there = displayHost(problem.origin);

      return {
        title: `Your card is waiting on ${there}.`,
        body: `You started it on ${there}, and this page is ${here}. Each address keeps its own copy, so this one cannot see your card. Open ${there}/create in this browser to carry on where you left off.`,
      };
    }
    case "expired":
      return {
        title: "Your card was too old to bring back.",
        body: "We keep an unsaved card for one day while you sign in, and this one was started more than a day ago. Please start again below.",
      };
    case "damaged":
      return {
        title: "We could not open the card you started.",
        body: "Something went wrong reading it back, so the editor below is empty. We are sorry. Please start again below.",
      };
    case "blocked":
      return {
        title: "Your browser would not let us bring your card back.",
        body: "It is set to block the storage Lifafa uses to hold your card while you sign in. Allow this site to store data in your browser's settings and reload this page, or start again below.",
      };
    case "handoff-gone":
      return {
        title: "We could not find the card you started.",
        body: "We keep a card for one day while you sign in, and this one is no longer there. If you already saved it, it is in your invitations. Otherwise, please start again below.",
      };
    case "handoff-unreachable":
      return {
        title: "Your card is safe, but it did not open.",
        body: "We could not reach it just now. Check your connection and try again.",
      };
    case "after-login-empty":
      return {
        title: "We could not find the card you started.",
        body: "You signed in, but this browser no longer has the card you were making. If you saved it before, it is in your invitations. Otherwise, please start again below.",
      };
    case "handoff-waiting":
      return {
        title: "Your card is still saved.",
        body: "You started a card in Instagram or Facebook. Open it here and sign in once to keep it.",
      };
  }
}

/**
 * Said plainly, above the editor, instead of an empty editor that says nothing.
 *
 * `alert`, unlike the notice about existing invitations beside it: the host came
 * back from signing in expecting their card, and this is news about that card.
 * Dismissible, because a host who has read it and started again does not need
 * it sitting over the work they are doing now.
 */
export default function PendingCardNotice({
  problem,
  here,
}: {
  problem: PendingCardProblem;
  /** The address this page is on, as displayHost would print it. */
  here: string;
}): ReactElement | null {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  const { title, body } = messageFor(problem, here);

  return (
    <div
      role="alert"
      /* Spans both columns of the editor's grid; see ExistingInvitationsNotice. */
      className="flex items-start gap-3 rounded-2xl border border-[var(--lifafa-rose)]/40 bg-[var(--lifafa-rose)]/10 px-4 py-3.5 sm:px-5 lg:col-span-2"
    >
      <div className="min-w-0 flex-1 text-sm leading-relaxed">
        <p className="font-semibold text-[var(--lifafa-cream)]">{title}</p>
        <p className="mt-1 text-[var(--lifafa-cream)]/85">{body}</p>

        {problem.kind === "elsewhere" ? (
          <a
            href={`${problem.origin}/create`}
            className="mt-1 inline-flex min-h-11 items-center rounded font-medium text-[var(--lifafa-marigold)] underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
          >
            Open my card on {displayHost(problem.origin)}
          </a>
        ) : null}

        {problem.kind === "handoff-gone" || problem.kind === "after-login-empty" ? (
          <a
            href="/dashboard"
            className="mt-1 inline-flex min-h-11 items-center rounded font-medium text-[var(--lifafa-marigold)] underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
          >
            See my invitations
          </a>
        ) : null}

        {problem.kind === "handoff-waiting" ? (
          <a
            href={problem.href}
            className="mt-1 inline-flex min-h-11 items-center rounded font-medium text-[var(--lifafa-marigold)] underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
          >
            Open my card
          </a>
        ) : null}

        {problem.kind === "handoff-unreachable" ? (
          <a
            href={problem.retryHref}
            className="mt-1 inline-flex min-h-11 items-center rounded font-medium text-[var(--lifafa-marigold)] underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
          >
            Try again
          </a>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => {
          /* A waiting card the host has chosen to leave is not offered again. */
          if (problem.kind === "handoff-waiting") {
            forgetHandoff(problem.id);
          }

          setDismissed(true);
        }}
        aria-label="Dismiss this notice"
        className="-mr-1 flex size-11 shrink-0 items-center justify-center rounded-full text-[var(--lifafa-muted)] transition-colors duration-150 hover:text-[var(--lifafa-cream)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          role="presentation"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}
