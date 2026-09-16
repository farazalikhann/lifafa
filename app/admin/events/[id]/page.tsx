import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import { Stat, StatSection } from "@/components/admin/StatGrid";
import { requireAdminSession } from "@/lib/admin/auth";
import { getAdminEventDetail, type AdminGuest } from "@/lib/admin/stats";
import type { RsvpStatus } from "@/types/guest";

/**
 * One event in full, with its guest list. Read only.
 *
 * NO CONTROLS, AND THAT IS THE STEP. There is no edit, no delete, no refund
 * and no way to mark anything paid from here. A dashboard that can only look
 * is a dashboard whose worst bug is a wrong number on a screen.
 *
 * The guest list shows names and phone numbers, which are a host's guests'
 * details and not the owner's to browse idly. They are here because support —
 * "a guest says their RSVP did not save" — cannot be answered without them.
 */
export const dynamic = "force-dynamic";

const DATE_FORMAT = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

function formatTimestamp(iso: string | null): string {
  if (iso === null) {
    return "—";
  }

  const parsed = new Date(iso);

  return Number.isNaN(parsed.getTime()) ? "—" : DATE_FORMAT.format(parsed);
}

/** One labelled line in the details panel. */
function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): ReactElement {
  return (
    <div className="border-b border-zinc-100 px-4 py-2.5 last:border-b-0 sm:grid sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-sm break-words sm:mt-0">{children}</dd>
    </div>
  );
}

const RSVP_STYLES: Record<RsvpStatus, string> = {
  accepted: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  maybe: "bg-amber-100 text-amber-800",
  pending: "bg-zinc-100 text-zinc-600",
};

function RsvpBadge({ status }: { status: RsvpStatus }): ReactElement {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${RSVP_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

function GuestRow({ guest }: { guest: AdminGuest }): ReactElement {
  return (
    <tr className="border-b border-zinc-100 last:border-b-0">
      <td className="px-4 py-2.5 font-medium">{guest.name}</td>
      <td className="px-4 py-2.5 whitespace-nowrap text-zinc-600 tabular-nums">
        {guest.phone.length === 0 ? "—" : guest.phone}
      </td>
      <td className="px-4 py-2.5">
        <RsvpBadge status={guest.rsvp} />
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums">
        {/*
          The party size as a guest would describe it: themselves plus whoever
          they are bringing. accompanying_count alone reads as "0 people" for
          someone who is certainly coming.
        */}
        {guest.rsvp === "accepted" ? 1 + guest.accompanyingCount : "—"}
      </td>
      <td className="px-4 py-2.5 whitespace-nowrap text-zinc-600">
        {formatTimestamp(guest.respondedAt)}
      </td>
      <td className="px-4 py-2.5 whitespace-nowrap">
        {guest.checkedIn ? (
          <span className="text-green-700">
            {formatTimestamp(guest.checkedInAt)}
          </span>
        ) : (
          <span className="text-zinc-400">Not checked in</span>
        )}
      </td>
      <td className="max-w-[260px] px-4 py-2.5 text-zinc-600">
        {guest.message === null || guest.message.length === 0
          ? "—"
          : guest.message}
      </td>
    </tr>
  );
}

export default async function AdminEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<ReactElement> {
  const session = await requireAdminSession();
  const { id } = await params;
  const result = await getAdminEventDetail(id);

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

  const event = result.data;

  if (event === null) {
    return (
      <>
        <AdminHeader username={session.username} />
        <main className="mx-auto max-w-6xl px-5 py-10">
          <p className="text-sm text-zinc-600">
            No event with that id. It may have been deleted.
          </p>
          <Link
            href="/admin"
            className="mt-4 inline-block rounded text-sm text-blue-700 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          >
            Back to the overview
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <AdminHeader username={session.username} />

      <main className="mx-auto max-w-6xl px-5 py-8">
        <Link
          href="/admin"
          className="rounded text-sm text-blue-700 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
        >
          ← Overview
        </Link>

        <h1 className="mt-3 text-xl font-semibold tracking-tight">
          {event.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {event.occasionLabel} · created {formatTimestamp(event.createdAt)}
        </p>

        <StatSection title="Replies">
          <Stat label="Total replies" value={event.tally.total} />
          <Stat label="Accepted" value={event.tally.accepted} />
          <Stat label="Declined" value={event.tally.declined} />
          <Stat label="Maybe" value={event.tally.maybe} />
          <Stat label="Pending" value={event.tally.pending} />
          <Stat
            label="Headcount"
            value={event.tally.headcount}
            note="Acceptances plus their guests"
          />
          <Stat label="Checked in" value={event.tally.checkedIn} />
        </StatSection>

        <section className="mt-8">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">
            Event
          </h2>

          <dl className="mt-3 rounded-lg border border-zinc-200 bg-white">
            <Field label="Event id">
              <code className="text-xs">{event.id}</code>
            </Field>
            <Field label="Host id">
              <code className="text-xs">{event.hostId}</code>
            </Field>
            <Field label="Invite code">
              <code className="text-xs">{event.inviteCode}</code>
            </Field>
            <Field label="Paid">
              {event.isPaid ? "Yes" : "No"}
              {event.paymentId === null ? null : (
                <span className="text-zinc-500"> · {event.paymentId}</span>
              )}
            </Field>
            <Field label="Date and time">
              {event.eventDate.length === 0 ? "—" : event.eventDate}
              {event.eventTime.length === 0 ? "" : ` at ${event.eventTime}`}
            </Field>
            <Field label="Venue">
              {event.venueName.length === 0 ? "—" : event.venueName}
              {event.venueAddress.length === 0 ? null : (
                <span className="text-zinc-500"> · {event.venueAddress}</span>
              )}
            </Field>
            <Field label="Other functions">{event.subEventCount}</Field>
            <Field label="Language">{event.language}</Field>
            <Field label="Tradition">{event.traditionId}</Field>
            <Field label="Cover animation">
              {event.coverAnimation ?? "—"}
            </Field>
            <Field label="Weather shown">
              {event.showWeather ? "Yes" : "No"}
            </Field>
            <Field label="QR check-in">
              {event.qrCheckinEnabled ? "On" : "Off"}
            </Field>
            <Field label="Last updated">
              {formatTimestamp(event.updatedAt)}
            </Field>
          </dl>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">
            Guests ({event.guests.length})
          </h2>

          <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-left">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Name
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Phone
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    RSVP
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-right font-medium"
                  >
                    Party
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Replied
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Checked in
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Message
                  </th>
                </tr>
              </thead>

              <tbody>
                {event.guests.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-zinc-500"
                    >
                      No replies yet.
                    </td>
                  </tr>
                ) : (
                  event.guests.map((guest) => (
                    <GuestRow key={guest.id} guest={guest} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
