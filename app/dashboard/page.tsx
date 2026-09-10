import type { ReactElement } from "react";
import Link from "next/link";
import EventCard from "@/components/dashboard/EventCard";
import SignOutButton from "@/components/dashboard/SignOutButton";
import { countEventsForHost, getEventsForHost } from "@/lib/db/events";

/**
 * The host's invitations, and the home a signed-in host comes back to.
 *
 * A server component. The middleware has already established that someone is
 * signed in; RLS decides which rows they are, so nothing here filters by host.
 *
 * Every row carries the five facts a host needs to tell one invitation from
 * another without opening it: who it is for, when, the code in the link they
 * sent out, how many people have replied, and whether it has been paid for.
 * Newest first, which is the order getEventsForHost already returns.
 */

export default async function DashboardIndexPage(): Promise<ReactElement> {
  const result = await getEventsForHost();
  /*
    The tally comes from countEventsForHost rather than from result.data.length,
    so the number a host reads here and the number the notice on /create reads
    are the same question answered the same way. It is a head request carrying
    no rows, which is what makes a second call cheap enough to be worth it.
  */
  const countResult = await countEventsForHost();
  const count = countResult.ok ? countResult.data : null;

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
          <div className="min-w-0">
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--lifafa-cream)]">
              Your invitations
            </h1>
            {/*
              Null when the tally could not be read. The list below is the real
              content and stands on its own, so a failed count says nothing
              rather than putting an error where a subtitle goes.
            */}
            {count !== null && count > 0 ? (
              <p className="mt-1 text-sm text-[var(--lifafa-muted)]">
                {count} {count === 1 ? "invitation" : "invitations"} · each is a
                separate ₹999 payment
              </p>
            ) : null}
          </div>

          {/*
            The one thing a host comes here to do that is not reading. Filled
            rather than outlined, and first in the reading order after the
            heading, because the alternative — finding /create some other way —
            is what sent them round the houses in the first place.
          */}
          <Link
            href="/create"
            className="flex min-h-11 items-center rounded-full bg-[var(--lifafa-marigold)] px-5 text-[0.8125rem] font-semibold whitespace-nowrap text-[var(--lifafa-ink)] transition-transform duration-150 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
          >
            Create a new invitation
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
