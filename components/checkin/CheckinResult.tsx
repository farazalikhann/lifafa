"use client";

import { useEffect, type ReactElement } from "react";
import { formatArrivalTime } from "@/lib/checkinPass";
import type { PassCheckIn } from "@/lib/db/guests";

/** Long enough to read a name aloud; short enough that the next guest is not kept waiting. */
const AUTO_DISMISS_MS = 6000;
const AMBER = "#C99B45";

type Tone = "success" | "warning" | "refused";

function toneOf(kind: PassCheckIn["kind"]): Tone {
  if (kind === "success") {
    return "success";
  }

  return kind === "already" ? "warning" : "refused";
}

const TONE_COLOUR: Record<Tone, string> = {
  success: "var(--lifafa-marigold)",
  /* A warning, not a failure: the guest is fine, they are simply already inside. */
  warning: AMBER,
  refused: "var(--lifafa-rose)",
};

/** Every refusal, in words someone at a door can act on without asking anyone. */
const REFUSAL: Record<
  "not_found" | "not_owner" | "wrong_event",
  { title: string; detail: string }
> = {
  not_found: {
    title: "Pass not recognised",
    detail: "This code does not match any guest's pass.",
  },
  not_owner: {
    title: "Not a guest of yours",
    detail:
      "This pass belongs to an invitation on another account, so it cannot be checked in here.",
  },
  wrong_event: {
    title: "Pass for a different invitation",
    detail:
      "This guest is on another of your invitations. Check them in from that event's scanner.",
  },
};

function Mark({ tone, colour }: { tone: Tone; colour: string }): ReactElement {
  return (
    <svg
      viewBox="0 0 64 64"
      role="presentation"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke={colour}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-14 w-14 shrink-0"
    >
      <path d="M32 5 Q59 5 59 32 Q59 59 32 59 Q5 59 5 32 Q5 5 32 5 Z" />
      {tone === "success" ? <path d="M19 33 Q26 37 29 44 Q37 26 46 20" /> : null}
      {tone === "warning" ? <path d="M32 18 V34 L42 40" /> : null}
      {tone === "refused" ? <path d="M23 23 L41 41 M41 23 L23 41" /> : null}
    </svg>
  );
}

/**
 * What a scan, or a tap in the guest list, just did.
 *
 * Shared by the dashboard scanner, where it sits above the camera and clears
 * itself so the next guest can step up, and by the /checkin page, where it is
 * the whole screen and stays put. Passing onClose is what makes it the first.
 */
export default function CheckinResult({
  result,
  onClose,
}: {
  result: PassCheckIn;
  onClose?: () => void;
}): ReactElement {
  /*
    Auto dismiss so the door team never has to tidy up after a scan. Keyed on
    the result identity, so a fresh scan restarts the clock rather than
    inheriting the previous one's remaining time. Cleared on unmount.
  */
  useEffect(() => {
    if (onClose === undefined) {
      return;
    }

    const timer = setTimeout(onClose, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [result, onClose]);

  const tone = toneOf(result.kind);
  const colour = TONE_COLOUR[tone];

  return (
    <section
      role="status"
      aria-live="assertive"
      className="rounded-2xl border bg-[var(--lifafa-ink-raised)] px-5 py-6"
      style={{ borderColor: colour }}
    >
      <div className="flex items-center gap-4">
        <Mark tone={tone} colour={colour} />

        <div className="min-w-0 flex-1">
          {result.kind === "success" || result.kind === "already" ? (
            <p className="truncate text-2xl leading-tight font-semibold text-[var(--lifafa-cream)]">
              {result.guest.name}
            </p>
          ) : (
            <p className="text-lg leading-snug font-semibold text-[var(--lifafa-cream)]">
              {REFUSAL[result.kind].title}
            </p>
          )}

          {result.kind === "success" ? (
            <p className="mt-1 text-sm text-[var(--lifafa-muted)]">
              {result.guest.accompanyingCount === 0
                ? "Coming alone"
                : `+${result.guest.accompanyingCount} with them`}
            </p>
          ) : null}

          {result.kind === "already" ? (
            <p className="mt-1 text-sm font-medium" style={{ color: colour }}>
              Already checked in
              {formatArrivalTime(result.guest.checkedInAt) !== null
                ? ` at ${formatArrivalTime(result.guest.checkedInAt)}`
                : ""}
            </p>
          ) : null}

          {result.kind !== "success" && result.kind !== "already" ? (
            <p className="mt-1 text-sm leading-relaxed text-[var(--lifafa-muted)]">
              {REFUSAL[result.kind].detail}
            </p>
          ) : null}
        </div>
      </div>

      {result.kind === "success" ? (
        <p className="mt-5 font-[family-name:var(--font-display)] text-[2rem] leading-none font-semibold tabular-nums text-[var(--lifafa-cream)]">
          <span style={{ color: colour }}>{1 + result.guest.accompanyingCount}</span>{" "}
          {1 + result.guest.accompanyingCount === 1 ? "person" : "people"} entering
        </p>
      ) : null}

      {onClose !== undefined ? (
        <button
          type="button"
          onClick={onClose}
          className="mt-5 min-h-14 w-full rounded-xl border border-[var(--lifafa-hairline)] px-4 text-base font-medium text-[var(--lifafa-cream)] transition-colors duration-150 hover:border-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
        >
          Next guest
        </button>
      ) : null}
    </section>
  );
}
