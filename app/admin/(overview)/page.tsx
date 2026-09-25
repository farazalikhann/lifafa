import Link from "next/link";
import type { ReactElement } from "react";
import { PageHeading } from "@/components/admin/AdminShell";
import DailyEventsChart from "@/components/admin/DailyEventsChart";
import EventsTable from "@/components/admin/EventsTable";
import { ErrorNotice } from "@/components/admin/Feedback";
import { Stat, StatSection } from "@/components/admin/StatGrid";
import { requireAdminSession } from "@/lib/admin/auth";
import { formatInr } from "@/lib/admin/format";
import { getAdminOverview } from "@/lib/admin/stats";

/**
 * The owner's dashboard. Read only, every figure counted at request time.
 *
 * ONE NUMBER PER GROUP IS MARKED PRIMARY, and which one is a judgement about
 * what is actually asked: how many invitations exist, what money came in, how
 * many guests there are across all of them. The rest of each group is context
 * for that number. See components/admin/StatGrid.tsx.
 *
 * `force-dynamic` because the whole point of it is to be current. A cached
 * dashboard is a dashboard quietly answering yesterday's question, and the
 * cache would also be a copy of every host's tallies sitting in a store that
 * knows nothing about who is allowed to read it.
 */
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage(): Promise<ReactElement> {
  /*
    Before any query runs. middleware.ts has already refused an unauthenticated
    request, and this is the check that does not depend on a matcher staying
    correct — see the note in lib/admin/auth.ts.
  */
  await requireAdminSession();
  const result = await getAdminOverview();

  if (!result.ok) {
    return (
      <>
        <PageHeading title="Overview" />
        <div className="mt-6">
          <ErrorNotice message={result.error} />
        </div>
      </>
    );
  }

  const { events, guests, byOccasion, dailyEvents, recentEvents } = result.data;

  return (
    <>
      <PageHeading
        title="Overview"
        description="Across every host. Counted live, in Indian Standard Time."
      />

      <StatSection title="Events">
        <Stat label="Total events" value={events.total} emphasis="primary" />
        <Stat label="Today" value={events.today} note="Since IST midnight" />
        <Stat label="Last 7 days" value={events.last7Days} />
        <Stat label="Last 30 days" value={events.last30Days} />
      </StatSection>

      <div className="mt-4">
        <DailyEventsChart days={dailyEvents} />
      </div>

      <StatSection
        title="Revenue"
        /*
          THE CAVEAT BELONGS ON THE GROUP, and it is not a stylistic one. These
          figures are counted over two DIFFERENT populations and can disagree
          by a lot:

            - "Net received" and "discount given" are summed from payments rows
              with status 'paid' — actual captures, actual money.
            - "Paid events" and "gross" count events.is_paid, which is a flag.
              Every event published before Razorpay existed carries it with no
              payment row behind it, and so does anything marked paid by hand.

          So gross is NOT net plus discounts, and a reader who assumes it is
          will conclude money has gone missing. Saying which is which here is
          cheaper than the afternoon that assumption costs.
        */
        description="Received and discount are summed from captured payments. Paid events and gross count the is_paid flag, which also covers invitations published before payments existed, so the two do not reconcile."
      >
        <Stat
          label="Net received"
          value={formatInr(events.netReceivedInr)}
          note="Summed from captured payments"
          emphasis="primary"
        />
        <Stat
          label="Discount given"
          value={formatInr(events.discountGivenInr)}
          note="Across captured payments"
        />
        <Stat
          label="Paid events"
          value={events.paid}
          note="Flagged is_paid"
        />
        <Stat
          label="Gross at list price"
          value={formatInr(events.revenueInr)}
          note="Paid events × ₹999"
        />
      </StatSection>

      <StatSection title="Guests">
        <Stat label="Total guests" value={guests.total} emphasis="primary" />
        <Stat label="Accepted" value={guests.accepted} />
        <Stat label="Declined" value={guests.declined} />
        <Stat label="Maybe" value={guests.maybe} />
        <Stat label="Pending" value={guests.pending} />
        <Stat
          label="Checked in"
          value={guests.checkedIn}
          note="Scanned at a door"
        />
      </StatSection>

      <StatSection title="By event type">
        {/*
          No primary here on purpose. These are peers — the point is the
          distribution across them, and marking one would assert a ranking the
          data has not been asked for.
        */}
        {byOccasion.map((occasion) => (
          <Stat
            key={occasion.id}
            label={occasion.label}
            value={occasion.count}
          />
        ))}
      </StatSection>

      <section className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">
            Latest events
          </h2>
          {/*
            The overview shows a handful and hands off. Searching, filtering and
            paging all live on /admin/events; duplicating them here would be two
            tables to keep in step and two places to look.
          */}
          <Link
            href="/admin/events"
            className="rounded text-sm text-blue-700 underline decoration-transparent underline-offset-2 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          >
            All events →
          </Link>
        </div>

        <div className="mt-3">
          <EventsTable
            events={recentEvents}
            compact
            emptyTitle="No events yet."
            emptyHint="Invitations appear here as hosts create them."
          />
        </div>
      </section>
    </>
  );
}
