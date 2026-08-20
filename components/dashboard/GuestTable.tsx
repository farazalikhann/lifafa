"use client";

import { useMemo, useState, type ReactElement } from "react";
import type { Guest, RsvpStatus } from "@/types/guest";

type Filter = "all" | RsvpStatus;

const FILTERS: readonly { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "accepted", label: "Accepted" },
  { id: "declined", label: "Declined" },
  { id: "maybe", label: "Maybe" },
  { id: "pending", label: "Awaiting" },
];

const STATUS_LABEL: Record<RsvpStatus, string> = {
  accepted: "Accepted",
  declined: "Declined",
  maybe: "Maybe",
  pending: "Awaiting",
};

/** Badge colours, kept as inline styles so they can sit outside the tokens. */
const STATUS_STYLE: Record<RsvpStatus, { color: string; background: string }> = {
  accepted: {
    color: "#E8A33D",
    background: "rgba(232, 163, 61, 0.14)",
  },
  declined: {
    color: "#C4566B",
    background: "rgba(196, 86, 107, 0.14)",
  },
  maybe: {
    color: "#C99B45",
    background: "rgba(201, 155, 69, 0.12)",
  },
  pending: {
    color: "#A1968A",
    background: "rgba(161, 150, 138, 0.12)",
  },
};

function StatusBadge({ status }: { status: RsvpStatus }): ReactElement {
  const style = STATUS_STYLE[status];

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[0.6875rem] font-medium whitespace-nowrap"
      style={{ color: style.color, backgroundColor: style.background }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Marigold tick when checked in, hollow circle when not. */
function CheckedInMark({ checkedIn }: { checkedIn: boolean }): ReactElement {
  return (
    <svg
      viewBox="0 0 20 20"
      role="img"
      aria-label={checkedIn ? "Checked in" : "Not checked in"}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={
        checkedIn
          ? "h-[18px] w-[18px] text-[var(--lifafa-marigold)]"
          : "h-[18px] w-[18px] text-[var(--lifafa-hairline)]"
      }
    >
      {checkedIn ? (
        <path d="M4 10.5 L8 14.5 L16 5.5" />
      ) : (
        <circle cx={10} cy={10} r={6} />
      )}
    </svg>
  );
}

function bringingLabel(count: number): string {
  return count === 0 ? "—" : `+${count}`;
}

export default function GuestTable({
  guests,
}: {
  guests: readonly Guest[];
}): ReactElement {
  const [filter, setFilter] = useState<Filter>("all");

  /** Counts for the pill labels, derived rather than stored. */
  const counts = useMemo<Record<Filter, number>>(
    () => ({
      all: guests.length,
      accepted: guests.filter((g) => g.rsvp === "accepted").length,
      declined: guests.filter((g) => g.rsvp === "declined").length,
      maybe: guests.filter((g) => g.rsvp === "maybe").length,
      pending: guests.filter((g) => g.rsvp === "pending").length,
    }),
    [guests],
  );

  /**
   * Filter, then push everyone still awaiting a reply to the bottom. Array sort
   * is stable, so guests who have replied keep their original order.
   */
  const visible = useMemo<readonly Guest[]>(() => {
    const matching =
      filter === "all"
        ? [...guests]
        : guests.filter((guest) => guest.rsvp === filter);

    return [...matching].sort(
      (a, b) =>
        (a.rsvp === "pending" ? 1 : 0) - (b.rsvp === "pending" ? 1 : 0),
    );
  }, [guests, filter]);

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((option) => {
          const isSelected = option.id === filter;

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setFilter(option.id)}
              className={[
                "rounded-full border px-3.5 py-2 text-[0.8125rem] font-medium transition-colors duration-150",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]",
                isSelected
                  ? "border-transparent bg-[var(--lifafa-marigold)] text-[var(--lifafa-ink)]"
                  : "border-[var(--lifafa-hairline)] text-[var(--lifafa-muted)] hover:text-[var(--lifafa-cream)]",
              ].join(" ")}
            >
              {option.label}{" "}
              <span className="tabular-nums opacity-70">{counts[option.id]}</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--lifafa-hairline)] px-6 py-14 text-center">
          <p className="text-sm text-[var(--lifafa-cream)]">
            No guests in this list yet.
          </p>
          <p className="mt-2 text-xs text-[var(--lifafa-muted)]">
            Try another filter to see the rest of your guest list.
          </p>
        </div>
      ) : (
        <>
          {/* Table from 768px up */}
          <div className="hidden overflow-hidden rounded-2xl border border-[var(--lifafa-hairline)] md:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-[var(--lifafa-ink-raised)]">
                  {["Guest", "Phone", "Reply", "Bringing", "Checked in"].map(
                    (heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="px-4 py-3 text-[0.6875rem] font-medium tracking-[0.16em] text-[var(--lifafa-muted)] uppercase"
                      >
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {visible.map((guest) => (
                  <tr
                    key={guest.id}
                    className="border-t border-[var(--lifafa-hairline)]"
                  >
                    <td className="px-4 py-3.5 text-sm font-medium text-[var(--lifafa-cream)]">
                      {guest.name}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-[var(--lifafa-muted)] tabular-nums">
                      {guest.phone}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={guest.rsvp} />
                    </td>
                    <td className="px-4 py-3.5 text-sm text-[var(--lifafa-cream)] tabular-nums">
                      {bringingLabel(guest.accompanyingCount)}
                    </td>
                    <td className="px-4 py-3.5">
                      <CheckedInMark checkedIn={guest.checkedIn} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Stacked cards below 768px */}
          <ul className="flex flex-col gap-3 md:hidden">
            {visible.map((guest) => (
              <li
                key={guest.id}
                className="rounded-2xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-base font-medium text-[var(--lifafa-cream)]">
                    {guest.name}
                  </p>
                  <StatusBadge status={guest.rsvp} />
                </div>

                <dl className="mt-3 flex flex-col gap-1.5 text-[0.8125rem]">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-[var(--lifafa-muted)]">Phone</dt>
                    <dd className="text-[var(--lifafa-cream)] tabular-nums">
                      {guest.phone}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-[var(--lifafa-muted)]">Bringing</dt>
                    <dd className="text-[var(--lifafa-cream)] tabular-nums">
                      {bringingLabel(guest.accompanyingCount)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-[var(--lifafa-muted)]">Checked in</dt>
                    <dd>
                      <CheckedInMark checkedIn={guest.checkedIn} />
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
