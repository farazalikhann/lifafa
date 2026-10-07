"use client";

import { useLayoutEffect, useRef, type ReactElement, type ReactNode } from "react";

/**
 * A strip pinned across the top of an invitation, above everything on it.
 *
 * Fixed above everything, the cover included, and it publishes its own height
 * as --lifafa-preview-h on <html>. The language switch, the cover's drawing and
 * the card each sit that much lower, so the strip covers none of them. On a
 * page with no strip the variable is never set and all three read it as 0.
 *
 * Two pages have one: a host looking at their unpaid card (HostPreviewBanner)
 * and anyone looking at the sample (SampleBanner). Only ever one to a page.
 */
export default function PinnedStrip({
  label,
  children,
  action,
  slim = false,
}: {
  /** What the strip is, for a screen reader moving by landmark. */
  label: string;
  /** The line it says. */
  children: ReactNode;
  /** The one thing it offers to do, at its right. */
  action: ReactNode;
  /**
   * Kept to one row on a phone: the line wraps beside the button and the
   * button never drops under it. For a strip that stays up for the whole of
   * a card somebody is reading, where every row it takes is a row of card.
   */
  slim?: boolean;
}): ReactElement {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const strip = ref.current;
    const root = document.documentElement;

    if (strip === null) {
      return;
    }

    const publish = (): void => {
      root.style.setProperty(
        "--lifafa-preview-h",
        `${Math.ceil(strip.getBoundingClientRect().height)}px`,
      );
    };

    publish();
    const observer =
      typeof ResizeObserver === "function" ? new ResizeObserver(publish) : null;
    observer?.observe(strip);

    return () => {
      observer?.disconnect();
      root.style.removeProperty("--lifafa-preview-h");
    };
  }, []);

  return (
    <div
      ref={ref}
      role="region"
      aria-label={label}
      className="fixed inset-x-0 top-0 z-[70] border-b border-[var(--lifafa-marigold)]/40 bg-[var(--lifafa-ink)]/95 backdrop-blur"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div
        className={`mx-auto flex max-w-3xl items-center justify-between gap-x-4 gap-y-2 px-4 ${
          slim ? "py-1.5" : "flex-wrap py-2.5"
        }`}
      >
        <p
          className={`min-w-0 flex-1 text-[0.8125rem] leading-snug text-[var(--lifafa-cream)] ${
            slim ? "text-balance" : "basis-[16rem]"
          }`}
        >
          {children}
        </p>
        {action}
      </div>
    </div>
  );
}

/** The strip's button: the marigold pill both strips end in. */
export const PINNED_STRIP_ACTION =
  "inline-flex min-h-11 shrink-0 items-center rounded-full bg-[var(--lifafa-marigold)] px-5 text-[0.8125rem] font-semibold whitespace-nowrap text-[var(--lifafa-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]";
