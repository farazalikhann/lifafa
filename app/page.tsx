import type { Metadata } from "next";
import MetaPixelNoscript from "@/components/analytics/MetaPixelNoscript";
import CallToAction from "@/components/landing/CallToAction";
import DemoSection from "@/components/landing/DemoSection";
import Faq from "@/components/landing/Faq";
import GuestManagement from "@/components/landing/GuestManagement";
import HelpFooter from "@/components/landing/HelpFooter";
import Hero from "@/components/landing/Hero";
import LandingHeader from "@/components/landing/LandingHeader";
import Pricing from "@/components/landing/Pricing";
import { LOWEST_PRICE_PAISE, formatPriceRs } from "@/lib/pricing";

/*
  The one address this page should be indexed under: the site answers on two
  hosts, and this names which. Relative, so the metadataBase in app/layout.tsx
  resolves it. The title is absolute: this page is the brand's own.
*/
export const metadata: Metadata = {
  title: { absolute: "Lifafa | Wedding invitations that also tell you who is coming" },
  description:
    `Digital wedding invitations that also tell you who is coming. Choose a design, add your details, share one link on WhatsApp and see every reply and your headcount in one place. From ${formatPriceRs(LOWEST_PRICE_PAISE)} per event.`,
  alternates: { canonical: "/" },
};

/**
 * The landing page, for a host arriving on a phone from an ad. The first
 * screen is the name, what it is, how a card is made in four steps and the
 * way in; then the Premium designs as a guest sees them, what the invitation
 * does after it is sent, the price, four questions and a last way in.
 *
 * Built to be light on a slow connection. Every section is a server component
 * except the step diagram, the scroll cue and the demo row's dots, so the page
 * is in the HTML and needs little script; nothing plays a video; the first
 * screen has no picture at all, and every picture below it is a WebP resized
 * for where it is shown and fetched only once the page has loaded.
 */
export default function Page() {
  return (
    /*
      The header is a sibling of <main>: it is site navigation, not part of
      the page's content. The wrapper carries the landing page's warmer ink;
      see `.lifafa-landing` in globals.css.
    */
    <div className="lifafa-landing">
      <LandingHeader />
      <main>
        <Hero />
        <DemoSection />
        <GuestManagement />
        <Pricing />
        <Faq />
        <CallToAction />
      </main>
      <HelpFooter />
      <MetaPixelNoscript />
    </div>
  );
}
