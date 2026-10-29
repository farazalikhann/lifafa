"use client";

import { lazy, Suspense, useCallback, useRef, useState, type ReactElement } from "react";
import type { HelpMessagePage } from "@/types/database";

/*
  The panel, its questions and its form are a separate chunk, fetched the
  first time a host reaches for the button (hover, focus or tap). The page's
  first load carries only this button.
*/
const loadPanel = () => import("./HelpPanel");
const HelpPanel = lazy(loadPanel);

/**
 * The Help button, bottom right, on the home page and the host dashboard only.
 *
 * Mounted by app/page.tsx, app/dashboard/page.tsx and
 * app/dashboard/[eventId]/page.tsx, inside their light theme so the
 * --paper-* tokens resolve. Never on /i, /demo, /create, the editor, check-in,
 * /admin or the policy pages.
 *
 * z-40: under the dashboard's dialogs (z-50) and the landing header, over the
 * page. Nothing on those pages is fixed to the bottom, so it sits 20px in.
 */
export default function HelpWidget({
  page,
  eventId = null,
}: {
  page: HelpMessagePage;
  eventId?: string | null;
}): ReactElement {
  const [open, setOpen] = useState(false);
  /* Once loaded the panel stays mounted, so a closed and reopened chat keeps its place. */
  const [loaded, setLoaded] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const prefetch = useCallback(() => {
    void loadPanel();
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    launcherRef.current?.focus();
  }, []);

  return (
    <>
      {/*
        Room at the very end of the page, so the last footer links (centred on
        phones) scroll clear of the button instead of ending under it. From
        640px the footer is left aligned and the button never covers it.
      */}
      <div aria-hidden="true" className="h-[88px] sm:hidden" />
      <button
        ref={launcherRef}
        type="button"
        aria-label="Help"
        aria-haspopup="dialog"
        aria-expanded={open}
        onPointerEnter={prefetch}
        onFocus={prefetch}
        onClick={() => {
          setLoaded(true);
          setOpen((was) => !was);
        }}
        className="fixed right-5 bottom-[calc(20px+env(safe-area-inset-bottom))] z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--paper-emerald)] text-[var(--paper-washi)] shadow-[0_6px_18px_rgb(var(--paper-shadow-warm)/0.28)] transition-[transform,background-color] duration-200 ease-out hover:-translate-y-0.5 active:bg-[var(--paper-emerald-press)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--paper-emerald)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        {open ? (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 11.5c0 4.14-3.58 7.5-8 7.5-1.2 0-2.34-.25-3.36-.69L4 19.5l1.2-3.6A7.1 7.1 0 0 1 4 11.5C4 7.36 7.58 4 12 4s8 3.36 8 7.5Z" />
            <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" strokeWidth="2.25" />
          </svg>
        )}
      </button>

      {loaded ? (
        <Suspense fallback={null}>
          <HelpPanel
            open={open}
            onClose={close}
            launcherRef={launcherRef}
            page={page}
            eventId={eventId}
          />
        </Suspense>
      ) : null}
    </>
  );
}
