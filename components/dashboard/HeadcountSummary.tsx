import type { ReactElement } from "react";
import type { Guest, RsvpStatus } from "@/types/guest";

/**
 * Every figure here is derived from the guest array — nothing is hardcoded.
 * The headcount counts each accepted guest plus the people they are bringing.
 * "Maybe" replies are deliberately excluded so the number stays a number the
 * host can hand to a caterer.
 */
function countBy(guests: readonly Guest[], status: RsvpStatus): number {
  return guests.filter((guest) => guest.rsvp === status).length;
}

function expectedHeadcount(guests: readonly Guest[]): number {
  return guests
    .filter((guest) => guest.rsvp === "accepted")
    .reduce((total, guest) => total + 1 + guest.accompanyingCount, 0);
}

interface Tile {
  label: string;
  count: number;
  /** Inline colour so each tile can carry its own accent. */
  color: string;
}

const AMBER = "#C99B45";

function StatTile({ tile }: { tile: Tile }): ReactElement {
  return (
    <div className="rounded-2xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-4 py-4">
      <p
        className="font-[family-name:var(--font-display)] text-2xl leading-none font-semibold tabular-nums sm:text-3xl"
        style={{ color: tile.color }}
      >
        {tile.count}
      </p>
      <p className="mt-2 text-xs text-[var(--lifafa-muted)]">{tile.label}</p>
    </div>
  );
}

export default function HeadcountSummary({
  guests,
}: {
  guests: readonly Guest[];
}): ReactElement {
  const headcount = expectedHeadcount(guests);
  const accepted = countBy(guests, "accepted");
  const declined = countBy(guests, "declined");
  const maybe = countBy(guests, "maybe");
  const pending = countBy(guests, "pending");

  const tiles: readonly Tile[] = [
    { label: "Accepted", count: accepted, color: "var(--lifafa-marigold)" },
    { label: "Declined", count: declined, color: "var(--lifafa-rose)" },
    { label: "Maybe", count: maybe, color: AMBER },
    { label: "Awaiting reply", count: pending, color: "var(--lifafa-muted)" },
  ];

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-stretch">
      {/* The one number the host actually came here for. */}
      <div className="flex flex-col justify-center rounded-3xl border border-[var(--lifafa-marigold)]/40 bg-[var(--lifafa-ink-raised)] px-6 py-8 sm:px-8 sm:py-10">
        <p className="text-[0.6875rem] tracking-[0.26em] text-[var(--lifafa-muted)] uppercase">
          Expected headcount
        </p>
        <p className="mt-3 font-[family-name:var(--font-display)] text-[4.5rem] leading-[0.9] font-semibold tracking-[-0.03em] text-[var(--lifafa-marigold)] tabular-nums sm:text-[5.5rem]">
          {headcount}
        </p>
        <p className="mt-4 text-sm text-[var(--lifafa-muted)]">
          Based on {accepted} confirmed {accepted === 1 ? "reply" : "replies"}.
        </p>
      </div>

      <div className="flex flex-col justify-center gap-3">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {tiles.map((tile) => (
            <StatTile key={tile.label} tile={tile} />
          ))}
        </div>
        <p className="text-xs text-[var(--lifafa-muted)]">
          Maybe replies are not counted in the headcount.
        </p>
      </div>
    </section>
  );
}
