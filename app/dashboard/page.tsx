import type { ReactElement } from "react";
import Link from "next/link";
import DeleteEventButton from "@/components/dashboard/DeleteEventButton";
import PaymentBadge from "@/components/dashboard/PaymentBadge";
import SignOutButton from "@/components/dashboard/SignOutButton";
import { countEventsForHost, getEventsForHost } from "@/lib/db/events";
import { coverNameLine, formatWhen, resolveCoverNames } from "@/lib/cardFormat";
import type { HostEvent } from "@/types/database";

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

/**
 * What to call an invitation in a list of them.
 *
 * The names first, because that is what the card itself opens with and what the
 * host will recognise — "Aarav weds Priya" places an invitation instantly where
 * "Reception" does not. resolveCoverNames is the one resolution the card, the
 * share image and the page title all share, so a row here cannot end up calling
 * an event something the card never says.
 *
 * It falls back to a placeholder when no names are filled in, and a list of
 * rows all reading "Your names" would be useless — hence the isPlaceholder
 * check rather than trusting the string it returns.
 */
function eventHeading(event: HostEvent): string {
  const names = resolveCoverNames(event.draft, event.config.occasionId);

  if (names.kind === "pair" || !names.isPlaceholder) {
    return coverNameLine(names);
  }

  const title = event.draft.eventTitle.trim();

  return title.length > 0 ? title : "Untitled invitation";
}

/**
 * The muted line under the heading: the title, the date, or both.
 *
 * The title is repeated here only when the heading came from the names, so a
 * row never says the same thing twice. A row with no usable date says so rather
 * than leaving the line short — "when" is the fact a host scans this list for.
 */
function eventSubtitle(event: HostEvent, heading: string): string {
  const title = event.draft.eventTitle.trim();
  const when = formatWhen(event.draft.eventDate, event.draft.eventTime);

  const parts = [
    title.length > 0 && title !== heading ? title : null,
    when ?? "Date not set yet",
  ].filter((part): part is string => part !== null);

  return parts.join(" · ");
}

function EventCard({ event }: { event: HostEvent }): ReactElement {
  const heading = eventHeading(event);

  return (
    /*
      `relative`, because the Edit link below is positioned against this row
      rather than laid out inside it. An anchor cannot contain another anchor —
      the browser drops the inner one — and the whole card being one link is
      what makes a row easy to hit on a phone, so the second destination sits
      over the first instead of inside it.
    */
    <li className="relative">
      <Link
        href={`/dashboard/${event.id}`}
        className="flex flex-col gap-3 rounded-2xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-5 py-5 transition-colors duration-150 hover:border-[var(--lifafa-marigold)]/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--lifafa-cream)]">
              {heading}
            </p>
            <p className="mt-1 truncate text-sm text-[var(--lifafa-muted)]">
              {eventSubtitle(event, heading)}
            </p>
          </div>

          {/*
            The payment state sits top right, where a status belongs and where
            it is the same distance from the heading on every row. It is the one
            fact here about the invitation rather than about the celebration.
          */}
          <PaymentBadge isPaid={event.isPaid} />
        </div>

        {/*
          Wraps rather than truncates. At 360px the code and the reply tally do
          not fit on one line together, and a code with its last characters cut
          off is worse than useless — it is what a host reads back to check
          which link they sent.
        */}
        {/*
          `pr-32` is the room the Edit and Delete controls take out of this row.
          It is a reservation rather than padding for its own sake: both are
          absolutely positioned over this corner, and a code long enough to
          reach them would be sitting under a click target that goes somewhere
          else.
        */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pr-32">
          <span className="font-mono text-xs tracking-wide text-[var(--lifafa-muted)]">
            /i/{event.inviteCode}
          </span>

          <span className="rounded-full bg-[var(--lifafa-ink)] px-3 py-1 text-xs font-medium tabular-nums text-[var(--lifafa-marigold)]">
            {event.replyCount} {event.replyCount === 1 ? "reply" : "replies"}
          </span>
        </div>
      </Link>

      {/*
        The two ways in this row did not have: change it, or be rid of it.

        Both are labelled with the invitation's own name rather than left as a
        bare "Edit" and "Delete": a screen reader user moving through this list
        by control would otherwise hear the same two words once per row with
        nothing to tell them apart. The visible text stays short, because the
        row it sits on has already said which invitation this is.

        Edit is marigold and Delete is muted until hovered, which is the whole
        of the visual argument between them — the safe one is the one that looks
        like a control, and the one there is no undo for does not compete for
        the eye. Delete is last, at the outside edge, where a destructive
        action is hardest to hit by accident.
      */}
      <div className="absolute right-3 bottom-3 flex items-center gap-1">
        <Link
          href={`/dashboard/${event.id}/edit`}
          aria-label={`Edit ${heading}`}
          className="flex min-h-11 items-center rounded px-2 text-[0.8125rem] font-medium text-[var(--lifafa-marigold)] underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
        >
          Edit
        </Link>

        <DeleteEventButton
          eventId={event.id}
          heading={heading}
          replyCount={event.replyCount}
        />
      </div>
    </li>
  );
}

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
