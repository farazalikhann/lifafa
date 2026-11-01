"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
} from "react";
import {
  chromeIntentUrl,
  instagramPlatform,
  type InstagramPlatform,
} from "@/lib/inAppBrowser";
import { saveDraftHandoff } from "@/lib/handoff/actions";
import { openInBrowserClick } from "@/lib/metaPixel";
import { readPendingCard, type PendingCard } from "@/lib/pendingCard";
import { HANDOFF_PARAM } from "@/components/browser/DraftHandoffRestore";
import { PRIMARY_BUTTON } from "@/components/landing/styles";

/**
 * "Open in Chrome for the best experience", for a visitor in Instagram's
 * in-app browser and nobody else (lib/inAppBrowser.ts).
 *
 * TWO MOMENTS. `start`, on the landing page and the wizard: the first page
 * they see, before a draft is made in storage Chrome cannot read. `signin`,
 * on /login: Google refuses to sign anyone in from here, so they are asked
 * again even if they stayed the first time.
 *
 * "STAY HERE" LASTS THE SESSION. It is kept in sessionStorage (and in this
 * module, for when storage is blocked), one flag per moment. Staying at sign
 * in also covers `start`, so a visitor who began on /login is not asked a
 * third time on the way to /create.
 *
 * ANDROID gets one button: an intent link that opens this very address in
 * Chrome, query and all, so fbclid still ties the visit to the ad. IPHONE
 * cannot be sent anywhere by a button, so it gets the two taps written out,
 * a small picture of where they are, and a "Copy link" button. The iPhone
 * copy says "your browser", since its menu opens whichever one is the default.
 *
 * THE CARD COMES TOO. At sign in the card waits in this browser's storage
 * (lib/pendingCard.ts). Tapping the button there saves it on the server
 * (lib/handoff/actions.ts) and puts its id on the link, and /login in the
 * other browser restores it (DraftHandoffRestore). If the save fails or takes
 * more than a few seconds, the link goes without it.
 *
 * Renders nothing on the server and nothing until mounted: the user agent is
 * read in the browser, so the static landing page stays static.
 */

export type PromptMoment = "start" | "signin";

const STORE_KEY = "lifafa.openInChrome.stayed";

/** How long the link waits for the card to be saved before going without it. */
const SAVE_TIMEOUT_MS = 4000;

/** This address with the saved card's id on it, or as it is when the save fails. */
async function linkWithCard(card: PendingCard): Promise<string> {
  const plain = window.location.href;
  const timeout = new Promise<null>((resolve) => {
    window.setTimeout(() => resolve(null), SAVE_TIMEOUT_MS);
  });

  try {
    const saved = await Promise.race([saveDraftHandoff(card), timeout]);

    if (saved === null || !saved.ok) {
      return plain;
    }

    const url = new URL(plain);
    url.searchParams.set(HANDOFF_PARAM, saved.id);
    return url.href;
  } catch {
    return plain;
  }
}

/** For when sessionStorage throws: good for this page's life at least. */
const stayedInMemory = new Set<PromptMoment>();

function hasStayed(moment: PromptMoment): boolean {
  if (stayedInMemory.has(moment)) {
    return true;
  }

  try {
    const stored = window.sessionStorage.getItem(STORE_KEY) ?? "";
    return stored.split(",").includes(moment);
  } catch {
    return false;
  }
}

function rememberStayed(moments: readonly PromptMoment[]): void {
  for (const moment of moments) {
    stayedInMemory.add(moment);
  }

  try {
    window.sessionStorage.setItem(STORE_KEY, [...stayedInMemory].join(","));
  } catch {
    /* Private mode or blocked storage: the in-memory flag still holds. */
  }
}

/** Clipboard API first, then the old textarea route some web views still need. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard !== undefined && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* Fall through to the textarea. */
  }

  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand("copy");
    area.remove();
    return copied;
  } catch {
    return false;
  }
}

/** Instagram's "⋯", drawn, so it looks the same in every font. */
function MenuDots({ className = "" }: { className?: string }): ReactElement {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
    >
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

/** A window with an arrow leaving it: the Android illustration. */
function LeaveIcon(): ReactElement {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width={28}
      height={28}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13.5 4.5h-7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-7" />
      <path d="M4.5 8.5h9" />
      <path d="M14 4h6v6" stroke="var(--paper-gold)" />
      <path d="M20 4l-8.5 8.5" />
    </svg>
  );
}

/**
 * The top of Instagram's browser as a small sketch: the close cross, the
 * address, the ⋯ ringed in gold, and the menu it opens with the right row
 * picked out. Decorative; the sentence beside it says the same thing.
 */
function IosIllustration({ host }: { host: string }): ReactElement {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto w-full max-w-[17rem] rounded-2xl border border-[var(--paper-hairline)] bg-[var(--paper-washi)] px-3 pt-3 pb-3"
    >
      <div className="flex items-center gap-2 rounded-xl bg-[var(--paper-card)] px-3 py-2 text-[var(--paper-ink)]">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
        <span className="min-w-0 flex-1 truncate text-center text-[0.75rem] font-semibold text-[var(--paper-muted)]">
          {host}
        </span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-2 ring-[var(--paper-gold)]">
          <MenuDots className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-2 ml-auto w-[85%] overflow-hidden rounded-xl border border-[var(--paper-hairline)] bg-[var(--paper-card)] text-[0.75rem] text-[var(--paper-muted)]">
        <div className="px-3 py-1.5">Copy link</div>
        <div className="border-t border-[var(--paper-hairline)] bg-[var(--paper-emerald)]/[0.08] px-3 py-1.5 font-semibold text-[var(--paper-emerald)]">
          Open in external browser
        </div>
      </div>
    </div>
  );
}

export default function OpenInChromePrompt({
  moment,
}: {
  moment: PromptMoment;
}): ReactElement | null {
  const [platform, setPlatform] = useState<InstagramPlatform | null>(null);
  const [open, setOpen] = useState(false);
  const [href, setHref] = useState("");
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");
  const [busy, setBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  /** One save per popup, however many times the button is tapped. */
  const linkRef = useRef<Promise<string> | null>(null);

  /** The link to send them on with: carrying the card at sign in, when there is one. */
  const carryLink = useCallback((): Promise<string> => {
    if (linkRef.current === null) {
      const stash = moment === "signin" ? readPendingCard() : null;

      linkRef.current =
        stash?.kind === "card"
          ? linkWithCard(stash.card)
          : Promise.resolve(window.location.href);
    }

    return linkRef.current;
  }, [moment]);

  useEffect(() => {
    const detected = instagramPlatform(navigator.userAgent);

    if (detected === null || hasStayed(moment)) {
      return;
    }

    setPlatform(detected);
    setHref(window.location.href);
    setOpen(true);
  }, [moment]);

  /*
    The panel takes the focus on open, so a screen reader starts in it and Tab
    goes to the button. Not the button itself: on a phone that draws its focus
    ring before anything has been touched.
  */
  useEffect(() => {
    if (open) {
      panelRef.current?.focus({ preventScroll: true });
    }
  }, [open]);

  const stay = useCallback((): void => {
    rememberStayed(moment === "signin" ? ["start", "signin"] : ["start"]);
    setOpen(false);
  }, [moment]);

  /* Escape is "Stay here"; Tab wraps inside the panel. */
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      stay();
      return;
    }

    if (event.key !== "Tab" || panelRef.current === null) {
      return;
    }

    const stops = [
      ...panelRef.current.querySelectorAll<HTMLElement>("a[href], button"),
    ];
    const first = stops[0];
    const last = stops[stops.length - 1];

    const active = document.activeElement;

    if (event.shiftKey && (active === first || active === panelRef.current)) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  /*
    Android: at sign in the link is held back until the card is saved, then
    followed. Anywhere else the intent link in the href is followed as it is.
  */
  const handleContinue = async (event: MouseEvent<HTMLAnchorElement>): Promise<void> => {
    openInBrowserClick({ platform: "android", step: moment });

    if (moment !== "signin") {
      return;
    }

    event.preventDefault();

    if (busy) {
      return;
    }

    setBusy(true);
    const link = await carryLink();
    setBusy(false);
    window.location.href = chromeIntentUrl(link);
  };

  const handleCopy = async (): Promise<void> => {
    openInBrowserClick({ platform: "ios", step: moment });
    setBusy(true);

    const link = carryLink();
    let ok = false;

    /*
      Safari only lets a page write to the clipboard during the tap, and the
      save takes longer than that. A ClipboardItem holding a promise is
      written during the tap and filled when the link is ready.
    */
    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write !== undefined) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": link.then((text) => new Blob([text], { type: "text/plain" })),
          }),
        ]);
        ok = true;
      }
    } catch {
      /* Fall back below. */
    }

    if (!ok) {
      ok = await copyText(await link);
    }

    setBusy(false);
    setCopied(ok ? "done" : "failed");
  };

  if (!open || platform === null) {
    return null;
  }

  return (
    <div
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-[var(--paper-ink)]/55 px-4 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))] sm:items-center sm:pb-4"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="open-in-chrome-title"
        aria-describedby="open-in-chrome-body"
        tabIndex={-1}
        className="max-h-full outline-none w-full max-w-[25rem] overflow-y-auto rounded-3xl border border-[var(--paper-hairline)] bg-[var(--paper-card)] px-5 pt-6 pb-4 font-[family-name:var(--paper-sans)] text-[var(--paper-ink)] shadow-[0_18px_48px_rgb(var(--paper-shadow-warm)/0.28)] motion-safe:animate-[lifafa-rise_240ms_ease-out_both] sm:px-7 sm:pt-7"
      >
        {platform === "android" ? (
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--paper-hairline)] bg-[var(--paper-washi)] text-[var(--paper-emerald)]">
            <LeaveIcon />
          </span>
        ) : null}

        <h2
          id="open-in-chrome-title"
          className="text-center font-[family-name:var(--paper-display)] text-[1.375rem] leading-[1.2] font-semibold tracking-[-0.015em] text-balance"
        >
          {platform === "android"
            ? "Open in Chrome for the best experience"
            : "Open in your browser for the best experience"}
        </h2>
        <p
          id="open-in-chrome-body"
          className="mt-3 text-center text-base leading-[1.6] text-pretty text-[var(--paper-muted)]"
        >
          {platform === "android"
            ? "Instagram’s browser does not support Google sign-in. Continue in Chrome to design your card and sign in with one tap."
            : "Instagram’s browser does not support Google sign-in. Open this page in your browser to design your card and sign in with one tap."}
        </p>

        {platform === "android" ? (
          <a
            href={chromeIntentUrl(href)}
            onClick={(event) => void handleContinue(event)}
            aria-busy={busy}
            className={`${PRIMARY_BUTTON} mt-6 w-full`}
          >
            {busy ? "Opening Chrome…" : "Continue in Chrome"}
          </a>
        ) : (
          <>
            <div className="mt-5">
              <IosIllustration host={href === "" ? "" : new URL(href).host} />
              <p className="mt-3 text-center text-[0.9375rem] leading-[1.55] text-[var(--paper-ink)]">
                Tap the{" "}
                <span className="inline-flex translate-y-[3px] items-center rounded-full border border-[var(--paper-hairline)] bg-[var(--paper-washi)] px-1.5 py-0.5">
                  <MenuDots className="h-3.5 w-3.5" />
                  <span className="sr-only">⋯</span>
                </span>{" "}
                menu at the top right, then choose{" "}
                <strong className="font-semibold">Open in external browser</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleCopy()}
              disabled={busy}
              aria-busy={busy}
              className={`${PRIMARY_BUTTON} mt-5 w-full disabled:cursor-wait`}
            >
              {busy ? "Copying…" : copied === "done" ? "Link copied" : "Copy link"}
            </button>
            <p
              role="status"
              className="mt-2 min-h-5 text-center text-sm text-[var(--paper-muted)]"
            >
              {copied === "done"
                ? "Paste it into Safari or Chrome."
                : copied === "failed"
                  ? "Could not copy. Use the menu above instead."
                  : ""}
            </p>
          </>
        )}

        <div className={`${platform === "android" ? "mt-2" : ""} flex justify-center`}>
          <button
            type="button"
            onClick={stay}
            className="inline-flex min-h-11 items-center rounded px-3 text-sm font-medium text-[var(--paper-muted)] underline decoration-[var(--paper-gold)] underline-offset-4 transition-colors duration-150 hover:text-[var(--paper-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paper-emerald)]"
          >
            Stay here
          </button>
        </div>
      </div>
    </div>
  );
}
