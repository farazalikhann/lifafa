import type { ReactElement, ReactNode } from "react";

/**
 * The three things a page says when it has nothing to show: loading, empty,
 * or broken.
 *
 * WHY THESE ARE A SHARED COMPONENT AND NOT PROSE PER PAGE. A slow query and a
 * genuinely empty table used to look identical here — a bordered box with
 * nothing in it — and both looked like the page was broken. They mean three
 * different things and want three different responses: wait, do something, or
 * tell somebody. Naming them once means no page can accidentally invent a
 * fourth.
 *
 * Server components. Nothing here has state; the skeletons animate in CSS.
 */

/* ─────────────────────────── Loading ─────────────────────────── */

/**
 * A grey block standing in for content that has not arrived.
 *
 * `animate-pulse` is Tailwind's own, so this costs no keyframes of ours. It is
 * on the container rather than each child so a skeleton table pulses as one
 * object instead of as a shimmering crowd of separate rectangles.
 *
 * `aria-hidden` throughout, with the announcement left to the region below:
 * a screen reader has no use for the shape of the thing that is missing, and
 * eleven pulsing rectangles announced one by one is worse than silence.
 */
export function SkeletonLine({
  className = "h-4 w-full",
}: {
  className?: string;
}): ReactElement {
  return (
    <div aria-hidden="true" className={`rounded bg-zinc-200 ${className}`} />
  );
}

/** A grid of stat tiles, shaped like the real one. */
export function SkeletonStats({ count = 4 }: { count?: number }): ReactElement {
  return (
    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="rounded-lg border border-zinc-200 bg-white p-4"
        >
          <SkeletonLine className="h-3 w-20" />
          <SkeletonLine className="mt-3 h-6 w-16" />
        </div>
      ))}
    </div>
  );
}

/** A table, shaped like the real one, with a header rule and `rows` bars. */
export function SkeletonTable({ rows = 6 }: { rows?: number }): ReactElement {
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
        <SkeletonLine className="h-3 w-32" />
      </div>
      <div className="divide-y divide-zinc-100">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-4 px-4 py-3">
            <SkeletonLine className="h-4 flex-1" />
            <SkeletonLine className="hidden h-4 w-24 sm:block" />
            <SkeletonLine className="hidden h-4 w-32 md:block" />
            <SkeletonLine className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Wraps a page's skeletons so the wait is announced once, politely.
 *
 * `aria-busy` with `role="status"` and `aria-live="polite"`: polite rather than
 * assertive because a page loading is not an interruption, and once rather than
 * per skeleton for the reason given above. The visually hidden sentence is what
 * actually gets read; everything inside is decoration.
 */
export function LoadingRegion({
  label,
  children,
}: {
  /** What is loading, e.g. "Loading the overview". A sentence, not a word. */
  label: string;
  children: ReactNode;
}): ReactElement {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div className="animate-pulse">{children}</div>
    </div>
  );
}

/* ─────────────────────────── Empty ─────────────────────────── */

/**
 * Nothing to show, and why — quiet, not alarming.
 *
 * TWO DIFFERENT EMPTIES, and the distinction is the whole point of the `hint`.
 * "No events yet" is the product being young; "no events match this filter" is
 * a thing the reader just did and can undo. A single "No results" for both
 * leaves somebody staring at a filter they have forgotten they set.
 *
 * Deliberately plain: no illustration, no icon, no call to action. This is an
 * internal tool, and an empty state that takes up half a screen is an empty
 * state that has to be scrolled past every time the filter is too narrow.
 */
export function EmptyState({
  title,
  hint,
}: {
  title: string;
  /** One short line: what to do about it, when there is something to do. */
  hint?: string;
}): ReactElement {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-10 text-center">
      <p className="text-sm font-medium text-zinc-600">{title}</p>
      {hint === undefined ? null : (
        <p className="mt-1 text-xs text-zinc-500">{hint}</p>
      )}
    </div>
  );
}

/** The same, sized to sit inside a table body rather than replace one. */
export function EmptyRow({
  colSpan,
  title,
  hint,
}: {
  colSpan: number;
  title: string;
  hint?: string;
}): ReactElement {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center">
        <p className="text-sm font-medium text-zinc-600">{title}</p>
        {hint === undefined ? null : (
          <p className="mt-1 text-xs text-zinc-500">{hint}</p>
        )}
      </td>
    </tr>
  );
}

/* ─────────────────────────── Broken ─────────────────────────── */

/**
 * A query that failed, said plainly.
 *
 * `role="alert"` here and nowhere else in this file. An error is the one of the
 * three that genuinely interrupts: the reader is looking at a page that cannot
 * answer their question, and waiting for them to notice is worse than saying so.
 */
export function ErrorNotice({ message }: { message: string }): ReactElement {
  return (
    <p
      role="alert"
      className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      {message}
    </p>
  );
}
