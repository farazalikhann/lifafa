"use client";

import Link from "next/link";
import type { ReactElement } from "react";
import PinnedStrip, { PINNED_STRIP_ACTION } from "@/components/invite/PinnedStrip";

/**
 * The strip across the top of an unpaid invitation, shown to its host only.
 *
 * The page decides who sees it, on the server (the "preview" case of
 * getGuestEvent in lib/db/inviteEvent.ts): a guest opening an unpaid link never
 * reaches the card at all, so this is only ever in front of the person who can
 * do something about it.
 *
 * How it is pinned, and how the card keeps clear of it, is PinnedStrip's.
 */
export default function HostPreviewBanner({
  eventId,
}: {
  eventId: string;
}): ReactElement {
  return (
    <PinnedStrip
      label="Preview"
      action={
        <Link
          /* The payment panel on the dashboard, which is the existing checkout. */
          href={`/dashboard/${eventId}#payment-banner-heading`}
          className={PINNED_STRIP_ACTION}
        >
          Pay now
        </Link>
      }
    >
      <span className="font-semibold text-[var(--lifafa-marigold)]">
        Preview only.
      </span>{" "}
      Guests cannot open this link until you complete payment.
    </PinnedStrip>
  );
}
