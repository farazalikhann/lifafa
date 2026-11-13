"use client";

import { useEffect, type ReactElement } from "react";
import { JUST_SAVED_PARAM } from "@/lib/wizardSteps";

/**
 * "Your card is saved", over the editor of a card saved a moment ago with
 * "Save my card" on the details or customize step of a new card (or brought
 * back saved from a sign in on one of those steps). The host carries on from
 * the same step, now over the saved card: Next goes on to the next steps, and
 * "Save changes" keeps whatever they change from here.
 *
 * Takes `saved` out of the address once it is on screen, as SavedNotice does
 * on the dashboard, so a reload is the plain editor.
 */
export default function JustSavedNotice(): ReactElement {
  useEffect(() => {
    const url = new URL(window.location.href);

    if (!url.searchParams.has(JUST_SAVED_PARAM)) {
      return;
    }

    url.searchParams.delete(JUST_SAVED_PARAM);
    /*
      Null, as SavedNotice does: handing Next its own state back with a new
      address made the router fetch the whole page a second time.
    */
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  return (
    <p
      role="status"
      data-just-saved=""
      className="flex items-start gap-2.5 rounded-2xl border border-[var(--paper-emerald)]/25 bg-[var(--paper-emerald)]/10 px-4 py-3 text-[0.9375rem] leading-snug font-medium text-[var(--lifafa-cream)] lg:col-span-2"
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" className="mt-px size-[18px] shrink-0 text-[var(--paper-emerald)]">
        <circle cx="10" cy="10" r="10" fill="currentColor" />
        <path d="M6 10.5l2.6 2.5L14 7.5" fill="none" stroke="#fffaf0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>
        Your card is saved. Carry on with Next, and press Save changes to keep what you change.
      </span>
    </p>
  );
}
