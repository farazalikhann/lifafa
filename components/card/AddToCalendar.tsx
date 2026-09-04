"use client";

import type { ReactElement } from "react";
import {
  buildGoogleCalendarUrl,
  buildIcsContent,
  icsFileName,
  type CalendarInvite,
} from "@/lib/calendar";
import type { Theme } from "@/lib/themes";
import type { EventDraft } from "@/types/event";

/**
 * 44px is the smallest thing a thumb can be asked to hit reliably, and this
 * sits directly under a countdown a guest has been staring at — so it has to
 * be reachable on the first try rather than the second.
 */
const ACTION_CLASS = [
  "flex min-h-11 items-center justify-center rounded-full px-4",
  "text-[0.8125rem] font-medium tracking-[0.02em] whitespace-nowrap",
  "underline decoration-transparent underline-offset-4",
  "transition-colors duration-200 hover:decoration-current",
  "focus-visible:outline-2 focus-visible:outline-offset-4",
].join(" ");

/**
 * The two ways a guest can keep the date.
 *
 * Quiet by design. This lands between the countdown and whatever section comes
 * next, and a pair of filled buttons there would read as the card's call to
 * action — which it is not. The RSVP is. These are underlined text in the
 * accent colour, the same weight the rest of the card gives a link.
 *
 * Renders nothing when the event has no date, matching the countdown directly
 * above it: there is no instant to write into anyone's calendar, and an
 * invitation is not improved by a button that cannot work.
 */
export default function AddToCalendar({
  draft,
  theme,
  invite,
}: {
  draft: EventDraft;
  theme: Theme;
  invite: CalendarInvite;
}): ReactElement | null {
  const googleUrl = buildGoogleCalendarUrl(draft, invite);

  if (googleUrl === null) {
    return null;
  }

  const handleDownload = (): void => {
    const content = buildIcsContent(draft, invite);

    /*
      Cannot be null here — the Google URL above is built from the same span
      and the component has already returned — but the type says it can, and
      asserting otherwise would be a claim rather than a check.
    */
    if (content === null) {
      return;
    }

    const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = icsFileName(draft);
    document.body.append(link);
    link.click();
    link.remove();

    /*
      Released on the next frame rather than immediately: revoking while the
      click is still being handled cancels the download in some browsers. Same
      reasoning as the CSV export on the dashboard.
    */
    requestAnimationFrame(() => URL.revokeObjectURL(url));
  };

  return (
    <div className="flex flex-col items-center gap-2 px-7 pb-2 text-center">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <a
          href={googleUrl}
          target="_blank"
          /*
            noopener is the one that matters — without it the new tab gets a
            handle on this one through window.opener and can navigate it
            somewhere else. noreferrer comes along for older browsers that
            only honoured the pair.
          */
          rel="noopener noreferrer"
          className={ACTION_CLASS}
          style={{ color: theme.accent, outlineColor: theme.accent }}
        >
          Add to Google Calendar
        </a>

        <button
          type="button"
          onClick={handleDownload}
          className={ACTION_CLASS}
          style={{ color: theme.accent, outlineColor: theme.accent }}
        >
          Download for Apple or Outlook
        </button>
      </div>

      <p className="text-xs" style={{ color: theme.textMuted }}>
        Save the date to your calendar.
      </p>
    </div>
  );
}
