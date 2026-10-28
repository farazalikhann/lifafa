import type { ReactElement } from "react";
import Link from "next/link";
import { BrushField, BrushWash } from "@/components/landing/Brush";
import Logo from "@/components/brand/Logo";
import LinkPending from "@/components/landing/LinkPending";
import { ON_EMERALD_BUTTON } from "@/components/landing/styles";
import { LOWEST_PRICE_PAISE, formatPrice } from "@/lib/pricing";
import { NEW_CARD_HREF } from "@/lib/wizardSteps";

/**
 * The last word before the footer: a full-width emerald band, ivory type and
 * the page's one action again, inverted so it still reads as the button.
 */
export default function CallToAction(): ReactElement {
  return (
    <section
      aria-labelledby="closing-heading"
      className="relative isolate bg-[var(--paper-emerald)] px-5 py-20 text-center sm:px-14 lg:py-28"
    >
      {/* A faint gold wash for texture; the type stays well clear of AA. */}
      <BrushField>
        <BrushWash
          tone="gold"
          opacity={0.14}
          className="top-[-20%] left-[-16%] aspect-square w-[90vw] max-w-[36rem] lg:left-[8%]"
        />
      </BrushField>
      <div className="mx-auto flex max-w-2xl flex-col items-center">
        {/* The white logo between two gold hairlines: the page signs off. */}
        <span className="flex items-center gap-4">
          <span aria-hidden="true" className="h-px w-10 bg-[var(--paper-gold)]" />
          <Logo variant="white" />
          <span aria-hidden="true" className="h-px w-10 bg-[var(--paper-gold)]" />
        </span>
        <h2
          id="closing-heading"
          className="mt-6 font-[family-name:var(--paper-display)] text-[clamp(2rem,7vw,3.25rem)] leading-[1.1] font-semibold tracking-[-0.02em] text-balance text-[var(--paper-washi)]"
        >
          Your invitation can be ready tonight
        </h2>
        <p className="mt-4 max-w-[32rem] text-base leading-[1.6] text-pretty text-[var(--paper-gold-soft)] sm:text-lg">
          Choose a design, add your details and start collecting replies in
          about 10 minutes.
        </p>
        <Link href={NEW_CARD_HREF} className={`mt-9 ${ON_EMERALD_BUTTON}`}>
          <LinkPending>Choose a design</LinkPending>
        </Link>
        <p className="mt-5 text-sm text-[var(--paper-gold-soft)]">
          From {formatPrice(LOWEST_PRICE_PAISE)} per event. One time payment.
        </p>
      </div>
    </section>
  );
}
