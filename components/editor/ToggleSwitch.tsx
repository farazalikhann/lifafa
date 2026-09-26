"use client";

import type { ReactElement } from "react";

/**
 * An On/Off switch in the editor's gold, for a row that is simply on or off.
 *
 * Built the way CheckinPanel's switch is: a button with role="switch", so
 * aria-checked carries the state and a screen reader says "Butterflies,
 * switch, on". The state is in words as well as in the knob's position, and
 * the words are hidden from assistive technology because aria-checked already
 * says it. At least 44px square to tap, whatever the track measures.
 */
export default function ToggleSwitch({
  checked,
  onChange,
  label,
  describedBy,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** What is being switched, for the accessible name. */
  label: string;
  describedBy?: string;
}): ReactElement {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      onClick={() => onChange(!checked)}
      className="flex min-h-11 min-w-11 shrink-0 items-center justify-end gap-2 rounded-lg px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
    >
      <span
        aria-hidden="true"
        className="text-[0.8125rem] font-medium text-[var(--lifafa-cream)]"
      >
        {checked ? "On" : "Off"}
      </span>
      <span
        aria-hidden="true"
        className={`flex h-6 w-10 items-center rounded-full p-0.5 transition-colors duration-150 ${
          checked ? "bg-[var(--lifafa-marigold)]" : "bg-[var(--lifafa-hairline)]"
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-[var(--lifafa-ink)] transition-transform duration-150 ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}
