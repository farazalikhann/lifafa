import type { Metadata } from "next";
import type { ReactElement } from "react";
import InviteExperience from "@/components/invite/InviteExperience";
import SampleBanner from "@/components/invite/SampleBanner";
import {
  DEMO_CHECKIN_TOKEN,
  DEMO_NIKAH,
  DEMO_NIKAH_GROUND,
  DEMO_NIKAH_PATH,
} from "@/lib/demoCards";
import { canonicalSiteOrigin } from "@/lib/siteUrl";

/**
 * The sample invitation, opened whole.
 *
 * Exactly what a guest's link shows, drawn by the same component from the
 * same shape of event: the curtain, its film and its light, then the card
 * with everything on it moving, and the reply form under it. The event is the
 * one in lib/demoCards.ts and no other: nothing here reads the database, so
 * the page is built once and served to everyone.
 *
 * A reply is answered as a real one is, pass and all, and goes nowhere: see
 * `sample` on InviteExperience.
 *
 * Indexed, on purpose. It is the product, shown working, and a page somebody
 * searching for a Nikah invitation should be able to land on.
 */

const TITLE = "Sample Nikah invitation: Ayaan Siddiqui & Zoya Rizvi";
const DESCRIPTION =
  "Open a sample digital Nikah invitation made with Lifafa: a curtain reveal, Bismillah and dua, the couple, a countdown, the venue with directions, every function and a reply form.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: DEMO_NIKAH_PATH },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: DEMO_NIKAH_PATH,
  },
};

export default function DemoNikahPage(): ReactElement {
  const { language } = DEMO_NIKAH.config;

  return (
    <>
      {/* The card's colour from the first byte, as on a guest's link; see app/i/[inviteCode]/page.tsx. */}
      <style>{`html,body{background-color:${DEMO_NIKAH_GROUND}}`}</style>
      <SampleBanner />
      <InviteExperience
        event={DEMO_NIKAH}
        initialLanguage={language}
        linkLanguage={null}
        /* A sample has no day to be over after: its replies never close. */
        ended={false}
        weather={null}
        inviteUrl={`${canonicalSiteOrigin()}${DEMO_NIKAH_PATH}`}
        sample={{ checkinToken: DEMO_CHECKIN_TOKEN }}
      />
    </>
  );
}
