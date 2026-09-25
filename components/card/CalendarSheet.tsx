"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
} from "react";
import { createPortal } from "react-dom";
import {
  androidCalendarIntent,
  googleCalendarUrl,
  icsContent,
  icsFileName,
  icsPath,
  type CalendarEvent,
} from "@/lib/calendar";
import { cardCopy } from "@/lib/cardLanguage";
import { readableOn } from "@/lib/contrast";
import type { Theme } from "@/lib/themes";
import type { CardLanguage } from "@/types/card";

/**
 * What the guest is holding, as far as adding to a calendar is concerned.
 *
 *   android  The calendar app is reached by intent, never by the web link.
 *   ios      iPhone and iPad. Apple Calendar through the .ics route.
 *   mac      Apple Calendar is there, but so is a browser with Google open.
 *   desktop  Everything else: Google in a new tab, or the file.
 */
type Platform = "android" | "ios" | "mac" | "desktop";

type Choice = "google" | "apple" | "other";

/**
 * Read from the user agent, in the browser only.
 *
 * iPadOS asks for the desktop site and says "Macintosh", so a Mac with a touch
 * screen is an iPad — no Mac has one.
 */
function detectPlatform(): Platform {
  const ua = navigator.userAgent;

  if (/Android/i.test(ua)) {
    return "android";
  }

  if (/iPhone|iPad|iPod/i.test(ua)) {
    return "ios";
  }

  if (/Macintosh/i.test(ua)) {
    return navigator.maxTouchPoints > 1 ? "ios" : "mac";
  }

  return "desktop";
}

/**
 * Whether the page is open inside another app's browser — WhatsApp,
 * Instagram, Facebook — rather than in Chrome or Safari.
 *
 * Those are where an intent or a file is most likely to go nowhere, so the
 * sheet says up front what to do if it does. "; wv)" is how every Android
 * WebView marks itself; an iPhone view with no "Safari/" in it is one too.
 */
function isInAppBrowser(platform: Platform): boolean {
  const ua = navigator.userAgent;

  if (/FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Snapchat|LinkedInApp/i.test(ua)) {
    return true;
  }

  if (platform === "android") {
    return /; wv\)/.test(ua);
  }

  return platform === "ios" && !/Safari\//.test(ua);
}

/** Safari on a Mac, as against Chrome, Edge or Firefox on one. */
function isMacSafari(): boolean {
  const ua = navigator.userAgent;
  return /Safari\//.test(ua) && !/Chrome|Chromium|CriOS|Edg|Firefox|FxiOS/.test(ua);
}

/** The choices on offer, best first, and which of them is best. */
function choicesFor(platform: Platform): {
  order: readonly Choice[];
  best: Choice;
} {
  switch (platform) {
    case "android":
      return { order: ["google", "other"], best: "google" };
    case "ios":
      return { order: ["apple", "google", "other"], best: "apple" };
    case "mac":
      return isMacSafari()
        ? { order: ["apple", "google", "other"], best: "apple" }
        : { order: ["google", "apple", "other"], best: "google" };
    case "desktop":
      return { order: ["google", "other"], best: "google" };
  }
}

/**
 * How long a tap on the Android intent is given to take the guest into their
 * calendar app before the sheet says what to do instead. Long enough for a
 * cold start on a slow phone to take the screen, short enough that a guest
 * who is still looking at the sheet is told before they give up on it.
 */
const INTENT_GRACE_MS = 2000;

/**
 * The .ics made in the browser, for the editor's previews only.
 *
 * A saved invitation is served by the route, which is what iOS needs; a draft
 * the host is still typing has no code the route could look up.
 */
function downloadIcs(event: CalendarEvent): void {
  const blob = new Blob([icsContent(event, new Date())], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = icsFileName(event);
  document.body.append(link);
  link.click();
  link.remove();

  /*
    Released on the next frame rather than immediately: revoking while the
    click is still being handled cancels the download in some browsers.
  */
  requestAnimationFrame(() => URL.revokeObjectURL(url));
}

function GridIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7.5 13h2M11 13h2M14.5 13h2M7.5 16.5h2M11 16.5h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function DayIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="15" r="2.25" fill="currentColor" />
    </svg>
  );
}

function FileIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path d="M6 3.5h8l4.5 4.5v12.5H6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 3.5V8h4.5M12 11v6M9.5 14.5 12 17l2.5-2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ICONS: Record<Choice, () => ReactElement> = {
  google: GridIcon,
  apple: DayIcon,
  other: FileIcon,
};

/**
 * The calendar picker a guest gets from "Add to my calendar".
 *
 * A sheet from the bottom on a phone and a small dialog on a wider screen,
 * drawn in the card's own colours and faces. Portalled to <body>, because the
 * card's sections sit inside revealed wrappers that carry a transform, and a
 * transformed ancestor would pin a `fixed` sheet to the section instead of to
 * the screen. The font stacks are on <html>, so they still resolve out here.
 *
 * Every choice is a real link — an intent, a web page or the .ics route —
 * followed on the guest's own tap, which is what in-app browsers and popup
 * blockers ask for. Only the editor's previews, which have no saved code,
 * build the file in the browser instead.
 */
export default function CalendarSheet({
  event,
  inviteCode,
  isPreview,
  theme,
  language,
  onClose,
  onAdded,
}: {
  event: CalendarEvent;
  inviteCode: string;
  /** The editor's previews: no route to fetch the file from. */
  isPreview: boolean;
  theme: Theme;
  language: CardLanguage;
  onClose: () => void;
  /** The guest chose a calendar and it was handed over. */
  onAdded: () => void;
}): ReactElement {
  const copy = cardCopy(language);
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const bestRef = useRef<HTMLAnchorElement | HTMLButtonElement | null>(null);

  /*
    Mounted only after a tap, never on the server, so the user agent can be
    read while rendering without a hydration mismatch — but it is still read
    once, into state, rather than on every render.
  */
  const [device] = useState(() => {
    const platform = detectPlatform();
    return { platform, inApp: isInAppBrowser(platform), ...choicesFor(platform) };
  });

  /** Set when an Android tap did not leave the page. See INTENT_GRACE_MS. */
  const [notOpened, setNotOpened] = useState(false);

  /* The latest callbacks, for listeners armed once. */
  const onAddedRef = useRef(onAdded);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onAddedRef.current = onAdded;
    onCloseRef.current = onClose;
  });

  const disarmRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    bestRef.current?.focus();

    /*
      The page under the sheet stays where it is. Whatever scrolls the card
      — the window on the guest's page — is held while the sheet is up.
    */
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";

    return () => {
      root.style.overflow = previous;
      disarmRef.current?.();
    };
  }, []);

  /**
   * Watches an Android tap on the intent.
   *
   * The calendar app taking the screen hides this page, and that is the only
   * sign there is that it opened. If the page is still showing after the
   * grace period, something in between — an in-app browser, a phone with no
   * calendar app — swallowed the tap, and the sheet says so and points at the
   * file. Still listening after that: a chooser left on screen for a while
   * still ends with the app opening, and then it was added after all.
   */
  const watchIntent = (): void => {
    disarmRef.current?.();

    const handleHidden = (): void => {
      if (document.visibilityState === "hidden") {
        disarm();
        onAddedRef.current();
      }
    };

    const handlePageHide = (): void => {
      disarm();
      onAddedRef.current();
    };

    const timer = window.setTimeout(() => setNotOpened(true), INTENT_GRACE_MS);

    const disarm = (): void => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleHidden);
      window.removeEventListener("pagehide", handlePageHide);
      disarmRef.current = null;
    };

    document.addEventListener("visibilitychange", handleHidden);
    window.addEventListener("pagehide", handlePageHide);
    disarmRef.current = disarm;
  };

  /* Escape closes; Tab goes round the sheet rather than out into the card. */
  const handleKeyDown = (keyEvent: KeyboardEvent<HTMLDivElement>): void => {
    if (keyEvent.key === "Escape") {
      keyEvent.preventDefault();
      onClose();
      return;
    }

    if (keyEvent.key !== "Tab" || panelRef.current === null) {
      return;
    }

    const stops = Array.from(
      panelRef.current.querySelectorAll<HTMLElement>("a[href], button"),
    );

    if (stops.length === 0) {
      return;
    }

    const first = stops[0];
    const last = stops[stops.length - 1];

    if (keyEvent.shiftKey && document.activeElement === first) {
      keyEvent.preventDefault();
      last.focus();
    } else if (!keyEvent.shiftKey && document.activeElement === last) {
      keyEvent.preventDefault();
      first.focus();
    }
  };

  const onAccent = readableOn(theme.accent, [theme.background, theme.textPrimary]);
  const hairline = `${theme.textMuted}4D`;

  const labels: Record<Choice, { label: string; note: string }> = {
    google: {
      label: copy.calendar.google,
      note:
        device.platform === "android"
          ? copy.calendar.googleNoteApp
          : copy.calendar.googleNoteWeb,
    },
    apple: { label: copy.calendar.apple, note: copy.calendar.appleNote },
    other: { label: copy.calendar.other, note: copy.calendar.otherNote },
  };

  /**
   * One choice as the element that does it. A link wherever there is
   * something to link to; a button only for the editor's file.
   */
  const renderChoice = (choice: Choice): ReactElement => {
    /* Once the intent has failed, the file is what the guest should reach for. */
    const isBest = notOpened ? choice === "other" : choice === device.best;
    const Icon = ICONS[choice];

    const body = (
      <>
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            color: isBest ? onAccent : theme.accent,
            backgroundColor: isBest ? theme.accent : "transparent",
            border: isBest ? "none" : `1px solid ${hairline}`,
          }}
        >
          <Icon />
        </span>
        <span className="flex min-w-0 flex-1 flex-col text-left">
          <span className="text-[0.975rem] leading-snug font-semibold">
            {labels[choice].label}
          </span>
          <span className="text-[0.8125rem] leading-snug" style={{ color: theme.textMuted }}>
            {labels[choice].note}
          </span>
        </span>
        {isBest ? (
          <span
            className="hidden shrink-0 rounded-full px-2.5 py-1 text-[0.6875rem] leading-none font-semibold min-[400px]:inline"
            style={{ backgroundColor: theme.accent, color: onAccent }}
          >
            {copy.calendar.recommended}
          </span>
        ) : null}
      </>
    );

    const className =
      "flex min-h-[64px] w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2";
    const style = {
      border: isBest ? `1.5px solid ${theme.accent}` : `1px solid ${hairline}`,
      backgroundColor: isBest ? `${theme.accent}14` : "transparent",
      color: theme.textPrimary,
      outlineColor: theme.accent,
    };
    /* The recommended row is also where the focus lands on open. */
    const ref = (element: HTMLAnchorElement | HTMLButtonElement | null): void => {
      if (choice === device.best) {
        bestRef.current = element;
      }
    };

    /* A "Best for this device" tag hidden at 375px is still read out. */
    const accessibleName = isBest
      ? `${labels[choice].label}. ${labels[choice].note}. ${copy.calendar.recommended}`
      : undefined;

    if (choice === "google") {
      if (device.platform === "android") {
        return (
          <a
            ref={ref}
            href={androidCalendarIntent(event)}
            onClick={watchIntent}
            className={className}
            style={style}
            aria-label={accessibleName}
          >
            {body}
          </a>
        );
      }

      return (
        <a
          ref={ref}
          href={googleCalendarUrl(event)}
          target="_blank"
          /*
            noopener is the one that matters — without it the new tab gets a
            handle on this one through window.opener and can navigate it
            somewhere else.
          */
          rel="noopener noreferrer"
          onClick={() => onAdded()}
          className={className}
          style={style}
          aria-label={accessibleName}
        >
          {body}
        </a>
      );
    }

    if (isPreview) {
      return (
        <button
          ref={ref}
          type="button"
          onClick={() => {
            downloadIcs(event);
            onAdded();
          }}
          className={className}
          style={style}
          aria-label={accessibleName}
        >
          {body}
        </button>
      );
    }

    /*
      Apple on an iPhone or iPad is sent inline, which is what makes Safari
      show the event with its own "Add to Calendar" rather than a download.
      Everywhere else — a Mac, and "Other" — it is saved as a file.
    */
    const inline = choice === "apple" && device.platform === "ios";

    return (
      <a
        ref={ref}
        href={icsPath(inviteCode, language, !inline)}
        download={inline ? undefined : icsFileName(event)}
        onClick={() => onAdded()}
        className={className}
        style={style}
        aria-label={accessibleName}
      >
        {body}
      </a>
    );
  };

  return createPortal(
    <div
      /* A tap on the dimmed card behind is a way out, like Escape. */
      onClick={onClose}
      onKeyDown={handleKeyDown}
      className="lifafa-sheet-backdrop fixed inset-0 z-[70] flex items-end justify-center bg-black/55 sm:items-center sm:px-5"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        lang={copy.lang}
        onClick={(clickEvent) => clickEvent.stopPropagation()}
        className="lifafa-sheet relative w-full max-w-[28rem] rounded-t-[1.75rem] px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[1.75rem] sm:px-6 sm:pt-5 sm:pb-6"
        style={{
          backgroundColor: theme.background,
          color: theme.textPrimary,
          fontFamily: theme.fontFamily,
          border: `1px solid ${theme.accent}59`,
        }}
      >
        {/* The grip a bottom sheet is recognised by. Decoration only. */}
        <span
          aria-hidden="true"
          className="mx-auto mb-3 block h-1 w-10 rounded-full sm:hidden"
          style={{ backgroundColor: hairline }}
        />

        <div className="flex items-start justify-between gap-3">
          <h2
            id={titleId}
            className="pt-2 text-[1.35rem] leading-tight font-medium"
            style={{
              fontFamily: theme.displayFontFamily ?? theme.fontFamily,
              fontWeight: theme.displayFontWeight,
            }}
          >
            {copy.calendar.sheetTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.calendar.close}
            className="-mt-0.5 -mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:-outline-offset-4"
            style={{ color: theme.textMuted, outlineColor: theme.accent }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <span
          aria-hidden="true"
          className="mt-2 mb-4 block h-px w-12"
          style={{ backgroundColor: theme.accent, opacity: 0.55 }}
        />

        {device.inApp || notOpened ? (
          <p
            role={notOpened ? "status" : undefined}
            className="mb-3 rounded-xl px-3.5 py-2.5 text-[0.8125rem] leading-relaxed"
            style={{ backgroundColor: `${theme.textMuted}1A`, color: theme.textPrimary }}
          >
            {notOpened ? copy.calendar.notOpened : copy.calendar.inAppBrowser}
          </p>
        ) : null}

        <ul className="flex flex-col gap-2.5">
          {device.order.map((choice) => (
            <li key={choice}>{renderChoice(choice)}</li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
