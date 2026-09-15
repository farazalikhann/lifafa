import type { ReactElement } from "react";
import Link from "next/link";

/**
 * Says that this invitation is not taking replies, when it is not.
 *
 * Renders nothing on a card with its reply form on, which is almost every card.
 *
 * The replies already collected stay on the page underneath and are not
 * mentioned: switching the form off closes it to new replies, it does not
 * throw away the ones that came in while it was open.
 *
 * A server component, and a quiet one — the muted hairline box the dashboard
 * uses for information rather than the marigold it keeps for money. Nothing is
 * wrong; the host chose this, and the link is only there for the host who
 * forgot they did.
 */
export default function RepliesOffNotice({
  repliesOpen,
  editHref,
}: {
  repliesOpen: boolean;
  /** The editor for this invitation, where the switch is. */
  editHref: string;
}): ReactElement | null {
  if (repliesOpen) {
    return null;
  }

  return (
    <p className="rounded-2xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-5 py-4 text-sm leading-relaxed text-[var(--lifafa-cream)]">
      The reply form is switched off on this invitation, so guests cannot send a
      reply.{" "}
      <Link
        href={editHref}
        className="rounded font-medium text-[var(--lifafa-marigold)] underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
      >
        Turn it on under Structure
      </Link>
    </p>
  );
}
