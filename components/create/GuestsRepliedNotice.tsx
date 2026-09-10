import type { ReactElement } from "react";

/**
 * "N guests have already replied."
 *
 * WHY IT EXISTS. Editing a card nobody has seen is a private act. Editing one
 * that thirty people have already accepted is not: someone who told their
 * family they were free on the Sunday, booked a train and asked for the day off
 * did all of that against the card as it read then. Moving the date or the
 * venue silently rewrites the invitation under them, and the only person who
 * can tell them is the host.
 *
 * IT SAYS SO AND STOPS THERE. Nothing is disabled, nothing is confirmed twice,
 * and no message is sent to anybody: the host may absolutely move their own
 * wedding, and a product that made that hard would be wrong about whose event
 * it is. This is the sentence that makes sure the consequence was seen. The
 * dashboard says it once more after the save, when the date or venue actually
 * changed.
 *
 * A server component. The count is read on the server with the event, so it
 * arrives with the editor's first paint rather than a beat later — unlike the
 * notice on /create, which is a courtesy about a page the host is already
 * using. This one is a caution about what they are about to do.
 */
export default function GuestsRepliedNotice({
  count,
}: {
  /** How many guests have replied. Renders nothing at zero. */
  count: number;
}): ReactElement | null {
  if (count < 1) {
    return null;
  }

  return (
    <div
      /*
        `status`, not `alert`. Nothing has gone wrong and nothing is waiting on
        the host; an assertive live region would interrupt a screen reader
        mid-sentence to say so.

        `lg:col-span-2` for the same reason ExistingInvitationsNotice carries
        it: this is a grid item in the editor's two-column layout, and a wrapper
        that spanned the columns would occupy a row even on the renders where
        there is nothing to say. The grid is defined in CardEditor.
      */
      role="status"
      className="rounded-2xl border border-[var(--lifafa-marigold)]/40 bg-[var(--lifafa-marigold)]/10 px-4 py-3.5 text-sm leading-relaxed text-[var(--lifafa-cream)] sm:px-5 lg:col-span-2"
    >
      <p>
        {count} {count === 1 ? "guest has" : "guests have"} already replied. If
        you change the date or venue, tell them.
      </p>
    </div>
  );
}
