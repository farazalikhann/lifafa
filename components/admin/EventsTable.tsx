import Link from "next/link";
import type { ReactElement } from "react";
import { EmptyRow } from "@/components/admin/Feedback";
import { formatIst } from "@/lib/admin/format";
import type { AdminEventSummary } from "@/lib/admin/stats";

/**
 * A list of events, as a table.
 *
 * A SERVER COMPONENT, where the old one was a client component holding sort
 * and filter state. Both moved to the URL — see app/admin/events/page.tsx — so
 * there is nothing left here that needs a browser: this renders rows and
 * nothing else, and the page it sits on decides which rows.
 *
 * Used twice, at two sizes: the compact list on the overview and the full
 * table on /admin/events. The difference is `compact`, which drops the columns
 * that only matter when comparing many rows.
 */
export default function EventsTable({
  events,
  compact = false,
  /** What to say when there are no rows, and what to suggest about it. */
  emptyTitle = "No events yet.",
  emptyHint,
  /** Column header for created-at, so the sortable version can pass a control. */
  createdHeader = "Created",
}: {
  events: readonly AdminEventSummary[];
  compact?: boolean;
  emptyTitle?: string;
  emptyHint?: string;
  createdHeader?: ReactElement | string;
}): ReactElement {
  const columns = compact ? 4 : 6;

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <table
        className={`w-full text-sm ${compact ? "min-w-[480px]" : "min-w-[720px]"}`}
      >
        <thead className="border-b border-zinc-200 bg-zinc-50 text-left">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Event
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Type
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              {createdHeader}
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Paid
            </th>
            {compact ? null : (
              <>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Guests
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Accepted
                </th>
              </>
            )}
          </tr>
        </thead>

        <tbody>
          {events.length === 0 ? (
            <EmptyRow
              colSpan={columns}
              title={emptyTitle}
              hint={emptyHint}
            />
          ) : (
            events.map((event) => (
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
                  {formatIst(event.createdAt)}
                </td>
                <td className="px-4 py-2.5">
                  <PaidPill isPaid={event.isPaid} />
                </td>
                {compact ? null : (
                  <>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {event.guestCount}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {event.acceptedCount}
                    </td>
                  </>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Paid or not, as a dot and a word.
 *
 * BOTH, NEVER JUST THE DOT. A colour alone fails for anyone who cannot
 * distinguish green from grey, and it fails for everyone on a printout. The
 * dot is what makes a column of fifty rows scannable; the word is what makes
 * any single row unambiguous.
 */
export function PaidPill({ isPaid }: { isPaid: boolean }): ReactElement {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
        isPaid ? "bg-green-100 text-green-800" : "bg-zinc-100 text-zinc-600"
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${
          isPaid ? "bg-green-600" : "bg-zinc-400"
        }`}
      />
      {isPaid ? "Paid" : "Unpaid"}
    </span>
  );
}
