"use client";

import { useState, type ReactElement } from "react";
import { useAdParamsHref } from "@/hooks/useAdParamsHref";
import { viewContent } from "@/lib/metaPixel";
import type { TemplateConfig } from "@/templates/types";
import {
  TemplateGalleryView,
  type GalleryFilter,
} from "@/components/wizard/TemplateGalleryView";

/**
 * A template looked at, for the ads: its live demo opened, or chosen. Sent on
 * the tap itself, before the demo link leaves the page; lib/metaPixel.ts
 * sends it once per template per tab.
 */
function looked(template: TemplateConfig): void {
  viewContent({
    id: template.id,
    tier: template.collection,
    pricePaise: template.price,
  });
}

/**
 * Step 1: the templates, in their two collections.
 *
 * THE PREMIUM COLLECTION is first: the templates with a card of their own,
 * each made for any wedding, so it has no chips to filter by. THE TRADITIONS
 * COLLECTION follows, with a chip to a tradition and one for any occasion.
 *
 * Each card is the template's preview (the first screen of its sample
 * invitation, at 360px), its name, its price, a link that opens the sample
 * itself, and Select. Tapping the preview opens the sample as that link does,
 * with the same ViewContent: the picture is what visitors tap. Two to a row
 * on a phone, where each is still wide enough for both buttons at 44px.
 *
 * Choosing here only says which template; what that does to the card is the
 * wizard's business (switchTemplate), which keeps every detail the host has
 * typed. On a paid invitation a template that costs more than the one it was
 * paid for is shown and cannot be chosen; the server refuses that save too.
 */
export default function TemplateGallery({
  selectedId,
  onSelect,
  paidPricePaise = null,
}: {
  selectedId: string;
  onSelect: (template: TemplateConfig) => void;
  /** On a paid invitation, the price of the template it was paid on; null before payment. */
  paidPricePaise?: number | null;
}): ReactElement {
  const adHref = useAdParamsHref();
  const [filter, setFilter] = useState<GalleryFilter>("all");

  /* Drawn by TemplateGalleryView, which the server also draws as the first screen. */
  return (
    <TemplateGalleryView
      selectedId={selectedId}
      paidPricePaise={paidPricePaise}
      filter={filter}
      onFilter={setFilter}
      onSelect={onSelect}
      onLooked={looked}
      demoHref={adHref}
    />
  );
}
