"use client";

import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ErrorInfo,
  type ReactElement,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import DiscardChangesDialog from "@/components/create/DiscardChangesDialog";
import EditorSkeleton, {
  EditorFormSkeleton,
  QuickStartSkeleton,
} from "@/components/create/EditorSkeleton";
import ExistingInvitationsNotice from "@/components/create/ExistingInvitationsNotice";
import BusyLabel from "@/components/network/BusyLabel";
import { markSaveReload, startSaveClock } from "@/lib/saveTiming";
import { clarityEvent } from "@/lib/clarity";
import { holdForTyping, useLightMotionHere } from "@/lib/motionBudget";
import { startLoad, useLazyModule } from "@/hooks/useLazyModule";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { isOnline, reportWaiting, setSavesOnPhone } from "@/lib/loadNotice";
import PendingCardNotice, {
  displayHost,
  type PendingCardProblem,
} from "@/components/create/PendingCardNotice";
import { adoptDraftHandoff, type AdoptResult } from "@/lib/handoff/actions";
import { HANDOFF_PARAM, handoffFromSearch, pathWithHandoff } from "@/lib/handoff/link";
import { forgetHandoff, rememberHandoff, seenHandoff } from "@/lib/handoff/seen";
import LegalFooter from "@/components/legal/LegalFooter";
import CreateIntro, { INTRO_TEMPLATE_ID, TRUST_LINE } from "@/components/wizard/CreateIntro";
import TemplateGallery, { looked } from "@/components/wizard/TemplateGallery";
import { useAdParamsHref } from "@/hooks/useAdParamsHref";
import { templateDemoPath } from "@/lib/templateSamples";
import WizardProgress from "@/components/wizard/WizardProgress";
import {
  CHOOSE_DESIGN_HINT,
  CHOOSE_DESIGN_HINT_ID,
  FREE_SAVE_LINE,
  HINT_TEXT,
  PRIMARY_BUTTON,
  QUIET_BUTTON,
  TRUST_TEXT,
} from "@/components/wizard/wizardStyles";
import {
  useCardEditor,
  type EditorSnapshot,
  type SaveOutcome,
} from "@/hooks/useCardEditor";
import { coverNameLine, resolveCoverNames } from "@/lib/cardFormat";
import {
  cardChecklist,
  checklistAnchor,
  hasCardDetails,
  type ChecklistItemId,
} from "@/lib/cardChecklist";
import type { EventFormPart } from "@/components/create/EventForm";
import { withContactBlock } from "@/lib/contacts";
import { createEvent, updateEvent, warmSave } from "@/lib/db/events";
import { hasSessionCookie } from "@/lib/supabase/sessionCookie";
import type { ChangeAllowance } from "@/lib/eventLock";
import { EMPTY_SNAPSHOT, arrivalFor, restoredSnapshot, type Arrival } from "@/lib/newCard";
import { clearCardAutosave, readCardAutosave } from "@/lib/cardAutosave";
import { useCardAutosave } from "@/hooks/useCardAutosave";
import {
  clearPendingCard,
  pendingCardReturnPath,
  readPendingCard,
  stashOriginFromUrl,
  writePendingCard,
} from "@/lib/pendingCard";
import { formatPrice } from "@/lib/pricing";
import { getTheme } from "@/lib/themes";
import {
  JUST_SAVED_PARAM,
  NEW_CARD_HREF,
  WIZARD_PATH,
  WIZARD_STEPS,
  WIZARD_STEP_PARAM,
  wizardStepId,
  wizardStepIndex,
  wizardStepPath,
  type WizardStepId,
} from "@/lib/wizardSteps";
import { getTemplate } from "@/templates/registry";
import { switchTemplate } from "@/templates/switch";
import type { TemplateConfig } from "@/templates/types";
import type { EventContact, EventDraft } from "@/types/event";
import Logo from "@/components/Logo";

/*
  Code fetched when it is needed, through useLazyModule rather than
  next/dynamic: a chunk that does not arrive (a slow line, the connection
  gone) leaves its skeleton on screen and "Try again" in the network notice,
  where a dynamic component threw and took the editor down with it.

  The full-screen preview: its cover player and every cover drawn in code.
  Fetched when it is opened, and once the editor has arrived, while the
  browser is idle, so it opens with the connection gone too.
*/
const loadFullScreenPreview = () =>
  import("@/components/create/FullScreenPreview").then((module) => module.default);
/*
  The card beside the steps, at lg only: it is what brings the card
  renderers (templates/parts.ts), so a phone never downloads it.
*/
const loadCardPreview = () => import("@/components/create/CardPreview").then((module) => module.default);
const FRAME_QUERY = "(min-width: 64rem)";

/*
  THE EDITOR (the details and customize steps, components/wizard/editorSteps.ts)
  is one chunk, not part of the gallery's download. It is fetched when a design
  opens: a template chosen, Next pressed, or an address that already names a
  later step, which starts it as this file loads, beside hydration. Until it
  is here a step shows the form's skeleton, a screen high, so nothing below it
  moves into view.
*/
const loadEditorSteps = () => import("@/components/wizard/editorSteps");

function preloadEditorSteps(): void {
  /* A failed fetch is tried again when a step is drawn. */
  startLoad(loadEditorSteps);
}

if (typeof window !== "undefined") {
  const named = new URLSearchParams(window.location.search).get(WIZARD_STEP_PARAM);

  if (named !== null && named !== "template") {
    preloadEditorSteps();
  }
}

/** A step whose code is on its way: the form's skeleton, a screen high, said to a screen reader too. */
function StepSkeleton({ quick = false }: { quick?: boolean }): ReactElement {
  /* The quick start at its own height, so the footer under it does not jump up when it arrives. */
  return (
    <div role="status" className={quick ? undefined : "min-h-[100svh]"}>
      <span className="sr-only">Opening the editor…</span>
      {quick ? <QuickStartSkeleton /> : <EditorFormSkeleton />}
    </div>
  );
}

/** Whether the connection is one to spend on code the visitor has not asked for yet. */
function roomToPrefetch(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;

  return connection?.saveData !== true && !/(^|-)2g$/.test(connection?.effectiveType ?? "");
}

/**
 * A new invitation, made in four steps: a template, the details, the few
 * things that can be changed about the look, and a last look before saving.
 *
 * THE CARD IS HELD BY useCardEditor, for a new card and a saved one alike.
 * What is here is only what the steps are: which one is on screen, how to
 * move between them, and what each one shows.
 *
 * THE STEP IS IN THE URL (`?step=details`), so the browser's Back goes back a
 * step and a reload stays where it was. It is moved with history.pushState,
 * which Next keeps useSearchParams in step with and which asks the server for
 * nothing: a step change is a change of what is on screen, not a new page.
 *
 * OPEN TO EVERYONE, like /create. The account is asked for when the card is
 * saved (or translated), and the card and the step are stashed across the
 * sign-in; see lib/pendingCard.ts.
 */

const subscribeToNothing = (): (() => void) => () => {};

/** False on the server and through hydration, true from the first render after. */
function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}

/**
 * Around the previews: a part of the card whose code did not arrive (the
 * connection gone, templates/parts.ts) closes the preview instead of taking
 * the editor down with it, and onError says so in the network notice.
 */
class PreviewBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    console.error("[wizard] a preview could not be drawn:", error);
    this.props.onError();
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

/** A preview could not be drawn: what is missing comes with the page, so the retry loads it again. */
function reportPreviewFailed(): void {
  reportWaiting("preview-parts", { kind: "failed", retry: () => window.location.reload(), reloads: true });
}

/**
 * Catches a restored card the wizard cannot draw, and falls back to an empty
 * one with the reason said. The stash outlives a reload, so without this a
 * card with something wrong inside it would take the page down on every visit
 * for a day.
 */
class RestoredCardBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error(
      "[wizard] the restored card would not open:",
      error,
      info.componentStack,
    );
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function Wizard({
  templateId = null,
  firstScreen,
}: {
  /**
   * A template chosen before the wizard opened ("Create yours"), already
   * checked by the page to be one the gallery offers.
   */
  templateId?: string | null;
  /**
   * What the server draws in the wizard's place, where it knows what that is:
   * the gallery (GalleryFirstScreen) for an address that opens on it. Without
   * one, the skeleton.
   */
  firstScreen?: ReactNode;
}): ReactElement {
  /* The preview's floating layers: fewer on a light phone, and held while the host types (lib/motionBudget.ts). */
  useLightMotionHere();
  useEffect(() => holdForTyping(document), []);

  /* The step the address names, for the skeleton's header. */
  const step = wizardStepId(useSearchParams().get(WIZARD_STEP_PARAM)) ?? WIZARD_STEPS[0].id;

  /*
    A stashed card is in the browser's storage, which the server cannot see, so
    the server draws the skeleton rather than guess at an empty wizard, or the
    gallery as a new visitor's first render has it, where the address opens
    on the gallery and nothing kept can change what that screen is.
  */
  return useIsClient() ? (
    <WizardArrival templateId={templateId} />
  ) : (
    <>{firstScreen ?? <EditorSkeleton step={step} />}</>
  );
}

/**
 * The card on the template chosen before the wizard opened, everything typed
 * into it kept (switchTemplate). A card already on it is left as it is, so a
 * look changed in step 3 is not put back.
 */
function onChosenTemplate(
  snapshot: EditorSnapshot,
  templateId: string | null,
): EditorSnapshot {
  if (
    templateId === null ||
    getTemplate(snapshot.config.templateId).id === templateId
  ) {
    return snapshot;
  }

  return switchTemplate(snapshot, getTemplate(templateId));
}

/** What the wizard starts from, decided once as the page opens. */
interface ArrivalStart {
  arrival: Arrival;
  start: EditorSnapshot;
  fallback: EditorSnapshot;
  /** The card was the one kept as the visitor typed. */
  autosaved: boolean;
  /**
   * The card's design was chosen: a card brought back (the sign-in stash or
   * the one kept as the visitor typed) keeps the one it was made on, and a
   * template named in the address is a choice. An empty card has none: no
   * design is chosen for the visitor, and Next waits for one.
   */
  chosen: boolean;
  /**
   * Where the address is moved before the steps are drawn, or null to leave
   * it. A return from sign in with no card to show goes to the first step;
   * a handed-over card that could not be brought back loses its id.
   */
  address: string | null;
  /**
   * For Clarity, once the steps are drawn: back from sign in with the card
   * brought back from this browser's own copy (`restored`), or with nothing
   * to bring back (`lost`). Null for every other arrival.
   */
  report: "lost" | "restored" | null;
}

/**
 * The start from what this browser holds: the sign-in stash, then the card
 * kept as the visitor typed, then an empty card. `search` is the query the
 * address will have once the steps are drawn.
 */
function localStart(
  templateId: string | null,
  search: string,
  /** Back from sign in with a handed-over card that did not open: that is said by the caller. */
  afterHandoff = false,
): ArrivalStart {
  const read = arrivalFor(
    readPendingCard(),
    stashOriginFromUrl(search),
    window.location.origin,
  );
  const empty = onChosenTemplate(EMPTY_SNAPSHOT, templateId);

  if (read.kind === "restored") {
    /* The handed-over card wins, and for good: an older kept one is not offered back later. */
    clearCardAutosave();

    return {
      arrival: read,
      start: onChosenTemplate(read.snapshot, templateId),
      fallback: empty,
      autosaved: false,
      chosen: true,
      address: null,
      report: afterHandoff ? "restored" : null,
    };
  }

  const kept = read.kind === "fresh" ? readCardAutosave() : null;
  /* Back from sign in, and the card kept for the trip is not here. */
  const cameBack = (read.kind === "fresh" && read.restart === true) || afterHandoff;

  if (read.kind === "fresh" && kept === null) {
    /*
      Nothing of the card in this browser. Said plainly on the first step,
      never an empty gallery that says nothing: a card handed over from
      Instagram or Facebook that this browser was shown is still on the
      server and is offered back (lib/handoff/seen.ts); otherwise, after a
      sign in, that the card could not be found.
    */
    const waiting = afterHandoff ? null : seenHandoff();
    const problem: PendingCardProblem | null =
      waiting !== null
        ? {
            kind: "handoff-waiting",
            id: waiting,
            href: pathWithHandoff(wizardStepPath("preview"), waiting),
          }
        : read.restart === true
          ? { kind: "after-login-empty" }
          : null;

    if (problem !== null) {
      return {
        arrival: { kind: "lost", problem },
        start: empty,
        fallback: empty,
        autosaved: false,
        chosen: templateId !== null,
        address: read.restart === true ? NEW_CARD_HREF : null,
        report: read.restart === true ? "lost" : null,
      };
    }
  }

  return {
    arrival: read,
    start: kept === null ? empty : onChosenTemplate(restoredSnapshot(kept), templateId),
    fallback: empty,
    autosaved: kept !== null,
    chosen: kept !== null || templateId !== null,
    address: null,
    /* Back from sign in without the card, and the one kept as it was typed brought back instead. */
    report: cameBack && kept !== null ? "restored" : null,
  };
}

/** How long to wait before asking about a card again. */
const ADOPT_RETRY_MS = 1500;
/**
 * Runs `work` in a task of its own after the next paint, so a button's busy
 * state is on screen before heavy rendering starts. A hidden tab paints no
 * frames, so the timer alone carries it there.
 */
function afterPaint(work: () => void): void {
  if (document.visibilityState === "hidden") {
    window.setTimeout(work, 0);
    return;
  }

  window.requestAnimationFrame(() => window.setTimeout(work, 0));
}

/**
 * After a save: when the saved card's page is loaded directly, if the move
 * to it has not happened. Above the slowest move a normal save made in
 * production (4.1 seconds, Clarity's save_screen_ms, 11 to 13 Nov): a full
 * load started on a page that was about to arrive only makes it later.
 */
const SAVE_RELOAD_MS = 8000;

/** How often a signed-in host's save is kept warm while they edit (warmSave). */
const WARM_EVERY_MS = 4 * 60 * 1000;

/** Said the moment a save is confirmed, while the saved card's page is on its way. */
const SAVED_OPENING = "Your card is saved. Opening it…";

/** How many times to ask about a card another request is still saving (about 18 seconds). */
const ADOPT_BUSY_TRIES = 12;
/** How many times a save that broke is tried before this browser's own copy is used. */
const ADOPT_FAILED_TRIES = 3;

/**
 * One adoption per id for the life of the page, however many times the
 * effect runs (React's strict mode runs it twice).
 */
const adoptions = new Map<string, Promise<AdoptResult>>();

function adoptOnce(id: string): Promise<AdoptResult> {
  let adoption = adoptions.get(id);

  if (adoption === undefined) {
    adoption = (async (): Promise<AdoptResult> => {
      let busy = 0;
      let failed = 0;

      for (;;) {
        let result: AdoptResult;

        try {
          result = await adoptDraftHandoff(id);
        } catch {
          result = { ok: false, reason: "failed" };
        }

        if (result.ok || result.reason === "missing" || result.reason === "signed-out") {
          return result;
        }

        const spent =
          result.reason === "busy" ? ++busy >= ADOPT_BUSY_TRIES : ++failed >= ADOPT_FAILED_TRIES;

        if (spent) {
          return result;
        }

        await new Promise((resolve) => window.setTimeout(resolve, ADOPT_RETRY_MS));
      }
    })();
    adoptions.set(id, adoption);
  }

  return adoption;
}

/**
 * How long a move to the saved card may take before the page is loaded
 * directly. It was 3 seconds, and a normal move took up to 4.1 in production
 * (SAVE_RELOAD_MS), so on a slower phone the fallback reloaded a page that
 * was on its way.
 */
const OPEN_SAVED_MS = 8000;

/**
 * Moves to the saved card, and makes sure of it. A router.replace here was
 * seen to fetch the page and then never show it (the address and the screen
 * stayed where they were), which left a host who had just signed in on a
 * skeleton. Not there after OPEN_SAVED_MS, the page is loaded directly; the
 * card is saved either way.
 */
function openSavedCard(router: ReturnType<typeof useRouter>, eventId: string, href: string): void {
  router.replace(href);
  window.setTimeout(() => {
    /*
      On the saved card by the id in its address, not the address itself: the
      saved card's editor takes `saved=new` out of it as soon as it is drawn.
    */
    if (!window.location.href.includes(eventId)) {
      clarityEvent("open_saved_fallback");
      window.location.assign(href);
    }
  }, OPEN_SAVED_MS);
}

/**
 * Where a card just saved continues, from "Save my card" and from a sign in
 * or a handoff alike: the step it was left on. From the last step, the saved screen
 * (payment). From an earlier one, "Save my card" on the details or the
 * customize step, the same step of the saved card's editor, where the host
 * goes on to the next steps and "Save changes" keeps what they change.
 * `saved=new` there says "Your card is saved" once (JustSavedNotice).
 */
function adoptedHref(eventId: string, step: string | null): string {
  const stepId = wizardStepId(step);

  if (stepId === null || stepId === "preview" || stepId === "template") {
    return `${WIZARD_PATH}?${WIZARD_STEP_PARAM}=preview&event=${encodeURIComponent(eventId)}`;
  }

  return `${wizardStepPath(stepId, `/dashboard/${encodeURIComponent(eventId)}/edit`)}&${JUST_SAVED_PARAM}=new`;
}

/**
 * Decides where the card comes from, once, as the page mounts, and starts
 * the wizard from it.
 *
 * A template chosen before the wizard opened is laid onto whichever card it
 * starts from. It needs no stash of its own across a sign-in: the card's
 * config carries its templateId, and the card is stashed whole.
 *
 * A HANDOFF ID IN THE URL COMES FIRST (lib/handoff/link.ts): a card carried
 * from Instagram's or Facebook's browser. The server copy is the card, so it
 * is saved straight into the signed-in account (adoptDraftHandoff) and the
 * host continues on the step they left it on, with every detail there,
 * whatever browser or tab the sign in came back to. Not signed in yet: off
 * to sign in, the id still on the way back. Past its day or not found: the
 * copies in this browser below, and failing those the first step, quietly.
 *
 * THEN THREE PLACES A CARD CAN COME FROM, in this order. The sign-in stash
 * (lib/pendingCard.ts): when it holds a card, that is the card. Then the card
 * kept as the visitor typed (lib/cardAutosave.ts), with a note saying so and
 * a way to start fresh. Then an empty card.
 */
function WizardArrival({
  templateId,
}: {
  templateId: string | null;
}): ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [handoff] = useState(() => handoffFromSearch(window.location.search));
  const [arrived, setArrived] = useState<ArrivalStart | null>(() =>
    handoff === null ? localStart(templateId, window.location.search) : null,
  );
  /*
    Back from signing in (Google or the email code) with the card stashed in
    this browser: saved to the account at once and opened as the saved card,
    as a card handed over from Instagram's or Facebook's browser always was
    (adoptDraftHandoff). The host used to land back in the editor and press
    "Save my card" again. Signed out after all (Back from /login), or a
    save that fails: the editor with the card, as before.
  */
  const [finishing, setFinishing] = useState(
    () =>
      handoff === null &&
      arrived?.arrival.kind === "restored" &&
      stashOriginFromUrl(window.location.search) !== null,
  );

  /* Back from sign in and saved: said at once, while the saved card's page is fetched. */
  const [finishedSaving, setFinishedSaving] = useState(false);

  useEffect(() => {
    if (!finishing || arrived === null || arrived.arrival.kind !== "restored") {
      return;
    }

    let live = true;
    const card = arrived.start;
    const step = arrived.arrival.step;

    /*
      Saved from the details or customize step, the card opens in its editor
      on that step, which draws the form: its code fetched now, beside the
      save, rather than after the editor's page has arrived.
    */
    if (step === "details" || step === "customize") {
      preloadEditorSteps();
    }

    void createEvent(
      card.draft,
      card.config,
      card.coverAnimation,
      { showWeather: card.showWeather, themeId: card.weatherTheme },
      card.qrCheckinEnabled,
    ).then(
      (result) => {
        if (!live) {
          return;
        }

        if (!result.ok) {
          setFinishing(false);
          return;
        }

        /* In the account now: nothing of it is kept in this browser. */
        clearPendingCard();
        clearCardAutosave();
        setFinishedSaving(true);
        openSavedCard(router, result.data.id, adoptedHref(result.data.id, step));
      },
      () => live && setFinishing(false),
    );

    return () => {
      live = false;
    };
    /* Once, for the card this page arrived with. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (handoff === null) {
      return;
    }

    let live = true;

    void adoptOnce(handoff).then((result) => {
      if (!live) {
        return;
      }

      if (result.ok) {
        /* In the account now: nothing of it is kept in this browser. */
        clearPendingCard();
        clearCardAutosave();
        forgetHandoff(handoff);
        openSavedCard(router, result.eventId, adoptedHref(result.eventId, result.step));
        return;
      }

      const here = new URL(window.location.href);

      if (result.reason === "signed-out") {
        /* Untouched on the server; sign in brings the id back here. */
        adoptions.delete(handoff);
        rememberHandoff(handoff);
        const login = new URL("/login", here.origin);
        login.searchParams.set("redirectTo", `${here.pathname}${here.search}`);
        login.searchParams.set(HANDOFF_PARAM, handoff);
        router.replace(`${login.pathname}${login.search}`);
        return;
      }

      /* Not found, past its day, or the server would not answer: this browser's own copies. */
      adoptions.delete(handoff);

      if (result.reason === "missing") {
        forgetHandoff(handoff);
      }

      const retryHref = `${here.pathname}${here.search}`;
      here.searchParams.delete(HANDOFF_PARAM);
      const local = localStart(templateId, here.search, true);

      /*
        Nothing of the card in this browser either, which is the usual case:
        it was made in Instagram's or Facebook's browser. Said plainly, on the
        first step, instead of an empty gallery that says nothing. A card that
        is still on the server but did not open gets a way to try again.
      */
      if (local.arrival.kind === "fresh") {
        setArrived({
          ...local,
          arrival: {
            kind: "lost",
            problem:
              result.reason === "missing"
                ? { kind: "handoff-gone" }
                : { kind: "handoff-unreachable", retryHref },
          },
          address: NEW_CARD_HREF,
          report: "lost",
        });
        return;
      }

      setArrived({ ...local, address: local.address ?? `${here.pathname}${here.search}` });
    });

    return () => {
      live = false;
    };
  }, [handoff, router, templateId]);

  /* The address is moved first, so the steps open on the right one from their first frame. */
  const address = arrived?.address ?? null;

  useEffect(() => {
    if (address !== null) {
      window.history.replaceState(null, "", address);
    }
  }, [address]);

  /* Back from sign in: whether the card came back from this browser, or could not come back at all. */
  const report = arrived?.report ?? null;

  useEffect(() => {
    if (report === "lost") {
      clarityEvent("card_lost_after_login");
    } else if (report === "restored") {
      clarityEvent("card_restored_after_login");
    }
  }, [report]);

  /*
    Settled once the address is where the arrival put it, and settled for
    good: the steps move the address themselves from then on (Next, Back, the
    bar's segments), and a later step is not the arrival undone.
  */
  const settledOnce = useRef(false);

  if (
    arrived !== null &&
    (address === null ||
      (searchParams.get(HANDOFF_PARAM) === null &&
        searchParams.get(WIZARD_STEP_PARAM) ===
          new URL(address, window.location.origin).searchParams.get(WIZARD_STEP_PARAM)))
  ) {
    settledOnce.current = true;
  }

  const settled = settledOnce.current;

  /* Bumped by "Start fresh", so the steps start again from the empty card. */
  const [generation, setGeneration] = useState(0);
  const startFresh = useCallback((): void => {
    clearCardAutosave();
    setArrived((current) =>
      current === null
        ? current
        : {
            ...current,
            start: current.fallback,
            autosaved: false,
            chosen: templateId !== null,
          },
    );
    setGeneration((value) => value + 1);
  }, [templateId]);

  if (!settled || arrived === null || finishing) {
    const skeletonStep =
      wizardStepId(searchParams.get(WIZARD_STEP_PARAM)) ?? WIZARD_STEPS[0].id;

    return handoff === null && !finishing ? (
      <EditorSkeleton step={skeletonStep} />
    ) : (
      <>
        <p
          role="status"
          className="fixed inset-x-4 top-20 z-20 mx-auto max-w-sm rounded-2xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-4 py-3 text-center text-sm text-[var(--lifafa-cream)] shadow-sm"
        >
          {finishedSaving ? SAVED_OPENING : <>Welcome back. Let&apos;s finish your card.</>}
        </p>
        <EditorSkeleton step={skeletonStep} />
      </>
    );
  }

  const { arrival, start, fallback, autosaved, chosen } = arrived;
  /* The empty card the fallbacks start from: chosen only when the address named its template. */
  const fallbackChosen = templateId !== null;

  if (arrival.kind === "restored") {
    return (
      <RestoredCardBoundary
        fallback={
          <WizardSteps
            start={fallback}
            templateChosen={fallbackChosen}
            problem={{ kind: "damaged" }}
            stashedStep={null}
          />
        }
      >
        <WizardSteps
          start={start}
          templateChosen={chosen}
          problem={null}
          stashedStep={wizardStepId(arrival.step)}
        />
      </RestoredCardBoundary>
    );
  }

  const steps = (
    <WizardSteps
      key={generation}
      start={start}
      /*
        A new card is kept once it differs from the empty card, so one opened
        on a template the address named ("Create this card") keeps that design
        from the start. A kept card is kept once it changes, as before.
      */
      untouched={autosaved ? start : EMPTY_SNAPSHOT}
      templateChosen={chosen}
      problem={arrival.kind === "lost" ? arrival.problem : null}
      stashedStep={null}
      onStartFresh={autosaved ? startFresh : undefined}
    />
  );

  /* A kept card could be one an older build wrote; one that will not open is dropped, not fatal. */
  return autosaved ? (
    <RestoredCardBoundary
      fallback={
        <WizardSteps
          start={fallback}
          untouched={EMPTY_SNAPSHOT}
          templateChosen={fallbackChosen}
          problem={null}
          stashedStep={null}
        />
      }
    >
      {steps}
    </RestoredCardBoundary>
  ) : (
    steps
  );
}

/**
 * What makes the wizard an editor of a saved invitation and not the maker of
 * a new one. Everything about the steps is the same; this is the whole of
 * what differs, and all of it is decided by the edit page on the server.
 */
interface EditContext {
  eventId: string;
  /** The event row's is_paid, which decides the watermark in the previews. */
  isPaid: boolean;
  /** The event is over and locked (lib/eventLock.ts): every control inert, nothing to save. */
  readOnly: boolean;
  /** After payment: the draft as saved and the changes used, for the notes on the date and names. */
  paidLimits?: { baseline: EventDraft; allowance: ChangeAllowance };
  /** What the edit page has to say first: guests have replied, or the event has ended. */
  notice?: ReactNode;
}

/**
 * The wizard over a saved invitation: what /dashboard/[eventId]/edit mounts
 * for every invitation, whichever editor it was made in.
 *
 * The same four steps over the stored card, opening on the details, which is
 * what a host coming back has almost always come to change. Saving updates
 * the row and returns to the event's dashboard; there is no payment here. See
 * `edit` in WizardSteps for the rest of what differs.
 */
export function EditWizard({
  initial,
  ...edit
}: EditContext & {
  /** The stored event, as the editor takes it. */
  initial: EditorSnapshot;
}): ReactElement {
  return (
    /* useSearchParams, which the step is read from, wants a boundary. */
    <Suspense fallback={<EditorSkeleton />}>
      <WizardSteps
        start={initial}
        problem={null}
        stashedStep={null}
        edit={edit}
      />
    </Suspense>
  );
}

/**
 * What the details step shows: the quick start of a new card ("quick"), the
 * card as it now is with what is left to add ("card"), one part of the form
 * opened from that list (an item's id), or the whole form ("all"), as every
 * saved invitation has it.
 */
type DetailsView = "quick" | "card" | "all" | ChecklistItemId;

/** The parts of the details form each item of the checklist opens; Functions is its own editor. */
const ITEM_PARTS: Readonly<Record<Exclude<ChecklistItemId, "functions">, ReadonlySet<EventFormPart>>> = {
  names: new Set(["names"]),
  date: new Set(["date"]),
  venue: new Set(["time", "venue"]),
  families: new Set(["families"]),
  message: new Set(["message"]),
};

/** The heading over one part of the form, opened from the checklist. */
const CHECKLIST_TITLES: Readonly<Record<ChecklistItemId, string>> = {
  names: "Names",
  date: "Date",
  venue: "Venue and time",
  functions: "Functions",
  families: "Family names",
  message: "Message for guests",
};

const isItemView = (view: DetailsView): view is ChecklistItemId =>
  view !== "quick" && view !== "card" && view !== "all";

/** Where an element of the form is drawn, brought into view and, when it takes typing, focused. */
function revealField(id: string): void {
  const element = document.getElementById(id);

  if (element === null) {
    return;
  }

  element.scrollIntoView({ block: "center" });

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    element.focus({ preventScroll: true });
  }
}

/** The quick start's heading, and the card's, over the details step of a new card. */
const QUICK_START_TITLE = "Let's see your card in 10 seconds";
const CARD_TITLE = "Your card";
/** Over the card the moment "See my card" has made it. */
const CARD_READY =
  "Your card is ready! Nothing here is final. Add more details now, or edit your card later from your dashboard.";

/*
  What the host is told about changing the card later. True for every card:
  a card is edited from its dashboard, before payment as much as the host
  likes and after it within the limits the dashboard explains (a date and the
  names can be changed a few times, and an invitation whose day is over is
  closed; lib/eventLock.ts). So "edit", and never "anytime" or "everything".
*/
const DETAILS_REASSURANCE =
  "Nothing here is final. Add what you have now. You can edit your card later from your dashboard.";

function WizardSteps({
  start,
  untouched = start,
  templateChosen: chosenAtStart = true,
  problem,
  stashedStep,
  edit,
  onStartFresh,
}: {
  start: EditorSnapshot;
  /**
   * The card as it is with nothing done to it: until the card differs from
   * this, there is nothing to keep in this browser (hooks/useCardAutosave.ts).
   * The start, unless the start already holds a choice worth keeping.
   */
  untouched?: EditorSnapshot;
  /**
   * Whether the card's design has been chosen (see `chosen` on ArrivalStart).
   * Until it is, the gallery has nothing selected, Next is off with a hint
   * beside it, and no later step can be reached. A saved card's always has.
   */
  templateChosen?: boolean;
  /** Why a card the host came back for is not here, if it is not. */
  problem: PendingCardProblem | null;
  /** The step a restored card was stashed on. */
  stashedStep: WizardStepId | null;
  /** Given when this is a saved invitation being changed; absent for a new card. */
  edit?: EditContext;
  /**
   * The card was the one kept in this browser as the visitor typed: say so,
   * and offer to clear it (lib/cardAutosave.ts).
   */
  onStartFresh?: () => void;
}): ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editing = edit !== undefined;
  const readOnly = edit?.readOnly === true;
  /* Where the steps live: /create, or this invitation's own edit page. */
  const path = editing ? `/dashboard/${edit.eventId}/edit` : WIZARD_PATH;
  const dashboardHref = editing ? `/dashboard/${edit.eventId}` : "/dashboard";

  /*
    The URL's step, or the one the card was stashed on, or the first. The URL
    wins: a host back from signing in arrives on a link that names the step,
    and after that every move writes it there. A saved card opens on its
    details, the second step: its template was chosen long ago.
  */
  const requestedStep: WizardStepId =
    wizardStepId(searchParams.get(WIZARD_STEP_PARAM)) ??
    stashedStep ??
    (editing ? "details" : WIZARD_STEPS[0].id);
  /* Whether a design has been chosen: until then, the gallery is the only step. */
  const startedChosen = chosenAtStart || editing;
  const [templateChosen, setTemplateChosen] = useState(startedChosen);
  /*
    An address naming a later step before any design was chosen (an old link,
    a step typed in) opens on the gallery, and stays on it once one is chosen,
    until Next moves on: choosing does not jump the visitor to that step. The
    address is left as it is, so nothing here waits on the router to catch up.
  */
  const [heldOnGallery, setHeldOnGallery] = useState(
    !startedChosen && requestedStep !== "template",
  );
  const step: WizardStepId = templateChosen && !heldOnGallery ? requestedStep : "template";
  const index = wizardStepIndex(step);

  /*
    How the details step is shown. A new card with nothing typed in it starts
    on the quick start: the two names and the date, and "See my card". A card
    brought back with details already in it opens on itself and its checklist.
    A saved invitation opens on the whole form, as it always has. Held here,
    not in the address, so moving between the steps keeps it and Back and
    Next are as they were.
  */
  const [detailsView, setDetailsView] = useState<DetailsView>(() =>
    editing ? "all" : hasCardDetails(start.draft) ? "card" : "quick",
  );
  const isLast = index === WIZARD_STEPS.length - 1;

  /* Read by the sign-in detour, which is built before the step can change. */
  const stepRef = useRef<WizardStepId>(step);
  stepRef.current = step;
  const chosenRef = useRef(templateChosen);
  chosenRef.current = templateChosen;

  const goTo = useCallback(
    (next: WizardStepId): void => {
      if (next === stepRef.current) {
        return;
      }

      /* Nothing past the gallery before a design is chosen: Next is off, and so are the bar's segments. */
      if (!chosenRef.current && next !== "template") {
        return;
      }

      setHeldOnGallery(false);

      if (next !== "template") {
        preloadEditorSteps();
      }

      window.history.pushState(null, "", wizardStepPath(next, path));
      /* A second tap before the step has drawn goes nowhere new: no step is skipped, no history doubled. */
      stepRef.current = next;
      window.scrollTo({ top: 0 });
    },
    [path],
  );

  /*
    A new step starts at its heading, for a keyboard and for a screen reader:
    without this the focus stays on a Next button that has not moved while
    everything above it has been replaced. Not on the first render, where
    taking the focus would be the page grabbing it on load.
  */
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    headingRef.current?.focus({ preventScroll: true });
  }, [step, detailsView]);

  /**
   * Stashes the card and the step, and sends the host to sign in. Returns the
   * error to show when the card could not be kept, and null once on the way.
   */
  const sendToSignIn = useCallback(
    (snapshot: EditorSnapshot): string | null => {
      const stashed = writePendingCard({
        draft: snapshot.draft,
        config: snapshot.config,
        coverAnimation: snapshot.coverAnimation,
        showWeather: snapshot.showWeather,
        weatherTheme: snapshot.weatherTheme,
        qrCheckinEnabled: snapshot.qrCheckinEnabled,
        step: stepRef.current,
      });

      if (!stashed) {
        return "Your browser would not let us hold onto this card. Please try again, or check your privacy settings.";
      }

      /* The design too, so the sign-in page can show its picture at once (app/login/page.tsx). */
      router.push(
        `/login?redirectTo=${encodeURIComponent(
          pendingCardReturnPath(wizardStepPath(stepRef.current)),
        )}&design=${encodeURIComponent(getTemplate(snapshot.config.templateId).id)}`,
      );
      return null;
    },
    [router],
  );

  /**
   * "Save my card" while signed out: sendToSignIn, in every browser.
   *
   * Instagram's and Facebook's browsers too, since /login signs a host in
   * there with an email code. The card used to be handed over to Chrome or
   * Safari from here; now it goes to /login in this same browser like any
   * other, and /login offers Chrome or Safari for Google only at a tap
   * (components/browser/InAppLoginPrompt.tsx), carrying the card then.
   */
  const continueSignedOut = useCallback(
    async (snapshot: EditorSnapshot): Promise<SaveOutcome> => {
      const failure = sendToSignIn(snapshot);
      return failure === null ? { ok: true } : { ok: false, error: failure };
    },
    [sendToSignIn],
  );

  /**
   * Saves the invitation, or sends the host to sign in first, and then goes
   * on to payment: the same page, on the saved card. The session is asked for
   * at the click, as on /create, so one that has not loaded yet or has
   * expired is not mistaken for signed out or signed in.
   */
  /*
    THE WATCHDOG after a save. The row is written; what is left is the move to
    the saved card's page, and a router.push can stall there (a phone that
    dropped the request, an in-app browser that never finishes it), leaving
    the host over a card that is already saved. The button says "Saved" and
    the line beside it that the card is opening from the moment the server
    confirms the save (`savedCard`); after SAVE_RELOAD_MS, still here and not
    on the saved card, the page is loaded directly.
  */
  const [savedCard, setSavedCard] = useState(false);
  const saveTimers = useRef<number[]>([]);

  useEffect(
    () => () => {
      for (const timer of saveTimers.current) {
        window.clearTimeout(timer);
      }
    },
    [],
  );

  const watchSavedCard = useCallback((eventId: string, target: string): void => {
    for (const timer of saveTimers.current) {
      window.clearTimeout(timer);
    }

    saveTimers.current = [
      window.setTimeout(() => {
        /* On the saved card already: the saved screen, or its editor on the step the save was pressed on. */
        if (window.location.href.includes(eventId)) {
          return;
        }

        clarityEvent("save_watchdog");
        markSaveReload();
        window.location.assign(target);
      }, SAVE_RELOAD_MS),
    ];
  }, []);

  /* Set once the card is saved to an account: nothing is kept in this browser after that. */
  const autosaveStopped = useRef(false);

  const save = useCallback(
    async (snapshot: EditorSnapshot): Promise<SaveOutcome> => {
      /*
        A saved invitation: the row is updated, and the host goes back to its
        dashboard. The link, the owner and whether it is paid are not this
        save's to touch; see updateEvent for the whole list, and for the lock
        and the change limits it holds a paid card to.
      */
      if (edit !== undefined) {
        if (!isOnline()) {
          return {
            ok: false,
            error: "You are offline. Connect to the internet, then save your changes again.",
          };
        }

        const result = await updateEvent(edit.eventId, {
          draft: snapshot.draft,
          cardConfig: snapshot.config,
          coverAnimation: snapshot.coverAnimation,
          weather: {
            showWeather: snapshot.showWeather,
            themeId: snapshot.weatherTheme,
          },
          qrCheckinEnabled: snapshot.qrCheckinEnabled,
        });

        if (!result.ok) {
          return { ok: false, error: result.error };
        }

        /* Whether the guests need telling: only the date and the venue count. */
        const detailsMoved =
          snapshot.draft.eventDate !== start.draft.eventDate ||
          snapshot.draft.eventTime !== start.draft.eventTime ||
          snapshot.draft.venueName !== start.draft.venueName ||
          snapshot.draft.venueAddress !== start.draft.venueAddress;

        /* refresh() first, so the dashboard is built from the row as it now is. */
        router.refresh();
        router.push(`${dashboardHref}?saved=${detailsMoved ? "details" : "1"}`);

        return { ok: true };
      }

      /* Nothing can be saved or handed on without a connection: say so, and keep the card here. */
      if (!isOnline()) {
        return {
          ok: false,
          error:
            "You are offline. Your card is kept on this phone. Connect to the internet, then press Save my card again.",
        };
      }

      /*
        No session cookie in this browser: nobody is signed in, and the
        server would only say so after a round trip (lib/supabase/sessionCookie.ts).
        Straight to sign in, as `signedOut` below would send the host.
      */
      if (!hasSessionCookie()) {
        return continueSignedOut(snapshot);
      }

      /*
        Timed, for the saved card's page to report (lib/saveTiming.ts). The
        session is asked by createEvent itself, on the server: nobody signed
        in comes back as `signedOut`, and only then is the host sent to sign
        in. There is no second trip to Supabase from the browser first.
      */
      const clock = startSaveClock();
      const result = await createEvent(
        snapshot.draft,
        snapshot.config,
        snapshot.coverAnimation,
        { showWeather: snapshot.showWeather, themeId: snapshot.weatherTheme },
        snapshot.qrCheckinEnabled,
      );

      clock.lap("create");

      if (!result.ok) {
        if (result.signedOut === true) {
          return continueSignedOut(snapshot);
        }

        /* The stash stays: the card is still not saved anywhere else. */
        return { ok: false, error: result.error };
      }

      clearPendingCard();
      autosaveStopped.current = true;
      clearCardAutosave();
      clock.handOff(result.data.id);
      /* Saved: the button says so now, not when the saved card's page has arrived. */
      setSavedCard(true);

      /* The saved screen from the last step; from the details or customize step, that step of the saved card. */
      const target = adoptedHref(result.data.id, stepRef.current);
      router.push(target);
      watchSavedCard(result.data.id, target);

      return { ok: true };
    },
    [router, continueSignedOut, edit, start, dashboardHref, watchSavedCard],
  );

  const {
    isDirty,
    limitNotes,
    templateId,
    applySnapshot,
    draft,
    blocks,
    setBlocks,
    occasionId,
    setOccasionId,
    style,
    setStyle,
    setBorderStyle,
    setFontPair,
    rsvpEnabled,
    setRsvpEnabled,
    scratchTarget,
    setScratchTarget,
    musicUrl,
    setMusicUrl,
    setCoverAnimation,
    showWeather,
    setShowWeather,
    setWeatherTheme,
    qrCheckinEnabled,
    setQrCheckinEnabled,
    pdfDownload,
    setPdfDownload,
    language,
    previewLanguage,
    setPreviewLanguage,
    handleChange,
    handleOccasionSelect,
    handleLanguageSelect,
    handleDraftWord,
    handleSubEventWord,
    handleSectionWord,
    translatedSignal,
    handleTranslated,
    handleCardId,
    openSubEventId,
    setOpenSubEventId,
    coverAnimation,
    weatherTheme,
    previewWeather,
    snapshot,
    isSaving,
    error,
    handleSave,
    motifs,
    preview,
  } = useCardEditor({
    start,
    /*
      A new card has nothing saved to lose, and its sign-in detour leaves on
      purpose. A saved one has: unsaved changes are asked about before they
      are walked away from, here and by the browser's own prompt.
    */
    guardUnsaved: editing,
    onSave: save,
    paidLimits: edit?.paidLimits,
  });

  /*
    A signed-in host on the editor of a new card: the function that saves it,
    and its connection to Supabase, woken now and every few minutes while the
    page is open, so "Save my card" does not meet them cold (warmSave). Not
    for a visitor with no session cookie, whose Save goes straight to sign in.
  */
  const onEditor = !editing && step !== "template";

  useEffect(() => {
    if (!onEditor || !hasSessionCookie()) {
      return;
    }

    const warm = (): void => {
      if (document.visibilityState === "visible") {
        void warmSave().catch(() => undefined);
      }
    };

    warm();
    const timer = window.setInterval(warm, WARM_EVERY_MS);
    return () => window.clearInterval(timer);
  }, [onEditor]);

  /* A new card is kept in this browser as it is made; see hooks/useCardAutosave.ts. */
  useCardAutosave({ snapshot, start: untouched, enabled: !editing, stopped: autosaveStopped });

  /*
    Where a guarded control was trying to go, held while the host answers the
    dialog. Only the one control that exists to walk away comes through here.
  */
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const leave = (href: string): void => {
    if (isDirty) {
      setPendingHref(href);
      return;
    }

    router.push(href);
  };

  /*
    The numbers, and the section that shows them: a card has no contact block
    until it has a contact, so the first number that can be dialled brings one.
  */
  const handleContacts = useCallback(
    (contacts: readonly EventContact[]): void => {
      handleChange("contacts", contacts);
      setBlocks((previous) => withContactBlock(previous, { contacts }));
    },
    [handleChange, setBlocks],
  );

  /* The editor's code, for the details and customize steps: their skeleton until it is here. */
  const { module: editor } = useLazyModule(loadEditorSteps, {
    wanted: step === "details" || step === "customize",
    id: "editor",
  });
  const isFramed = useMediaQuery(FRAME_QUERY);
  /*
    A new card's details step on a phone, past the quick start: the card in
    the page, above what is left to add. At lg it is beside the step as always.
  */
  const inlinePreview = !editing && !isFramed && step === "details" && detailsView === "card";
  const { module: CardPreview } = useLazyModule(loadCardPreview, {
    wanted: isFramed || inlinePreview,
    id: "card-preview",
  });

  /*
    While the quick start is filled in, the card's code is fetched quietly, so
    "See my card" draws it at once. Not reported: nothing waits on it yet.
  */
  const quickStart = !editing && step === "details" && detailsView === "quick";
  /*
    The quick start on screen: "See my card" is its one main action, so the
    bar's Next and Preview wait (Back stays). Not while its code is still on
    the way, so a step that never arrives still has its way on.
  */
  const quickStartShown = quickStart && editor !== null;

  useEffect(() => {
    if (quickStart && !isFramed && editor !== null && roomToPrefetch()) {
      startLoad(loadCardPreview);
    }
  }, [quickStart, isFramed, editor]);

  /* "See my card", and Done under a part of the form: the card with what was typed, from the top of the page. */
  const showCard = (): void => {
    setDetailsView("card");
    window.scrollTo({ top: 0 });
  };

  /*
    "Your card is ready!" over the card, from "See my card" until the host
    opens a part of the form or leaves the step: the moment after, not a
    standing notice.
  */
  const [justMade, setJustMade] = useState(false);

  useEffect(() => {
    if (step !== "details" || detailsView !== "card") {
      setJustMade(false);
    }
  }, [step, detailsView]);

  /*
    "See my card" turns into a spinner first, and the card, the heavy part,
    is drawn in the task after that paint: the tap is answered at once even
    on a slow phone, and cannot be pressed twice.
  */
  const [making, setMaking] = useState(false);

  const seeMyCard = (): void => {
    if (making) {
      return;
    }

    setMaking(true);
    afterPaint(() => {
      setMaking(false);
      setJustMade(true);
      showCard();
    });
  };

  /* Next, the same way: its spinner first, then the step. */
  const [moving, setMoving] = useState(false);

  const nextStep = (to: WizardStepId): void => {
    if (moving) {
      return;
    }

    setMoving(true);
    afterPaint(() => {
      setMoving(false);
      goTo(to);
    });
  };

  /*
    A field of the details form to bring into view once it is drawn: the
    first field of a part opened from the checklist, the venue from the
    preview's hint, or the field a dashboard link names in the address
    (`#venueName`) on a saved invitation's edit page. Waits for the editor's
    code where that is still on its way.
  */
  const [reveal, setReveal] = useState<{ id: string } | null>(() => {
    /* The edit page is drawn on the server too, where there is no address to read. */
    const hash = typeof window === "undefined" ? "" : window.location.hash.slice(1);
    return editing && /^[A-Za-z][\w-]*$/.test(hash) ? { id: hash } : null;
  });

  useEffect(() => {
    if (reveal === null || editor === null || step !== "details") {
      return;
    }

    /* After the frame that draws the part, and once: clearing it below does not cancel this. */
    window.requestAnimationFrame(() => revealField(reveal.id));
    setReveal(null);
  }, [reveal, editor, step]);

  /**
   * An item of the checklist, its "Add" or "Edit": that part of the form on
   * its own, on the details step. From the whole form, the same fields there.
   */
  const openItem = (id: ChecklistItemId): void => {
    goTo("details");

    if (detailsView !== "all") {
      setDetailsView(id);
    }

    setReveal({ id: checklistAnchor(id, draft, occasionId) });
  };

  /*
    The light "+ Add venue" over the preview's frame, on a new card with no
    venue yet. The previews only: the guest's page never has it.
  */
  const onAddVenue =
    editing || draft.venueName.trim().length > 0 ? undefined : () => openItem("venue");

  /*
    "Save my card" saves, on the first press. Every detail is optional
    and nothing stands in front of the save: no reminder about a venue or a
    time, and nothing listing what is still to add. The card can be changed
    from the dashboard after it is saved, which the step says above the button.
  */
  const pressSave = handleSave;

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const {
    module: FullScreenPreview,
    failed: previewFailed,
    retry: retryPreview,
  } = useLazyModule(loadFullScreenPreview, { wanted: isPreviewOpen, id: "preview" });
  /* Pressed, and its code still on the way: the button says so and cannot be pressed again. */
  const previewOpening = isPreviewOpen && FullScreenPreview === null && !previewFailed;
  const previewTrigger = useRef<HTMLButtonElement>(null);
  const closePreview = useCallback((): void => setIsPreviewOpen(false), []);
  /* Whichever of the two preview buttons was pressed gets the focus back. */
  const openPreview = (button: HTMLButtonElement): void => {
    previewTrigger.current = button;

    if (previewFailed) {
      retryPreview();
    }

    setIsPreviewOpen(true);
  };

  /* Once the editor is here, the preview's code too, while the browser is idle: it then opens offline as well. */
  useEffect(() => {
    if (editor === null || !roomToPrefetch()) {
      return;
    }

    const prefetch = (): void => {
      startLoad(loadFullScreenPreview);
      /* And what draws the chosen design in it: the card, its cover, its reply frame. */
      void import("@/components/create/FullScreenPreview").then(
        (module) => module.preloadTemplateParts(templateId),
        () => undefined,
      );
    };

    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(prefetch, { timeout: 5000 });
      return () => window.cancelIdleCallback(handle);
    }

    const timer = window.setTimeout(prefetch, 2000);
    return () => window.clearTimeout(timer);
  }, [editor, templateId]);

  /* A new card is kept on this phone as it is typed: the offline notice can say so. */
  useEffect(() => {
    if (editing) {
      return;
    }

    setSavesOnPhone(true);
    return () => setSavesOnPhone(false);
  }, [editing]);

  const template = getTemplate(templateId);
  /* The intro and the trust line: a new card's gallery, never a saved one's. */
  const showIntro = step === "template" && !editing;
  const adHref = useAdParamsHref();
  /*
    On a paid invitation, what it was paid on: the price of the template the
    stored card is on. A template that costs more cannot be moved to after
    payment (updateEvent refuses it); one at the same price or less can.
  */
  const paidPricePaise =
    edit?.isPaid === true ? getTemplate(start.config.templateId).price : null;

  /**
   * A template chosen in the gallery: the card moved onto it, with everything
   * the host has typed kept. See switchTemplate for exactly what is the
   * event's and goes across, and what is the look's and is replaced. Choosing
   * the one the card is already on does nothing, so a look the host has since
   * changed in step 3 is not put back by a stray tap.
   */
  const handleTemplate = (next: TemplateConfig): void => {
    /* The gallery does not offer it and the server would refuse the save; this is the third lock, not the only one. */
    if (paidPricePaise !== null && next.price > paidPricePaise) {
      return;
    }

    /* A design chosen: the editor's steps are what comes next. */
    preloadEditorSteps();
    /* Chosen even when it is the one the card is drawn on: an empty card is drawn on Classic. */
    setTemplateChosen(true);

    if (next.id === template.id) {
      return;
    }

    applySnapshot(switchTemplate(snapshot, next));
  };

  const names = resolveCoverNames(preview.draft, occasionId, previewLanguage);
  /* A new card's details and customize steps, once its design is chosen: Save on a row of its own. */
  const saveRow =
    !editing && templateChosen && (step === "details" || step === "customize");
  /* A saved card not paid for yet, as one just saved continues in: Save changes has the line too. */
  const unpaidEdit = editing && !readOnly && edit.isPaid !== true;
  /*
    "Save my card", wherever a new card offers it: the same save from every
    step (`save` above), the same sign in, handoff and duplicate guard.
  */
  const saveButton = (className: string): ReactElement => (
    <button
      type="button"
      onClick={pressSave}
      disabled={isSaving}
      aria-busy={isSaving}
      data-save-card=""
      className={className}
    >
      <BusyLabel busy={isSaving} busyText={savedCard ? "Saved" : "Saving…"} done={savedCard}>
        Save my card
      </BusyLabel>
    </button>
  );
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink)]/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 pt-2.5 pb-1 sm:px-12 lg:px-[5.5rem] xl:px-8">
          <WizardProgress
            brand={
              editing ? (
                /* The way out of an edit, which asks first when there is something unsaved. */
                <button
                  type="button"
                  onClick={() => leave(dashboardHref)}
                  className="-my-2 min-h-11 rounded text-[0.8125rem] font-medium whitespace-nowrap text-[var(--lifafa-muted)] transition-colors duration-150 hover:text-[var(--lifafa-cream)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
                >
                  <span aria-hidden="true" className="mr-1.5">
                    ←
                  </span>
                  {readOnly ? "Back to dashboard" : "Cancel"}
                </button>
              ) : (
                <Link
                  href="/"
                  className="-my-2 inline-block rounded py-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
                >
                  <Logo compact />
                </Link>
              )
            }
            current={step}
            onSelect={goTo}
          />
        </div>
      </header>

      {/*
        Two columns at lg, as in the editor: the step on the left, the card on
        the right. The room the bar pinned to the bottom needs is under the
        footer below, so the footer can be scrolled clear of it too.
      */}
      <main className="mx-auto grid max-w-6xl gap-8 px-4 pt-6 pb-12 sm:px-12 lg:grid-cols-[58fr_42fr] lg:items-start lg:gap-10 lg:px-[5.5rem] lg:pt-10 xl:px-8">
        {problem !== null ? (
          <PendingCardNotice
            problem={problem}
            here={displayHost(window.location.origin)}
          />
        ) : null}
        {onStartFresh !== undefined ? (
          <p
            role="status"
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-4 py-2 text-sm text-[var(--lifafa-cream)] sm:px-5 lg:col-span-2"
          >
            Your card details were restored.
            <button
              type="button"
              onClick={onStartFresh}
              className="inline-flex min-h-11 items-center rounded font-medium text-[var(--lifafa-marigold)] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
            >
              Start fresh
            </button>
          </p>
        ) : null}
        {/* A new card is told of the ones the host already has; a saved one, what its edit page has to say. */}
        {editing ? edit.notice : <ExistingInvitationsNotice />}

        {/*
          `min-w-0`, so nothing that refuses to wrap can widen a 360px page.
          Inert once the event is over: every control out of reach, the steps
          and the preview still there to look through.
        */}
        <div className="flex min-w-0 flex-col gap-8" inert={readOnly}>
          {/*
            What Lifafa is, for a visitor from an ad, over a new card's gallery
            only. As GalleryFirstScreen draws it, so nothing moves.
          */}
          {showIntro ? (
            <CreateIntro
              demoHref={adHref(templateDemoPath(INTRO_TEMPLATE_ID))}
              onOpen={() => looked(getTemplate(INTRO_TEMPLATE_ID))}
              live
            />
          ) : null}

          {/*
            Over a new card's still card on a phone, the heading is for screen
            readers only: the card says what it is, and the checklist under it
            then fits on the first screen.
          */}
          <div
            className={`flex min-w-0 flex-col gap-1.5${inlinePreview ? " max-lg:sr-only" : ""}`}
          >
            {/*
              The quick start's title is two lines in Fraunces on a screen up to
              396px wide and one line in the fallback face it is first drawn in:
              its second line is held from the start there, so the form under
              it does not drop when the font arrives.
            */}
            <h1
              ref={headingRef}
              tabIndex={-1}
              className={`font-[family-name:var(--font-display)] text-2xl font-semibold tracking-[-0.01em] text-balance text-[var(--lifafa-cream)] focus:outline-none${
                step === "details" && detailsView === "quick" ? " max-[396px]:min-h-16" : ""
              }`}
            >
              {/* The last step publishes a new card; for a saved one it is only a last look. */}
              {editing && step === "preview"
                ? "Preview your changes"
                : step === "details" && detailsView === "quick"
                  ? QUICK_START_TITLE
                  : step === "details" && detailsView === "card"
                    ? CARD_TITLE
                    : step === "details" && isItemView(detailsView)
                      ? (CHECKLIST_TITLES[detailsView] ?? WIZARD_STEPS[index].title)
                      : WIZARD_STEPS[index].title}
            </h1>
            {showIntro ? <p className={TRUST_TEXT}>{TRUST_LINE}</p> : null}
          </div>

          {/*
            At the top of the details, in words a host cannot miss: nothing here
            has to be right now. Over a card just made, the "ready" line says
            the same, so the card and its guide stay on the first screen.
          */}
          {step === "details" && !editing && !(detailsView === "card" && justMade) ? (
            <p
              data-details-reassurance=""
              className="flex items-start gap-2.5 rounded-2xl border border-[var(--lifafa-marigold)]/40 bg-[var(--lifafa-marigold)]/[0.08] px-4 py-3 text-[0.9375rem] leading-snug font-medium text-[var(--lifafa-cream)]"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--lifafa-marigold)]"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
              {/* What saving costs first: a visitor from a demo lands here, past the gallery's line. */}
              <span className="flex min-w-0 flex-col gap-1">
                <span data-free-line="" className="font-semibold">
                  {FREE_SAVE_LINE}
                </span>
                <span>{DETAILS_REASSURANCE}</span>
              </span>
            </p>
          ) : null}

          {step === "template" ? (
            <TemplateGallery
              selectedId={templateChosen ? template.id : null}
              onSelect={handleTemplate}
              paidPricePaise={paidPricePaise}
            />
          ) : null}

          {(step === "details" || step === "customize") && editor === null ? (
            <StepSkeleton quick={step === "details" && detailsView === "quick"} />
          ) : null}

          {step === "details" && editor !== null ? (
            /* Everything the host types: masked from Clarity (lib/clarity.ts). `contents` keeps the layout as it was. */
            <div className="contents" data-clarity-mask="true">
              {detailsView === "quick" ? (
                /* A div, not a form: Enter on a phone's keyboard moves on, it does not submit. */
                <div className="flex min-w-0 flex-col gap-6">
                  <editor.EventBasics
                    draft={draft}
                    onChange={handleChange}
                    occasionId={occasionId}
                    language={language}
                  />
                  {/* The one main action here: the bar's Next and Preview wait until the card is made. */}
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={seeMyCard}
                      aria-busy={making}
                      className={`${PRIMARY_BUTTON} w-full`}
                    >
                      <BusyLabel busy={making} busyText="Making your card…">
                        See my card
                      </BusyLabel>
                    </button>
                    <p className="text-center text-xs text-[var(--lifafa-muted)]">You can add the rest next</p>
                  </div>
                  <editor.QuickStartNext />
                </div>
              ) : detailsView === "card" ? (
                <div className="flex min-w-0 flex-col gap-4 lg:gap-6">
                  {justMade ? (
                    <p
                      role="status"
                      data-card-ready=""
                      className="flex items-start gap-2.5 rounded-2xl border border-[var(--paper-emerald)]/25 bg-[var(--paper-emerald)]/10 px-4 py-2.5 text-[0.8125rem] leading-snug font-medium text-[var(--paper-emerald)]"
                    >
                      <svg aria-hidden="true" viewBox="0 0 20 20" className="mt-px size-[18px] shrink-0">
                        <circle cx="10" cy="10" r="10" fill="currentColor" />
                        <path d="M6 10.5l2.6 2.5L14 7.5" fill="none" stroke="#fffaf0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {CARD_READY}
                    </p>
                  ) : null}
                  {inlinePreview ? (
                    CardPreview === null ? (
                      /* The still card's size (CardPreview.tsx), so nothing moves when it arrives. */
                      <div
                        aria-hidden="true"
                        className="mx-auto h-[min(620px,55vh)] aspect-[390/720] animate-pulse rounded-[1.25rem] border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)]"
                      />
                    ) : (
                      <PreviewBoundary onError={reportPreviewFailed}>
                        <CardPreview
                          inline
                          draft={preview.draft}
                          config={preview.config}
                          onPreviewLanguageChange={setPreviewLanguage}
                          motifs={motifs}
                          coverAnimation={coverAnimation}
                          weather={previewWeather}
                          weatherTheme={weatherTheme}
                          isPaid={false}
                          onAddVenue={onAddVenue}
                        />
                      </PreviewBoundary>
                    )
                  ) : null}
                  <editor.CardChecklist
                    items={cardChecklist(draft, occasionId)}
                    onAdd={openItem}
                    onShowAll={() => {
                      setDetailsView("all");
                      window.scrollTo({ top: 0 });
                    }}
                  />
                </div>
              ) : isItemView(detailsView) ? (
                /* One part of the form, opened from the checklist: the same fields as the whole form. */
                <div
                  className="flex min-w-0 flex-col gap-8"
                  onFocusCapture={() => setPreviewLanguage(language)}
                >
                  {detailsView === "functions" ? (
                    <editor.SubEventEditor
                      subEvents={draft.subEvents}
                      openId={openSubEventId}
                      onChange={(subEvents) => handleChange("subEvents", subEvents)}
                      onOpenIdChange={setOpenSubEventId}
                    />
                  ) : (
                    <editor.EventForm
                      draft={draft}
                      onChange={handleChange}
                      occasionId={occasionId}
                      language={language}
                      parts={ITEM_PARTS[detailsView]}
                    />
                  )}
                  <button type="button" onClick={showCard} className={`${PRIMARY_BUTTON} self-start`}>
                    Done
                  </button>
                </div>
              ) : (
              <>
              {/* A new card's whole form keeps a way back to its checklist. */}
              {editing ? null : (
                <button
                  type="button"
                  onClick={showCard}
                  className="-mt-4 inline-flex min-h-11 items-center self-start rounded text-sm font-medium text-[var(--lifafa-marigold)] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
                >
                  Back to your card
                </button>
              )}
              {/*
                Typing in the card's own words turns the preview back to the
                card's own language, after the host has been writing the other
                one in the panel below.
              */}
              <div
                className="flex min-w-0 flex-col gap-9"
                onFocusCapture={() => setPreviewLanguage(language)}
              >
                <editor.LanguagePicker
                  language={language}
                  onLanguageChange={handleLanguageSelect}
                />
                <editor.EventForm
                  draft={draft}
                  onChange={handleChange}
                  occasionId={occasionId}
                  language={language}
                  /* After payment: how many changes of date and of names are left, on those fields. */
                  paidLimits={limitNotes}
                />
                <editor.SubEventEditor
                  subEvents={draft.subEvents}
                  openId={openSubEventId}
                  onChange={(subEvents) => handleChange("subEvents", subEvents)}
                  onOpenIdChange={setOpenSubEventId}
                />
                <editor.ContactEditor
                  contacts={draft.contacts ?? []}
                  onChange={handleContacts}
                />
                <editor.AutoTranslate
                  cardLanguage={language}
                  draft={draft}
                  blocks={blocks}
                  occasionId={occasionId}
                  eventId={edit?.eventId}
                  onTranslated={handleTranslated}
                  onCardId={handleCardId}
                  /* An edit page is behind sign-in already; only a new card can meet a signed-out host. */
                  onSignInRequired={
                    editing ? undefined : () => sendToSignIn(snapshot)
                  }
                />
              </div>

              <editor.TranslationPanel
                cardLanguage={language}
                draft={draft}
                blocks={blocks}
                occasionId={occasionId}
                onDraftWord={handleDraftWord}
                onSubEventWord={handleSubEventWord}
                onSectionWord={handleSectionWord}
                onFocusLanguage={setPreviewLanguage}
                revealSignal={translatedSignal}
              />
              </>
              )}
            </div>
          ) : null}

          {step === "customize" && editor !== null ? (
            <editor.CustomizeStep
              template={template}
              namesLine={coverNameLine(names)}
              style={style}
              onLookChange={(nextStyle, nextBorder) => {
                setStyle(nextStyle);
                setBorderStyle(nextBorder);
              }}
              onFontPairChange={setFontPair}
              blocks={blocks}
              onBlocksChange={setBlocks}
              rsvpEnabled={rsvpEnabled}
              onRsvpEnabledChange={setRsvpEnabled}
              countdownScratched={scratchTarget === "countdown"}
              onCountdownScratchedChange={(scratched) =>
                setScratchTarget(scratched ? "countdown" : "none")
              }
              musicUrl={musicUrl}
              onMusicUrlChange={setMusicUrl}
              coverAnimation={coverAnimation}
              onCoverAnimationChange={setCoverAnimation}
              showWeather={showWeather}
              weatherTheme={weatherTheme}
              onShowWeatherChange={setShowWeather}
              onWeatherThemeChange={setWeatherTheme}
              qrCheckinEnabled={qrCheckinEnabled}
              onQrCheckinEnabledChange={setQrCheckinEnabled}
              pdfDownload={pdfDownload}
              onPdfDownloadChange={setPdfDownload}
            />
          ) : null}

          {step === "preview" ? (
            <div className="flex min-w-0 flex-col gap-6">
              <div className="flex flex-col gap-4 rounded-2xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] p-5">
                <div className="flex min-w-0 flex-col gap-1">
                  <p
                    data-clarity-mask="true"
                    className="font-[family-name:var(--font-display)] text-xl font-semibold break-words text-[var(--lifafa-cream)]"
                  >
                    {/* The names when there are any; never the card's "Your names" placeholder. */}
                    {names.kind === "line" && names.isPlaceholder ? "Your card" : coverNameLine(names)}
                  </p>
                  <p className="text-sm leading-relaxed text-[var(--lifafa-muted)]">
                    Open the invitation exactly as your guests will: the cover,
                    the card and the reply form.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(event) => openPreview(event.currentTarget)}
                  disabled={previewOpening}
                  aria-busy={previewOpening}
                  className={`${QUIET_BUTTON} self-start`}
                >
                  <BusyLabel busy={previewOpening}>Preview full screen</BusyLabel>
                </button>
              </div>

              {/* A saved invitation is not being paid for here: its link, and its price, are as they were. */}
              {editing ? null : (
                <p className="text-sm leading-relaxed text-[var(--lifafa-muted)]">
                  Saving creates your invitation and its link. Publishing it is
                  the next step and costs {formatPrice(template.price)}: guests
                  can open the link once it is published. Each invitation is a
                  separate payment.
                </p>
              )}
            </div>
          ) : null}
        </div>

        {/* The card, beside every step at lg. Nothing below it, where its code is not fetched. */}
        <div
          data-clarity-mask="true"
          className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-24"
        >
          {CardPreview === null ? null : (
            <PreviewBoundary onError={reportPreviewFailed}>
              <CardPreview
                draft={preview.draft}
                config={preview.config}
                onPreviewLanguageChange={setPreviewLanguage}
                motifs={motifs}
                coverAnimation={coverAnimation}
                weather={previewWeather}
                weatherTheme={weatherTheme}
                isPaid={edit?.isPaid === true}
                onAddVenue={onAddVenue}
              />
            </PreviewBoundary>
          )}
        </div>
      </main>

      {/* Bottom room for the bar pinned to the bottom, over the safe area: two rows where Save has its own. */}
      <LegalFooter className={saveRow ? "pb-48" : "pb-32"} />

      {/*
        Back and Next, pinned to the bottom of the screen where a thumb is.

        A NEW CARD can be saved from every step once its design is chosen:
        "Save my card" is here on the details, the customize and the preview
        step, with the line on what saving costs beside it. A visitor who
        filled in everything and changed the look on step 3 left without
        ever reaching the one Save there was, on step 4. On the details and
        customize steps it has a row of its own over Back, Preview and Next,
        since the four do not fit one row at 360px; Next is the outline
        button there, so Save is the one main action. On the quick start,
        "See my card" is the step's main action and Save is the outline one.
        On the preview step it is the last step's own button, beside Back.

        A SAVED CARD can be saved from any step, since a host fixing a venue
        should not have to walk to the end to do it: "Save changes" is always
        here, beside Back and Next, and the preview is the last step's own
        button (and the card itself at lg). At 360px the three are 306px of
        the 328 there is. Nothing to save once the event is over.

        What went wrong with a save is said here, over the buttons, so it is
        seen from whichever step the save was pressed on.
      */}
      {/* data-lifafa-foot-bar: the network notice sits above it (components/network/NetworkNotice.tsx). */}
      <div data-lifafa-foot-bar="" className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink)]/92 backdrop-blur">
        {error !== null ? (
          <p
            role="alert"
            className="mx-auto max-w-6xl border-b border-[var(--lifafa-rose)]/40 bg-[var(--lifafa-rose)]/15 px-4 py-2.5 text-[0.8125rem] leading-relaxed text-[var(--lifafa-cream)] sm:px-5 lg:px-8"
          >
            {error}
          </p>
        ) : null}
        {(isLast && !editing) || unpaidEdit ? (
          /* Right over the last step's Save, and over Save changes on a card not paid for: what saving costs. */
          <p
            data-save-reassurance=""
            aria-live="polite"
            className="mx-auto max-w-6xl border-b border-[var(--lifafa-hairline)] px-4 py-2.5 text-[0.9375rem] leading-snug font-medium text-[var(--lifafa-cream)] sm:px-12 lg:px-[5.5rem] xl:px-8"
          >
            {savedCard ? SAVED_OPENING : FREE_SAVE_LINE}
          </p>
        ) : null}
        {saveRow ? (
          /* The details and customize steps: Save on a row of its own, the line beside it. */
          <div
            data-save-row=""
            className="mx-auto flex max-w-6xl items-center gap-3 border-b border-[var(--lifafa-hairline)] px-4 py-2.5 sm:px-12 lg:px-[5.5rem] xl:px-8"
          >
            <p
              data-save-reassurance=""
            aria-live="polite"
              className="min-w-0 flex-1 text-[0.8125rem] leading-snug font-medium text-[var(--lifafa-cream)]"
            >
              {savedCard ? SAVED_OPENING : FREE_SAVE_LINE}
            </p>
            {saveButton(quickStartShown ? QUIET_BUTTON : PRIMARY_BUTTON)}
          </div>
        ) : null}
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-12 lg:px-[5.5rem] xl:px-8">
          {index > 0 ? (
            <button
              type="button"
              onClick={() => goTo(WIZARD_STEPS[index - 1].id)}
              className={QUIET_BUTTON}
            >
              Back
            </button>
          ) : null}

          {editing ? (
            isLast ? null : (
              <button
                type="button"
                onClick={() => goTo(WIZARD_STEPS[index + 1].id)}
                className={QUIET_BUTTON}
              >
                Next
              </button>
            )
          ) : isLast || quickStartShown ? null : templateChosen ? (
            <button
              type="button"
              onClick={(event) => openPreview(event.currentTarget)}
              disabled={previewOpening}
              aria-busy={previewOpening}
              className={`${QUIET_BUTTON} lg:hidden`}
            >
              <BusyLabel busy={previewOpening}>Preview</BusyLabel>
            </button>
          ) : (
            /* As GalleryFirstScreen draws it, so nothing moves when the wizard takes over. */
            <p id={CHOOSE_DESIGN_HINT_ID} className={HINT_TEXT}>
              {CHOOSE_DESIGN_HINT}
            </p>
          )}

          <div className="ml-auto">
            {editing ? (
              readOnly ? null : (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  aria-busy={isSaving}
                  className={PRIMARY_BUTTON}
                >
                  <BusyLabel busy={isSaving} busyText="Saving…">
                    Save changes
                  </BusyLabel>
                </button>
              )
            ) : isLast ? (
              saveButton(PRIMARY_BUTTON)
            ) : quickStartShown ? null : (
              <button
                type="button"
                onClick={() => nextStep(WIZARD_STEPS[index + 1].id)}
                disabled={!templateChosen}
                aria-busy={moving}
                aria-describedby={templateChosen ? undefined : CHOOSE_DESIGN_HINT_ID}
                /* Beside Save, the outline button: Save is the one main action. */
                className={saveRow ? QUIET_BUTTON : PRIMARY_BUTTON}
              >
                {/* Its own word while busy: "Opening…" made it 127px wide, and Back, Preview and Next 338px of the 328 at 360px. */}
                <BusyLabel busy={moving} busyText="Next">
                  Next
                </BusyLabel>
              </button>
            )}
          </div>
        </div>
      </div>

      {pendingHref !== null ? (
        <DiscardChangesDialog
          onKeepEditing={() => setPendingHref(null)}
          onDiscard={() => {
            const href = pendingHref;
            setPendingHref(null);
            router.push(href);
          }}
        />
      ) : null}

      {isPreviewOpen && FullScreenPreview !== null ? (
        <PreviewBoundary
          onError={() => {
            setIsPreviewOpen(false);
            reportPreviewFailed();
          }}
        >
          <FullScreenPreview
            draft={preview.draft}
            theme={getTheme(preview.draft.themeId)}
            config={preview.config}
            motifs={motifs}
            coverAnimation={coverAnimation}
            weather={previewWeather}
            weatherTheme={weatherTheme}
            triggerRef={previewTrigger}
            onClose={closePreview}
            onPreviewLanguageChange={setPreviewLanguage}
            isPaid={edit?.isPaid === true}
          />
        </PreviewBoundary>
      ) : null}
    </div>
  );
}
