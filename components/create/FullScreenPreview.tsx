"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import CardCanvas from "@/components/card/CardCanvas";
import Watermark from "@/components/card/Watermark";
import type { Motif } from "@/lib/motifs";
import { getPalette } from "@/lib/palettes";
import type { Theme } from "@/lib/themes";
import type { CardConfig } from "@/types/card";
import type { EventDraft } from "@/types/event";

type DeviceId = "phone" | "desktop";

interface Device {
  id: DeviceId;
  label: string;
  /** Card width in CSS pixels, capped by the screen on anything narrower. */
  width: number;
}

const DEVICES: readonly Device[] = [
  { id: "phone", label: "Phone", width: 390 },
  { id: "desktop", label: "Desktop", width: 480 },
];

/**
 * Everything that can hold focus inside the overlay.
 *
 * Queried live on each Tab rather than captured on open, because the device
 * toggle re-renders and the card's own content can change under it — a stale
 * list would trap focus on a node that is no longer in the document.
 */
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

function focusableWithin(root: HTMLElement): readonly HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((element) => element.offsetParent !== null);
}

function devicePillClass(isSelected: boolean): string {
  return [
    "min-h-11 rounded-full border px-4 text-[0.8125rem] font-medium transition-colors duration-150",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]",
    isSelected
      ? "border-transparent bg-[var(--lifafa-ink-raised)] text-[var(--lifafa-cream)] ring-2 ring-[var(--lifafa-marigold)]"
      : "border-[var(--lifafa-hairline)] text-[var(--lifafa-muted)] hover:text-[var(--lifafa-cream)]",
  ].join(" ");
}

/**
 * The invitation with nothing of the editor around it.
 *
 * The phone frame on /create is an honest preview of the proportions but not of
 * the experience: it is 380px of a 1440px screen, with a form beside it. This
 * gives the host the other half of the answer — the card alone, at the width a
 * guest's device will give it, scrolled the way a guest will scroll it.
 *
 * Watermarked, because the point of showing the finished thing is to sell it.
 * The mark is drawn over the card rather than into it, so nothing about the
 * invitation itself changes when payment removes it.
 *
 * Rendered into `document.body` through a portal, not in place. Its trigger
 * lives inside the editor's `lg:sticky` preview column, and a sticky box opens
 * a stacking context even with no z-index of its own — so an overlay rendered
 * there would have its z-50 sealed inside a layer sitting below the page's own
 * sticky header, and "above everything" would quietly stop being true at `lg`.
 * The portal only ever runs on the client: nothing mounts this until a click.
 */
export default function FullScreenPreview({
  draft,
  theme,
  config,
  motifs,
  triggerRef,
  onClose,
}: {
  draft: EventDraft;
  theme: Theme;
  config: CardConfig;
  motifs: readonly Motif[];
  /** Focus returns here on close, so the host lands where they left. */
  triggerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}): ReactElement {
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [deviceId, setDeviceId] = useState<DeviceId>("phone");
  const titleId = useId();

  const device = DEVICES.find((entry) => entry.id === deviceId) ?? DEVICES[0];
  const palette = getPalette(config.style.paletteId);

  /*
    onClose comes from the parent and is not guaranteed to be stable, so the
    key handler reads it through a ref instead of closing over it. Otherwise
    the document listener would be torn down and rebuilt on every render of
    the editor — once per keystroke in the form behind this overlay.
  */
  const onCloseRef = useRef<() => void>(onClose);
  onCloseRef.current = onClose;

  const handleClose = useCallback((): void => {
    onCloseRef.current();
  }, []);

  /*
    Scroll lock.

    The cleanup restores whatever the page had before, and it runs on unmount
    as well as on close — so an overlay torn down while still open (a route
    change, an error boundary) cannot leave the page behind it frozen.
  */
  useEffect(() => {
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, []);

  /*
    Focus in on open, and back to the trigger on the way out. The return is a
    cleanup rather than a line in the close handler, so it happens however the
    overlay goes away.
  */
  useEffect(() => {
    closeButtonRef.current?.focus();

    return () => {
      triggerRef.current?.focus();
    };
  }, [triggerRef]);

  /*
    Escape to close, and Tab kept inside.

    Listening on the document rather than on the overlay covers the case an
    overlay-scoped listener would miss: a tap on the card is a tap on something
    unfocusable, which leaves focus on <body> — outside the overlay, where no
    keydown of ours would ever fire again. When a key does arrive from outside,
    focus is pulled back in rather than allowed to walk the page behind.
  */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const overlay = overlayRef.current;

      if (overlay === null) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = focusableWithin(overlay);

      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (!(active instanceof HTMLElement) || !overlay.contains(active)) {
        event.preventDefault();
        first.focus();
        return;
      }

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return createPortal(
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex flex-col bg-[var(--lifafa-ink)]"
    >
      <h2 id={titleId} className="sr-only">
        Full screen preview of your invitation
      </h2>

      {/*
        Toggles left, close right. Both sides are pills of the same height, so
        at 360px the row is a single line of tappable targets with room over.
      */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--lifafa-hairline)] px-3 py-2 sm:px-5">
        <div className="flex items-center gap-2">
          {DEVICES.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={option.id === deviceId}
              onClick={() => setDeviceId(option.id)}
              className={devicePillClass(option.id === deviceId)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button
          ref={closeButtonRef}
          type="button"
          aria-label="Close preview"
          onClick={handleClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--lifafa-hairline)] text-[var(--lifafa-muted)] transition-colors duration-150 hover:text-[var(--lifafa-cream)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      {/*
        min-h-0 is what lets this shrink inside the column: without it the flex
        item takes its content height, the card runs off the bottom of the
        screen and the footer goes with it.
      */}
      <div className="lifafa-no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div
          className="relative mx-auto w-full"
          style={{
            maxWidth: `${device.width}px`,
            backgroundColor: palette.background,
          }}
        >
          {/*
            CardCanvas caps itself at 420px, the width of the editor's frame.
            Desktop is wider than that, so the cap is lifted and the width comes
            from this wrapper instead — which is also what keeps a 390px phone
            preview inside a 360px screen.
          */}
          <div className="[&>*]:max-w-none">
            <CardCanvas
              draft={draft}
              theme={theme}
              config={config}
              motifs={motifs}
              sizing="viewport"
              /* "Exactly what your guests will see" has to include the doing. */
              audience="guest"
            />
          </div>

          <Watermark
            show
            accent={config.style.accentOverride ?? palette.accent}
            surface={palette.surface}
          />
        </div>
      </div>

      <footer className="shrink-0 border-t border-[var(--lifafa-hairline)] px-4 py-3 text-center text-xs text-[var(--lifafa-muted)]">
        This is exactly what your guests will see.
      </footer>
    </div>,
    document.body,
  );
}
