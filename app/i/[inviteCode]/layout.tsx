import type { Metadata } from "next";
import type { ReactNode } from "react";
import { coverNameLine, resolveCoverNames } from "@/lib/cardFormat";
import { getMockEvent } from "@/lib/mockEvent";

/**
 * A server wrapper that exists purely to own the invite page's metadata.
 *
 * The page itself is a client component — it holds the RSVP stage in state —
 * and a client component cannot export `generateMetadata`. Rather than split
 * the page into a server shell plus a client body, the metadata is hoisted one
 * level to this layout, which renders its children untouched and so adds
 * nothing to the DOM.
 *
 * The route's opengraph-image.tsx is picked up by file convention and needs no
 * mention here; `metadataBase` in the root layout is what resolves it to an
 * absolute URL, which is the form WhatsApp and every other scraper require.
 */

const DESCRIPTION =
  "You are invited. Tap to see the invitation and send your reply.";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}): Promise<Metadata> {
  const { inviteCode } = await params;
  const { draft, occasionId } = getMockEvent(inviteCode);

  /* Flattened from the same resolution the cover runs, so the chat thread and
     the card it links to name the same people. */
  const title = `${draft.eventTitle} — ${coverNameLine(
    resolveCoverNames(draft, occasionId),
  )}`;

  return {
    title,
    description: DESCRIPTION,
    openGraph: {
      type: "website",
      title,
      description: DESCRIPTION,
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
