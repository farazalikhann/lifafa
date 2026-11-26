"use client";

import { useEffect } from "react";
import { viewContent } from "@/lib/metaPixel";

/**
 * A template's live demo landed on, for the ads: ViewContent with the
 * template's id as content_name, as the gallery sends it (TemplateGallery's
 * looked). Once per template per tab, so a demo opened from the gallery, which
 * already sent it on the tap, does not send it again. Asked for on the first
 * render; lib/metaPixel.ts holds it until the pixel is on the page and sends
 * it after the PageView. Renders nothing.
 */
export default function DemoViewContent({
  templateId,
  tier,
  pricePaise,
}: {
  templateId: string;
  tier: "premium" | "traditions";
  pricePaise: number;
}): null {
  useEffect(() => {
    viewContent({ id: templateId, tier, pricePaise });
  }, [templateId, tier, pricePaise]);

  return null;
}
