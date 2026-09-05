import Hero from "@/components/landing/Hero";
import LandingHeader from "@/components/landing/LandingHeader";
import ScrollStory from "@/components/landing/ScrollStory";
import Pricing from "@/components/landing/Pricing";
import CallToAction from "@/components/landing/CallToAction";
import HelpFooter from "@/components/landing/HelpFooter";

export default function Page() {
  return (
    /*
      The header is a sibling of <main> rather than inside it: it is site
      navigation, not part of the page's content, and a landmark nested in the
      main landmark reads wrong to anything navigating by them.

      It is fixed, so it adds no height and the hero still opens on a full
      viewport of its own — nothing below this line changed to make room.
    */
    <>
      <LandingHeader />
      <main>
        <Hero />
        <ScrollStory />
        <Pricing />
        <CallToAction />
        <HelpFooter />
      </main>
    </>
  );
}
