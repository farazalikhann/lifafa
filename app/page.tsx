import type { Metadata } from "next";
import type { ReactElement, ReactNode } from "react";
import MetaPixelNoscript from "@/components/analytics/MetaPixelNoscript";
import CallToAction from "@/components/landing/CallToAction";
import Comparison from "@/components/landing/Comparison";
import Faq from "@/components/landing/Faq";
import Features from "@/components/landing/Features";
import HelpFooter from "@/components/landing/HelpFooter";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import LandingHeader from "@/components/landing/LandingHeader";
import PremiumShowcase, { demoPath } from "@/components/landing/PremiumShowcase";
import Pricing from "@/components/landing/Pricing";
import SectionRule from "@/components/landing/SectionRule";
import SideStrips, { type StripPattern } from "@/components/landing/SideStrips";
import { paperSans } from "@/components/theme/fonts";
import { LOWEST_PRICE_PAISE, formatPrice } from "@/lib/pricing";
import { listedPremium } from "@/templates/premium";

/*
  The one address this page should be indexed under: the site answers on two
  hosts, and this names which. Relative, so the metadataBase in app/layout.tsx
  resolves it. The title is absolute: this page is the brand's own.
*/
export const metadata: Metadata = {
  title: { absolute: "Lifafa | Wedding invitations that tell you who is coming" },
  description: `Digital wedding invitations that tell you who is coming. Choose a design, add your details, share one link on WhatsApp and see every reply and your headcount in one place. From ${formatPrice(LOWEST_PRICE_PAISE)} per event.`,
  alternates: { canonical: "/" },
};

/** One section with its pair of side patterns, which scroll with it. */
function Band({
  pattern,
  children,
}: {
  pattern: StripPattern;
  children: ReactNode;
}): ReactElement {
  return (
    <div className="relative [&>section]:relative">
      <SideStrips pattern={pattern} />
      {children}
    </div>
  );
}

/**
 * The landing page, light and editorial (DESIGN.md at the repo root), for a
 * host arriving on a phone from an ad: what Lifafa is and the two ways on,
 * the Premium designs opening on a phone, how it works, how it compares, what
 * it does, the price, six questions and a last way in.
 *
 * Built to be light on a slow connection. Every section is a server component
 * except the carousel, so the page is in the HTML and the first screen is
 * text alone: it paints without waiting for a picture or a video. Only the
 * centred slide's video is ever fetched, and only once the carousel is near.
 */
export default function Page() {
  /* The hero's live demo: the first premium design the gallery lists. */
  const first = listedPremium()[0];
  const demoHref = first === undefined ? "/demo/nikah" : demoPath(first.id);

  return (
    /*
      The header is a sibling of <main>: it is site navigation, not part of
      the page's content. The wrapper carries the light theme and the landing
      page's own Manrope; see `.lifafa-paper` in globals.css. overflow-x clip
      keeps the side patterns from ever widening the page.
    */
    <div className={`lifafa-paper ${paperSans.variable} relative overflow-x-clip`}>
      {/* The page's ivory from the first byte, so an overscroll never shows the product's dark ink. */}
      <style>{"html,body{background-color:#f6efe0}"}</style>
      <LandingHeader />
      <main>
        <Band pattern="seigaiha">
          <Hero demoHref={demoHref} />
          <PremiumShowcase />
        </Band>
        <SectionRule />
        <Band pattern="asanoha">
          <HowItWorks />
        </Band>
        <SectionRule />
        <Band pattern="seigaiha">
          <Comparison />
        </Band>
        <SectionRule />
        <Band pattern="asanoha">
          <Features />
        </Band>
        <SectionRule />
        <Band pattern="seigaiha">
          <Pricing />
        </Band>
        <SectionRule />
        <Band pattern="asanoha">
          <Faq />
        </Band>
        <CallToAction />
      </main>
      <HelpFooter />
      <MetaPixelNoscript />
    </div>
  );
}
