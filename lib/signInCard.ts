import { readCardAutosaveEntry } from "@/lib/cardAutosave";
import { deepEqual } from "@/lib/deepEqual";
import { HANDOFF_PARAM } from "@/lib/handoff/link";
import {
  pendingCardReturnPath,
  readPendingCard,
  writePendingCard,
  type PendingCard,
} from "@/lib/pendingCard";
import { WIZARD_PATH, wizardStepId, wizardStepPath, type WizardStepId } from "@/lib/wizardSteps";

/**
 * The card a host signing in still has unsaved in this browser, and where
 * sign in sends them so it is saved to their account.
 *
 * WHY. A host pressed "Save and continue", reached /login with their card,
 * went back to look at the samples, and signed in later from a plain /login
 * (the header's "Sign in", a new tab). That /login knew nothing of the card,
 * so sign in went to an empty dashboard and the card stayed in this browser,
 * unsaved. Now the browser is asked at the moment of sign in, whichever way
 * in (Google or the email code, components/auth/SignInForm.tsx and
 * EmailCodeForm.tsx), and a card waiting here sends the host back to /create
 * the way "Save and continue" does: /create saves it at once and opens it
 * (WizardArrival in components/wizard/Wizard.tsx).
 *
 * TWO PLACES A CARD CAN BE (and the newest wins):
 * - the sign-in stash (lib/pendingCard.ts): "Save and continue" was pressed.
 * - the card kept as the visitor typed (lib/cardAutosave.ts), only when
 *   something was typed into it: a design picked and nothing else is not a
 *   card anyone would want saved for them.
 *
 * Browser only: everything here reads this browser's storage. Loaded when it
 * is needed (the sign-in page fetches it on the first tap), since the stash's
 * own checks bring the cover animations' code with them.
 */

export interface WaitingCard {
  card: PendingCard;
  /** Epoch milliseconds: stashed, or last changed. */
  savedAt: number;
  from: "stash" | "autosave";
}

/** Whether anything was typed into the card's details. */
function hasDetails(card: PendingCard): boolean {
  const draft = card.draft as unknown as Record<string, unknown>;

  return [
    "partyOneName",
    "partyTwoName",
    "hostNames",
    "eventTitle",
    "eventDate",
    "venueName",
    "venueAddress",
    "message",
  ].some((key) => typeof draft[key] === "string" && (draft[key] as string).trim() !== "");
}

/** The newest unsaved card in this browser, or null. Never throws. */
export function waitingCard(now: number = Date.now()): WaitingCard | null {
  const stash = readPendingCard(now);
  const kept = readCardAutosaveEntry(now);
  const stashed: WaitingCard | null =
    stash.kind === "card" ? { card: stash.card, savedAt: stash.savedAt, from: "stash" } : null;
  const typed: WaitingCard | null =
    kept !== null && hasDetails(kept.card) ? { ...kept, from: "autosave" } : null;

  if (stashed === null || typed === null) {
    return stashed ?? typed;
  }

  /*
    The same card in both is the stash's: leaving the wizard for /login keeps
    the card a moment after it is stashed, and the stash knows the step.
  */
  const same =
    deepEqual(stashed.card.draft, typed.card.draft) &&
    deepEqual(stashed.card.config, typed.card.config);

  return !same && typed.savedAt > stashed.savedAt ? typed : stashed;
}

/**
 * Puts the newest waiting card in the sign-in stash, where /create looks for
 * it after a sign in, and returns the step it saves from. Null when there is
 * no card, or the browser would not keep it.
 *
 * A card kept as it was typed is saved from the details step, as "Save and
 * continue" there would: the saved card then opens in its editor on the
 * next step, with "Your card is saved".
 */
export function stashWaitingCard(): WizardStepId | null {
  const waiting = waitingCard();

  if (waiting === null) {
    return null;
  }

  if (waiting.from === "stash") {
    return wizardStepId(waiting.card.step) ?? "details";
  }

  return writePendingCard({ ...waiting.card, step: "details" }) ? "details" : null;
}

/**
 * Whether sign in may go to the waiting card instead of `path`: the
 * dashboard, the home page or a new card. Not a page the host was sent to
 * sign in for (an invitation's dashboard, a check-in), and not a card handed
 * over from Instagram's or Facebook's browser, which /create brings back
 * from the server itself (lib/handoff/link.ts).
 */
function mayGoToCard(path: string): boolean {
  let url: URL;

  try {
    url = new URL(path, "http://lifafa.local");
  } catch {
    return false;
  }

  if (url.searchParams.has(HANDOFF_PARAM)) {
    return false;
  }

  return (
    url.pathname === "/dashboard" ||
    url.pathname === "/" ||
    (url.pathname === WIZARD_PATH && !url.searchParams.has("event"))
  );
}

/**
 * Where a sign in should end, given where it was going: back to /create
 * with the waiting card, when there is one, or `redirectTo` as it was.
 * Called as the sign in starts (the Google button) or finishes (the email
 * code). Never throws: at worst the sign in goes where it was going.
 */
export function afterSignInPath(redirectTo: string): string {
  try {
    if (!mayGoToCard(redirectTo)) {
      return redirectTo;
    }

    const step = stashWaitingCard();

    return step === null ? redirectTo : pendingCardReturnPath(wizardStepPath(step));
  } catch {
    return redirectTo;
  }
}
