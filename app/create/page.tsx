import type { Metadata } from "next";
import { Suspense, type ReactElement } from "react";
import { redirect } from "next/navigation";
import EditorSkeleton from "@/components/create/EditorSkeleton";
import EventNotFound from "@/components/dashboard/EventNotFound";
import Wizard from "@/components/wizard/Wizard";
import WizardSaved from "@/components/wizard/WizardSaved";
import { getEventById } from "@/lib/db/events";
import { isUnderReview } from "@/lib/db/paymentReview";
import { NEW_CARD_HREF } from "@/lib/wizardSteps";
import { findTemplate } from "@/templates/registry";
import { marketingShare } from "@/lib/shareImage";

/**
 * A new invitation, made in the wizard: a template, the details, the few
 * things that can be changed about the look, and a last look before saving.
 *
 * This is where every "Create" link on the site leads, at
 * /create?step=template (NEW_CARD_HREF). Without a step it opens on the
 * template gallery too, or on the step a card waiting from before a sign-in
 * was stashed on.
 *
 * WITH `template` (templateStartHref: "Create yours" on the landing page and
 * on a live demo) the card starts on that template, on the details step. The
 * id is checked here, before anything is drawn: one the gallery does not
 * offer, unknown or not yet listed, is sent to the gallery instead.
 *
 * OPEN TO EVERYONE. The middleware lets anyone reach this page; the account
 * is asked for when the card is saved, which is the first moment it is
 * needed, and the card is kept across the sign-in (lib/pendingCard.ts).
 *
 * TWO THINGS LIVE HERE. Without `event` it is the wizard itself, a client
 * component that holds the card in the browser until it is saved. With
 * `event` it is the wizard's last screen for a card that has just been saved:
 * read here, on the server, under the host's own session, so the row decides
 * what is shown and whether there is anything left to pay.
 *
 * The canonical address is set by app/create/layout.tsx.
 */
export const metadata: Metadata = {
  title: "Create your invitation",
  ...marketingShare(
    "Create your invitation | Lifafa",
    "Choose a wedding invitation design, add your details and share one link. Guests reply in a tap and you see the headcount live.",
    "/create",
  ),
};

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{
    event?: string | string[];
    template?: string | string[];
  }>;
}): Promise<ReactElement> {
  const { event: eventId, template: templateParam } = await searchParams;

  if (typeof eventId !== "string") {
    let templateId: string | null = null;

    if (templateParam !== undefined) {
      const template =
        typeof templateParam === "string" ? findTemplate(templateParam) : null;

      if (template === null || !template.listed) {
        redirect(NEW_CARD_HREF);
      }

      templateId = template.id;
    }

    return (
      /* useSearchParams, which the wizard reads its step from, wants a boundary. */
      <Suspense fallback={<EditorSkeleton />}>
        <Wizard templateId={templateId} />
      </Suspense>
    );
  }

  const result = await getEventById(eventId);

  if (!result.ok) {
    return <EventNotFound message={result.error} />;
  }

  /* Null is "no such event" and "not yours" alike; see the edit route. */
  if (result.data === null) {
    return (
      <EventNotFound message="It may have been deleted, or it belongs to a different account." />
    );
  }

  /* Paid for, here or anywhere: there is nothing left for this screen to ask. */
  if (result.data.isPaid) {
    redirect(`/dashboard/${result.data.id}`);
  }

  return (
    <WizardSaved
      event={result.data}
      /* Asked for the event this host's own session has just read. */
      underReview={await isUnderReview(result.data.id)}
    />
  );
}
