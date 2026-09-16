import type { ReactElement, ReactNode } from "react";

/**
 * The numbers at the top of the dashboard.
 *
 * Server components, both of them — there is nothing interactive here, so
 * there is no reason to ship them to the browser.
 */

/** One figure, its label, and an optional line of context beneath. */
export function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  /** One short line. Where the figure comes from, or what it excludes. */
  note?: string;
}): ReactElement {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
        {label}
      </dt>
      <dd className="mt-1.5 text-2xl font-semibold tabular-nums">
        {typeof value === "number" ? value.toLocaleString("en-IN") : value}
      </dd>
      {note === undefined ? null : (
        <p className="mt-1 text-xs text-zinc-500">{note}</p>
      )}
    </div>
  );
}

/** A titled group of stats. */
export function StatSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): ReactElement {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">
        {title}
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {children}
      </dl>
    </section>
  );
}
