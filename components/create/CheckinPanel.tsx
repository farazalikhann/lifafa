"use client";

import { useId, type ReactElement } from "react";

/**
 * Whether guests are scanned in at the door on the day.
 *
 * Only the switch for now. The scanner and the code a guest shows are later
 * work; this records the host's answer so both have something to read when
 * they arrive. Stored in its own column rather than in CardConfig, like the
 * cover and the weather — see supabase/migrations/0005.
 *
 * A button with role="switch" rather than WeatherPicker's styled checkbox, so it
 * looks and announces itself the way the section switches in SectionManager
 * do: aria-checked carries the state, and the visible heading is its name
 * through aria-labelledby — the same heading-to-control wiring EditorTabs uses
 * between a tab and its panel — so a screen reader says "Guest check-in,
 * switch, off" rather than a bare "switch". The helper line is attached with
 * aria-describedby, so it is read once, after the state.
 */
export default function CheckinPanel({
  enabled,
  onEnabledChange,
}: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}): ReactElement {
  const headingId = useId();
  const hintId = useId();

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-[var(--lifafa-hairline)] px-4 py-4">
      <div className="flex items-center justify-between gap-4">
        <h2
          id={headingId}
          className="text-[0.6875rem] tracking-[0.2em] text-[var(--lifafa-muted)] uppercase"
        >
          Guest check-in
        </h2>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-labelledby={headingId}
          aria-describedby={hintId}
          onClick={() => onEnabledChange(!enabled)}
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
        >
          {/*
            The state in words as well as in position, the way WeatherPicker
            shows it. Hidden from assistive technology because aria-checked
            already says it, and saying it twice is noise.
          */}
          <span
            aria-hidden="true"
            className="text-[0.8125rem] font-medium text-[var(--lifafa-cream)]"
          >
            {enabled ? "On" : "Off"}
          </span>
          <span
            aria-hidden="true"
            className={`flex h-6 w-10 items-center rounded-full p-0.5 transition-colors duration-150 ${
              enabled
                ? "bg-[var(--lifafa-marigold)]"
                : "bg-[var(--lifafa-hairline)]"
            }`}
          >
            <span
              className={`h-5 w-5 rounded-full bg-[var(--lifafa-ink)] transition-transform duration-150 ${
                enabled ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </span>
        </button>
      </div>

      <p id={hintId} className="text-xs leading-relaxed text-[var(--lifafa-muted)]">
        Turn this on to scan guests in at the entrance on the event day. Leave
        it off for smaller gatherings.
      </p>
    </section>
  );
}
