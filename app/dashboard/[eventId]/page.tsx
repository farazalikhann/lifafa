import type { ReactElement } from "react";
import Link from "next/link";
import EventNotFound from "@/components/dashboard/EventNotFound";
import ExportCsvButton from "@/components/dashboard/ExportCsvButton";
import GuestTable from "@/components/dashboard/GuestTable";
import HeadcountSummary from "@/components/dashboard/HeadcountSummary";
import PaymentBanner from "@/components/dashboard/PaymentBanner";
import ReminderPanel from "@/components/dashboard/ReminderPanel";
import SavedNotice from "@/components/dashboard/SavedNotice";
import ShareBar from "@/components/dashboard/ShareBar";
import SignOutButton from "@/components/dashboard/SignOutButton";
import WeatherSummary from "@/components/dashboard/WeatherSummary";
import { formatWhen } from "@/lib/cardFormat";
import { getEventById } from "@/lib/db/events";
import { getGuestsForEvent } from "@/lib/db/guests";
import { inviteUrl } from "@/lib/siteUrl";
import { getEventWeather } from "@/lib/weather";

/**
 * One event's dashboard.
 *
 * A server component: the event and its guests are read here, and only the
 * filter state and the CSV build cross to the client. Every figure on the page
 * is derived from the guest list rather than stored.
 */

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  /*
    Only `saved`, and only ever written by the editor on its way back here. See
    components/dashboard/SavedNotice.tsx for why the confirmation travels in the
    URL and how it takes itself back out of one.
  */
  searchParams: Promise<{ saved?: string }>;
}): Promise<ReactElement> {
  const { eventId } = await params;
  const { saved } = await searchParams;
  const eventResult = await getEventById(eventId);

  if (!eventResult.ok) {
    return <EventNotFound message={eventResult.error} />;
  }

  /*
    Null covers both "no such event" and "not yours" — events_select_own filters
    rather than refuses, so another host's id simply matches nothing. Telling
    the two apart would confirm the existence of an event to someone with no
    business knowing it.
  */
  if (eventResult.data === null) {
    return (
      <EventNotFound message="It may have been deleted, or it belongs to a different account." />
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

  /*
    Read whatever the host chose for their guests.

    show_weather governs the card, not this page: whether it will rain on the
    day is the host's problem regardless of what they decided to print on the
    invitation. Null when there is nothing to say, and the panel renders nothing
    on null.
  */
  const weather = await getEventWeather(event.coordinates, draft.eventDate);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink)]/85 backdrop-blur">
        {/*
          Wraps rather than crushing four things onto one line.

          There are two groups here now — where you can go, and which event you
          are looking at — and on a phone they take a row each. That is the
          deliberate choice: nowrap would fit them both by shrinking the title
          block to nothing, and a truncated title is not a shorter title, it is
          a missing one.
        */}
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3 sm:px-6 lg:px-8">
          {/*
            The wordmark goes to the landing page and the link beside it goes to
            the list. It used to be one control doing both jobs silently — a
            wordmark is not a signpost, and a host who had saved a second card
            had no visible way from this page back to the first one. Now the way
            back is a link that says where it goes.
          */}
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="rounded font-[family-name:var(--font-display)] text-xl font-semibold tracking-[-0.02em] text-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
            >
              Lifafa
            </Link>

            <Link
              href="/dashboard"
              className="flex min-h-11 items-center rounded text-[0.8125rem] font-medium whitespace-nowrap text-[var(--lifafa-muted)] transition-colors duration-150 hover:text-[var(--lifafa-cream)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
            >
              {/* Decorative: the words already say which direction this goes. */}
              <span aria-hidden="true" className="mr-1.5">
                ←
              </span>
              All my invitations
            </Link>
          </div>

          {/*
            `ml-auto` so that when this wraps onto its own row it stays against
            the right edge. justify-between does nothing for a row holding one
            item, and a right-aligned title block sitting at the left would read
            as a mistake.
          */}
          <div className="ml-auto flex min-w-0 items-center gap-4">
            <div className="min-w-0 text-right">
              <p className="truncate text-[0.8125rem] font-medium text-[var(--lifafa-cream)] sm:text-sm">
                {title}
              </p>
              <p className="truncate text-xs text-[var(--lifafa-muted)]">
                {when ?? "Date not set yet"}
              </p>
            </div>
            {/*
              The way into the editor, and the first thing a host looks for
              when they spot a wrong date on this page. In the top bar rather
              than beside the share link, because it acts on the invitation as
              a whole and not on any one panel below.

              Filled marigold: it is the one control up here that changes
              something, and it sits before Sign out so that the destructive
              end of the bar stays at the edge.

              One word below sm, and the shorter label is not a compromise on
              this bar — it is what keeps the event's own name readable. At
              360px this row wraps under the wordmark with about 320px to share
              between the title, this and Sign out; "Edit invitation" would take
              enough of it to truncate the title to seven characters, and a host
              cannot tell two invitations apart by their first seven characters.
              Only one of the two is in the tree at any width, so a screen
              reader hears one label rather than both.
            */}
            <Link
              href={`/dashboard/${event.id}/edit`}
              className="flex min-h-11 shrink-0 items-center rounded-full bg-[var(--lifafa-marigold)] px-4 text-[0.8125rem] font-semibold whitespace-nowrap text-[var(--lifafa-ink)] transition-transform duration-150 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
            >
              <span className="sm:hidden">Edit</span>
              <span className="hidden sm:inline">Edit invitation</span>
            </Link>

            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1100px] flex-col gap-8 px-5 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        {/*
          First thing on the page after an edit, and gone on the next visit.
          "details" is the editor saying the date or the venue moved, which is
          the one change the people already holding this date need to hear
          about — from the host, who is the only one who can tell them.
        */}
        {saved === undefined ? null : (
          <SavedNotice variant={saved === "details" ? "details" : "plain"} />
        )}

        {/* A failed guest read leaves the page standing and says so. */}
        {!guestsResult.ok ? (
          <p
            role="alert"
            className="rounded-2xl border border-[var(--lifafa-rose)]/40 bg-[var(--lifafa-rose)]/10 px-5 py-4 text-sm text-[var(--lifafa-cream)]"
          >
            {guestsResult.error}
          </p>
        ) : null}

        {/*
          Above the share bar, and that placement is the whole argument for it.

          The watermark is on the card a guest opens, so the moment a host is
          about to copy the link is the moment they need to know it is there.
          Renders nothing once the event is paid for.
        */}
        <PaymentBanner isPaid={event.isPaid} />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            {/* The real link, built from the event's own code. */}
            <ShareBar inviteUrl={url} />
          </div>
          <div className="flex gap-2">
            <ExportCsvButton guests={guests} eventId={event.id} />
            {/*
              Only when the host switched QR check-in on. An event without it has
              no scanner to open, so there is nothing here to point at.
            */}
            {event.qrCheckinEnabled ? (
              <Link
                href={`/dashboard/${event.id}/checkin`}
                className="flex min-h-11 items-center justify-center rounded-xl border border-[var(--lifafa-hairline)] px-4 text-[0.8125rem] font-medium whitespace-nowrap text-[var(--lifafa-cream)] transition-colors duration-150 hover:border-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] sm:text-sm"
              >
                Check-in
              </Link>
            ) : null}
          </div>
        </div>

        {/*
          Above the headcount, with the event's own details rather than with the
          guest list. It is a fact about the day, not a fact about who is coming.
        */}
        <WeatherSummary weather={weather} showWeather={event.showWeather} />

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
