import type { ReactElement } from "react";

/**
 * Which cells of the little code are dark.
 *
 * A 5×5 grid with the three finder squares a real QR code has in its corners,
 * because that shape is what makes a block of dots read as "a code to scan"
 * rather than as a checkerboard. It encodes nothing and is not meant to.
 */
const QR_CELLS: readonly boolean[] = [
  true, true, false, true, true,
  true, false, true, false, true,
  false, true, true, true, false,
  true, false, true, false, true,
  true, true, false, true, true,
];

function QrBlock({ className = "" }: { className?: string }): ReactElement {
  return (
    <span
      className={`grid grid-cols-5 gap-px rounded-sm bg-[var(--lifafa-cream)] p-1 ${className}`}
    >
      {QR_CELLS.map((filled, index) => (
        <span
          key={index}
          className={`size-1 rounded-[1px] ${
            filled ? "bg-[var(--lifafa-ink)]" : "bg-transparent"
          }`}
        />
      ))}
    </span>
  );
}

/**
 * Both halves of check-in, side by side: the guest's pass and the gate.
 *
 * This is the panel with the least to look at in the editor — one switch — and
 * the most going on behind it, in two places the host is not: a code that
 * appears on a guest's phone after they reply, and a scanner on the host's own
 * dashboard on the day. Showing only one of the two would leave the switch
 * still unexplained, so the demo is a pair.
 *
 * The result reads "3 entering" rather than a name and a tick alone, because
 * the number is the part a host has to trust: one scan admits the guest and
 * everyone they said they were bringing.
 *
 * Decorative; see FeatureHelp, which marks it.
 */
export default function CheckinDemo(): ReactElement {
  return (
    <div className="flex h-full w-full items-center justify-center gap-3 px-4 py-4">
      {/* The guest's phone, holding the pass. Static: it is not what moves. */}
      <div className="flex h-full w-[4.25rem] shrink-0 flex-col items-center justify-center gap-1.5 rounded-lg border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-2 py-2">
        <span className="text-[0.5rem] tracking-[0.14em] text-[var(--lifafa-muted)] uppercase">
          Pass
        </span>
        <QrBlock />
        <span className="text-[0.5625rem] leading-tight text-[var(--lifafa-cream)]">
          Priya
        </span>
      </div>

      {/* The gate: a viewfinder, a line across it, and then an answer. */}
      <div className="relative h-full min-w-0 flex-1 overflow-hidden rounded-lg border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)]">
        <span className="lifafa-demo-scanned absolute inset-0 flex items-center justify-center">
          <QrBlock className="scale-125" />
        </span>

        {/*
          The scanner's line. A 1px bar travelling on Y — the same idea as the
          beam on the landing page's scan panel, and the same reason it is a
          translate and not a `top`.
        */}
        <span className="lifafa-demo-beam absolute inset-x-6 top-1/2 h-px bg-[var(--lifafa-marigold)]" />

        {/* Corner brackets, so the box reads as a camera rather than a card. */}
        <span className="absolute top-2 left-2 size-2.5 rounded-tl border-t border-l border-[var(--lifafa-marigold)]/70" />
        <span className="absolute top-2 right-2 size-2.5 rounded-tr border-t border-r border-[var(--lifafa-marigold)]/70" />
        <span className="absolute bottom-2 left-2 size-2.5 rounded-bl border-b border-l border-[var(--lifafa-marigold)]/70" />
        <span className="absolute right-2 bottom-2 size-2.5 rounded-br border-r border-b border-[var(--lifafa-marigold)]/70" />

        {/* What the door staff end up looking at. */}
        <span className="lifafa-demo-admit absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[var(--lifafa-ink-raised)] px-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-[var(--lifafa-marigold)]">
            <svg
              viewBox="0 0 24 24"
              className="size-3.5"
              fill="none"
              stroke="var(--lifafa-ink)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              role="presentation"
              focusable="false"
            >
              <path d="M5 12.5 10 17.5 19 7" />
            </svg>
          </span>
          <span className="text-[0.6875rem] leading-tight font-semibold text-[var(--lifafa-cream)]">
            Priya Sharma
          </span>
          <span className="text-[0.625rem] leading-tight text-[var(--lifafa-marigold)]">
            3 people entering
          </span>
        </span>
      </div>
    </div>
  );
}
