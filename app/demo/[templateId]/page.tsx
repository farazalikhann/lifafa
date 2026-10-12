import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import InviteExperience from "@/components/invite/InviteExperience";
import SampleBanner from "@/components/invite/SampleBanner";
import { canonicalSiteOrigin } from "@/lib/siteUrl";
import {
  DEMO_CHECKIN_TOKEN,
  templateDemoEvent,
  templateDemoPath,
} from "@/lib/templateSamples";
import { cardPalette } from "@/lib/textColors";
import { findTemplate, listedTemplates } from "@/templates/registry";

/**
 * A template's live demo: its sample invitation, opened as a guest opens one.
 *
 * What the gallery's "Live demo" button opens. The whole experience is the
 * real one, from the cover to the reply form, over a sample event that is not
 * in the database (lib/templateSamples.ts), so a reply here is answered and
 * sent nowhere, exactly as on the home page's sample at /demo/nikah.
 *
 * Kept out of search results for now: these go with the wizard, which is not
 * linked from anywhere yet.
 */

type DemoParams = { params: Promise<{ templateId: string }> };

export function generateStaticParams(): { templateId: string }[] {
  return listedTemplates().map((template) => ({ templateId: template.id }));
}

/* Only the listed templates; any other id is a 404 rather than a guess. */
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: DemoParams): Promise<Metadata> {
  const { templateId } = await params;
  const template = findTemplate(templateId);

  if (template === null) {
    return {};
  }

  return {
    title: `${template.name}: sample invitation`,
    description: `A sample invitation in the ${template.name} template. ${template.description}`,
    alternates: { canonical: templateDemoPath(template.id) },
    robots: { index: false, follow: false },
  };
}

export default async function TemplateDemoPage({
  params,
}: DemoParams): Promise<ReactElement> {
  const { templateId } = await params;
  const template = findTemplate(templateId);

  if (template === null || !template.listed) {
    notFound();
  }

  const event = templateDemoEvent(template);
  const ground = cardPalette(event.config.style).background;

  return (
    <>
      {/* The card's colour from the first byte, as on a guest's link. */}
      <style>{`html,body{background-color:${ground}}`}</style>
      <SampleBanner />
      <InviteExperience
        event={event}
        initialLanguage={event.config.language}
        linkLanguage={null}
        ended={false}
        weather={null}
        inviteUrl={`${canonicalSiteOrigin()}${templateDemoPath(template.id)}`}
        sample={{ checkinToken: DEMO_CHECKIN_TOKEN }}
      />
    </>
  );
}
