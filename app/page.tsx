import type { Metadata } from "next";
import CallToAction from "@/components/landing/CallToAction";
import Designs from "@/components/landing/Designs";
import Faq from "@/components/landing/Faq";
import GuestManagement from "@/components/landing/GuestManagement";
import HelpFooter from "@/components/landing/HelpFooter";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import LandingHeader from "@/components/landing/LandingHeader";
import Pricing from "@/components/landing/Pricing";
import { LOWEST_PRICE_PAISE, formatPriceRs } from "@/lib/pricing";

/*
  The one address this page should be indexed under: the site answers on two
  hosts, and this names which. Relative, so the metadataBase in app/layout.tsx
  resolves it. The title is absolute: this page is the brand's own.
*/
export const metadata: Metadata = {
  title: { absolute: "Lifafa | Digital invitations that tell you who is coming" },
  description:
    `Choose a beautiful digital invitation for your wedding or celebration, share one link on WhatsApp, and see every reply and your headcount in one place. From ${formatPriceRs(LOWEST_PRICE_PAISE)} per event.`,
  alternates: { canonical: "/" },
};

/**
 * The landing page, for a host arriving on a phone from an ad: what Lifafa
 * is and the way in on the first screen, then the designs, the three steps,
 * the guest management a host is paying for, the two prices, the questions
 * and a last way in.
 *
 * Built to be light on a slow connection. Every section is a server component
 * except the hero's crossfade, so the page is in the HTML and needs almost no
 * script; nothing plays a video; every picture is a WebP resized for where it
 * is shown, and every one below the first screen is fetched only as it comes
 * near.
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
        <Designs />
        <HowItWorks />
        <GuestManagement />
        <Pricing />
        <Faq />
        <CallToAction />
      </main>
      <HelpFooter />
    </div>
  );
}
