"use client";

import Link from "next/link";
import Rupees from "@/components/type/Rupees";
import LinkPending from "@/components/landing/LinkPending";
import type { ReactElement } from "react";
import { useAdParamsHref } from "@/hooks/useAdParamsHref";
import PinnedStrip, {
  PINNED_STRIP_ACTION,
  PINNED_STRIP_HIGHLIGHT,
} from "@/components/invite/PinnedStrip";
import { LOWEST_PRICE_PAISE, formatPrice } from "@/lib/pricing";
import type { StripTone } from "@/lib/stripTone";
import { CREATE_THIS_CARD, NEW_CARD_HREF } from "@/lib/wizardSteps";

/**
 * The strip across the top of the sample invitation.
 *
 * The sample is drawn exactly as a guest's link is, which is the point of it,
 * and so nothing on the card itself can say that it is not a real invitation
 * to a real wedding. This says it, for as long as the card is open, and
 * offers the one thing a visitor who likes it would do next.
 *
 * On a template's live demo that is a card on that template: `start` is
 * where its "Create this card" leads (the wizard's details step, the template
 * already chosen) and what it costs. Without it, as on the Nikah sample, the
 * button reads "Create yours", opens the gallery, and the price is the lowest
 * there is. Either way the ad's tags go with it (hooks/useAdParamsHref.ts).
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
  const adHref = useAdParamsHref();

  return (
    <PinnedStrip
      label="Sample invitation"
      slim
      tone={tone ?? undefined}
      action={
        <Link
          href={adHref(start?.href ?? NEW_CARD_HREF)}
          className={PINNED_STRIP_ACTION}
        >
          <LinkPending>
            {start === undefined ? (
              "Create yours"
            ) : (
              <>
                {/* On a phone the bar at the foot carries the whole words; the strip keeps short. */}
                <span className="sm:hidden">Create this card</span>
                <span className="max-sm:hidden">{CREATE_THIS_CARD}</span>
              </>
            )}
          </LinkPending>
        </Link>
      }
    >
      <span className={PINNED_STRIP_HIGHLIGHT}>
        This is a sample invitation.
      </span>{" "}
      {start !== undefined ? "Create yours for " : "Create yours from "}
      <Rupees text={formatPrice(start !== undefined ? start.pricePaise : LOWEST_PRICE_PAISE)} />.
    </PinnedStrip>
  );
}
