import type { ReactElement } from "react";
import Link from "next/link";
import CheckinScreen from "@/components/checkin/CheckinScreen";
import { getEventById } from "@/lib/db/events";
import { getGuestsForEvent } from "@/lib/db/guests";

/**
 * The door.
 *
 * A server shell that reads the event and its guest list, wrapping the client
 * screen that owns the scan interaction. Same ownership check as the dashboard:
 * an event that is not this host's simply is not found.
 */
export default async function CheckinPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<ReactElement> {
  const { eventId } = await params;
  const eventResult = await getEventById(eventId);

  if (!eventResult.ok || eventResult.data === null) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
        <p className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--lifafa-cream)]">
          We could not find that invitation.
        </p>
        <Link
          href="/dashboard"
          className="min-h-11 rounded px-2 text-sm font-medium text-[var(--lifafa-marigold)] underline decoration-transparent underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
        >
          Back to your invitations
        </Link>
      </main>
    );
  }

  const event = eventResult.data;

  /*
    The scanner exists only for an event whose host switched QR check-in on, and
    the dashboard does not link here otherwise. Someone who arrives by typing the
    address is told why there is nothing to scan, and where the switch is.
  */
  if (!event.qrCheckinEnabled) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
        <p className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--lifafa-cream)]">
          QR check-in is off for this invitation.
        </p>
        <p className="max-w-sm text-sm leading-relaxed text-[var(--lifafa-muted)]">
          Turn on Guest check-in in the editor&rsquo;s Structure tab to scan
          guests in at the entrance.
        </p>
        <Link
          href={`/dashboard/${event.id}`}
          className="min-h-11 rounded px-2 text-sm font-medium text-[var(--lifafa-marigold)] underline decoration-transparent underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
        >
          Back to the guest list
        </Link>
      </main>
    );
  }

  const guestsResult = await getGuestsForEvent(event.id);

  return (
    <CheckinScreen
      eventId={event.id}
      eventTitle={
        event.draft.eventTitle.length > 0
          ? event.draft.eventTitle
          : "Untitled invitation"
      }
      initialGuests={guestsResult.ok ? guestsResult.data : []}
      loadError={guestsResult.ok ? null : guestsResult.error}
    />
  );
}
