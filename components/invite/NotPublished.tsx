import type { ReactElement } from "react";
import { cardCopy } from "@/lib/cardLanguage";
import type { CardLanguage } from "@/types/card";

/**
 * What a guest sees when the host has not published the invitation yet.
 *
 * THE GATE ITSELF IS NOT HERE. This is only the screen; the decision is in
 * app/i/[inviteCode]/page.tsx, which renders this instead of the card when the
 * event is unpaid and the visitor is not its host. See the note there.
 *
 * WHAT IT DELIBERATELY DOES NOT SAY. Not "unpaid", not "the host has not paid",
 * not a price, and no way to pay. A guest is not the customer and has no
 * standing in that transaction; telling them their friend has not settled a
 * bill embarrasses the host in front of exactly the people the product exists
 * to impress. "Not ready yet" is both true and the host's own business.
 *
 * It also names nothing about the event — no couple, no date, no venue. The
 * whole point of the gate is that an unpublished invitation has not been
 * shared, so this screen must not be the thing that shares it.
 *
 * NOT AN ERROR, and styled so. A guest arriving here has done nothing wrong and
 * the link is not broken: it will work later. An error page would send them
 * back to the host asking whether the link was mistyped.
 */
export default function NotPublished({
  language,
}: {
  /** The card's own language, so the one sentence is in it. */
  language: CardLanguage;
}): ReactElement {
  const copy = cardCopy(language).invite;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p className="text-xs font-medium tracking-[0.2em] text-[var(--lifafa-marigold)] uppercase">
        {copy.headingFallback}
      </p>

      <h1 className="max-w-[20ch] font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--lifafa-cream)] sm:text-4xl">
        This invitation is not published yet
      </h1>

      <p className="max-w-[44ch] text-sm leading-relaxed text-[var(--lifafa-muted)]">
        The host is still putting it together. Keep this link — it will open
        properly once they are ready.
      </p>
    </main>
  );
}
