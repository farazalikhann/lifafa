import type { Metadata } from "next";
import { Suspense, type ReactElement } from "react";
import { redirect } from "next/navigation";
import EditorSkeleton from "@/components/create/EditorSkeleton";
import EventNotFound from "@/components/dashboard/EventNotFound";
import Wizard from "@/components/wizard/Wizard";
import WizardSaved from "@/components/wizard/WizardSaved";
import { getEventById } from "@/lib/db/events";

/**
 * The template-first wizard, being built beside the tabbed editor at /create.
 *
 * NOT LINKED FROM ANYWHERE YET, and kept out of search results: it takes
 * /create's place once every step is in, and until then it is reached by
 * typing its address.
 *
 * TWO THINGS LIVE HERE. Without `event` it is the wizard itself, a client
 * component that holds the card in the browser until it is saved. With
 * `event` it is the wizard's last screen for a card that has been saved: read
 * here, on the server, under the host's own session, so the row decides what
 * is shown and whether there is anything left to pay.
 */
export const metadata: Metadata = {
  title: "Create your invitation",
  robots: { index: false, follow: false },
};

export default async function WizardPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string | string[] }>;
}): Promise<ReactElement> {
  const { event: eventId } = await searchParams;

  if (typeof eventId !== "string") {
    return (
      /* useSearchParams, which the wizard reads its step from, wants a boundary. */
      <Suspense fallback={<EditorSkeleton />}>
        <Wizard />
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

  return <WizardSaved event={result.data} />;
}
