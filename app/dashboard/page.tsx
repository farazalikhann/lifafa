import type { ReactElement } from "react";
import Link from "next/link";
import SignOutButton from "@/components/dashboard/SignOutButton";
import { getEventsForHost } from "@/lib/db/events";
import { formatWhen } from "@/lib/cardFormat";
import type { HostEvent } from "@/types/database";

/**
 * The host's events.
 *
 * A server component. The middleware has already established that someone is
 * signed in; RLS decides which rows they are, so nothing here filters by host.
 */

function EventCard({ event }: { event: HostEvent }): ReactElement {
  const { draft } = event;
  const when = formatWhen(draft.eventDate, draft.eventTime);

  return (
    <li>
      <Link
        href={`/dashboard/${event.id}`}
        className="flex flex-col gap-3 rounded-2xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-5 py-5 transition-colors duration-150 hover:border-[var(--lifafa-marigold)]/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--lifafa-cream)]">
              {draft.eventTitle.length > 0
                ? draft.eventTitle
                : "Untitled invitation"}
            </p>
            <p className="mt-1 truncate text-sm text-[var(--lifafa-muted)]">
              {when ?? "Date not set yet"}
            </p>
          </div>

          <span className="shrink-0 rounded-full bg-[var(--lifafa-ink)] px-3 py-1.5 text-xs font-medium tabular-nums text-[var(--lifafa-marigold)]">
            {event.replyCount} {event.replyCount === 1 ? "reply" : "replies"}
          </span>
        </div>

        <p className="font-mono text-xs tracking-wide text-[var(--lifafa-muted)]">
          /i/{event.inviteCode}
        </p>
      </Link>
    </li>
  );
}

export default async function DashboardIndexPage(): Promise<ReactElement> {
  const result = await getEventsForHost();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink)]/85 backdrop-blur">
        <div className="mx-auto flex max-w-[900px] items-center justify-between gap-4 px-5 py-3 sm:px-6">
          <Link
            href="/"
            className="rounded font-[family-name:var(--font-display)] text-xl font-semibold tracking-[-0.02em] text-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
          >
            Lifafa
          </Link>
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto flex max-w-[900px] flex-col gap-6 px-5 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--lifafa-cream)]">
            Your invitations
          </h1>
          <Link
            href="/create"
            className="flex min-h-11 items-center rounded-full bg-[var(--lifafa-marigold)] px-5 text-[0.8125rem] font-semibold text-[var(--lifafa-ink)] transition-transform duration-150 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
          >
            New invitation
          </Link>
        </div>

        {!result.ok ? (
          <p
            role="alert"
            className="rounded-2xl border border-[var(--lifafa-rose)]/40 bg-[var(--lifafa-rose)]/10 px-5 py-4 text-sm text-[var(--lifafa-cream)]"
          >
            {result.error}
          </p>
        ) : result.data.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--lifafa-hairline)] px-6 py-16 text-center">
            <p className="text-base text-[var(--lifafa-cream)]">
              You have not made an invitation yet.
            </p>
            <p className="mx-auto mt-2 max-w-[38ch] text-sm leading-relaxed text-[var(--lifafa-muted)]">
              Build a card, save it, and share the link. Every reply lands here.
            </p>
            <Link
              href="/create"
              className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[var(--lifafa-marigold)] px-5 text-[0.8125rem] font-semibold text-[var(--lifafa-ink)] transition-transform duration-150 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
            >
              Make your first invitation
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {result.data.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
