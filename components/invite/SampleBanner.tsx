"use client";

import Link from "next/link";
import type { ReactElement } from "react";
import PinnedStrip, { PINNED_STRIP_ACTION } from "@/components/invite/PinnedStrip";
import { LOWEST_PRICE_PAISE, formatPrice } from "@/lib/pricing";
import { NEW_CARD_HREF } from "@/lib/wizardSteps";

/**
 * The strip across the top of the sample invitation.
 *
 * The sample is drawn exactly as a guest's link is, which is the point of it,
 * and so nothing on the card itself can say that it is not a real invitation
 * to a real wedding. This says it, for as long as the card is open, and
 * offers the one thing a visitor who likes it would do next.
 *
 * On a template's live demo that is a card on that template: `start` is
 * where its "Create yours" leads (the wizard's details step, the template
 * already chosen) and what it costs. Without it, as on the Nikah sample, the
 * button opens the gallery and the price is the lowest there is.
 *
 * How it is pinned, and how the card keeps clear of it, is PinnedStrip's.
 */
export default function SampleBanner({
  start,
}: {
  start?: { href: string; pricePaise: number };
}): ReactElement {
  return (
    <PinnedStrip
      label="Sample invitation"
      slim
      action={
        <Link
          href={start?.href ?? NEW_CARD_HREF}
          className={PINNED_STRIP_ACTION}
        >
          Create yours
        </Link>
      }
    >
      <span className="font-semibold text-[var(--lifafa-marigold)]">
        This is a sample invitation.
      </span>{" "}
      {start !== undefined
        ? `Create yours for ${formatPrice(start.pricePaise)}.`
        : `Create yours from ${formatPrice(LOWEST_PRICE_PAISE)}.`}
    </PinnedStrip>
  );
}
