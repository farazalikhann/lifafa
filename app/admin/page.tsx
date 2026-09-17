import type { ReactElement } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import RecentEventsTable from "@/components/admin/RecentEventsTable";
import { Stat, StatSection } from "@/components/admin/StatGrid";
import { requireAdminSession } from "@/lib/admin/auth";
import { getAdminOverview } from "@/lib/admin/stats";
import { formatInr } from "@/lib/pricing";

/**
 * The owner's dashboard. Read only, every figure counted at request time.
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
  const session = await requireAdminSession();
  const result = await getAdminOverview();

  if (!result.ok) {
    return (
      <>
        <AdminHeader username={session.username} />
        <main className="mx-auto max-w-6xl px-5 py-10">
          <p
            role="alert"
            className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {result.error}
          </p>
        </main>
      </>
    );
  }

  const { events, guests, byOccasion, recentEvents } = result.data;

  return (
    <>
      <AdminHeader username={session.username} />

      <main className="mx-auto max-w-6xl px-5 py-8">
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Across every host. Counted live, in Indian Standard Time.
        </p>

        <StatSection title="Events">
          <Stat label="Total events" value={events.total} />
          <Stat label="Today" value={events.today} note="Since IST midnight" />
          <Stat label="Last 7 days" value={events.last7Days} />
          <Stat label="Last 30 days" value={events.last30Days} />
        </StatSection>

        <StatSection title="Revenue">
          <Stat label="Paid events" value={events.paid} />
          <Stat
            label="Net received"
            value={formatInr(events.netReceivedInr)}
            /*
              The figure to trust, and named so it is not mistaken for the one
              below it. Summed from what each captured payment actually charged,
              so it stays right through a discount and through a price change.
            */
            note="Summed from captured payments"
          />
          <Stat
            label="Discount given"
            value={formatInr(events.discountGivenInr)}
            note="Across all captured payments"
          />
          <Stat
            label="Gross at list price"
            value={formatInr(events.revenueInr)}
            /*
              Kept, and labelled for what it is. Paid events times ₹999 answers
              "what would these have been worth at full price", which is what a
              coupon's cost is measured against — but it is not what arrived,
              and a tile reading "Total revenue" would have started lying the
              day the first code was used.
            */
            note="Paid events × ₹999. Before discounts."
          />
          <Stat
            label="Unpaid events"
            value={events.total - events.paid}
            note="Not published"
          />
        </StatSection>

        <StatSection title="Guests">
          <Stat label="Total guests" value={guests.total} />
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
          {byOccasion.map((occasion) => (
            <Stat
              key={occasion.id}
              label={occasion.label}
              value={occasion.count}
            />
          ))}
        </StatSection>

        <RecentEventsTable events={recentEvents} />
      </main>
    </>
  );
}
