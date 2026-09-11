"use client";

import { useMemo, useState, type ReactElement } from "react";
import { formatArrivalTime } from "@/lib/checkinPass";
import type { Guest, RsvpStatus } from "@/types/guest";

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

/** Alphabetical, the way a name is looked for when someone is standing in front of you. */
function byName(a: Guest, b: Guest): number {
  return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
}

/**
 * The whole guest list, by name, with a one-tap check-in on every row.
 *
 * The camera's fallback and its equal: it needs nothing from the scanner, so it
 * keeps working when camera permission is refused, the page is not on https,
 * or a guest's phone screen is cracked. Every guest is listed from the start
 * rather than only after typing, so the door can see at a glance who is in; the
 * search box narrows it by name or by any run of digits from a phone number.
 */
export default function ManualLookup({
  guests,
  onCheckIn,
  busy = false,
}: {
  guests: readonly Guest[];
  onCheckIn: (guestId: string) => void;
  /** A check-in is in flight; the buttons wait for it rather than stacking. */
  busy?: boolean;
}): ReactElement {
  const [query, setQuery] = useState<string>("");
  const trimmed = query.trim();

  const shown = useMemo<readonly Guest[]>(() => {
    const sorted = [...guests].sort(byName);

    if (trimmed.length === 0) {
      return sorted;
    }

    const lower = trimmed.toLowerCase();
    const digits = digitsOf(trimmed);

    return sorted.filter((guest) => {
      const matchesName = guest.name.toLowerCase().includes(lower);
      const matchesPhone =
        digits.length > 0 && digitsOf(guest.phone).includes(digits);
      return matchesName || matchesPhone;
    });
  }, [guests, trimmed]);

  const arrivedCount = guests.filter((guest) => guest.checkedIn).length;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor="guest-lookup"
          className="text-sm font-medium text-[var(--lifafa-cream)]"
        >
          Find a guest by name
        </label>
        <p className="text-xs text-[var(--lifafa-muted)] tabular-nums">
          {arrivedCount} of {guests.length} in
        </p>
      </div>

      <input
        id="guest-lookup"
        type="search"
        inputMode="search"
        autoComplete="off"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Type a name or phone number"
        className="min-h-12 w-full rounded-xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-4 text-base text-[var(--lifafa-cream)] placeholder:text-[var(--lifafa-muted)]/70 focus:border-[var(--lifafa-marigold)] focus:ring-2 focus:ring-[var(--lifafa-marigold)]/30 focus:outline-none"
      />

      {guests.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--lifafa-hairline)] px-4 py-8 text-center text-sm text-[var(--lifafa-muted)]">
          Nobody has replied yet.
        </p>
      ) : shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--lifafa-hairline)] px-4 py-8 text-center text-sm text-[var(--lifafa-muted)]">
          No guest matches &ldquo;{trimmed}&rdquo;.
        </p>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Guests">
          {shown.map((guest) => {
            const arrivedAt = formatArrivalTime(guest.checkedInAt);

            return (
              <li
                key={guest.id}
                className="rounded-2xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)]"
              >
                {guest.checkedIn ? (
                  /*
                    Already in: the whole row is tappable, so the door can pull up
                    when this guest arrived. No check-in button, so nobody can
                    stamp a second arrival time over the first.
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
                      <span className="mt-1.5 flex items-center gap-2">
                        <StatusBadge status={guest.rsvp} />
                        {guest.accompanyingCount > 0 ? (
                          <span className="text-xs text-[var(--lifafa-muted)]">
                            +{guest.accompanyingCount}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-sm text-[var(--lifafa-marigold)]">
                      Checked in
                      {arrivedAt !== null ? (
                        <span className="block text-xs text-[var(--lifafa-muted)]">
                          {arrivedAt}
                        </span>
                      ) : null}
                    </span>
                  </button>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-medium text-[var(--lifafa-cream)]">
                        {guest.name}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <StatusBadge status={guest.rsvp} />
                        {guest.accompanyingCount > 0 ? (
                          <span className="text-xs text-[var(--lifafa-muted)]">
                            +{guest.accompanyingCount}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onCheckIn(guest.id)}
                      disabled={busy}
                      aria-label={`Check in ${guest.name}`}
                      className="min-h-11 shrink-0 rounded-xl bg-[var(--lifafa-marigold)] px-4 text-sm font-semibold text-[var(--lifafa-ink)] transition-transform duration-150 enabled:hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] disabled:cursor-wait disabled:opacity-60"
                    >
                      Check in
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
