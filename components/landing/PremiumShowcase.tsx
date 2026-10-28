import type { ReactElement } from "react";
import { BrushField, BrushWash } from "@/components/landing/Brush";
import PremiumCarousel, { type CarouselSlide } from "@/components/landing/PremiumCarousel";
import { OPENING_PREVIEWS } from "@/components/landing/previews";
import { EYEBROW, SECTION_HEADING, TEXT_LINK } from "@/components/landing/styles";
import { LOWEST_PRICE_PAISE, formatPrice } from "@/lib/pricing";
import { NEW_CARD_HREF, templateStartHref } from "@/lib/wizardSteps";
import { listedPremium } from "@/templates/premium";

/**
 * A template's live demo. Written out rather than taken from
 * lib/templateSamples.ts, which would bring the whole template registry onto
 * this page for one string.
 */
export function demoPath(templateId: string): string {
  return `/demo/${templateId}`;
}

/** The id the hero's second button and any in-page link can lead to. */
export const SHOWCASE_ID = "designs";

/**
 * The slides, from the gallery's own listing of the Premium Collection:
 * only listed templates with a preview, in the gallery's order. A template
 * that is not listed yet never appears here. Each shows its recorded opening
 * (components/landing/previews.ts) when it has one, and its gallery preview
 * when it does not.
 */
export function premiumSlides(): CarouselSlide[] {
  return listedPremium().map((template) => {
    const recorded = OPENING_PREVIEWS[template.id];

    return {
      id: template.id,
      name: template.name,
      priceLabel: `Premium, ${formatPrice(template.price)} per event`,
      href: templateStartHref(template.id),
      demoHref: demoPath(template.id),
      poster: recorded?.poster ?? template.preview.src,
      video:
        recorded === undefined
          ? undefined
          : { mp4: recorded.mp4, webm: recorded.webm },
    };
  });
}

/** The Premium Collection, straight under the hero, as a carousel of phones. */
export default function PremiumShowcase(): ReactElement {
  const slides = premiumSlides();

  return (
    <section
      id={SHOWCASE_ID}
      aria-labelledby="showcase-heading"
      className="isolate scroll-mt-16 pb-16 lg:pb-24"
    >
      <div className="px-5 text-center sm:px-14 lg:px-24">
        <p className={EYEBROW}>Premium Collection</p>
        <h2 id="showcase-heading" className={`mt-3 ${SECTION_HEADING}`}>
          See the opening your guests will see
        </h2>
      </div>

      <div className="relative mt-6 lg:mt-8">
        {/* A soft emerald pool under the lower half of the phones. */}
        <BrushField>
          <BrushWash
            tone="emerald"
            opacity={0.16}
            className="bottom-[-30%] left-1/2 aspect-square w-[130vw] max-w-[52rem] -translate-x-1/2 lg:top-[66%] lg:bottom-auto"
          />
        </BrushField>
        <PremiumCarousel slides={slides} label="Premium Collection designs" />
      </div>

      <p className="mt-6 text-center">
        <a href={NEW_CARD_HREF} className={TEXT_LINK}>
          See every design, from {formatPrice(LOWEST_PRICE_PAISE)}
        </a>
      </p>
    </section>
  );
}
