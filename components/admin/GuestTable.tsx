import type { ReactElement } from "react";
import { EmptyRow } from "@/components/admin/Feedback";
import { formatCount, formatIst } from "@/lib/admin/format";
import type { AdminGuest } from "@/lib/admin/stats";
import type { RsvpStatus } from "@/types/guest";

/**
 * One event's guest list. Read only — no edit, no delete, no resend.
 *
 * THE COLUMNS ARE THE ASK: name, RSVP, accompanying count, checked in. Phone,
 * replied-at and the guest's message are kept beside them because the reason
 * this table exists at all is support — "a guest says their RSVP did not save"
 * cannot be answered without the number they typed it against.
 *
 * ACCOMPANYING COUNT IS SHOWN AS ITSELF, with the party total beside it. The
 * previous version showed only `1 + accompanyingCount`, which is what a
 * caterer wants and hides the column that was actually asked for — and made a
 * guest who is coming alone read as "1" in a column headed by a word that
 * means "extra people".
 */
export default function GuestTable({
  guests,
}: {
  guests: readonly AdminGuest[];
}): ReactElement {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <table className="w-full min-w-[880px] text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-left">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Name
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              RSVP
            </th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">
              Accompanying
            </th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">
              Party
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Checked in
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Phone
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Replied
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Message
            </th>
          </tr>
        </thead>

        <tbody>
          {guests.length === 0 ? (
            <EmptyRow
              colSpan={8}
              title="No replies yet."
              hint="Guests appear here as they respond to the invitation."
            />
          ) : (
            guests.map((guest) => <GuestRow key={guest.id} guest={guest} />)
          )}
        </tbody>
      </table>
    </div>
  );
}

const RSVP_STYLES: Record<RsvpStatus, { pill: string; dot: string }> = {
  accepted: { pill: "bg-green-100 text-green-800", dot: "bg-green-600" },
  declined: { pill: "bg-red-100 text-red-800", dot: "bg-red-600" },
  maybe: { pill: "bg-amber-100 text-amber-800", dot: "bg-amber-600" },
  pending: { pill: "bg-zinc-100 text-zinc-600", dot: "bg-zinc-400" },
};

/**
 * An RSVP state, as a dot and a word.
 *
 * Both, never just the dot — a colour alone fails for anyone who cannot tell
 * green from amber, and on a printout. The dot makes a column of two hundred
 * rows scannable; the word makes any single row unambiguous.
 */
export function RsvpBadge({ status }: { status: RsvpStatus }): ReactElement {
  const style = RSVP_STYLES[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${style.pill}`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${style.dot}`}
      />
      {status}
    </span>
  );
}

function GuestRow({ guest }: { guest: AdminGuest }): ReactElement {
  /*
    Only an acceptance has a party size worth stating. A declined guest's
    accompanying count is a number they typed before changing their mind, and
    printing it in a column a caterer reads would be adding it to the headcount
    by implication.
  */
  const attending = guest.rsvp === "accepted";

  return (
    <tr className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50">
      <td className="px-4 py-2.5 font-medium">{guest.name}</td>
      <td className="px-4 py-2.5">
        <RsvpBadge status={guest.rsvp} />
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums text-zinc-600">
        {attending ? formatCount(guest.accompanyingCount) : "—"}
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums">
        {attending ? formatCount(1 + guest.accompanyingCount) : "—"}
      </td>
      <td className="px-4 py-2.5 whitespace-nowrap">
        {guest.checkedIn ? (
          <span className="text-green-700">
            {formatIst(guest.checkedInAt)}
          </span>
        ) : (
          <span className="text-zinc-400">No</span>
        )}
      </td>
      <td className="px-4 py-2.5 whitespace-nowrap text-zinc-600 tabular-nums">
        {guest.phone.length === 0 ? "—" : guest.phone}
      </td>
      <td className="px-4 py-2.5 whitespace-nowrap text-zinc-600">
        {formatIst(guest.respondedAt)}
      </td>
      <td className="max-w-[260px] px-4 py-2.5 text-zinc-600">
        {guest.message === null || guest.message.length === 0
          ? "—"
          : guest.message}
      </td>
    </tr>
  );
}
