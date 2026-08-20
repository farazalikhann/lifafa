"use client";

import { useMemo, useState, type ReactElement } from "react";
import type { Guest, RsvpStatus } from "@/types/guest";

const MAX_MATCHES = 6;

const STATUS_LABEL: Record<RsvpStatus, string> = {
  accepted: "Accepted",
  declined: "Declined",
  maybe: "Maybe",
  pending: "Awaiting",
};

const STATUS_STYLE: Record<RsvpStatus, { color: string; background: string }> = {
  accepted: { color: "#E8A33D", background: "rgba(232, 163, 61, 0.14)" },
  declined: { color: "#C4566B", background: "rgba(196, 86, 107, 0.14)" },
  maybe: { color: "#C99B45", background: "rgba(201, 155, 69, 0.12)" },
  pending: { color: "#A1968A", background: "rgba(161, 150, 138, 0.12)" },
};

function StatusBadge({ status }: { status: RsvpStatus }): ReactElement {
  const style = STATUS_STYLE[status];

  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[0.6875rem] font-medium whitespace-nowrap"
      style={{ color: style.color, backgroundColor: style.background }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Digits only, so "+91 98450 21174" matches a typed "9845". */
function digitsOf(value: string): string {
  return value.replace(/\D/g, "");
}

export default function ManualLookup({
  guests,
  onCheckIn,
}: {
  guests: readonly Guest[];
  onCheckIn: (guestId: string) => void;
}): ReactElement {
  const [query, setQuery] = useState<string>("");

  const trimmed = query.trim();

  const matches = useMemo<readonly Guest[]>(() => {
    if (trimmed.length === 0) {
      return [];
    }

    const lower = trimmed.toLowerCase();
    const digits = digitsOf(trimmed);

    return guests
      .filter((guest) => {
        const byName = guest.name.toLowerCase().includes(lower);
        const byPhone =
          digits.length > 0 && digitsOf(guest.phone).includes(digits);
        return byName || byPhone;
      })
      .slice(0, MAX_MATCHES);
  }, [guests, trimmed]);

  return (
    <section className="flex flex-col gap-3">
      <label
        htmlFor="guest-lookup"
        className="text-sm font-medium text-[var(--lifafa-cream)]"
      >
        Or find a guest by name or phone
      </label>

      <input
        id="guest-lookup"
        type="search"
        inputMode="search"
        autoComplete="off"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Start typing a name or number"
        className="min-h-12 w-full rounded-xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-4 text-base text-[var(--lifafa-cream)] placeholder:text-[var(--lifafa-muted)]/70 focus:border-[var(--lifafa-marigold)] focus:ring-2 focus:ring-[var(--lifafa-marigold)]/30 focus:outline-none"
      />

      {trimmed.length === 0 ? null : matches.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--lifafa-hairline)] px-4 py-8 text-center text-sm text-[var(--lifafa-muted)]">
          No guest matches &ldquo;{trimmed}&rdquo;.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {matches.map((guest) => (
            <li
              key={guest.id}
              className="rounded-2xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)]"
            >
              {guest.checkedIn ? (
                /*
                  Already arrived: the row itself is tappable so the door team
                  can pull up when this guest came in. The muted "Arrived"
                  label stays as the at-a-glance state.
                */
                <button
                  type="button"
                  onClick={() => onCheckIn(guest.id)}
                  className="flex w-full min-h-11 items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors duration-150 hover:bg-[var(--lifafa-hairline)]/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-medium text-[var(--lifafa-cream)]">
                      {guest.name}
                    </span>
                    <span className="mt-1.5 block">
                      <StatusBadge status={guest.rsvp} />
                    </span>
                  </span>
                  <span className="shrink-0 text-sm text-[var(--lifafa-muted)]">
                    Arrived
                  </span>
                </button>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-medium text-[var(--lifafa-cream)]">
                      {guest.name}
                    </p>
                    <div className="mt-1.5">
                      <StatusBadge status={guest.rsvp} />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onCheckIn(guest.id)}
                    className="min-h-11 shrink-0 rounded-xl bg-[var(--lifafa-marigold)] px-4 text-sm font-semibold text-[var(--lifafa-ink)] transition-transform duration-150 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
                  >
                    Check in
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
