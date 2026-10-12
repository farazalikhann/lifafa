import type { ReactElement } from "react";
import EditEventEditor from "@/components/create/EditEventEditor";
import EventEndedNotice from "@/components/create/EventEndedNotice";
import GuestsRepliedNotice from "@/components/create/GuestsRepliedNotice";
import EventNotFound from "@/components/dashboard/EventNotFound";
import { EditWizard } from "@/components/wizard/Wizard";
import { getCoverAnimation } from "@/lib/coverAnimations";
import { countGuestsForEvent } from "@/lib/db/guests";
import { getEventById } from "@/lib/db/events";
import { isEditLocked } from "@/lib/eventLock";
import { getWeatherTheme } from "@/lib/weatherThemes";
import { CLASSIC_TEMPLATE_ID, getTemplate } from "@/templates/registry";

/**
 * Editing an invitation that already exists.
 *
 * A host used to be able to build a card and never touch it again: a wrong
 * date, a misspelt name, a venue that moved were all frozen the moment the row
 * was written. This is the way back in.
 *
 * A SERVER COMPONENT, and the gate is the reason. The event is read here with
 * the host's session cookie, so events_select_own decides whether there is
 * anything to show — another host's id returns null and meets a not-found
 * before any of the editor reaches their browser. Doing that check in the
 * client would mean shipping the editor first and apologising afterwards.
 *
 * WHICH EDITOR. An invitation is changed in the editor it was made in:
 *
 *   The wizard, for a card made in the wizard: the same four steps /create
 *   has, over the stored card, opening on the details and saving with "Save
 *   changes". Such a card says so itself, `editor: "wizard"` in its config,
 *   written by the wizard when it is saved (see CardConfig.editor). A card on
 *   any template but Classic is the wizard's too, marked or not: nothing else
 *   has ever been able to put a card on one, and the few saved from the
 *   wizard before it started writing the mark are recognised by that.
 *
 *   The full tabbed editor (CardEditor), for every other card, which is every
 *   one made before the wizard. Those were designed control by control, with
 *   ornaments, custom accents and orders of sections the wizard's few
 *   controls cannot reach, so they keep the editor that can.
 *
 * Both are handed the same card out of the database, the same lock, the same
 * limits and the same notice, and both save through updateEvent.
 */
export default async function EditEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<ReactElement> {
  const { eventId } = await params;
  const eventResult = await getEventById(eventId);

  if (!eventResult.ok) {
    return <EventNotFound message={eventResult.error} />;
  }

  /*
    Null covers both "no such event" and "not yours" — events_select_own filters
    rather than refuses, so another host's id simply matches nothing. Telling the
    two apart would confirm the existence of an event to someone with no
    business knowing it.
  */
  if (eventResult.data === null) {
    return (
      <EventNotFound message="It may have been deleted, or it belongs to a different account." />
    );
  }

  const event = eventResult.data;

  /*
    The tally, not the list. What the editor needs is whether anyone is already
    holding this date and how many; who they are is the dashboard's business and
    loading it here would be a guest list read for a page that cannot show one.
    A failed count says nothing rather than blocking the edit — the notice is a
    caution, and a host who cannot see it can still fix their venue.
  */
  const guestCount = await countGuestsForEvent(event.id);

  /*
    Both resolved from the raw column rather than passed through.

    These are stored as plain strings because a row written by an older build,
    or edited by hand, can carry an id this build has never heard of; the
    resolvers turn whatever is there into a real option. The editor's pickers
    take the union and would otherwise be handed a value that matches none of
    their choices, which is a control with nothing selected.
  */
  /*
    Over, and not unlocked by an admin: read-only (lib/eventLock.ts). Decided
    here on the server; updateEvent and the database refuse a save regardless.
  */
  const locked = isEditLocked({
    isPaid: event.isPaid,
    draft: event.draft,
    editUnlockedUntil: event.changes.editUnlockedUntil,
  });

  const coverAnimation = getCoverAnimation(event.coverAnimation).id;
  const weatherTheme = getWeatherTheme(event.weatherTheme).id;

  const initial = {
    draft: event.draft,
    /*
      The config as toStoredEvent hands it over: any section registered since
      the card was saved has already been slotted into the running order, and
      isPaid already reflects the column rather than the JSON's own copy. The
      editor starts from exactly what a guest would see.
    */
    config: event.config,
    coverAnimation,
    showWeather: event.showWeather,
    weatherTheme,
    qrCheckinEnabled: event.qrCheckinEnabled,
  };
  /* After payment, the draft as saved and the changes it has used, for the notes on the date and names. */
  const paidLimits = event.isPaid
    ? { baseline: event.draft, allowance: event.changes }
    : undefined;
  const notice = locked ? (
    <EventEndedNotice eventId={event.id} />
  ) : (
    <GuestsRepliedNotice count={guestCount.ok ? guestCount.data : 0} />
  );

  const madeInWizard =
    event.config.editor === "wizard" ||
    getTemplate(event.config.templateId).id !== CLASSIC_TEMPLATE_ID;

  if (madeInWizard) {
    return (
      <EditWizard
        eventId={event.id}
        /* The column, as this server page just read it; see the note on the other editor below. */
        isPaid={event.isPaid}
        initial={initial}
        readOnly={locked}
        paidLimits={paidLimits}
        notice={notice}
      />
    );
  }

  return (
    <EditEventEditor
      eventId={event.id}
      /*
        The column, as this server page just read it under the host's own
        session — not the card JSON's copy, which the editor carries in the
        browser. It decides the watermark in the host's full screen preview, so
        a host who has paid sees their card as their guests do.
      */
      isPaid={event.isPaid}
      initial={initial}
      readOnly={locked}
      paidLimits={paidLimits}
      notice={notice}
    />
  );
}
