"use client";

import {
  Component,
  useState,
  useSyncExternalStore,
  type ErrorInfo,
  type ReactElement,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import CardEditor, {
  type EditorSnapshot,
  type SaveOutcome,
} from "@/components/create/CardEditor";
import EditorSkeleton from "@/components/create/EditorSkeleton";
import ExistingInvitationsNotice from "@/components/create/ExistingInvitationsNotice";
import PendingCardNotice, {
  displayHost,
  type PendingCardProblem,
} from "@/components/create/PendingCardNotice";
import { createEvent } from "@/lib/db/events";
import {
  clearPendingCard,
  pendingCardReturnPath,
  readPendingCard,
  stashOriginFromUrl,
  writePendingCard,
  type PendingCard,
  type PendingCardRead,
} from "@/lib/pendingCard";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_CARD_LANGUAGE } from "@/lib/cardLanguage";
import { DEFAULT_SECTION_ORDER } from "@/lib/cardSections";
import { DEFAULT_COVER_ANIMATION } from "@/lib/coverAnimations";
import { DEFAULT_DESIGN } from "@/lib/designDefaults";
import { DEFAULT_WEATHER_THEME } from "@/lib/weatherThemes";
import { DEFAULT_OCCASION_ID, getOccasion } from "@/lib/occasions";
import type { CardConfig } from "@/types/card";
import type { EventDraft } from "@/types/event";

/**
 * A new invitation.
 *
 * A wrapper and nothing else: every control, the four tabs and the preview live
 * in CardEditor, which /dashboard/[eventId]/edit mounts over a saved event in
 * exactly the same way. What belongs here is only what is true of *creating*
 * one — the card to start from, the sign-in detour, and what saving does.
 *
 * OPEN TO EVERYONE. The middleware lets anyone reach this page; the account is
 * asked for at save time, which is the first moment it is actually needed.
 */

const DEFAULT_OCCASION = getOccasion(DEFAULT_OCCASION_ID);

const EMPTY_DRAFT: EventDraft = {
  partyOneName: "",
  partyTwoName: "",
  /* The commonest joining word on the cards this is built for. */
  joinerWord: "weds",
  hostNames: "",
  eventTitle: "",
  eventDate: "",
  eventTime: "",
  venueName: "",
  venueAddress: "",
  message: "",
  themeId: DEFAULT_OCCASION.defaultThemeId,
  subEvents: [],
};

/**
 * The card an empty editor starts from.
 *
 * The defaults are here rather than inside CardEditor, because "what a new
 * card looks like" is a fact about creating one: the editor's job is to show
 * whatever it is handed, whether that is this or a wedding somebody saved eight
 * months ago. How it looks comes from DEFAULT_DESIGN in lib/designDefaults.ts,
 * which the quick presets also measure an untouched card against — one copy,
 * so the two cannot disagree about what "untouched" is.
 */
const EMPTY_CONFIG: CardConfig = {
  themeId: DEFAULT_OCCASION.defaultThemeId,
  /* Every built-in section starts enabled, in the registry order. */
  blocks: DEFAULT_SECTION_ORDER.map((id) => ({
    kind: "builtin" as const,
    id,
    enabled: true,
  })),
  decorMotion: DEFAULT_DESIGN.decorMotion,
  decorIntensity: DEFAULT_DESIGN.decorIntensity,
  butterflies: DEFAULT_DESIGN.butterflies,
  leaves: DEFAULT_DESIGN.leaves,
  petals: DEFAULT_DESIGN.petals,
  occasionId: DEFAULT_OCCASION_ID,
  traditionId: DEFAULT_DESIGN.traditionId,
  /* English until the host picks otherwise, at the very top of the editor. */
  language: DEFAULT_CARD_LANGUAGE,
  /* On by default: a headcount is what most hosts are here for. */
  rsvpEnabled: true,
  /* Off by default: a card that hides its own date has to be asked for. */
  scratchTarget: "none",
  borderStyle: DEFAULT_DESIGN.borderStyle,
  style: DEFAULT_DESIGN.style,
  ornamentConfig: DEFAULT_DESIGN.ornamentConfig,
  /* A link the host pastes. Null is "no music", and nothing ever autoplays. */
  musicUrl: null,
  /* Nothing in the editor has been paid for — that is what /create is. */
  isPaid: false,
};


/** The card an empty editor starts from, with the four fields beside it. */
const EMPTY_SNAPSHOT: EditorSnapshot = {
  draft: EMPTY_DRAFT,
  config: EMPTY_CONFIG,
  coverAnimation: DEFAULT_DESIGN.coverAnimation,
  showWeather: false,
  weatherTheme: DEFAULT_WEATHER_THEME,
  qrCheckinEnabled: false,
};

/**
 * What the host arrives to: an empty card, the card they stashed before
 * signing in, or an empty card and the reason theirs is not in it.
 */
type Arrival =
  | { kind: "fresh" }
  | { kind: "restored"; snapshot: EditorSnapshot }
  | { kind: "lost"; problem: PendingCardProblem };

/**
 * A stashed card, as the editor takes one.
 *
 * The four fields that are not part of CardConfig fall back to this page's own
 * defaults, because an entry stashed before they existed carries nothing for
 * them. `isPaid` is not taken from the stash. It is not the stash's to say:
 * nothing in /create has been paid for.
 */
function restoredSnapshot(card: PendingCard): EditorSnapshot {
  return {
    draft: card.draft,
    config: { ...card.config, isPaid: false },
    coverAnimation: card.coverAnimation ?? DEFAULT_COVER_ANIMATION,
    showWeather: card.showWeather === true,
    weatherTheme: card.weatherTheme ?? DEFAULT_WEATHER_THEME,
    qrCheckinEnabled: card.qrCheckinEnabled === true,
  };
}

/**
 * Decides the arrival from what this browser holds and what the URL says.
 *
 * `stashOrigin` is only in the URL when the host is coming back from signing in
 * with a card stashed — pendingCardReturnPath put it there — so it is what tells
 * "expected a card and it is not here" apart from an ordinary visit. Only the
 * first of those is told anything: a card that expired while nobody was
 * waiting for it is gone quietly, the way a day limit should work.
 *
 * The address it names is checked before anything else. A card stashed on
 * another of the site's addresses is in that address's storage, which this page
 * cannot read, so whatever this page does find is not the card the host came
 * back for.
 */
function arrivalFor(
  read: PendingCardRead,
  stashOrigin: string | null,
  here: string,
): Arrival {
  if (read.kind === "card") {
    return { kind: "restored", snapshot: restoredSnapshot(read.card) };
  }

  if (stashOrigin !== null && stashOrigin !== here) {
    return { kind: "lost", problem: { kind: "elsewhere", origin: stashOrigin } };
  }

  const expected = stashOrigin !== null;

  switch (read.kind) {
    /* Always said: it is a card, it is here, and it would not open. */
    case "damaged":
      return { kind: "lost", problem: { kind: "damaged" } };
    case "blocked":
      return expected
        ? { kind: "lost", problem: { kind: "blocked" } }
        : { kind: "fresh" };
    case "expired":
      return expected
        ? { kind: "lost", problem: { kind: "expired" } }
        : { kind: "fresh" };
    case "none":
      return expected
        ? { kind: "lost", problem: { kind: "missing" } }
        : { kind: "fresh" };
  }
}

const subscribeToNothing = (): (() => void) => () => {};

/**
 * False on the server and through hydration, true from the first render after.
 *
 * The gate the page stands behind. A stashed card is in the browser's storage,
 * which the server cannot see, so the server draws EditorSkeleton rather than
 * guess — and an empty editor would be a wrong guess for exactly the host this
 * page most needs to get right. A page reached by a client-side link skips the
 * skeleton entirely: there is no hydration to wait through, and this answers
 * true on the first render.
 */
function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}

/**
 * Catches a restored card the editor cannot render.
 *
 * The stash is only checked for its outline — see hasCardOutline — and it
 * outlives a reload now, so a card with something wrong deep inside would not
 * fail once: it would take down /create on every visit for a day. This drops
 * the card instead, and the fallback is the empty editor with the reason said
 * out loud. Anything the fallback itself throws goes on up to
 * app/create/error.tsx.
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
      "[create] the restored card would not open:",
      error,
      info.componentStack,
    );
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function CreatePage(): ReactElement {
  return useIsClient() ? <CreateEditor /> : <EditorSkeleton />;
}

/**
 * The page itself, which only ever renders in the browser.
 *
 * The stash is read once, as this mounts, and the card it holds is handed to the
 * editor as the card to start from. So the first frame the editor ever draws
 * already has the host's names in it: there is no empty editor for the card to
 * be dropped into afterwards.
 */
function CreateEditor(): ReactElement {
  const router = useRouter();

  /*
    Read once. A lazy initialiser rather than an effect, so it happens before
    the first render rather than after the first paint, and state rather than a
    plain value, so a re-render cannot read the stash again and replace the
    card under a host who has since typed into it.
  */
  const [arrival] = useState<Arrival>(() =>
    arrivalFor(
      readPendingCard(),
      stashOriginFromUrl(window.location.search),
      window.location.origin,
    ),
  );

  /**
   * Saves a brand new invitation, or sends the host to sign in first.
   *
   * The session is read here rather than taken from a hook, and that is
   * deliberate: a hook that has not answered yet reports "signed out", which
   * would stash a signed-in host's card and march them off to a sign-in page
   * they do not need. Asking at the moment of the click also catches a session
   * that expired while the card was being built.
   */
  const handleSave = async (snapshot: EditorSnapshot): Promise<SaveOutcome> => {
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.getUser();
    const user = authError === null ? data.user : null;

    /*
      Signed out: stash the card and send them to sign in, with the way back
      naming this address. See lib/pendingCard.ts for why the card is in
      localStorage and why the address travels too.
    */
    if (user === null) {
      const stashed = writePendingCard({
        draft: snapshot.draft,
        config: snapshot.config,
        coverAnimation: snapshot.coverAnimation,
        showWeather: snapshot.showWeather,
        weatherTheme: snapshot.weatherTheme,
        qrCheckinEnabled: snapshot.qrCheckinEnabled,
      });

      if (!stashed) {
        /*
          Storage can be unavailable or full. Saying so beats sending them off
          to sign in and losing everything they typed on the way back.
        */
        return {
          ok: false,
          error:
            "Your browser would not let us hold onto this card. Please try again, or check your privacy settings.",
        };
      }

      router.push(
        `/login?redirectTo=${encodeURIComponent(pendingCardReturnPath())}`,
      );
      return { ok: true };
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

    /*
      Saved, so the stash has done its job — and not a moment before. This is
      the only place it is cleared.
    */
    clearPendingCard();
    router.push(`/dashboard/${result.data.id}`);

    return { ok: true };
  };

  const editor = (
    start: EditorSnapshot,
    problem: PendingCardProblem | null,
  ): ReactElement => (
    <CardEditor
      mode="create"
      initialDraft={start.draft}
      initialConfig={start.config}
      initialCoverAnimation={start.coverAnimation}
      initialShowWeather={start.showWeather}
      initialWeatherTheme={start.weatherTheme}
      initialQrCheckinEnabled={start.qrCheckinEnabled}
      onSave={handleSave}
      /*
        Always false here, and not taken from anything the browser holds: a
        card on /create has no event row yet, so there is nothing that could
        have been paid for, and the preview keeps its watermark. A stashed
        card's own isPaid is overwritten for the same reason — see
        restoredSnapshot.
      */
      isPaid={false}
      notice={
        <>
          {problem !== null ? (
            <PendingCardNotice
              problem={problem}
              here={displayHost(window.location.origin)}
            />
          ) : null}
          <ExistingInvitationsNotice />
        </>
      }
    />
  );

  if (arrival.kind === "restored") {
    return (
      <RestoredCardBoundary
        fallback={editor(EMPTY_SNAPSHOT, { kind: "damaged" })}
      >
        {editor(arrival.snapshot, null)}
      </RestoredCardBoundary>
    );
  }

  return editor(
    EMPTY_SNAPSHOT,
    arrival.kind === "lost" ? arrival.problem : null,
  );
}
