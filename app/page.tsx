import type { Metadata } from "next";
import Hero from "@/components/landing/Hero";
import LandingHeader from "@/components/landing/LandingHeader";
import Showcase from "@/components/landing/Showcase";
import ScrollStory from "@/components/landing/ScrollStory";
import HowItWorks from "@/components/landing/HowItWorks";
import Pricing from "@/components/landing/Pricing";
import Faq from "@/components/landing/Faq";
import CallToAction from "@/components/landing/CallToAction";
import HelpFooter from "@/components/landing/HelpFooter";

/*
  The one address this page should be indexed under.

  The site answers on two hosts — www.getlifafa.co.in redirects to the bare
  getlifafa.co.in — and a redirect alone leaves a crawler that reached www by
  some other route to decide for itself which is the real one. This says so.
  Relative, so the metadataBase in app/layout.tsx resolves it, which means the
  host comes from lib/siteUrl.ts here as everywhere else.
*/
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Page() {
  return (
    /*
      The header is a sibling of <main> rather than inside it: it is site
      navigation, not part of the page's content, and a landmark nested in the
      main landmark reads wrong to anything navigating by them.

      It is fixed, so it adds no height and the hero still opens on a full
      viewport of its own — nothing below this line changed to make room.

      The wrapper carries the landing page's warmer ink; see `.lifafa-landing`
      in globals.css. The header is inside it so its translucent bar is tinted
      with the same ink as the page behind it.
    */
    <div className="lifafa-landing">
      <LandingHeader />
      <main>
        <Hero />
        {/*
          Straight after the hero: a visitor who has just read "beautiful
          invitations" is shown some before being told how the product works.
        */}
        <Showcase />
        <ScrollStory />
        <HowItWorks />
        <Pricing />
        {/*
          After the price, because that is when these get asked: a visitor who
          has just read ₹999 wants to know what it covers before they tap.
        */}
        <Faq />
        <CallToAction />
        <HelpFooter />
      </main>
    </div>
  );
}
