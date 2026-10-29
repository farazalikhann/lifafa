import type { ReactElement } from "react";
import Link from "next/link";
import EventCard from "@/components/dashboard/EventCard";
import HelpWidget from "@/components/help/HelpWidget";
import SignOutButton from "@/components/dashboard/SignOutButton";
import HelpLine from "@/components/legal/HelpLine";
import LegalFooter from "@/components/legal/LegalFooter";
import { countEventsForHost, getEventsForHost } from "@/lib/db/events";
import { eventsUnderReview } from "@/lib/db/paymentReview";
import { NEW_CARD_HREF } from "@/lib/wizardSteps";
import Logo from "@/components/brand/Logo";

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
  /*
    The tally comes from countEventsForHost rather than from result.data.length,
    so the number a host reads here and the number the notice on /create reads
    are the same question answered the same way. It is a head request carrying
    no rows, which is what makes a second call cheap enough to be worth it.

    Both go together rather than one after the other. Neither reads the other's
    answer, and awaited in sequence the page sat through two round trips to
    Supabase before it could put a single row on screen — a second request's
    worth of waiting for a number that was already on its way.
  */
  const [result, countResult] = await Promise.all([
    getEventsForHost(),
    countEventsForHost(),
  ]);
  const count = countResult.ok ? countResult.data : null;

  /*
    Which of the unpaid ones have been paid for and are being verified, so
    their rows do not say "Not paid yet". One read for the list, and none at
    all for a host whose invitations are all published. The ids are this
    host's own: getEventsForHost read them under the host's session.
  */
  const underReview = await eventsUnderReview(
    result.ok
      ? result.data.filter((event) => !event.isPaid).map((event) => event.id)
      : [],
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink)]/85 backdrop-blur">
        <div className="mx-auto flex max-w-[900px] items-center justify-between gap-4 px-5 py-3 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
          >
            <Logo />
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
                separate payment
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
            href={NEW_CARD_HREF}
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
              href={NEW_CARD_HREF}
              className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[var(--lifafa-marigold)] px-5 text-[0.8125rem] font-semibold text-[var(--lifafa-ink)] transition-transform duration-150 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
            >
              Make your first invitation
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {result.data.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                underReview={underReview.has(event.id)}
              />
            ))}
          </ul>
        )}

        <HelpLine className="text-center sm:text-left" />
      </main>

      <LegalFooter />
      <HelpWidget page="dashboard" />
    </div>
  );
}
