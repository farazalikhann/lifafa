"use client";

import Link from "next/link";
import { useMemo, useState, type ReactElement } from "react";
import type { AdminEventSummary } from "@/lib/admin/stats";

/**
 * The fifty most recent events, sortable by date and filterable by paid state.
 *
 * SORTED AND FILTERED IN THE BROWSER, over a list the server already sent.
 * Fifty rows is small enough that a round trip per click would be slower than
 * the click, and — the part that matters more — sorting on the server would
 * mean taking a sort key from the URL and feeding it into a query built with
 * the service role key. Keeping the interaction here means the browser never
 * gets to influence what is read out of the database at all.
 */

type SortDirection = "newest" | "oldest";
type PaidFilter = "all" | "paid" | "unpaid";

/**
 * A date a person can scan, in Indian Standard Time.
 *
 * The timezone is named rather than left to the browser, so the dates in this
 * table agree with the "created today" figure above it — which is counted from
 * IST midnight. A dashboard whose two halves disagree about what day it is, by
 * five and a half hours, is a dashboard nobody trusts twice.
 */
const DATE_FORMAT = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

function formatDate(iso: string): string {
  const parsed = new Date(iso);

  return Number.isNaN(parsed.getTime()) ? "—" : DATE_FORMAT.format(parsed);
}

export default function RecentEventsTable({
  events,
}: {
  events: readonly AdminEventSummary[];
}): ReactElement {
  const [sort, setSort] = useState<SortDirection>("newest");
  const [paid, setPaid] = useState<PaidFilter>("all");

  const rows = useMemo(() => {
    const filtered = events.filter((event) => {
      if (paid === "paid") {
        return event.isPaid;
      }

      if (paid === "unpaid") {
        return !event.isPaid;
      }

      return true;
    });

    /*
      A copy before the sort. `events` is a prop, and sorting in place would
      mutate the array React handed down — which survives until the next render
      and then quietly produces a different order than the one just asked for.
    */
    return [...filtered].sort((a, b) => {
      const difference =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

      return sort === "newest" ? -difference : difference;
    });
  }, [events, paid, sort]);

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">
          Recent events
        </h2>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-zinc-500">Paid</span>
            <select
              value={paid}
              onChange={(event) => setPaid(event.target.value as PaidFilter)}
              className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm focus:outline-2 focus:outline-offset-2 focus:outline-zinc-900"
            >
              <option value="all">All</option>
              <option value="paid">Paid only</option>
              <option value="unpaid">Unpaid only</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <span className="text-zinc-500">Created</span>
            <select
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as SortDirection)
              }
              className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm focus:outline-2 focus:outline-offset-2 focus:outline-zinc-900"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
        </div>
      </div>

      <p className="mt-2 text-xs text-zinc-500">
        Showing {rows.length} of {events.length} most recent events.
      </p>

      <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Event
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Type
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Created
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Paid
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">
                Guests
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">
                Accepted
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  {events.length === 0
                    ? "No events yet."
                    : "No events match this filter."}
                </td>
              </tr>
            ) : (
              rows.map((event) => (
                <tr
                  key={event.id}
                  className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50"
                >
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/admin/events/${event.id}`}
                      className="rounded font-medium text-blue-700 underline decoration-transparent underline-offset-2 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                    >
                      {event.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-600">
                    {event.occasionLabel}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-zinc-600">
                    {formatDate(event.createdAt)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={
                        event.isPaid
                          ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                          : "rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600"
                      }
                    >
                      {event.isPaid ? "Paid" : "Unpaid"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {event.guestCount}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {event.acceptedCount}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
