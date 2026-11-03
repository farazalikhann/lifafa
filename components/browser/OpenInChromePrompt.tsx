"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
} from "react";
import { chromeIntentUrl, inAppName, type InAppBrowser } from "@/lib/inAppBrowser";
import { PRIMARY_BUTTON } from "@/components/landing/styles";

/**
 * "Open in Chrome", the small prompt for a visitor in Instagram's or
 * Facebook's in-app browser (lib/inAppBrowser.ts). It never opens by itself:
 *
 * - the wizard shows it when "Save and continue" could not open the real
 *   browser on its own (components/browser/useInAppHandoff.tsx), with a link
 *   to /login that carries the card;
 * - /login shows it on arrival (InAppLoginPrompt.tsx), since Google will not
 *   sign anyone in from here.
 *
 * ANDROID gets one button, an intent link that opens the link in Chrome.
 * IPHONE gets "Copy link". Without a card to carry, the ⋯ menu steps are drawn
 * as well, since "Open in external browser" opens this very page; with one,
 * they are not, because that page is not the link that carries the card.
 *
 * THE LINK MAY NOT BE READY. `getLink` is asked on the tap, and may still be
 * saving the card; Android waits for it, iPhone copies it as it arrives.
 */

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

/** The app's "⋯", drawn, so it looks the same in every font. */
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
 * The top of the app's browser as a small sketch: the close cross, the
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
  browser,
  getLink,
  withCard,
  onTap,
  onStay,
}: {
  browser: InAppBrowser;
  /** The address to open in the real browser. Asked on the tap; may still be saving the card. */
  getLink: () => Promise<string>;
  /** Whether the link is meant to carry the card, which changes the iPhone steps. */
  withCard: boolean;
  /** Called on the main button's tap, before anything else. */
  onTap?: () => void;
  onStay: () => void;
}): ReactElement {
  const { platform, app } = browser;
  const appName = inAppName(app);
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");
  const [busy, setBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  /** What the intent link opens until the tap asks for the real one. */
  const [here, setHere] = useState("");

  useEffect(() => {
    setHere(window.location.href);
  }, []);

  /*
    The panel takes the focus on open, so a screen reader starts in it and Tab
    goes to the button. Not the button itself: on a phone that draws its focus
    ring before anything has been touched.
  */
  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
  }, []);

  /* Escape is "Stay here"; Tab wraps inside the panel. */
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      onStay();
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

  /* Android: waits for the link (usually ready already), then opens it in Chrome. */
  const handleContinue = async (event: MouseEvent<HTMLAnchorElement>): Promise<void> => {
    event.preventDefault();

    if (busy) {
      return;
    }

    onTap?.();
    setBusy(true);
    const link = await getLink();
    setBusy(false);
    window.location.href = chromeIntentUrl(link);
  };

  const handleCopy = async (): Promise<void> => {
    onTap?.();
    setBusy(true);

    const link = getLink();
    let ok = false;

    /*
      Safari only lets a page write to the clipboard during the tap, and the
      save may take longer than that. A ClipboardItem holding a promise is
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
          {platform === "android" ? "Open in Chrome to sign in" : "Open in Safari to sign in"}
        </h2>
        <p
          id="open-in-chrome-body"
          className="mt-3 text-center text-base leading-[1.6] text-pretty text-[var(--paper-muted)]"
        >
          {`${appName}’s browser does not support Google sign-in. `}
          {platform === "android"
            ? withCard
              ? "Continue in Chrome to sign in, and your card comes with you."
              : "Continue in Chrome to sign in with one tap."
            : withCard
              ? "Copy the link and open it in Safari to sign in, and your card comes with you."
              : "Open this page in Safari to sign in with one tap."}
        </p>

        {platform === "android" ? (
          <a
            href={here === "" ? undefined : chromeIntentUrl(here)}
            onClick={(event) => void handleContinue(event)}
            aria-busy={busy}
            className={`${PRIMARY_BUTTON} mt-6 w-full`}
          >
            {busy ? "Opening Chrome…" : "Open in Chrome"}
          </a>
        ) : (
          <>
            {withCard ? null : (
              <div className="mt-5">
                <IosIllustration host={here === "" ? "" : new URL(here).host} />
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
            )}
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
                ? "Paste it into Safari’s address bar."
                : copied === "failed"
                  ? withCard
                    ? "Could not copy. Please try again."
                    : "Could not copy. Use the menu above instead."
                  : ""}
            </p>
          </>
        )}

        <div className={`${platform === "android" ? "mt-2" : ""} flex justify-center`}>
          <button
            type="button"
            onClick={onStay}
            className="inline-flex min-h-11 items-center rounded px-3 text-sm font-medium text-[var(--paper-muted)] underline decoration-[var(--paper-gold)] underline-offset-4 transition-colors duration-150 hover:text-[var(--paper-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paper-emerald)]"
          >
            Stay here
          </button>
        </div>
      </div>
    </div>
  );
}
