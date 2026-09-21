import type { ReactElement } from "react";
import Link from "next/link";

/**
 * What /create shows before the browser has said whether a card is waiting.
 *
 * WHY NOT THE EMPTY EDITOR. The server cannot see the card a host stashed before
 * signing in — it is in their browser's storage — so anything it renders is a
 * guess. The empty editor was that guess, and for the host coming back from
 * sign in it was the wrong one: their names and dates vanished, and a moment
 * later reappeared, which reads as the card being lost and then found. This is
 * drawn instead, in the editor's own layout, until the first client render can
 * put the right card in the editor from its very first frame.
 *
 * It is the server's render and the hydration render, and then it is gone. A
 * host who reaches /create by a link from another page never sees it.
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

/** A label over a field, the unit every panel in the editor is built from. */
function FieldSkeleton({ delay }: { delay: number }): ReactElement {
  return (
    <div className="flex flex-col gap-2.5">
      <Bar className="h-3 w-24" delay={delay} />
      <Bar className="h-12 w-full rounded-xl" delay={delay + 60} />
    </div>
  );
}

export default function EditorSkeleton(): ReactElement {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink)]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 lg:px-8">
          {/* A real link from the first frame: the way out should never wait. */}
          <Link
            href="/"
            className="rounded font-[family-name:var(--font-display)] text-xl font-semibold tracking-[-0.02em] text-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
          >
            Lifafa
          </Link>
          <Bar className="h-11 w-44" />
        </div>
      </header>

      <main
        role="status"
        aria-live="polite"
        className="mx-auto grid max-w-6xl gap-10 px-5 pt-8 pb-52 lg:grid-cols-[58fr_42fr] lg:items-start lg:px-8 lg:py-12"
      >
        <span className="sr-only">Opening the editor…</span>

        <div className="flex min-w-0 flex-col gap-9">
          {/* The tab bar. */}
          <div className="flex gap-2">
            {[0, 80, 160, 240].map((delay) => (
              <Bar key={delay} className="h-10 flex-1 rounded-xl" delay={delay} />
            ))}
          </div>

          {/* The occasion grid. */}
          <div className="grid grid-cols-3 gap-3">
            {[0, 70, 140, 210, 280, 350].map((delay) => (
              <Bar key={delay} className="h-16 rounded-2xl" delay={delay} />
            ))}
          </div>

          {[0, 120, 240, 360].map((delay) => (
            <FieldSkeleton key={delay} delay={delay} />
          ))}
        </div>

        {/* The phone the card is previewed in, beside the form at lg only. */}
        <div className="hidden lg:block">
          <Bar className="mx-auto aspect-[9/17] w-full max-w-[380px] rounded-[2.25rem]" />
        </div>
      </main>
    </div>
  );
}
