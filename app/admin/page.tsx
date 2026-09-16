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
            label="Total revenue"
            value={formatInr(events.revenueInr)}
            /*
              Said on the tile rather than only in a comment. There is no amount
              column and no payment webhook yet, so this figure is arithmetic on
              a flag — and an owner reading a revenue number deserves to know
              which kind of number it is before they act on it.
            */
            note="Paid events × ₹999. Derived, not recorded."
          />
          <Stat
            label="Unpaid events"
            value={events.total - events.paid}
            note="Watermarked cards"
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
