import type { ReactElement } from "react";

/** Four corner brackets, so the square reads as a camera viewfinder. */
function CornerBrackets(): ReactElement {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      role="presentation"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
      className="absolute inset-0 h-full w-full text-[var(--lifafa-marigold)]"
    >
      <path d="M4 20 V4 H20" />
      <path d="M80 4 H96 V20" />
      <path d="M96 80 V96 H80" />
      <path d="M20 96 H4 V80" />
    </svg>
  );
}

export default function ScannerFrame({
  onSimulateScan,
  onSimulateUnknown,
  allCheckedIn,
}: {
  onSimulateScan: () => void;
  onSimulateUnknown: () => void;
  allCheckedIn: boolean;
}): ReactElement {
  return (
    <section className="flex flex-col gap-4">
      <div className="relative aspect-square w-full rounded-3xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)]">
        <CornerBrackets />
        <div className="flex h-full items-center justify-center px-10 text-center">
          <p className="text-sm leading-relaxed text-[var(--lifafa-muted)]">
            Point the camera at the guest&rsquo;s QR code.
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={allCheckedIn}
        onClick={onSimulateScan}
        className={[
          "min-h-14 w-full rounded-xl px-4 text-base font-semibold transition-transform duration-150",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]",
          allCheckedIn
            ? "cursor-not-allowed border border-[var(--lifafa-hairline)] text-[var(--lifafa-muted)]"
            : "bg-[var(--lifafa-marigold)] text-[var(--lifafa-ink)] hover:-translate-y-px",
        ].join(" ")}
      >
        {allCheckedIn ? "Everyone has arrived." : "Simulate a scan"}
      </button>

      <div className="flex flex-col items-center gap-2">
        <p className="text-center text-xs text-[var(--lifafa-muted)]">
          Camera scanning is not connected yet.
        </p>
        {/* Demo affordance: makes the "not found" result reachable. */}
        <button
          type="button"
          onClick={onSimulateUnknown}
          className="min-h-11 rounded px-2 text-xs text-[var(--lifafa-muted)] underline decoration-transparent underline-offset-4 transition-colors duration-150 hover:text-[var(--lifafa-cream)] hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
        >
          Simulate an unknown code
        </button>
      </div>
    </section>
  );
}
