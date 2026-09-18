import type { ReactElement } from "react";

/**
 * What a guest sees when the link opens: a wrapped card, a tap, and the card.
 *
 * The three lines behind the cover are the invitation — a heading and two rows
 * of writing — and they rise in as the halves go, because that is the order the
 * guest perceives it in rather than a card that was always sitting there.
 *
 * Marked decorative by the popover that frames it (see FeatureHelp), so nothing
 * in here carries a label and nothing needs one.
 */
export default function CoverDemo(): ReactElement {
  return (
    <div className="relative flex h-full w-full items-center justify-center px-6 py-4">
      {/* The card itself, and the whole reason for the cover in front of it. */}
      <div className="relative h-full w-[8.5rem] overflow-hidden rounded-lg border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)]">
        {/*
          The delays are inline rather than `[animation-delay:…]` utilities, and
          have to be. globals.css is not inside an `@layer`, so its `animation`
          shorthand outranks anything Tailwind writes into the utilities layer —
          including the delay — and the three lines would arrive together. The
          style attribute is the one place that outranks both.
        */}
        <div className="flex h-full flex-col items-center justify-center gap-2 px-4">
          <span className="lifafa-demo-cover-line h-2 w-14 rounded-full bg-[var(--lifafa-marigold)]" />
          <span
            style={{ animationDelay: "0.12s" }}
            className="lifafa-demo-cover-line h-1.5 w-20 rounded-full bg-[var(--lifafa-cream)]/55"
          />
          <span
            style={{ animationDelay: "0.24s" }}
            className="lifafa-demo-cover-line h-1.5 w-16 rounded-full bg-[var(--lifafa-cream)]/35"
          />
        </div>

        {/*
          The two halves of the wrapping, each pinned to its own side and each
          sliding out over its own edge. `overflow-hidden` on the card above is
          what keeps them from travelling across the rest of the frame.
        */}
        <span className="lifafa-demo-cover-left absolute inset-y-0 left-0 w-1/2 border-r border-[var(--lifafa-ink)]/60 bg-[var(--lifafa-marigold)]/25" />
        <span className="lifafa-demo-cover-right absolute inset-y-0 right-0 w-1/2 bg-[var(--lifafa-marigold)]/25" />

        {/* The tap, blooming out of the middle of the still-closed cover. */}
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="lifafa-demo-tap size-9 rounded-full border-2 border-[var(--lifafa-marigold)]" />
        </span>
      </div>
    </div>
  );
}
