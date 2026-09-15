import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cardCopy, DEFAULT_CARD_LANGUAGE } from "@/lib/cardLanguage";
import { getInviteEvent } from "@/lib/db/inviteEvent";
import { serverSiteOrigin } from "@/lib/serverSiteOrigin";

/**
 * A server wrapper that owns the part of the invite page's metadata that does
 * not depend on the language the link asked for.
 *
 * It renders its children untouched, so it adds nothing to the DOM. The words
 * of the preview — title, description, image — used to be written here too and
 * moved to the page when a card became shareable in more than one language: a
 * layout is never given the query string, and `?lang=` is where the language
 * travels. The read is shared with the page through getInviteEvent, so neither
 * costs a second query.
 *
 * The share image is named by the page, at share-image/?lang=, and
 * `metadataBase` is what resolves that to an absolute URL, which is the form
 * WhatsApp and every other scraper require. Set here from
 * serverSiteOrigin() rather than left to the root layout's, so the image a
 * chat unfurls is on the same origin as the invite link it came from, even on
 * a deployment with nothing configured.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}): Promise<Metadata> {
  const { inviteCode } = await params;
  const [result, origin] = await Promise.all([
    getInviteEvent(inviteCode),
    serverSiteOrigin(),
  ]);
  const metadataBase = new URL(origin);

  /*
    An unknown code still needs metadata — a scraper follows the link before
    anyone sees the page — so it falls back to the product name rather than
    leaking that the code was invalid into a chat thread's preview.

    This is the only preview words the layout still writes. A card that exists
    is described by the page, which alone can read the link's `?lang=`; a
    layout is never handed the query string. The page's metadata is merged over
    this, so it wins wherever it speaks.
  */
  if (!result.ok || result.data === null) {
    /*
      No card, so no language to speak: English, and the generic promise of a
      reply form, since there is no card to say otherwise.
    */
    const fallback = cardCopy(DEFAULT_CARD_LANGUAGE).invite;

    return {
      metadataBase,
      title: fallback.shareTitleFallback,
      description: fallback.shareDescription(true),
      /*
        The share image route draws a plain wordmark for a code it cannot find,
        so the chat thread gets a thumbnail rather than a broken one.
      */
      openGraph: {
        images: [
          {
            url: `/i/${encodeURIComponent(inviteCode)}/share-image`,
            width: 1200,
            height: 630,
          },
        ],
      },
    };
  }

  return { metadataBase };
}

export default function InviteLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return children;
}
