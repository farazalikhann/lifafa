"use client";

import { useEffect, type ReactElement } from "react";
import type { Guest } from "@/types/guest";

/** What a scan produced. */
export type ScanResult =
  | { kind: "valid"; guest: Guest }
  | { kind: "already"; guest: Guest }
  | { kind: "notFound" };

const AUTO_DISMISS_MS = 6000;
const AMBER = "#C99B45";

/** Arrival times are pinned to India so they read the same everywhere. */
const TIME_FORMAT: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
};

function formatArrivalTime(iso: string | null): string | null {
  if (iso === null) {
    return null;
  }

  const parsed = new Date(iso);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-IN", TIME_FORMAT)
    .format(parsed)
    .replace(/[\u202F\u00A0]/g, " ")
    .replace(
      /\s*(am|pm)\s*$/i,
      (_match, period: string) => ` ${period.toUpperCase()}`,
    );
}

function Mark({
  kind,
  colour,
}: {
  kind: ScanResult["kind"];
  colour: string;
}): ReactElement {
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
      {kind === "valid" ? <path d="M19 33 Q26 37 29 44 Q37 26 46 20" /> : null}
      {kind === "already" ? <path d="M32 18 V34 L42 40" /> : null}
      {kind === "notFound" ? (
        <path d="M23 23 L41 41 M41 23 L23 41" />
      ) : null}
    </svg>
  );
}

export default function CheckinResult({
  result,
  onConfirm,
  onClose,
}: {
  result: ScanResult;
  onConfirm: (guestId: string) => void;
  onClose: () => void;
}): ReactElement {
  /*
    Auto dismiss so the door team never has to tidy up after a scan. Keyed on
    the result identity, so a fresh scan restarts the clock rather than
    inheriting the previous one's remaining time. Cleared on unmount.
  */
  useEffect(() => {
    const timer = setTimeout(onClose, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [result, onClose]);

  const accent =
    result.kind === "valid"
      ? "var(--lifafa-marigold)"
      : result.kind === "already"
        ? AMBER
        : "var(--lifafa-rose)";

  return (
    <section
      role="status"
      aria-live="assertive"
      className="rounded-2xl border bg-[var(--lifafa-ink-raised)] px-5 py-6"
      style={{ borderColor: accent }}
    >
      <div className="flex items-center gap-4">
        <Mark kind={result.kind} colour={accent} />

        <div className="min-w-0 flex-1">
          {result.kind === "notFound" ? (
            <p className="text-lg leading-snug font-semibold text-[var(--lifafa-cream)]">
              This code does not match any guest
            </p>
          ) : (
            <>
              <p className="truncate text-2xl leading-tight font-semibold text-[var(--lifafa-cream)]">
                {result.guest.name}
              </p>
              {result.kind === "valid" ? (
                <p className="mt-1 text-sm text-[var(--lifafa-muted)]">
                  {result.guest.accompanyingCount === 0
                    ? "Just them"
                    : `+${result.guest.accompanyingCount} guests`}
                </p>
              ) : (
                <p className="mt-1 text-sm" style={{ color: accent }}>
                  Already checked in
                  {formatArrivalTime(result.guest.checkedInAt) !== null
                    ? ` at ${formatArrivalTime(result.guest.checkedInAt)}`
                    : ""}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {result.kind === "valid" ? (
        <button
          type="button"
          onClick={() => onConfirm(result.guest.id)}
          className="mt-5 min-h-14 w-full rounded-xl bg-[var(--lifafa-marigold)] px-4 text-base font-semibold text-[var(--lifafa-ink)] transition-transform duration-150 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
        >
          Confirm arrival
        </button>
      ) : (
        <button
          type="button"
          onClick={onClose}
          className="mt-5 min-h-14 w-full rounded-xl border border-[var(--lifafa-hairline)] px-4 text-base font-medium text-[var(--lifafa-cream)] transition-colors duration-150 hover:border-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
        >
          Close
        </button>
      )}
    </section>
  );
}
