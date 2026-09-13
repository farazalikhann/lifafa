import type { Metadata } from "next";
import type { ReactNode } from "react";
import { coverNameLine, resolveCoverNames } from "@/lib/cardFormat";
import { getInviteEvent } from "@/lib/db/inviteEvent";

/**
 * A server wrapper that exists purely to own the invite page's metadata.
 *
 * Kept in the layout rather than the page so the page stays about the card,
 * and it renders its children untouched, so it adds nothing to the DOM. The
 * read is shared with the page through getInviteEvent, so owning the metadata
 * here costs no second query.
 *
 * The route's opengraph-image.tsx is picked up by file convention and needs no
 * mention here; `metadataBase` in the root layout is what resolves it to an
 * absolute URL, which is the form WhatsApp and every other scraper require.
 */

const DESCRIPTION =
  "You are invited. Tap to see the invitation and send your reply.";

const FALLBACK_TITLE = "Invitation — Lifafa";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}): Promise<Metadata> {
  const { inviteCode } = await params;
  const result = await getInviteEvent(inviteCode);

  /*
    An unknown code still needs metadata — a scraper follows the link before
    anyone sees the page — so it falls back to the product name rather than
    leaking that the code was invalid into a chat thread's preview.
  */
  if (!result.ok || result.data === null) {
    return { title: FALLBACK_TITLE, description: DESCRIPTION };
  }

  const { draft, config } = result.data;

  /*
    Flattened from the same resolution the cover runs, so the chat thread and
    the card it links to name the same people. Either half can be missing — a
    card with no title, or one whose names are still the editor's placeholder —
    and a title that opens with a dash, or announces "Your names" to a guest,
    reads as broken in a WhatsApp preview.
  */
  const names = resolveCoverNames(draft, config.occasionId);
  const nameLine =
    names.kind === "line" && names.isPlaceholder ? "" : coverNameLine(names);
  const title =
    [draft.eventTitle.trim(), nameLine]
      .filter((part) => part.length > 0)
      .join(" — ") || FALLBACK_TITLE;

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
