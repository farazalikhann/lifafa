import type { ReactElement } from "react";
import Link from "next/link";

/**
 * "We could not find that invitation."
 *
 * The answer every host-facing route gives for an event id that resolves to
 * nothing — and the same answer it gives for one that belongs to somebody else,
 * which is the point. events_select_own filters rather than refuses, so another
 * host's id simply matches no row; telling the two cases apart would confirm the
 * existence of an event to someone with no business knowing it.
 *
 * Shared by the dashboard and the editor so the two cannot drift into saying
 * different things about the same id.
 */
export default function EventNotFound({
  message,
}: {
  /** Why, in a sentence a host can act on. */
  message: string;
}): ReactElement {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
      <p className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--lifafa-cream)]">
        We could not find that invitation.
      </p>
      <p className="max-w-[38ch] text-sm leading-relaxed text-[var(--lifafa-muted)]">
        {message}
      </p>
      <Link
        href="/dashboard"
        className="mt-2 min-h-11 rounded px-2 text-sm font-medium text-[var(--lifafa-marigold)] underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
      >
        Back to your invitations
      </Link>
    </main>
  );
}
