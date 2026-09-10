"use client";

import type { ReactElement, ReactNode } from "react";
import { useRouter } from "next/navigation";
import CardEditor, {
  type EditorSnapshot,
  type SaveOutcome,
} from "@/components/create/CardEditor";
import { updateEvent } from "@/lib/db/events";

/**
 * The client half of /dashboard/[eventId]/edit.
 *
 * The page above is a server component and stays one: it reads the event with
 * the host's session cookie, so RLS decides whether this host may see it at all,
 * and a stranger meets a not-found before a single control is sent to their
 * browser. That gate cannot be a client component's job — but `onSave` is a
 * function, and functions do not cross that boundary. So this is the thinnest
 * possible client wrapper: it holds the callback and nothing else.
 *
 * WHAT SAVING MEANS HERE. updateEvent, then back to the event's dashboard. The
 * invite code is not passed, not patched and not patchable; see the note over
 * updateEvent for the whole list of what an edit may not touch and why.
 */
export default function EditEventEditor({
  eventId,
  initial,
  notice,
}: {
  eventId: string;
  /** The stored event, as the editor takes it. */
  initial: EditorSnapshot;
  notice?: ReactNode;
}): ReactElement {
  const router = useRouter();

  const handleSave = async (snapshot: EditorSnapshot): Promise<SaveOutcome> => {
    const result = await updateEvent(eventId, {
      draft: snapshot.draft,
      cardConfig: snapshot.config,
      coverAnimation: snapshot.coverAnimation,
      weather: {
        showWeather: snapshot.showWeather,
        themeId: snapshot.weatherTheme,
      },
    });

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    /*
      WHETHER THE GUESTS NEED TELLING.

      Decided here, against the draft this page was loaded with, because this is
      the only place that holds both versions: the editor knows what the card
      says now and the dashboard knows nothing at all. Only the date and the
      venue count — a reworded message or a new palette is not something anybody
      needs a WhatsApp about, and a confirmation that said so every time would
      stop being read by the second edit.

      It travels as a query parameter rather than as state, because the next
      thing that happens is a navigation to a server-rendered page. Nothing is
      sent to anyone: the host is told, and the host decides.
    */
    const detailsMoved =
      snapshot.draft.eventDate !== initial.draft.eventDate ||
      snapshot.draft.eventTime !== initial.draft.eventTime ||
      snapshot.draft.venueName !== initial.draft.venueName ||
      snapshot.draft.venueAddress !== initial.draft.venueAddress;

    /*
      refresh() before push(), for the cache rather than for this page.

      The dashboard is a server component rendered from the row that was just
      rewritten, and the client router keeps what it has already fetched. This
      throws that away, so the push lands on a dashboard built after the edit
      rather than a copy of the page as it was before it — which would show the
      old title in the top bar under a notice saying it had been saved. The
      cost is one refetch of the editor the host is in the act of leaving,
      which is a fair price for never showing them stale news about their own
      change.
    */
    router.refresh();
    router.push(
      `/dashboard/${eventId}?saved=${detailsMoved ? "details" : "1"}`,
    );

    return { ok: true };
  };

  return (
    <CardEditor
      mode="edit"
      eventId={eventId}
      initialDraft={initial.draft}
      initialConfig={initial.config}
      initialCoverAnimation={initial.coverAnimation}
      initialShowWeather={initial.showWeather}
      initialWeatherTheme={initial.weatherTheme}
      onSave={handleSave}
      notice={notice}
    />
  );
}
