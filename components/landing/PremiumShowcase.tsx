import type { ReactElement } from "react";
import PremiumCarousel, { type CarouselSlide } from "@/components/landing/PremiumCarousel";
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
 * that is not listed yet never appears here.
 */
export function premiumSlides(): CarouselSlide[] {
  return listedPremium().map((template) => ({
    id: template.id,
    name: template.name,
    priceLabel: `Premium, ${formatPrice(template.price)} per event`,
    href: templateStartHref(template.id),
    demoHref: demoPath(template.id),
    poster: template.preview.src,
  }));
}

/** The Premium Collection, straight under the hero, as a carousel of phones. */
export default function PremiumShowcase(): ReactElement {
  const slides = premiumSlides();

  return (
    <section
      id={SHOWCASE_ID}
      aria-labelledby="showcase-heading"
      className="scroll-mt-16 pb-16 lg:pb-24"
    >
      <div className="px-5 text-center sm:px-14 lg:px-24">
        <p className={EYEBROW}>Premium Collection</p>
        <h2 id="showcase-heading" className={`mt-3 ${SECTION_HEADING}`}>
          See the opening your guests will see
        </h2>
      </div>

      <div className="mt-6 lg:mt-8">
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
