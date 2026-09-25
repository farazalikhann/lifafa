import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import ActivateFreeButton from "@/components/admin/ActivateFreeButton";
import { PageHeading } from "@/components/admin/AdminShell";
import { PaidPill } from "@/components/admin/EventsTable";
import { EmptyState, ErrorNotice } from "@/components/admin/Feedback";
import GuestTable from "@/components/admin/GuestTable";
import { Stat, StatSection } from "@/components/admin/StatGrid";
import {
  resetEventChangeCounts,
  unlockEventEditing,
} from "@/app/admin/events/actions";
import { requireAdminSession } from "@/lib/admin/auth";
import { formatCount, formatIst, formatPaise } from "@/lib/admin/format";
import { getAdminEventDetail, type AdminEventDetail } from "@/lib/admin/stats";
import {
  ADMIN_UNLOCK_HOURS,
  DATE_CHANGE_LIMIT,
  NAME_CHANGE_LIMIT,
  isUnlocked,
} from "@/lib/eventLock";

/**
 * One event in full, with its guest list. Read only.
 *
 * NO CONTROLS, AND THAT IS THE STEP. There is no edit, no delete, no refund
 * and no way to mark anything paid from here. A dashboard that can only look
 * is a dashboard whose worst bug is a wrong number on a screen.
 *
 * THE EXCEPTIONS are the lock after the event (lib/eventLock.ts): unlocking
 * an ended invitation for ADMIN_UNLOCK_HOURS, and giving a paid invitation its
 * date and name changes back. Both are support's answer to "our event moved",
 * and neither touches the card, the guests or any money. See EditingPanel.
 * And activating an unpaid invitation for free, which records a ₹0
 * complimentary payment and moves no money. See ActivateFreeButton.
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

/** How the invitation was paid for, in one line. */
function describePayment(payment: NonNullable<AdminEventDetail["payment"]>): string {
  const when = payment.paidAt === null ? "" : ` · ${formatIst(payment.paidAt)}`;

  switch (payment.method) {
    case "complimentary":
      return `Complimentary, ₹0 received · ${payment.reason ?? "no reason"} · by ${payment.grantedBy ?? "unknown"}${when}`;
    case "coupon":
      return `Free with coupon ${payment.couponCode ?? "?"}, ₹0 received${when}`;
    case "razorpay":
      return `Razorpay, ${formatPaise(payment.amountPaise)}${
        payment.couponCode === null ? "" : ` with coupon ${payment.couponCode}`
      }${when}`;
  }
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

/**
 * Where the invitation stands with the lock and its change limits, and the
 * admin's two overrides of them. Posts to app/admin/events/actions.ts.
 */
function EditingPanel({ event }: { event: AdminEventDetail }): ReactElement {
  const { lock } = event;
  const unlocked = isUnlocked(lock.editUnlockedUntil);
  const status = !event.isPaid
    ? "Unpaid: no lock and no limits"
    : lock.ended
      ? unlocked
        ? `Ended, unlocked until ${formatIst(lock.editUnlockedUntil ?? "")}`
        : "Ended: locked"
      : "Paid: editable";
  const button =
    "min-h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900";

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">
        Editing
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Status" value={status} />
        <Stat label="End date" value={lock.endDate ?? "No date"} />
        <Stat
          label="Date changes used"
          value={`${lock.dateChangeCount} of ${DATE_CHANGE_LIMIT}`}
          note={
            lock.originalEndDate === null
              ? undefined
              : `Paid with end date ${lock.originalEndDate}`
          }
        />
        <Stat
          label="Name changes used"
          value={`${lock.nameChangeCount} of ${NAME_CHANGE_LIMIT}`}
        />
      </dl>
      {event.isPaid ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {lock.ended ? (
            <form action={unlockEventEditing}>
              <input type="hidden" name="eventId" value={event.id} />
              <button type="submit" className={button}>
                Unlock editing for {ADMIN_UNLOCK_HOURS} hours
              </button>
            </form>
          ) : null}
          <form action={resetEventChangeCounts}>
            <input type="hidden" name="eventId" value={event.id} />
            <button type="submit" className={button}>
              Reset date and name changes
            </button>
          </form>
        </div>
      ) : null}
    </section>
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

      {event.isPaid ? null : (
        <section className="mt-8">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">
            Activation
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            Unpaid. Guests cannot open it until the host pays, or you activate
            it for free.
          </p>
          <div className="mt-3">
            <ActivateFreeButton eventId={event.id} />
          </div>
        </section>
      )}

      <EditingPanel event={event} />

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
          {event.payment === null ? null : (
            <Field label="Paid with">{describePayment(event.payment)}</Field>
          )}
          <Field label="Date and time">
            {event.eventDate.length === 0 ? "–" : event.eventDate}
            {event.eventTime.length === 0 ? "" : ` at ${event.eventTime}`}
          </Field>
          <Field label="Venue">
            {event.venueName.length === 0 ? "–" : event.venueName}
            {event.venueAddress.length === 0 ? null : (
              <span className="text-zinc-500"> · {event.venueAddress}</span>
            )}
          </Field>
          <Field label="Other functions">{event.subEventCount}</Field>
          <Field label="Language">{event.language}</Field>
          <Field label="Tradition">{event.traditionId}</Field>
          <Field label="Cover animation">{event.coverAnimation ?? "–"}</Field>
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
