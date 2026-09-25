import Link from "next/link";
import type { ReactElement } from "react";
import { ENDED_EDIT_MESSAGE } from "@/lib/eventLock";

/**
 * The line across the top of the editor once a paid invitation's event is
 * over (lib/eventLock.ts). The editor under it is read-only, and the server
 * and the database refuse a save anyway; this says why, and points the host
 * to what still works.
 *
 * Spans both columns at lg, like the other notices in this slot.
 */
export default function EventEndedNotice({
  eventId,
}: {
  eventId: string;
}): ReactElement {
  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-2xl border border-[var(--lifafa-marigold)]/40 bg-[var(--lifafa-marigold)]/10 px-4 py-3.5 text-sm leading-relaxed text-[var(--lifafa-cream)] sm:flex-row sm:items-center sm:justify-between sm:px-5 lg:col-span-2"
    >
      <p>{ENDED_EDIT_MESSAGE}</p>
      <Link
        href={`/dashboard/${eventId}`}
        className="inline-flex min-h-11 shrink-0 items-center self-start rounded-full border border-[var(--lifafa-marigold)] px-4 text-[0.8125rem] font-semibold whitespace-nowrap text-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] sm:self-auto"
      >
        View guests and responses
      </Link>
    </div>
  );
}
