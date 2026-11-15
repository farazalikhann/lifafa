import { pairsNames } from "@/lib/occasions";
import type { CardConfig } from "@/types/card";
import type { EventDraft } from "@/types/event";

/**
 * "Crafting your card…": the full screen between "Save and continue" on the
 * last step and the payment page (components/wizard/CraftingScreen.tsx).
 *
 * A store of its own, read by a screen drawn in app/create/layout.tsx, so the
 * screen stays up while the wizard's page gives way to the payment page (the
 * layout is kept across that move; the page is not).
 *
 * WHAT IT WAITS FOR, AND WHAT IT DOES NOT. The save starts the screen and the
 * move to the payment page starts the moment the save succeeds, never after
 * the screen: the lines tick about every half second while the save runs, the
 * last one waits for the save, and once the save is done and the payment page
 * is here the lines left tick quickly and the screen goes. So it adds no wait
 * of its own to a save that has finished, and it is up for about 3.5 seconds
 * at most unless the save itself takes longer.
 */

export type CraftingPhase = "idle" | "saving" | "saved";

export interface CraftingState {
  phase: CraftingPhase;
  /** The checklist, in the host's own details. The last line waits for the save. */
  lines: readonly string[];
  /** When the screen came up (performance.now()). */
  startedAt: number;
  /** The saved card, once the save has succeeded. */
  eventId: string | null;
  /** The payment page for that card is on screen. */
  arrived: boolean;
}

const IDLE: CraftingState = { phase: "idle", lines: [], startedAt: 0, eventId: null, arrived: false };

let state: CraftingState = IDLE;
const listeners = new Set<() => void>();

function set(next: CraftingState): void {
  state = next;

  for (const listener of listeners) {
    listener();
  }
}

export function subscribeCrafting(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const craftingSnapshot = (): CraftingState => state;
export const craftingServerSnapshot = (): CraftingState => IDLE;

/** The save has started: the screen comes up with these lines. */
export function startCrafting(lines: readonly string[]): void {
  set({ phase: "saving", lines, startedAt: performance.now(), eventId: null, arrived: false });
}

/** The save succeeded; the move to the card's payment page has started. */
export function craftingSaved(eventId: string): void {
  if (state.phase === "idle") {
    return;
  }

  set({ ...state, phase: "saved", eventId });
}

/** The save did not happen (an error, or off to sign in first): the screen goes at once. */
export function stopCrafting(): void {
  set(IDLE);
}

/** The payment page for `eventId` is on screen (components/wizard/PayPageShown.tsx). */
export function craftingArrived(eventId: string): void {
  if (state.phase !== "idle" && (state.eventId === null || state.eventId === eventId)) {
    set({ ...state, eventId, arrived: true });
  }
}

const filled = (value: string | undefined): boolean => (value ?? "").trim().length > 0;

/** "22 November", the date as typed (an ISO date), read in Indian time as the card reads it. */
function dayAndMonth(isoDate: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());

  if (match === null) {
    return null;
  }

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));

  return Number.isNaN(date.getTime())
    ? null
    : new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", timeZone: "UTC" }).format(date);
}

/**
 * The checklist, from the card being saved: the names on the design, the
 * date, the venue, the replies, and the envelope last. A line whose detail
 * is empty is left out. Plain English, in the host's own words where there
 * are any.
 */
export function craftingLines(draft: EventDraft, config: CardConfig, designName: string): string[] {
  const pair = pairsNames(config.occasionId);
  const line = draft.hostNames.trim();
  const names = filled(line)
    ? line
    : [draft.partyOneName.trim(), pair ? draft.partyTwoName.trim() : ""].filter(Boolean).join(" and ");
  const lines: string[] = [
    names.length > 0 ? `Placing ${names} on the ${designName} card` : `Setting up the ${designName} card`,
  ];
  const day = dayAndMonth(draft.eventDate);

  if (day !== null) {
    lines.push(`Adding your ${config.occasionId === "wedding" ? "wedding date" : "date"}, ${day}`);
  }

  if (filled(draft.venueName)) {
    lines.push(`Marking ${draft.venueName.trim()} on the map`);
  } else if (filled(draft.venueAddress) || filled(draft.venueMapsLink)) {
    lines.push("Marking the venue on the map");
  }

  if (config.rsvpEnabled !== false) {
    lines.push("Setting up RSVP for your guests");
  }

  lines.push("Sealing your envelope");
  return lines;
}
