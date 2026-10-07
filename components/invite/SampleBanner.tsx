"use client";

import Link from "next/link";
import type { ReactElement } from "react";
import PinnedStrip, { PINNED_STRIP_ACTION } from "@/components/invite/PinnedStrip";
import { INVITATION_PRICE_INR, formatInr } from "@/lib/pricing";

/**
 * The strip across the top of the sample invitation.
 *
 * The sample is drawn exactly as a guest's link is, which is the point of it,
 * and so nothing on the card itself can say that it is not a real invitation
 * to a real wedding. This says it, for as long as the card is open, and
 * offers the one thing a visitor who likes it would do next.
 *
 * How it is pinned, and how the card keeps clear of it, is PinnedStrip's.
 */
export default function SampleBanner(): ReactElement {
  return (
    <PinnedStrip
      label="Sample invitation"
      slim
      action={
        <Link href="/create" className={PINNED_STRIP_ACTION}>
          Create yours
        </Link>
      }
    >
      <span className="font-semibold text-[var(--lifafa-marigold)]">
        This is a sample invitation.
      </span>{" "}
      Create yours for {formatInr(INVITATION_PRICE_INR)}.
    </PinnedStrip>
  );
}
