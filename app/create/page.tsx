import type { Metadata } from "next";
import { Suspense, type ReactElement } from "react";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import RememberAdParams from "@/components/browser/RememberAdParams";
import EditorSkeleton from "@/components/create/EditorSkeleton";
import EventNotFound from "@/components/dashboard/EventNotFound";
import GalleryFirstScreen from "@/components/wizard/GalleryFirstScreen";
import Wizard from "@/components/wizard/Wizard";
import { getEventById } from "@/lib/db/events";
import { isUnderReview } from "@/lib/db/paymentReview";
import { liveOffer } from "@/lib/coupons/offer";
import { razorpayKeyId } from "@/lib/razorpay/keys";
import { opensOnGallery } from "@/lib/opensOnGallery";
import { AFTER_SIGN_IN_PARAM, NEW_CARD_HREF } from "@/lib/wizardSteps";
import { findTemplate } from "@/templates/registry";
import { marketingShare } from "@/lib/shareImage";

/** An event id as the database writes them; anything else is not looked up for payments. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

/*
  The screen for a card just saved, behind `event`: split from the wizard's
  download, so a visitor choosing a design never fetches the payment code.
*/
const WizardSaved = dynamic(() => import("@/components/wizard/WizardSaved"));

type Query = Record<string, string | string[] | undefined>;

/** The query's own value, or null: a key given twice counts as given. */
function queryGetter(query: Query): { get: (key: string) => string | null } {
  return {
    get: (key) => {
      const value = query[key];
      return value === undefined ? null : Array.isArray(value) ? (value[0] ?? "") : value;
    },
  };
}

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}): Promise<ReactElement> {
  const query = await searchParams;
  const { event: eventId, template: templateParam } = query;

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
      <>
        {/* useSearchParams, which the wizard reads its step from, wants a boundary. */}
        <Suspense fallback={<EditorSkeleton />}>
          <Wizard
            templateId={templateId}
            /*
              The gallery itself on the server, where the address opens on it
              and nothing this browser holds can change that (lib/opensOnGallery.ts).
            */
            firstScreen={
              opensOnGallery(queryGetter(query)) ? (
                <GalleryFirstScreen welcome={query[AFTER_SIGN_IN_PARAM] !== undefined} />
              ) : undefined
            }
          />
        </Suspense>
        {/* Keeps the ad's tags in Instagram's and Facebook's browsers; renders nothing. */}
        <RememberAdParams />
      </>
    );
  }

  /*
    The three reads this screen makes, at once rather than one after another:
    the event, whether a payment for it is being checked, and the offer over
    the coupon field (liveOffer is read once per request, so PaymentBanner's
    own call gets this one). The two that do not depend on the event's owner
    are only shown after the event read below has found it this host's.
  */
  const [result, underReview] = await Promise.all([
    getEventById(eventId),
    UUID.test(eventId) ? isUnderReview(eventId) : Promise.resolve(false),
    razorpayKeyId() !== null ? liveOffer() : Promise.resolve(null),
  ]);

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
      underReview={underReview}
    />
  );
}
