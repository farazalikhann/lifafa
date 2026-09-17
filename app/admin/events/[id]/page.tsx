import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import { PageHeading } from "@/components/admin/AdminShell";
import { PaidPill } from "@/components/admin/EventsTable";
import { EmptyState, ErrorNotice } from "@/components/admin/Feedback";
import GuestTable from "@/components/admin/GuestTable";
import { Stat, StatSection } from "@/components/admin/StatGrid";
import { requireAdminSession } from "@/lib/admin/auth";
import { formatCount, formatIst } from "@/lib/admin/format";
import { getAdminEventDetail } from "@/lib/admin/stats";

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

/** Back to the list, in the place every detail page keeps it. */
function BackLink(): ReactElement {
  return (
    <Link
      href="/admin/events"
      className="rounded text-sm text-blue-700 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
    >
      ← All events
    </Link>
  );
}

export default async function AdminEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<ReactElement> {
  await requireAdminSession();
  const { id } = await params;
  const result = await getAdminEventDetail(id);

  if (!result.ok) {
    return (
      <>
        <BackLink />
        <div className="mt-4">
          <ErrorNotice message={result.error} />
        </div>
      </>
    );
  }

  const event = result.data;

  if (event === null) {
    return (
      <>
        <BackLink />
        <div className="mt-4">
          <EmptyState
            title="No event with that id."
            hint="It may have been deleted, or the link may be mistyped."
          />
        </div>
      </>
    );
  }

  return (
    <>
      <BackLink />

      <div className="mt-3">
        <PageHeading
          title={event.title}
          description={`${event.occasionLabel} · created ${formatIst(event.createdAt)}`}
          aside={<PaidPill isPaid={event.isPaid} />}
        />
      </div>

      <StatSection title="Replies">
        {/*
          Headcount is the primary figure, not "total replies". A caterer, a
          venue and the host all ask the same question — how many people are
          turning up — and that is acceptances plus the people they are
          bringing, which is a different number from how many forms came back.
        */}
        <Stat
          label="Headcount"
          value={event.tally.headcount}
          note="Acceptances plus their guests"
          emphasis="primary"
        />
        <Stat label="Total replies" value={event.tally.total} />
        <Stat label="Accepted" value={event.tally.accepted} />
        <Stat label="Declined" value={event.tally.declined} />
        <Stat label="Maybe" value={event.tally.maybe} />
        <Stat label="Pending" value={event.tally.pending} />
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
          <Field label="Cover animation">{event.coverAnimation ?? "—"}</Field>
          <Field label="Weather shown">{event.showWeather ? "Yes" : "No"}</Field>
          <Field label="QR check-in">
            {event.qrCheckinEnabled ? "On" : "Off"}
          </Field>
          <Field label="Last updated">{formatIst(event.updatedAt)}</Field>
        </dl>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">
            Guests
          </h2>
          {/*
            The summary above the table, in words rather than as a second row of
            tiles. The tiles have already given the breakdown; this is the one
            line that says what is in the table directly beneath it.
          */}
          <p className="text-xs text-zinc-500">
            {formatCount(event.tally.total)}{" "}
            {event.tally.total === 1 ? "reply" : "replies"} ·{" "}
            {formatCount(event.tally.accepted)} accepted ·{" "}
            {formatCount(event.tally.checkedIn)} checked in ·{" "}
            {formatCount(event.tally.headcount)} expected at the door
          </p>
        </div>

        <div className="mt-3">
          <GuestTable guests={event.guests} />
        </div>
      </section>
    </>
  );
}
