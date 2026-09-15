import type { Metadata } from "next";
import type { ReactNode } from "react";
import { coverNameLine, resolveCoverNames } from "@/lib/cardFormat";
import { cardCopy, DEFAULT_CARD_LANGUAGE } from "@/lib/cardLanguage";
import { getInviteEvent } from "@/lib/db/inviteEvent";
import { serverSiteOrigin } from "@/lib/serverSiteOrigin";

/**
 * A server wrapper that exists purely to own the invite page's metadata.
 *
 * Kept in the layout rather than the page so the page stays about the card,
 * and it renders its children untouched, so it adds nothing to the DOM. The
 * read is shared with the page through getInviteEvent, so owning the metadata
 * here costs no second query.
 *
 * The route's opengraph-image.tsx is picked up by file convention and needs no
 * mention here; `metadataBase` is what resolves it to an absolute URL, which is
 * the form WhatsApp and every other scraper require. Set here from
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
    };
  }

  const { draft, config } = result.data;
  const copy = cardCopy(config.language).invite;

  /*
    In the card's language, and honest about the form: a card the host sent
    without one must not promise the guest a reply they cannot send.
  */
  const description = copy.shareDescription(config.rsvpEnabled);

  /*
    Flattened from the same resolution the cover runs, so the chat thread and
    the card it links to name the same people. Either half can be missing — a
    card with no title, or one whose names are still the editor's placeholder —
    and a title that opens with a dash, or announces "Your names" to a guest,
    reads as broken in a WhatsApp preview.
  */
  const names = resolveCoverNames(draft, config.occasionId, config.language);
  const nameLine =
    names.kind === "line" && names.isPlaceholder ? "" : coverNameLine(names);
  const title =
    [draft.eventTitle.trim(), nameLine]
      .filter((part) => part.length > 0)
      .join(" — ") || copy.shareTitleFallback;

  return {
    metadataBase,
    title,
    description,
    openGraph: {
      type: "website",
      title,
      description,
    },
  };
}

export default function InviteLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return children;
}
