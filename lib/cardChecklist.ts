import { pairsNames } from "@/lib/occasions";
import type { EventDraft } from "@/types/event";
import type { OccasionId } from "@/types/occasion";

/**
 * What a card still needs, as a short list: the "Complete your card" list
 * under a new card's preview (components/create/CardChecklist.tsx) and on the
 * dashboard of a saved one.
 *
 * Only a reading of the draft. Nothing here is required to save, publish or
 * pay: an item left open is a reminder, never a lock.
 */
export type ChecklistItemId = "names" | "date" | "venue" | "functions" | "families" | "message";

export interface ChecklistItem {
  id: ChecklistItemId;
  label: string;
  done: boolean;
}

const filled = (value: string | undefined): boolean => (value ?? "").trim().length > 0;

/** The names the card is about: both of a pair, or the one line written instead. */
export function hasNames(draft: EventDraft, occasionId: OccasionId): boolean {
  if (filled(draft.hostNames)) {
    return true;
  }

  return pairsNames(occasionId)
    ? filled(draft.partyOneName) && filled(draft.partyTwoName)
    : filled(draft.partyOneName);
}

export function cardChecklist(draft: EventDraft, occasionId: OccasionId): ChecklistItem[] {
  return [
    { id: "names", label: "Names", done: hasNames(draft, occasionId) },
    { id: "date", label: "Date", done: filled(draft.eventDate) },
    {
      id: "venue",
      label: "Venue and time",
      done: filled(draft.venueName) && filled(draft.eventTime),
    },
    { id: "functions", label: "Functions", done: draft.subEvents.length > 0 },
    {
      id: "families",
      label: "Family names",
      done: filled(draft.partyOneParents) || filled(draft.partyTwoParents),
    },
    { id: "message", label: "Message for guests", done: filled(draft.message) },
  ];
}

/**
 * How much of the details form is filled, for the "Details filled" bar over
 * it (components/create/DetailsProgress.tsx). Every field the form shows
 * counts once: each name, each family's parents and city, the title, the
 * date, the start time, the functions (one or more), the venue, its address,
 * its map link, the contact numbers (one or more with a number) and the
 * message. The joining word is left out: it always has a word in it.
 *
 * Only an encouragement. Nothing here stops a save, a step or a payment.
 */
export function detailsFilled(
  draft: EventDraft,
  occasionId: OccasionId,
): { filled: number; total: number } {
  /* A line written in place of the names (an older card's) fills the names. */
  const line = filled(draft.hostNames);
  const names = pairsNames(occasionId)
    ? [line || filled(draft.partyOneName), line || filled(draft.partyTwoName)]
    : [line];
  const families = pairsNames(occasionId)
    ? [draft.partyOneParents, draft.partyOneCity, draft.partyTwoParents, draft.partyTwoCity]
    : [draft.partyOneParents, draft.partyOneCity];
  const checks = [
    ...names,
    ...families.map(filled),
    filled(draft.eventTitle),
    filled(draft.eventDate),
    filled(draft.eventTime),
    draft.subEvents.length > 0,
    filled(draft.venueName),
    filled(draft.venueAddress),
    filled(draft.venueMapsLink),
    (draft.contacts ?? []).some((contact) => filled(contact.phone)),
    filled(draft.message),
  ];

  return { filled: checks.filter(Boolean).length, total: checks.length };
}

/**
 * The field in the full details form each item starts at, by its element id:
 * where the dashboard's links land on the edit page.
 */
export function checklistAnchor(id: ChecklistItemId, draft: EventDraft, occasionId: OccasionId): string {
  switch (id) {
    case "names":
      return pairsNames(occasionId) ? "partyOneName" : "hostNames";
    case "date":
      return "eventDate";
    case "venue":
      return filled(draft.venueName) ? "eventTime" : "venueName";
    case "functions":
      return "card-functions";
    case "families":
      return "families-heading";
    case "message":
      return "message";
  }
}
