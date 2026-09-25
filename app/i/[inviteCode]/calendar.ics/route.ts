import type { NextRequest } from "next/server";
import {
  calendarEvent,
  functionCalendarEvent,
  icsContent,
  icsFileName,
} from "@/lib/calendar";
import {
  cardInLanguage,
  inviteLinkIn,
  requestedLanguage,
} from "@/lib/cardTranslation";
import { getGuestEvent } from "@/lib/db/inviteEvent";
import { serverSiteOrigin } from "@/lib/serverSiteOrigin";
import { inviteUrl } from "@/lib/siteUrl";

/**
 * The invitation as an .ics file, for Apple Calendar and everything else.
 *
 * A route rather than a file built in the browser, because iOS offers its
 * native "Add to Calendar" sheet only for a text/calendar response it fetched
 * itself. A blob link either opens as plain text or does nothing, and inside
 * an in-app browser a blob download usually does nothing at all.
 *
 * THE SAME GATE AS THE PAGE. A paid invitation for anyone, an unpaid one only
 * for its signed-in host checking their card, and nothing about it for anyone
 * else — a calendar file is the date, the venue and the names, which is the
 * whole of what the publish gate holds back. An ended invitation still serves:
 * a guest saving the keepsake is not a reason to refuse.
 *
 *   ?lang=  The language the entry is written in, as on the page.
 *   ?fn=    One of the timeline's functions, by id, for its own entry. A
 *           function that is not on the card is a 404, never the main event.
 *   ?dl=1   Sent as an attachment, for browsers that should save it. Without
 *           it the file is sent inline, which is what makes Safari on an
 *           iPhone show the event instead of a download prompt.
 */

/* Per request: the answer changes the moment an invitation is paid for. */
export const dynamic = "force-dynamic";

const NO_STORE = "no-store, max-age=0";

function notAvailable(status: number): Response {
  return new Response("This invitation is not available.", {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": NO_STORE,
      "x-robots-tag": "noindex",
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ inviteCode: string }> },
): Promise<Response> {
  const { inviteCode } = await params;
  const guest = await getGuestEvent(inviteCode);

  if (guest.kind === "failed") {
    return notAvailable(503);
  }

  /* An unpaid card reads as not found, exactly as a code that does not exist. */
  if (guest.kind !== "active" && guest.kind !== "preview") {
    return notAvailable(404);
  }

  const { event } = guest;
  const { searchParams } = request.nextUrl;
  const language = requestedLanguage(
    searchParams.get("lang"),
    event.config.language,
  );
  const { draft, config } = cardInLanguage(event.draft, event.config, language);

  const invite = {
    code: event.inviteCode,
    url: inviteLinkIn(
      inviteUrl(event.inviteCode, await serverSiteOrigin()),
      language,
    ),
  };

  const functionId = searchParams.get("fn");
  const fn =
    functionId === null
      ? null
      : (draft.subEvents.find((entry) => entry.id === functionId) ?? null);

  if (functionId !== null && fn === null) {
    return notAvailable(404);
  }

  const entry =
    fn === null
      ? calendarEvent(draft, config.occasionId, invite, language)
      : functionCalendarEvent(draft, fn, config.occasionId, invite, language);

  /* No date, so no calendar entry; the card shows no button for this either. */
  if (entry === null) {
    return notAvailable(404);
  }

  const disposition = searchParams.get("dl") === "1" ? "attachment" : "inline";

  return new Response(icsContent(entry, new Date()), {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `${disposition}; filename="${icsFileName(entry)}"`,
      "cache-control": NO_STORE,
      "x-robots-tag": "noindex",
    },
  });
}
