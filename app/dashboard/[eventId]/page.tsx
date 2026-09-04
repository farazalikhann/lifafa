import type { ReactElement } from "react";
import Link from "next/link";
import ExportCsvButton from "@/components/dashboard/ExportCsvButton";
import GuestTable from "@/components/dashboard/GuestTable";
import HeadcountSummary from "@/components/dashboard/HeadcountSummary";
import ReminderPanel from "@/components/dashboard/ReminderPanel";
import ShareBar from "@/components/dashboard/ShareBar";
import SignOutButton from "@/components/dashboard/SignOutButton";
import { formatWhen } from "@/lib/cardFormat";
import { getEventById } from "@/lib/db/events";
import { getGuestsForEvent } from "@/lib/db/guests";
import { inviteUrl } from "@/lib/siteUrl";

/**
 * One event's dashboard.
 *
 * A server component: the event and its guests are read here, and only the
 * filter state and the CSV build cross to the client. Every figure on the page
 * is derived from the guest list rather than stored.
 */

function NotFound({ message }: { message: string }): ReactElement {
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

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<ReactElement> {
  const { eventId } = await params;
  const eventResult = await getEventById(eventId);

  if (!eventResult.ok) {
    return <NotFound message={eventResult.error} />;
  }

  /*
    Null covers both "no such event" and "not yours" — events_select_own filters
    rather than refuses, so another host's id simply matches nothing. Telling
    the two apart would confirm the existence of an event to someone with no
    business knowing it.
  */
  if (eventResult.data === null) {
    return (
      <NotFound message="It may have been deleted, or it belongs to a different account." />
    );
  }

  const event = eventResult.data;
  const guestsResult = await getGuestsForEvent(event.id);
  const guests = guestsResult.ok ? guestsResult.data : [];

  const { draft } = event;
  const when = formatWhen(draft.eventDate, draft.eventTime);
  const title =
    draft.eventTitle.length > 0 ? draft.eventTitle : "Untitled invitation";
  /* One link, built once, shared by the share bar and the reminder message. */
  const url = inviteUrl(event.inviteCode);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink)]/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-5 py-3 sm:px-6 lg:px-8">
          <Link
            href="/dashboard"
            className="rounded font-[family-name:var(--font-display)] text-xl font-semibold tracking-[-0.02em] text-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
          >
            Lifafa
          </Link>

          <div className="flex min-w-0 items-center gap-4">
            <div className="min-w-0 text-right">
              <p className="truncate text-[0.8125rem] font-medium text-[var(--lifafa-cream)] sm:text-sm">
                {title}
              </p>
              <p className="truncate text-xs text-[var(--lifafa-muted)]">
                {when ?? "Date not set yet"}
              </p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1100px] flex-col gap-8 px-5 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        {/* A failed guest read leaves the page standing and says so. */}
        {!guestsResult.ok ? (
          <p
            role="alert"
            className="rounded-2xl border border-[var(--lifafa-rose)]/40 bg-[var(--lifafa-rose)]/10 px-5 py-4 text-sm text-[var(--lifafa-cream)]"
          >
            {guestsResult.error}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            {/* The real link, built from the event's own code. */}
            <ShareBar inviteUrl={url} />
          </div>
          <div className="flex gap-2">
            <ExportCsvButton guests={guests} eventId={event.id} />
            <Link
              href={`/dashboard/${event.id}/checkin`}
              className="flex min-h-11 items-center justify-center rounded-xl border border-[var(--lifafa-hairline)] px-4 text-[0.8125rem] font-medium whitespace-nowrap text-[var(--lifafa-cream)] transition-colors duration-150 hover:border-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] sm:text-sm"
            >
              Check-in
            </Link>
          </div>
        </div>

        <HeadcountSummary guests={guests} />
        <GuestTable guests={guests} />

        {/*
          Under the table rather than over it. The host comes to this page for
          the headcount and the list; chasing the people missing from it is the
          next thing they do, not the first thing they read.
        */}
        <ReminderPanel
          guests={guests}
          eventTitle={title}
          when={when}
          inviteUrl={url}
        />
      </main>
    </div>
  );
}
