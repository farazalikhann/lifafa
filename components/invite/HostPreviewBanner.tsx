"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, type ReactElement } from "react";

/**
 * The strip across the top of an unpaid invitation, shown to its host only.
 *
 * The page decides who sees it, on the server (the "preview" case of
 * getGuestEvent in lib/db/inviteEvent.ts): a guest opening an unpaid link never
 * reaches the card at all, so this is only ever in front of the person who can
 * do something about it.
 *
 * Fixed above everything, the cover included, and it publishes its own height
 * as --lifafa-preview-h on <html>. The language switch, the cover's drawing and
 * the card each sit that much lower, so the banner covers none of them. On a
 * guest's page the variable is never set and all three read it as 0.
 */
export default function HostPreviewBanner({
  eventId,
}: {
  eventId: string;
}): ReactElement {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const banner = ref.current;
    const root = document.documentElement;

    if (banner === null) {
      return;
    }

    const publish = (): void => {
      root.style.setProperty(
        "--lifafa-preview-h",
        `${Math.ceil(banner.getBoundingClientRect().height)}px`,
      );
    };

    publish();
    const observer =
      typeof ResizeObserver === "function" ? new ResizeObserver(publish) : null;
    observer?.observe(banner);

    return () => {
      observer?.disconnect();
      root.style.removeProperty("--lifafa-preview-h");
    };
  }, []);

  return (
    <div
      ref={ref}
      role="region"
      aria-label="Preview"
      className="fixed inset-x-0 top-0 z-[70] border-b border-[var(--lifafa-marigold)]/40 bg-[var(--lifafa-ink)]/95 backdrop-blur"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5">
        <p className="min-w-0 flex-1 basis-[16rem] text-[0.8125rem] leading-snug text-[var(--lifafa-cream)]">
          <span className="font-semibold text-[var(--lifafa-marigold)]">
            Preview only.
          </span>{" "}
          Guests cannot open this link until you complete payment.
        </p>
        <Link
          /* The payment panel on the dashboard, which is the existing checkout. */
          href={`/dashboard/${eventId}#payment-banner-heading`}
          className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-[var(--lifafa-marigold)] px-5 text-[0.8125rem] font-semibold whitespace-nowrap text-[var(--lifafa-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
        >
          Pay now
        </Link>
      </div>
    </div>
  );
}
