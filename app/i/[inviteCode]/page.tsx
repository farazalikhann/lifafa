import type { Metadata } from "next";
import type { ReactElement } from "react";
import Link from "next/link";
import InviteExperience from "@/components/invite/InviteExperience";
import { coverNameLine, resolveCoverNames } from "@/lib/cardFormat";
import { cardCopy } from "@/lib/cardLanguage";
import {
  cardInLanguage,
  inviteLinkIn,
  requestedLanguage,
} from "@/lib/cardTranslation";
import { getInviteEvent } from "@/lib/db/inviteEvent";
import { serverSiteOrigin } from "@/lib/serverSiteOrigin";
import { inviteUrl } from "@/lib/siteUrl";
import { getEventWeather } from "@/lib/weather";
import type { StoredEvent } from "@/types/database";

/**
 * A guest opening their link.
 *
 * A server component: the event is read here, through the one anonymous path
 * the schema allows, and only the reply interaction crosses to the client.
 * Nothing on this route asks anyone to sign in.
 *
 * `?lang=` picks the language, and it is how the host shares one invitation
 * with guests who read different ones — see the share bar on the dashboard. A
 * link without it, or with a language Lifafa does not have, opens the card in
 * the language it was written in, which is what every link sent before this
 * existed does.
 */

type InviteParams = {
  params: Promise<{ inviteCode: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
};

/** Shown for an unknown code, and for a read that failed. */
function InviteNotFound({ reason }: { reason: string }): ReactElement {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[var(--lifafa-ink)] px-6 text-center">
      <p className="font-[family-name:var(--font-display)] text-2xl font-semibold text-balance text-[var(--lifafa-cream)]">
        This invitation could not be found.
      </p>
      <p className="max-w-[34ch] text-sm leading-relaxed text-[var(--lifafa-muted)]">
        {reason}
      </p>
      <Link
        href="/"
        className="mt-2 min-h-11 rounded px-2 text-sm font-medium text-[var(--lifafa-marigold)] underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
      >
        Go to Lifafa
      </Link>
    </main>
  );
}

/**
 * The stored event as a guest reads it in the language the link asked for.
 *
 * One construction for the page and its metadata, so the chat thread's preview
 * and the card it opens can never be in two languages.
 */
function eventInLanguage(
  event: StoredEvent,
  lang: string | string[] | undefined,
): StoredEvent {
  const language = requestedLanguage(lang, event.config.language);
  const { draft, config } = cardInLanguage(event.draft, event.config, language);

  return { ...event, draft, config };
}

/**
 * The preview a chat app unfurls, in the link's language.
 *
 * Here and not in the layout, because a layout is never handed the query
 * string. The layout still sets metadataBase and speaks for a code that finds
 * no card; everything this returns is merged over it.
 */
export async function generateMetadata({
  params,
  searchParams,
}: InviteParams): Promise<Metadata> {
  const [{ inviteCode }, { lang }] = await Promise.all([params, searchParams]);
  const result = await getInviteEvent(inviteCode);

  if (!result.ok || result.data === null) {
    return {};
  }

  const { draft, config, inviteCode: code } = eventInLanguage(result.data, lang);
  const copy = cardCopy(config.language).invite;

  /*
    In the link's language, and honest about the form: a card the host sent
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
    title,
    description,
    openGraph: {
      type: "website",
      title,
      description,
      images: [
        {
          url: `/i/${encodeURIComponent(code)}/share-image?lang=${config.language}`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
  };
}

export default async function InvitePage({
  params,
  searchParams,
}: InviteParams): Promise<ReactElement> {
  const [{ inviteCode }, { lang }] = await Promise.all([params, searchParams]);
  /* Shared with the metadata above and the layout's, so this is not another query. */
  const result = await getInviteEvent(inviteCode);

  /*
    A failed read and an unknown code are shown the same way. A guest can do
    nothing about either, and the difference is only meaningful in the server
    log — where dbFailure has already written it.
  */
  if (!result.ok) {
    return (
      <InviteNotFound reason="Something went wrong opening this invitation. Please try the link again in a moment." />
    );
  }

  if (result.data === null) {
    return (
      <InviteNotFound reason="The link may have been mistyped, or this invitation may have been removed by the host." />
    );
  }

  /*
    Resolved to the link's language before anything is handed down, so the
    card and everything around it — cover, form, pass — only ever see one
    language's words and need no idea that a card can hold another.
  */
  const event = eventInLanguage(result.data, lang);

  /*
    Read here, on the server, and handed down finished.

    This is the only place the weather is fetched for a guest, and it is cached
    by Next's fetch cache rather than requested per visitor: an invitation
    opened by three hundred people makes one call upstream. Skipped outright
    when the host switched weather off, so their guests cost nothing at all.

    getEventWeather never throws and returns null for every failure, so nothing
    here needs a try or a fallback: null simply means the card renders without
    it.
  */
  const weather = event.showWeather
    ? await getEventWeather(event.coordinates, event.draft.eventDate)
    : null;

  return (
    <InviteExperience
      event={event}
      weather={weather}
      /*
        In the language this card is being read in, so the link written into a
        guest's calendar brings them back to the card they saved it from.
      */
      inviteUrl={inviteLinkIn(
        inviteUrl(event.inviteCode, await serverSiteOrigin()),
        event.config.language,
      )}
    />
  );
}
