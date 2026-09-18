import type { ReactElement } from "react";

/** Four tiles of foil, cleared in turn so the coin appears to be doing it. */
const FLAKE_DELAYS = ["0s", "0.2s", "0.4s", "0.6s"] as const;

/**
 * The scratch panel: a section of the card hidden until a guest rubs it off.
 *
 * The date is the example because it is the default target and the easiest to
 * read at this size. It is never animated — it is simply sitting on the card,
 * the way it is on the real one — and what moves is the foil on top of it. That
 * is the point the panel's controls cannot make on their own: the host is not
 * choosing a decoration, they are choosing which fact to withhold.
 *
 * Decorative; see FeatureHelp, which marks it.
 */
export default function ScratchDemo(): ReactElement {
  return (
    <div className="flex h-full w-full items-center justify-center px-6 py-4">
      <div className="w-full max-w-[12rem] rounded-lg border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-3 py-3">
        <span className="block text-[0.5625rem] tracking-[0.2em] text-[var(--lifafa-muted)] uppercase">
          When
        </span>

        <div className="relative mt-2 overflow-hidden rounded">
          {/* Underneath, and always there. */}
          <p className="px-2 py-2.5 text-center text-[0.8125rem] font-semibold text-[var(--lifafa-cream)]">
            14 Feb, 7 pm
          </p>

          {/* The foil over it, in four tiles so it can go from one side. */}
          <span className="absolute inset-0 flex">
            {FLAKE_DELAYS.map((delay) => (
              <span
                key={delay}
                style={{ animationDelay: delay }}
                className="lifafa-demo-flake h-full flex-1 bg-[var(--lifafa-hairline)]"
              />
            ))}
          </span>

          {/*
            The coin. It rides a full-width track rather than moving on its own,
            so the distance in the keyframes is a percentage of the panel it is
            crossing instead of a percentage of a 20px disc.
          */}
          <span className="pointer-events-none absolute inset-0 flex items-center">
            <span className="lifafa-demo-scrub flex w-full">
              <span className="size-5 rounded-full border border-[var(--lifafa-marigold)] bg-[var(--lifafa-marigold)]/35" />
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
