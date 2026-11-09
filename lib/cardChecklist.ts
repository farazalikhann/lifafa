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
 * Whether anything of the event has been typed into the card yet. A card
 * with nothing (a new one, or one kept with only its design chosen) starts on
 * the quick start; one with details opens on its checklist instead.
 */
export function hasCardDetails(draft: EventDraft): boolean {
  return (
    [
      draft.partyOneName,
      draft.partyTwoName,
      draft.hostNames,
      draft.eventTitle,
      draft.eventDate,
      draft.eventTime,
      draft.venueName,
      draft.venueAddress,
      draft.message,
      draft.partyOneParents,
      draft.partyTwoParents,
      draft.partyOneCity,
      draft.partyTwoCity,
    ].some(filled) ||
    draft.subEvents.length > 0 ||
    (draft.contacts ?? []).length > 0
  );
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
