import type { ReactElement } from "react";
import type { Guest } from "@/types/guest";

/**
 * Both figures are counted in people, not guest records, so they are directly
 * comparable: a guest bringing three others counts as four on both sides.
 * Everything is derived from the live list, so the numbers move as the door
 * team works.
 */
function peopleFor(guest: Guest): number {
  return 1 + guest.accompanyingCount;
}

export default function ArrivalCounter({
  guests,
}: {
  guests: readonly Guest[];
}): ReactElement {
  const arrived = guests
    .filter((guest) => guest.checkedIn)
    .reduce((total, guest) => total + peopleFor(guest), 0);

  const expected = guests
    .filter((guest) => guest.rsvp === "accepted")
    .reduce((total, guest) => total + peopleFor(guest), 0);

  /*
    Walk-ins are real: someone who declined can still turn up and be scanned in,
    which would push arrived past expected. Clamp the bar so it never overflows
    while the count itself stays honest.
  */
  const percent =
    expected === 0 ? 0 : Math.min(100, Math.round((arrived / expected) * 100));

  return (
    <section className="rounded-2xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-5 py-5">
      <p className="font-[family-name:var(--font-display)] text-[2rem] leading-none font-semibold tabular-nums text-[var(--lifafa-cream)] sm:text-[2.25rem]">
        <span className="text-[var(--lifafa-marigold)]">{arrived}</span>
        <span className="text-[var(--lifafa-muted)]"> / {expected}</span>
        <span className="text-[var(--lifafa-cream)]"> arrived</span>
      </p>

      <div
        role="progressbar"
        aria-valuenow={arrived}
        aria-valuemin={0}
        aria-valuemax={expected}
        aria-label="Guests arrived"
        className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[var(--lifafa-hairline)]"
      >
        <div
          className="h-full rounded-full bg-[var(--lifafa-marigold)] transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
    </section>
  );
}
