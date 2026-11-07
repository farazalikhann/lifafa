import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import DemoCreateBar, { DEMO_CREATE_BAR_SELECTOR } from "@/components/invite/DemoCreateBar";
import InviteExperience from "@/components/invite/InviteExperience";
import SampleBanner from "@/components/invite/SampleBanner";
import { canonicalSiteOrigin } from "@/lib/siteUrl";
import { sampleStripTone } from "@/lib/stripTone";
import {
  DEMO_CHECKIN_TOKEN,
  templateDemoEvent,
  templateDemoPath,
} from "@/lib/templateSamples";
import { cardPalette } from "@/lib/textColors";
import { NEW_CARD_HREF, templateStartHref } from "@/lib/wizardSteps";
import { TEMPLATES, findTemplate } from "@/templates/registry";

/**
 * A template's live demo: its sample invitation, opened as a guest opens one.
 *
 * What the gallery's "Live demo" button opens. The whole experience is the
 * real one, from the cover to the reply form, over a sample event that is not
 * in the database (lib/templateSamples.ts), so a reply here is answered and
 * sent nowhere, exactly as on the home page's sample at /demo/nikah.
 *
 * Kept out of search results: they are one sample wedding in every look, not
 * pages of their own: the gallery is where a host meets them.
 *
 * On a phone a bar at the foot of the screen gives the price and "Create this
 * card" (DemoCreateBar). Clarity records it (lib/clarity.ts); the Meta pixel
 * never runs here (lib/metaPixel.ts).
 */

type DemoParams = { params: Promise<{ templateId: string }> };

export function generateStaticParams(): { templateId: string }[] {
  return TEMPLATES.map((template) => ({ templateId: template.id }));
}

/*
  Every template has one, in the gallery yet or not: a template being built is
  looked at here before it is offered. Any other id is a 404.
*/
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

  if (template === null) {
    notFound();
  }

  const event = templateDemoEvent(template);
  const ground = cardPalette(event.config.style).background;
  /* A template the gallery does not offer yet cannot be started on: its buttons open the gallery. */
  const startHref = template.listed ? templateStartHref(template.id) : NEW_CARD_HREF;
  /* The strip and the bar in the card's own colours. */
  const tone = sampleStripTone(event.config);

  return (
    <>
      {/* The card's colour from the first byte, as on a guest's link. */}
      <style>{`html,body{background-color:${ground}}`}</style>
      <SampleBanner
        tone={tone}
        start={{ href: startHref, pricePaise: template.price }}
      />
      <InviteExperience
        event={event}
        initialLanguage={event.config.language}
        linkLanguage={null}
        ended={false}
        weather={null}
        inviteUrl={`${canonicalSiteOrigin()}${templateDemoPath(template.id)}`}
        sample={{ checkinToken: DEMO_CHECKIN_TOKEN, clearOf: DEMO_CREATE_BAR_SELECTOR }}
      />
      {/* The page ends the bar's height lower on a phone, so the last of the card scrolls clear of it. */}
      <div aria-hidden="true" style={{ height: "var(--lifafa-foot-h, 0px)" }} />
      <DemoCreateBar
        href={startHref}
        label={template.listed ? "Create this card" : "Create yours"}
        name={template.name}
        pricePaise={template.price}
        tone={tone}
      />
    </>
  );
}
