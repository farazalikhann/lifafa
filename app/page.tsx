import Hero from "@/components/landing/Hero";
import ScrollStory from "@/components/landing/ScrollStory";
import Pricing from "@/components/landing/Pricing";
import CallToAction from "@/components/landing/CallToAction";
import HelpFooter from "@/components/landing/HelpFooter";

export default function Page() {
  return (
    <main>
      <Hero />
      <ScrollStory />
      <Pricing />
      <CallToAction />
      <HelpFooter />
    </main>
  );
}
