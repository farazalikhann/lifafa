import type { ReactElement, ReactNode } from "react";
import Link from "next/link";

/**
 * What a host sees between tapping a row and that invitation's page arriving.
 *
 * Its own file rather than letting the list's skeleton stand in: the boundary
 * one level up covers this route too, and a host opening an invitation would
 * have watched the list they just left redraw itself as grey bars before the
 * page they asked for appeared. A placeholder of the wrong page is worse than
 * a plain one — it reads as the navigation having gone backwards.
 *
 * Wider container than the list, matching this page rather than that one, and
 * the two ways out of here are real links from the first frame: the wait is
 * the reason a host changes their mind, and a back that only works once the
 * page has finished loading is a back that is missing when it is wanted.
 */

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

function PanelSkeleton({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}): ReactElement {
  return (
    <div
      className={`rounded-2xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-5 py-5 ${className}`}
    >
      {children}
    </div>
  );
}

export default function EventLoading(): ReactElement {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink)]/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="rounded font-[family-name:var(--font-display)] text-xl font-semibold tracking-[-0.02em] text-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
            >
              Lifafa
            </Link>

            <Link
              href="/dashboard"
              className="flex min-h-11 items-center rounded text-[0.8125rem] font-medium whitespace-nowrap text-[var(--lifafa-muted)] transition-colors duration-150 hover:text-[var(--lifafa-cream)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
            >
              <span aria-hidden="true" className="mr-1.5">
                ←
              </span>
              All my invitations
            </Link>
          </div>

          <div className="ml-auto flex min-w-0 items-center gap-4">
            <div className="flex min-w-0 flex-col items-end gap-1.5">
              <Bar className="h-3.5 w-32" />
              <Bar className="h-3 w-20" delay={90} />
            </div>
          </div>
        </div>
      </header>

      <main
        role="status"
        aria-live="polite"
        className="mx-auto flex max-w-[1100px] flex-col gap-6 px-5 py-8 sm:px-6 sm:py-10 lg:px-8"
      >
        <span className="sr-only">Loading this invitation…</span>

        {/* The share link. */}
        <PanelSkeleton>
          <div className="flex flex-wrap items-center gap-3">
            <Bar className="h-4 w-[min(20rem,60%)]" />
            <Bar className="h-9 w-24 rounded-full" delay={90} />
          </div>
        </PanelSkeleton>

        {/* The headcount, three figures across. */}
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 120, 240].map((delay) => (
            <PanelSkeleton key={delay}>
              <div>
                <Bar className="h-3 w-16" delay={delay} />
                <Bar className="mt-3 h-7 w-12" delay={delay + 60} />
              </div>
            </PanelSkeleton>
          ))}
        </div>

        {/* The guest list. */}
        <PanelSkeleton className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Bar className="h-4 w-28" />
            <Bar className="h-9 w-28 rounded-full" delay={90} />
          </div>
          <div className="flex flex-col gap-3">
            {[0, 110, 220, 330].map((delay) => (
              <div key={delay} className="flex items-center gap-4">
                <Bar className="h-3.5 flex-1" delay={delay} />
                <Bar className="h-6 w-16 shrink-0 rounded-full" delay={delay + 60} />
              </div>
            ))}
          </div>
        </PanelSkeleton>
      </main>
    </div>
  );
}
