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
import AutoTranslate from "@/components/create/AutoTranslate";
import ContactEditor from "@/components/create/ContactEditor";
import DiscardChangesDialog from "@/components/create/DiscardChangesDialog";
import EditorSkeleton from "@/components/create/EditorSkeleton";
import EventForm from "@/components/create/EventForm";
import ExistingInvitationsNotice from "@/components/create/ExistingInvitationsNotice";
import dynamic from "next/dynamic";
import LanguagePicker from "@/components/create/LanguagePicker";
import PendingCardNotice, {
  displayHost,
  type PendingCardProblem,
} from "@/components/create/PendingCardNotice";
import SubEventEditor from "@/components/create/SubEventEditor";
import TranslationPanel from "@/components/create/TranslationPanel";
import CustomizeStep from "@/components/wizard/CustomizeStep";
import { useInAppHandoff } from "@/components/browser/useInAppHandoff";
import { inAppBrowser } from "@/lib/inAppBrowser";
import { adoptDraftHandoff, type AdoptResult } from "@/lib/handoff/actions";
import { HANDOFF_PARAM, handoffFromSearch } from "@/lib/handoff/link";
import LegalFooter from "@/components/legal/LegalFooter";
import TemplateGallery from "@/components/wizard/TemplateGallery";
import WizardProgress from "@/components/wizard/WizardProgress";
import {
  useCardEditor,
  type EditorSnapshot,
  type SaveOutcome,
} from "@/hooks/useCardEditor";
import { coverNameLine, resolveCoverNames } from "@/lib/cardFormat";
import { withContactBlock } from "@/lib/contacts";
import { createEvent, updateEvent } from "@/lib/db/events";
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
import { createClient } from "@/lib/supabase/client";
import { getTheme } from "@/lib/themes";
import {
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

/* The full-screen preview: its cover player and every cover drawn in code. Fetched when it is opened. */
const FullScreenPreview = dynamic(() => import("@/components/create/FullScreenPreview"), { ssr: false });
/*
  The card beside the steps, at lg. Client-only and fetched when drawn: it is
  what brings the card renderers (templates/parts.ts), and below lg it draws
  nothing, so a phone choosing a design never downloads them.
*/
const CardPreview = dynamic(() => import("@/components/create/CardPreview"), { ssr: false });

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
}: {
  /**
   * A template chosen before the wizard opened ("Create yours"), already
   * checked by the page to be one the gallery offers.
   */
  templateId?: string | null;
}): ReactElement {
  /*
    A stashed card is in the browser's storage, which the server cannot see, so
    the server draws the skeleton rather than guess at an empty wizard.
  */
  return useIsClient() ? (
    <WizardArrival templateId={templateId} />
  ) : (
    <EditorSkeleton />
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
   * Where the address is moved before the steps are drawn, or null to leave
   * it. A return from sign in with no card to show goes to the first step;
   * a handed-over card that could not be brought back loses its id.
   */
  address: string | null;
}

/**
 * The start from what this browser holds: the sign-in stash, then the card
 * kept as the visitor typed, then an empty card. `search` is the query the
 * address will have once the steps are drawn.
 */
function localStart(templateId: string | null, search: string): ArrivalStart {
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
      address: null,
    };
  }

  const kept = read.kind === "fresh" ? readCardAutosave() : null;
  /* Back from sign in with nothing here at all: the first step, and not a word about it. */
  const restart = read.kind === "fresh" && read.restart === true && kept === null;

  return {
    arrival: read,
    start: kept === null ? empty : onChosenTemplate(restoredSnapshot(kept), templateId),
    fallback: empty,
    autosaved: kept !== null,
    address: restart ? NEW_CARD_HREF : null,
  };
}

/** How long to wait before asking about a card again. */
const ADOPT_RETRY_MS = 1500;
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
 * Where a card saved to the account from a handoff continues: the step it
 * was left on. From the last step that is the saved screen, exactly where
 * "Save and continue" leads a signed-in host. From an earlier one it is the
 * same step of the wizard over the saved invitation.
 */
function adoptedHref(eventId: string, step: string | null): string {
  const stepId = wizardStepId(step);

  if (stepId === null || stepId === "preview") {
    return `${WIZARD_PATH}?${WIZARD_STEP_PARAM}=preview&event=${encodeURIComponent(eventId)}`;
  }

  return wizardStepPath(stepId, `/dashboard/${encodeURIComponent(eventId)}/edit`);
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
        router.replace(adoptedHref(result.eventId, result.step));
        return;
      }

      const here = new URL(window.location.href);

      if (result.reason === "signed-out") {
        /* Untouched on the server; sign in brings the id back here. */
        adoptions.delete(handoff);
        const login = new URL("/login", here.origin);
        login.searchParams.set("redirectTo", `${here.pathname}${here.search}`);
        login.searchParams.set(HANDOFF_PARAM, handoff);
        router.replace(`${login.pathname}${login.search}`);
        return;
      }

      /* Not found, past its day, or the server would not answer: this browser's own copies. */
      adoptions.delete(handoff);
      here.searchParams.delete(HANDOFF_PARAM);
      const local = localStart(templateId, here.search);
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

  const settled =
    arrived !== null &&
    (address === null ||
      (searchParams.get(HANDOFF_PARAM) === null &&
        searchParams.get(WIZARD_STEP_PARAM) ===
          new URL(address, window.location.origin).searchParams.get(WIZARD_STEP_PARAM)));

  /* Bumped by "Start fresh", so the steps start again from the empty card. */
  const [generation, setGeneration] = useState(0);
  const startFresh = useCallback((): void => {
    clearCardAutosave();
    setArrived((current) =>
      current === null ? current : { ...current, start: current.fallback, autosaved: false },
    );
    setGeneration((value) => value + 1);
  }, []);

  if (!settled) {
    return handoff === null ? (
      <EditorSkeleton />
    ) : (
      <>
        <p
          role="status"
          className="fixed inset-x-4 top-20 z-20 mx-auto max-w-sm rounded-2xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-4 py-3 text-center text-sm text-[var(--lifafa-cream)] shadow-sm"
        >
          Welcome back. Let&apos;s finish your card.
        </p>
        <EditorSkeleton />
      </>
    );
  }

  const { arrival, start, fallback, autosaved } = arrived;

  if (arrival.kind === "restored") {
    return (
      <RestoredCardBoundary
        fallback={
          <WizardSteps
            start={fallback}
            problem={{ kind: "damaged" }}
            stashedStep={null}
          />
        }
      >
        <WizardSteps
          start={start}
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
      problem={arrival.kind === "lost" ? arrival.problem : null}
      stashedStep={null}
      onStartFresh={autosaved ? startFresh : undefined}
    />
  );

  /* A kept card could be one an older build wrote; one that will not open is dropped, not fatal. */
  return autosaved ? (
    <RestoredCardBoundary
      fallback={
        <WizardSteps start={fallback} problem={null} stashedStep={null} />
      }
    >
      {steps}
    </RestoredCardBoundary>
  ) : (
    steps
  );
}

const PRIMARY_BUTTON =
  "min-h-12 rounded-full bg-[var(--lifafa-marigold)] px-6 text-[0.9375rem] font-semibold whitespace-nowrap text-[var(--lifafa-ink)] transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] enabled:hover:-translate-y-px disabled:opacity-60";
const QUIET_BUTTON =
  "min-h-12 rounded-full border border-[var(--lifafa-hairline)] px-4 text-[0.9375rem] font-medium whitespace-nowrap text-[var(--lifafa-cream)] transition-colors duration-150 hover:border-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]";

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

function WizardSteps({
  start,
  problem,
  stashedStep,
  edit,
  onStartFresh,
}: {
  start: EditorSnapshot;
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
  const step: WizardStepId =
    wizardStepId(searchParams.get(WIZARD_STEP_PARAM)) ??
    stashedStep ??
    (editing ? "details" : WIZARD_STEPS[0].id);
  const index = wizardStepIndex(step);
  const isLast = index === WIZARD_STEPS.length - 1;

  /* Read by the sign-in detour, which is built before the step can change. */
  const stepRef = useRef<WizardStepId>(step);
  stepRef.current = step;

  const goTo = useCallback(
    (next: WizardStepId): void => {
      if (next === stepRef.current) {
        return;
      }

      window.history.pushState(null, "", wizardStepPath(next, path));
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
  }, [step]);

  /**
   * Stashes the card and the step, and sends the host to sign in. Returns the
   * error to show when the card could not be kept, and null once on the way.
   */
  const {
    leave: leaveInAppBrowser,
    prompt: inAppPrompt,
    opening: openingBrowser,
  } = useInAppHandoff();

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

      router.push(
        `/login?redirectTo=${encodeURIComponent(
          pendingCardReturnPath(wizardStepPath(stepRef.current)),
        )}`,
      );
      return null;
    },
    [router],
  );

  /**
   * "Save and continue" while signed out. In Instagram's or Facebook's
   * browser, where Google will not sign anyone in, the card goes on to Chrome
   * or Safari and this page stays (components/browser/useInAppHandoff.tsx);
   * the stash is still written, so a reload here keeps the card. Anywhere
   * else, sendToSignIn as always.
   */
  const continueSignedOut = useCallback(
    async (snapshot: EditorSnapshot): Promise<SaveOutcome> => {
      if (inAppBrowser(navigator.userAgent) === null) {
        const failure = sendToSignIn(snapshot);
        return failure === null ? { ok: true } : { ok: false, error: failure };
      }

      const card = {
        draft: snapshot.draft,
        config: snapshot.config,
        coverAnimation: snapshot.coverAnimation,
        showWeather: snapshot.showWeather,
        weatherTheme: snapshot.weatherTheme,
        qrCheckinEnabled: snapshot.qrCheckinEnabled,
        step: stepRef.current,
      };

      writePendingCard(card);
      await leaveInAppBrowser(
        card,
        pendingCardReturnPath(wizardStepPath(stepRef.current)),
      );

      return { ok: true, stay: true };
    },
    [sendToSignIn, leaveInAppBrowser],
  );

  /**
   * Saves the invitation, or sends the host to sign in first, and then goes
   * on to payment: the same page, on the saved card. The session is asked for
   * at the click, as on /create, so one that has not loaded yet or has
   * expired is not mistaken for signed out or signed in.
   */
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

      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.getUser();
      const user = authError === null ? data.user : null;

      if (user === null) {
        return continueSignedOut(snapshot);
      }

      const result = await createEvent(
        snapshot.draft,
        snapshot.config,
        snapshot.coverAnimation,
        { showWeather: snapshot.showWeather, themeId: snapshot.weatherTheme },
        snapshot.qrCheckinEnabled,
      );

      if (!result.ok) {
        /* The stash stays: the card is still not saved anywhere else. */
        return { ok: false, error: result.error };
      }

      clearPendingCard();
      autosaveStopped.current = true;
      clearCardAutosave();
      router.push(
        `${WIZARD_PATH}?${WIZARD_STEP_PARAM}=preview&event=${result.data.id}`,
      );

      return { ok: true };
    },
    [router, continueSignedOut, edit, start, dashboardHref],
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

  /* A new card is kept in this browser as it is made; see hooks/useCardAutosave.ts. */
  useCardAutosave({ snapshot, start, enabled: !editing, stopped: autosaveStopped });

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

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const previewTrigger = useRef<HTMLButtonElement>(null);
  const closePreview = useCallback((): void => setIsPreviewOpen(false), []);
  /* Whichever of the two preview buttons was pressed gets the focus back. */
  const openPreview = (button: HTMLButtonElement): void => {
    previewTrigger.current = button;
    setIsPreviewOpen(true);
  };

  const template = getTemplate(templateId);
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
    if (next.id === template.id) {
      return;
    }

    /* The gallery does not offer it and the server would refuse the save; this is the third lock, not the only one. */
    if (paidPricePaise !== null && next.price > paidPricePaise) {
      return;
    }

    applySnapshot(switchTemplate(snapshot, next));
  };

  const names = resolveCoverNames(preview.draft, occasionId, previewLanguage);
  const missing = [
    draft.eventTitle.trim().length === 0 ? "the event's title" : null,
    draft.eventDate.length === 0 ? "the date" : null,
    draft.venueName.trim().length === 0 ? "the venue" : null,
  ].filter((entry): entry is string => entry !== null);

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
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-[-0.01em] text-balance text-[var(--lifafa-cream)] focus:outline-none"
          >
            {/* The last step publishes a new card; for a saved one it is only a last look. */}
            {editing && step === "preview"
              ? "Preview your changes"
              : WIZARD_STEPS[index].title}
          </h1>

          {step === "template" ? (
            <TemplateGallery
              selectedId={template.id}
              onSelect={handleTemplate}
              paidPricePaise={paidPricePaise}
            />
          ) : null}

          {step === "details" ? (
            /* Everything the host types: masked from Clarity (lib/clarity.ts). `contents` keeps the layout as it was. */
            <div className="contents" data-clarity-mask="true">
              {/*
                Typing in the card's own words turns the preview back to the
                card's own language, after the host has been writing the other
                one in the panel below.
              */}
              <div
                className="flex min-w-0 flex-col gap-9"
                onFocusCapture={() => setPreviewLanguage(language)}
              >
                <LanguagePicker
                  language={language}
                  onLanguageChange={handleLanguageSelect}
                />
                <EventForm
                  draft={draft}
                  onChange={handleChange}
                  occasionId={occasionId}
                  language={language}
                  /* After payment: how many changes of date and of names are left, on those fields. */
                  paidLimits={limitNotes}
                />
                <SubEventEditor
                  subEvents={draft.subEvents}
                  openId={openSubEventId}
                  onChange={(subEvents) => handleChange("subEvents", subEvents)}
                  onOpenIdChange={setOpenSubEventId}
                />
                <ContactEditor
                  contacts={draft.contacts ?? []}
                  onChange={handleContacts}
                />
                <AutoTranslate
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

              <TranslationPanel
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
            </div>
          ) : null}

          {step === "customize" ? (
            <CustomizeStep
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
                    {coverNameLine(names)}
                  </p>
                  <p className="text-sm leading-relaxed text-[var(--lifafa-muted)]">
                    Open the invitation exactly as your guests will: the cover,
                    the card and the reply form.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(event) => openPreview(event.currentTarget)}
                  className={`${QUIET_BUTTON} self-start`}
                >
                  Preview full screen
                </button>
              </div>

              {missing.length > 0 ? (
                <div
                  role="status"
                  className="flex flex-col items-start gap-1 rounded-2xl border border-[var(--lifafa-hairline)] px-5 py-4"
                >
                  <p className="text-sm leading-relaxed text-[var(--lifafa-cream)]">
                    Still to add: {missing.join(", ")}. You can save without{" "}
                    {missing.length === 1 ? "it" : "them"} and fill{" "}
                    {missing.length === 1 ? "it" : "them"} in later.
                  </p>
                  <button
                    type="button"
                    onClick={() => goTo("details")}
                    className="min-h-11 rounded text-sm font-medium text-[var(--lifafa-marigold)] underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
                  >
                    Go to details
                  </button>
                </div>
              ) : null}

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

        {/* The card, beside every step at lg. Draws nothing below it. */}
        <div
          data-clarity-mask="true"
          className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-24"
        >
          <CardPreview
            draft={preview.draft}
            config={preview.config}
            onPreviewLanguageChange={setPreviewLanguage}
            motifs={motifs}
            coverAnimation={coverAnimation}
            weather={previewWeather}
            weatherTheme={weatherTheme}
            isPaid={edit?.isPaid === true}
          />
        </div>
      </main>

      {/* `pb-32` clears the bar pinned to the bottom, over the safe area. */}
      <LegalFooter className="pb-32" />

      {/*
        Back and Next, pinned to the bottom of the screen where a thumb is.

        A NEW CARD saves at the end: the last step's button is "Save and
        continue", and on a phone the way to the card sits between Back and
        Next on the steps before it.

        A SAVED CARD can be saved from any step, since a host fixing a venue
        should not have to walk to the end to do it: "Save changes" is always
        here, beside Back and Next, and the preview is the last step's own
        button (and the card itself at lg). At 360px the three are 306px of
        the 328 there is. Nothing to save once the event is over.

        What went wrong with a save is said here, over the buttons, so it is
        seen from whichever step the save was pressed on.
      */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink)]/92 backdrop-blur">
        {error !== null ? (
          <p
            role="alert"
            className="mx-auto max-w-6xl border-b border-[var(--lifafa-rose)]/40 bg-[var(--lifafa-rose)]/15 px-4 py-2.5 text-[0.8125rem] leading-relaxed text-[var(--lifafa-cream)] sm:px-5 lg:px-8"
          >
            {error}
          </p>
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
          ) : isLast ? null : (
            <button
              type="button"
              onClick={(event) => openPreview(event.currentTarget)}
              className={`${QUIET_BUTTON} lg:hidden`}
            >
              Preview
            </button>
          )}

          <div className="ml-auto">
            {editing ? (
              readOnly ? null : (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className={PRIMARY_BUTTON}
                >
                  {isSaving ? "Saving…" : "Save changes"}
                </button>
              )
            ) : isLast ? (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || openingBrowser !== null}
                className={PRIMARY_BUTTON}
              >
                {openingBrowser === "android"
                  ? "Opening Chrome…"
                  : openingBrowser === "ios"
                    ? "Opening Safari…"
                    : isSaving
                      ? "Saving…"
                      : "Save and continue"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => goTo(WIZARD_STEPS[index + 1].id)}
                className={PRIMARY_BUTTON}
              >
                Next
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

      {/* "Open in Chrome" by hand, when "Save and continue" could not open it. In-app browsers only. */}
      {inAppPrompt}

      {isPreviewOpen ? (
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
      ) : null}
    </div>
  );
}
