"use client";

import Link from "next/link";
import type { ReactElement } from "react";
import PinnedStrip, {
  PINNED_STRIP_ACTION,
  PINNED_STRIP_HIGHLIGHT,
} from "@/components/invite/PinnedStrip";
import { LOWEST_PRICE_PAISE, formatPrice } from "@/lib/pricing";
import type { StripTone } from "@/lib/stripTone";
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
 * Drawn in the card's own colours (`tone`, from sampleStripTone), so it
 * belongs to the invitation under it; in the strip's ink and marigold where
 * the card's colours would not read.
 *
 * How it is pinned, and how the card keeps clear of it, is PinnedStrip's.
 */
export default function SampleBanner({
  start,
  tone,
}: {
  start?: { href: string; pricePaise: number };
  tone?: StripTone | null;
}): ReactElement {
  return (
    <PinnedStrip
      label="Sample invitation"
      slim
      tone={tone ?? undefined}
      action={
        <Link
          href={start?.href ?? NEW_CARD_HREF}
          className={PINNED_STRIP_ACTION}
        >
          Create yours
        </Link>
      }
    >
      <span className={PINNED_STRIP_HIGHLIGHT}>
        This is a sample invitation.
      </span>{" "}
      {start !== undefined
        ? `Create yours for ${formatPrice(start.pricePaise)}.`
        : `Create yours from ${formatPrice(LOWEST_PRICE_PAISE)}.`}
    </PinnedStrip>
  );
}
