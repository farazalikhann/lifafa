"use client";

import { useEffect, useState, type ReactElement } from "react";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { countEventsForHost } from "@/lib/db/events";

/**
 * "You already have some of these."
 *
 * WHY IT EXISTS. Saving a card creates an event and sends the host to that
 * event's dashboard. Nothing is deleted and the earlier invitation is exactly
 * where it was — but a host who opens /create a second time gets an empty
 * editor with no sign that the first card survived, saves it, and lands on a
 * dashboard showing one event and no replies. That reads as loss even though
 * nothing was lost. This is the sentence that says otherwise, before they start.
 *
 * DISMISSAL IS REACT STATE AND NOTHING ELSE. Not localStorage, not a column: a
 * host who dismisses it has been told, and the next time they deliberately come
 * to make another invitation is a moment worth telling them again. It costs one
 * tap and remembering it forever would cost the host who forgot.
 *
 * A CLIENT COMPONENT, because /create is one. The count is fetched after mount
 * rather than rendered from the server, which means the notice appears a beat
 * after the editor rather than with it. That is the right way round here: this
 * is a caution about a page the host is already allowed to use, not a gate, and
 * an editor that waited on a count before painting would be worse for every
 * host who has no invitations at all.
 */
export default function ExistingInvitationsNotice(): ReactElement | null {
  const { user, isLoading } = useUser();
  const [count, setCount] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const userId = user?.id ?? null;

  useEffect(() => {
    /*
      Nothing to count for a signed-out visitor, and the editor is open to
      them — /create asks for an account at save time, not at arrival. The
      action would answer 0 for them anyway, since RLS scopes it to the caller;
      not asking saves a round trip on the commonest first visit there is.
    */
    if (isLoading || userId === null) {
      setCount(null);
      return;
    }

    /* The action can resolve after a sign-out unmounts nothing but changes who. */
    let active = true;

    void countEventsForHost()
      .then((result) => {
        if (!active) return;
        setCount(result.ok ? result.data : null);
      })
      .catch((cause: unknown) => {
        /*
          Swallowed on purpose. This is a courtesy, not a requirement: a host
          who never sees it can still build and save their card exactly as
          before, so a failed count shows nothing rather than an error about a
          number they did not ask for.
        */
        console.error("[create] could not count existing invitations:", cause);
        if (!active) return;
        setCount(null);
      });

    return () => {
      active = false;
    };
  }, [isLoading, userId]);

  if (dismissed || count === null || count < 1) {
    return null;
  }

  return (
    <div
      /*
        `status`, not `alert`. Nothing has gone wrong and nothing is waiting on
        the host; an assertive live region would interrupt a screen reader
        mid-sentence to say so.
      */
      role="status"
      /*
        `lg:col-span-2` is here rather than on a wrapper in the page, because a
        wrapper would be a grid item on every render — including the many where
        this component returns null and the editor would be pushed down by an
        empty row. The two-column grid it spans is defined in app/create.
      */
      className="flex items-start gap-3 rounded-2xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-4 py-3.5 sm:px-5 lg:col-span-2"
    >
      <div className="min-w-0 flex-1 text-sm leading-relaxed text-[var(--lifafa-cream)]">
        <p>
          You already have {count}{" "}
          {count === 1 ? "invitation" : "invitations"}. This will create a new
          one.
        </p>
        <Link
          href="/dashboard"
          className="mt-1 inline-flex min-h-11 items-center rounded font-medium text-[var(--lifafa-marigold)] underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
        >
          See my invitations
        </Link>
      </div>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss this notice"
        className="-mr-1 flex size-11 shrink-0 items-center justify-center rounded-full text-[var(--lifafa-muted)] transition-colors duration-150 hover:text-[var(--lifafa-cream)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
      >
        {/* Same 24 grid and line weight as every other icon in the editor. */}
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
