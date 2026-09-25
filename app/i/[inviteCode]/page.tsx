import type { Metadata } from "next";
import type { ReactElement } from "react";
import Link from "next/link";
import HostPreviewBanner from "@/components/invite/HostPreviewBanner";
import InviteExperience from "@/components/invite/InviteExperience";
import NotPublished from "@/components/invite/NotPublished";
import { coverNameLine, resolveCoverNames } from "@/lib/cardFormat";
import { cardCopy } from "@/lib/cardLanguage";
import {
  cardInLanguage,
  requestedLanguage,
} from "@/lib/cardTranslation";
import { getGuestEvent } from "@/lib/db/inviteEvent";
import { hasEnded } from "@/lib/eventLock";
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

/*
  Rendered for every request, never from a cache. Whether the card opens
  depends on whether it is paid and on who is asking, and both can change
  between one request and the next: the moment a payment lands, the next guest
  must get the card. (Reading the visitor's session already makes this route
  dynamic; this says so, so a later change cannot quietly make it static.)
*/
export const dynamic = "force-dynamic";

/**
 * What an unpaid invitation unfurls as, for everyone: no names, no date, no
 * image of the card. A scraper carries no session, so the host gets this too.
 * Kept out of search results while it is not active.
 */
const INACTIVE_TITLE = "Lifafa invitation";
const INACTIVE_DESCRIPTION = "This invitation is not active yet.";

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
  const guest = await getGuestEvent(inviteCode);

  if (guest.kind === "missing" || guest.kind === "failed") {
    return {};
  }

  /*
    AN UNPUBLISHED INVITATION UNFURLS AS NOTHING IN PARTICULAR.

    The gate below hides the card from guests; leaving this alone would have
    WhatsApp hand them the couple's names, the date and a drawn share image
    anyway, in the preview, before the gate ever ran. That is the gate leaking
    exactly what it exists to hold back — and a preview is the most public
    surface this application has, since it is pasted into group chats.

    So an unpaid card unfurls as a generic "Lifafa invitation", with the share
    image's plain wordmark, until it is paid. Unlike the page gate, this does
    NOT make an exception for the host ("preview" is treated as inactive): a
    scraper carries no session, so there is nobody to recognise.
  */
  if (guest.kind !== "active") {
    return {
      title: INACTIVE_TITLE,
      description: INACTIVE_DESCRIPTION,
      robots: { index: false, follow: false },
      openGraph: {
        type: "website",
        title: INACTIVE_TITLE,
        description: INACTIVE_DESCRIPTION,
        /* The share image draws only the Lifafa wordmark for an unpaid card. */
        images: [
          {
            url: `/i/${encodeURIComponent(inviteCode)}/share-image`,
            width: 1200,
            height: 630,
            alt: INACTIVE_TITLE,
          },
        ],
      },
    };
  }

  const { draft, config, inviteCode: code } = eventInLanguage(guest.event, lang);
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
  /*
    Decided on the server, once for the request and shared with the metadata
    above: paid, the host previewing their unpaid card, or closed. See
    getGuestEvent in lib/db/inviteEvent.ts.
  */
  const guest = await getGuestEvent(inviteCode);

  /*
    A failed read and an unknown code are shown the same way. A guest can do
    nothing about either, and the difference is only meaningful in the server
    log — where dbFailure has already written it.
  */
  if (guest.kind === "failed") {
    return (
      <InviteNotFound reason="Something went wrong opening this invitation. Please try the link again in a moment." />
    );
  }

  if (guest.kind === "missing") {
    return (
      <InviteNotFound reason="The link may have been mistyped, or this invitation may have been removed by the host." />
    );
  }

  /*
    ───────────────────────── THE PUBLISH GATE ─────────────────────────

    An unpaid invitation does not open for guests. Not a watermarked card: a
    watermarked card is still the whole card — names, date, venue, and a reply
    form — so it would ask for payment while giving away what is being paid for.
    This page renders no event at all, so nothing about it reaches the HTML.

    THE HOST IS THE ONE EXCEPTION ("preview" below): a host checking their card
    wants to see what a guest will see, on the real link, with the real cover
    and the real scroll. They get it watermarked, under a banner that says
    guests cannot open it yet and takes them to payment.
  */
  if (guest.kind === "inactive") {
    return <NotPublished />;
  }

  /*
    The event goes down as stored, both languages in it, and InviteExperience
    resolves it in the browser, so a guest can switch language without the page
    being fetched again. The link only decides where it starts: its ?lang=, or
    the card's own language when it names none or one Lifafa does not have.
  */
  const { event } = guest;
  const language = requestedLanguage(lang, event.config.language);
  const linkLanguage = typeof lang === "string" && lang === language ? language : null;


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
    <>
      {guest.kind === "preview" ? (
        <HostPreviewBanner eventId={event.id} />
      ) : null}
      <InviteExperience
        event={event}
        initialLanguage={language}
        linkLanguage={linkLanguage}
        /* Past its end date in India: a keepsake, with the replies closed. */
        ended={hasEnded(event.isPaid, event.draft)}
        weather={weather}
        /* Without a language: the component adds the one on screen. */
        inviteUrl={inviteUrl(event.inviteCode, await serverSiteOrigin())}
      />
    </>
  );
}
