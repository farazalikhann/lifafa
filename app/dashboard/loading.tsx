import type { ReactElement } from "react";

/**
 * What a host sees between tapping "My invitations" and the list arriving.
 *
 * Until this file existed there was nothing in the dashboard tree to suspend
 * on, so Next had no shell to show and held the old page on screen while it
 * waited: the tap did nothing at all for a second or two, and the only way to
 * tell it had registered was that the page eventually changed. A host taps
 * again.
 *
 * It also makes the link worth prefetching. A dynamic route prefetches to its
 * loading state and no further — with none to fetch there was nothing to warm,
 * and now the shell is usually already in the browser when the tap lands.
 *
 * The markup below is the real page with its words taken out: same header,
 * same container, same row geometry. Shared measurements would be more
 * rigorous, but a skeleton that imports from the page it stands in for starts
 * pulling that page's data helpers into the shell it is meant to render
 * without them. It is a drawing of the page, and drifts the way a drawing
 * does — if a row changes shape, this changes with it.
 */

/** One placeholder bar. Offset staggers the pulse so the list breathes as a list. */
function Bar({
  className,
  delay = 0,
}: {
  className: string;
  delay?: number;
}): ReactElement {
  return (
    <span
      aria-hidden="true"
      className={`block rounded-full bg-[var(--lifafa-hairline)] animate-[lifafa-skeleton_1.6s_ease-in-out_infinite] motion-reduce:animate-none ${className}`}
      style={delay === 0 ? undefined : { animationDelay: `${delay}ms` }}
    />
  );
}

function RowSkeleton({ delay }: { delay: number }): ReactElement {
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-5 py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Bar className="h-4 w-[min(14rem,70%)]" delay={delay} />
          <Bar className="mt-2.5 h-3 w-[min(10rem,50%)]" delay={delay + 90} />
        </div>
        <Bar className="h-6 w-16 shrink-0 rounded-full" delay={delay + 180} />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Bar className="h-3 w-24" delay={delay + 120} />
        <Bar className="h-6 w-20 rounded-full" delay={delay + 210} />
      </div>
    </li>
  );
}

export default function DashboardLoading(): ReactElement {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink)]/85 backdrop-blur">
        <div className="mx-auto flex max-w-[900px] items-center justify-between gap-4 px-5 py-3 sm:px-6">
          {/*
            The wordmark is real text, not a bar. It is the one thing on this
            screen that is already known while the rest is on its way, and
            drawing it as a placeholder would be pretending otherwise.
          */}
          <span className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-[-0.02em] text-[var(--lifafa-marigold)]">
            Lifafa
          </span>
          <Bar className="h-4 w-20" />
        </div>
      </header>

      {/*
        role="status" rather than a spinner with a label: it announces once,
        politely, and the sr-only line is what a screen reader gets in place of
        a page of grey bars that mean nothing read aloud.
      */}
      <main
        role="status"
        aria-live="polite"
        className="mx-auto flex max-w-[900px] flex-col gap-6 px-5 py-8 sm:px-6 sm:py-10"
      >
        <span className="sr-only">Loading your invitations…</span>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <Bar className="h-6 w-44" />
            <Bar className="mt-2 h-3 w-56 max-w-full" delay={90} />
          </div>
          <Bar className="h-11 w-52 max-w-full rounded-full" delay={180} />
        </div>

        <ul className="flex flex-col gap-3">
          <RowSkeleton delay={0} />
          <RowSkeleton delay={140} />
          <RowSkeleton delay={280} />
        </ul>
      </main>
    </div>
  );
}
