import type { ReactElement, ReactNode } from "react";
import { formatCount } from "@/lib/admin/format";

/**
 * The numbers at the top of a page.
 *
 * ONE NUMBER PER GROUP IS BIGGER THAN THE REST, and that is the only visual
 * decision in this file worth defending. A grid of nine identically sized
 * figures is a grid with no answer in it: the reader has to scan every label
 * to find the one they came for. Marking the important one means the common
 * question — how many events, what came in, how many guests — is answered
 * before anything is read.
 *
 * Server components throughout. Nothing here has state or handlers, so nothing
 * here needs to reach the browser.
 */

/** How much room and weight a figure gets. */
export type StatEmphasis = "primary" | "normal";

/**
 * One figure, its label, and an optional line of context beneath.
 *
 * The value is formatted HERE when it arrives as a number, so a count can
 * never reach the screen as a bare `1234`. A money figure arrives as a string
 * that has already been through formatInr — there is no code path that hands a
 * rupee amount to this component as a number, because that is how ₹99,900
 * gets printed for a ₹999 invitation.
 */
export function Stat({
  label,
  value,
  note,
  emphasis = "normal",
}: {
  label: string;
  value: string | number;
  /** One short line. Where the figure comes from, or what it excludes. */
  note?: string;
  emphasis?: StatEmphasis;
}): ReactElement {
  const primary = emphasis === "primary";

  return (
    <div
      className={`rounded-lg border bg-white p-4 ${
        primary
          ? /*
              A darker rule as well as a bigger number. The size is the signal
              for someone scanning; the border is what still distinguishes the
              tile once the grid wraps to one column on a phone and "bigger"
              has nothing beside it to be bigger than.
            */
            "border-zinc-300 sm:col-span-2"
          : "border-zinc-200"
      }`}
    >
      <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
        {label}
      </dt>
      <dd
        className={`mt-1.5 font-semibold tabular-nums ${
          primary ? "text-3xl sm:text-4xl" : "text-2xl"
        }`}
      >
        {typeof value === "number" ? formatCount(value) : value}
      </dd>
      {note === undefined ? null : (
        <p className="mt-1 text-xs text-zinc-500">{note}</p>
      )}
    </div>
  );
}

/**
 * A titled group of stats.
 *
 * The heading is a real <h2> rather than a styled <p>: these are the landmarks
 * somebody navigating by heading jumps between, and "Revenue" being a heading
 * is what makes that work.
 */
export function StatSection({
  title,
  description,
  children,
}: {
  title: string;
  /** One line under the heading, when the group needs a caveat. */
  description?: string;
  children: ReactNode;
}): ReactElement {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">
        {title}
      </h2>
      {description === undefined ? null : (
        <p className="mt-1 text-xs text-zinc-500">{description}</p>
      )}
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{children}</dl>
    </section>
  );
}
