"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CardPreview from "@/components/create/CardPreview";
import CoverAnimationPicker from "@/components/create/CoverAnimationPicker";
import DiscardChangesDialog from "@/components/create/DiscardChangesDialog";
import EditorTabs, { type EditorTabId } from "@/components/create/EditorTabs";
import EventForm from "@/components/create/EventForm";
import MotionPicker from "@/components/create/MotionPicker";
import MusicPanel from "@/components/create/MusicPanel";
import OccasionGrid from "@/components/create/OccasionGrid";
import PreviewBar from "@/components/create/PreviewBar";
import RevealPanel from "@/components/create/RevealPanel";
import SectionManager from "@/components/create/SectionManager";
import SubEventEditor from "@/components/create/SubEventEditor";
import TraditionPicker from "@/components/create/TraditionPicker";
import WeatherPicker from "@/components/create/WeatherPicker";
import StylePanel from "@/components/create/StylePanel";
import { deepEqual } from "@/lib/deepEqual";
import { DEFAULT_FONT_PAIR_ID } from "@/lib/fontPairs";
import { coverNameLine, resolveCoverNames } from "@/lib/cardFormat";
import { getMotifs } from "@/lib/motifs";
import { DEFAULT_ORNAMENT_CONFIG } from "@/lib/ornaments/muslim";
import { getPalette } from "@/lib/palettes";
import { getOccasion } from "@/lib/occasions";
import type {
  CardBorderStyle,
  CardConfig,
  DecorIntensity,
  DecorMotion,
  ScratchTarget,
} from "@/types/card";
import type { CoverAnimationId } from "@/types/coverAnimation";
import type { WeatherThemeId } from "@/types/weather";
import type { CardBlock } from "@/types/customSection";
import type { CardDensity, CardStyle, FontPairId, PaletteId } from "@/types/style";
import type { EventDraft } from "@/types/event";
import type { OccasionId, TraditionId } from "@/types/occasion";
import type { OrnamentConfig } from "@/types/ornament";

/**
 * Everything a saved invitation is made of, in one object.
 *
 * The cover animation and the two weather fields are here rather than inside
 * CardConfig because they are their own columns — see supabase/migrations 0003
 * and 0004 — and this is the shape that has to travel whole: to the sign-in
 * stash on /create, to createEvent, to updateEvent, and back out of the row
 * when a host reopens the editor.
 */
export interface EditorSnapshot {
  draft: EventDraft;
  config: CardConfig;
  coverAnimation: CoverAnimationId;
  showWeather: boolean;
  weatherTheme: WeatherThemeId;
}

/**
 * What a route's save does, as far as the editor needs to know.
 *
 * `ok` means the page is on its way somewhere else — the new dashboard, the
 * event's dashboard, or the sign-in page — so the button stays busy rather than
 * flicking back to its resting label under a host who has already left. The
 * failure carries a sentence written for a host; the editor shows it and does
 * nothing else with it.
 */
export type SaveOutcome = { ok: true } | { ok: false; error: string };

/**
 * Every value the editor holds, flat, in one object.
 *
 * The point of naming this shape is the pair of functions under it. A snapshot
 * out of the database and a snapshot the editor has just built have to be
 * comparable — that is what tells a host with unsaved work apart from one who
 * has changed nothing — and the only way to be sure they are is to put both of
 * them through the same construction. Everything here is state; `isPaid` is the
 * exception and is carried rather than edited.
 */
interface EditorState {
  draft: EventDraft;
  blocks: readonly CardBlock[];
  decorMotion: DecorMotion;
  decorIntensity: DecorIntensity;
  occasionId: OccasionId;
  traditionId: TraditionId;
  scratchTarget: ScratchTarget;
  borderStyle: CardBorderStyle;
  style: CardStyle;
  ornamentConfig: OrnamentConfig;
  musicUrl: string | null;
  isPaid: boolean;
  coverAnimation: CoverAnimationId;
  showWeather: boolean;
  weatherTheme: WeatherThemeId;
}

/**
 * A stored card, unpacked into the values the controls edit.
 *
 * This is where a saved card meets the fields it did not have when it was
 * saved. `musicUrl` is the live example: a config written before music existed
 * has no such key at all, and the editor's state has to start at null rather
 * than at undefined — otherwise the very first comparison against the stored
 * card finds a difference that no host made and offers to discard it.
 */
function toState(snapshot: EditorSnapshot): EditorState {
  const { config } = snapshot;

  return {
    draft: snapshot.draft,
    blocks: config.blocks,
    decorMotion: config.decorMotion,
    decorIntensity: config.decorIntensity,
    occasionId: config.occasionId,
    traditionId: config.traditionId,
    scratchTarget: config.scratchTarget,
    borderStyle: config.borderStyle,
    style: config.style,
    ornamentConfig: config.ornamentConfig,
    /* Null on every card saved before this field existed. */
    musicUrl: config.musicUrl ?? null,
    /*
      Carried, never edited.

      /create starts it false, because nothing in an unsaved editor has been
      paid for — that is what /create is. An edit carries whatever the row says,
      so a host who has paid does not have the fact quietly written out of their
      card's JSON by fixing a typo. The column is what a payment writes to and
      toStoredEvent lets it win over this copy on the way out either way, but a
      stored config that contradicts its own row is a lie waiting for a reader
      that trusts it.
    */
    isPaid: config.isPaid,
    coverAnimation: snapshot.coverAnimation,
    showWeather: snapshot.showWeather,
    weatherTheme: snapshot.weatherTheme,
  };
}

/**
 * The editor's values, packed back into the shape a card is stored in.
 *
 * The one place a CardConfig is built, which is what makes the dirty check
 * trustworthy: the card being compared against is this function's output over
 * the state the editor started from, and the card in front of the host is this
 * function's output over the state it holds now. Neither key order nor a field
 * that one side happens to be missing can make them differ on its own.
 */
function toSnapshot(state: EditorState): EditorSnapshot {
  return {
    draft: state.draft,
    config: {
      /* The card's theme follows the draft's, which is what the occasion sets. */
      themeId: state.draft.themeId,
      blocks: state.blocks,
      decorMotion: state.decorMotion,
      decorIntensity: state.decorIntensity,
      occasionId: state.occasionId,
      traditionId: state.traditionId,
      scratchTarget: state.scratchTarget,
      borderStyle: state.borderStyle,
      style: state.style,
      ornamentConfig: state.ornamentConfig,
      musicUrl: state.musicUrl,
      isPaid: state.isPaid,
    },
    coverAnimation: state.coverAnimation,
    showWeather: state.showWeather,
    weatherTheme: state.weatherTheme,
  };
}

type CardEditorProps = {
  initialDraft: EventDraft;
  initialConfig: CardConfig;
  initialCoverAnimation: CoverAnimationId;
  initialShowWeather: boolean;
  initialWeatherTheme: WeatherThemeId;
  /** What this route does with a finished card. The editor never writes a row. */
  onSave: (snapshot: EditorSnapshot) => Promise<SaveOutcome>;
  /**
   * Rendered above the editor and spanning both columns at lg.
   *
   * A slot rather than a mode check, because each route has its own thing to
   * say and neither of them is the editor's business: /create warns that this
   * will be another invitation, the edit route says how many guests have
   * already replied to this one.
   */
  notice?: ReactNode;
  /**
   * Recovers a card stashed before a sign-in detour, if there is one.
   *
   * Injected rather than reached for, because the stash belongs to /create and
   * to nothing else: a host editing a saved event is already signed in, took no
   * detour, and must never have a stale card from some earlier session dropped
   * over the invitation they came here to fix. The route that has a stash
   * passes a reader; the route that has none passes nothing.
   */
  restore?: () => EditorSnapshot | null;
} & (
  | { mode: "create"; eventId?: never }
  /* The id is required exactly when editing, so Cancel always has somewhere to go. */
  | { mode: "edit"; eventId: string }
);

/**
 * The invitation editor: every control, the four tabs, the preview, the save.
 *
 * ONE EDITOR, TWO ROUTES. /create mounts it over empty defaults and saves by
 * creating a row; /dashboard/[eventId]/edit mounts it over a stored event and
 * saves by updating one. Everything between those two moments is identical
 * code, which is the entire point: a second editor would be a second place for
 * a new control to be forgotten, and the first host to notice would be the one
 * whose ornament vanished the moment they fixed a typo in a venue.
 *
 * WHAT THE MODE ACTUALLY CHANGES is small and all of it is here: the word on
 * the save button, a Cancel beside it, the way back to the list, and the guard
 * over unsaved changes. Nothing in the panels below knows which route it is on.
 *
 * ALL THE STATE LIVES HERE, and that is load-bearing rather than tidy: only the
 * selected tab's panel is mounted, so a control that leaves the screen leaves
 * nothing behind it. See the notes on `openSubEventId` and `nextCustomId` for
 * the two pieces that had to be lifted out of their own editors to make that
 * safe.
 */
export default function CardEditor({
  mode,
  eventId,
  initialDraft,
  initialConfig,
  initialCoverAnimation,
  initialShowWeather,
  initialWeatherTheme,
  onSave,
  notice,
  restore,
}: CardEditorProps): ReactElement {
  const router = useRouter();

  /*
    What this route handed over, unpacked. Cheap enough to rebuild on every
    render and only ever read on the first: it seeds the state below and the
    baseline the dirty check measures against.
  */
  const initial = toState({
    draft: initialDraft,
    config: initialConfig,
    coverAnimation: initialCoverAnimation,
    showWeather: initialShowWeather,
    weatherTheme: initialWeatherTheme,
  });

  const [draft, setDraft] = useState<EventDraft>(initial.draft);
  /*
    Which pile of controls is on screen. React state and nothing else: no
    localStorage, which is unavailable here, and nothing in the URL either — a
    tab is where the host happens to be looking, not a place to come back to.
    Details, because the facts are what an empty card needs first, and because
    they are what a host reopening a saved card has almost always come to fix.
  */
  const [tab, setTab] = useState<EditorTabId>("details");
  const [occasionId, setOccasionId] = useState<OccasionId>(initial.occasionId);
  const [traditionId, setTraditionId] = useState<TraditionId>(
    initial.traditionId,
  );
  const [decorMotion, setDecorMotion] = useState(initial.decorMotion);
  const [decorIntensity, setDecorIntensity] = useState<DecorIntensity>(
    initial.decorIntensity,
  );
  const [borderStyle, setBorderStyle] = useState(initial.borderStyle);
  const [scratchTarget, setScratchTarget] = useState(initial.scratchTarget);
  /* A link the host pastes. Null is "no music", and nothing ever autoplays. */
  const [musicUrl, setMusicUrl] = useState<string | null>(initial.musicUrl);
  /*
    Not part of CardConfig: the cover wraps the card rather than being on it,
    and it is stored in its own column. See supabase/migrations/0003.
  */
  const [coverAnimation, setCoverAnimation] = useState<CoverAnimationId>(
    initial.coverAnimation,
  );
  /* Also its own column rather than part of CardConfig; see 0004. */
  const [showWeather, setShowWeather] = useState(initial.showWeather);
  const [weatherTheme, setWeatherTheme] = useState<WeatherThemeId>(
    initial.weatherTheme,
  );
  /*
    The current tradition's ornament pack choices. Kept here rather than inside
    the panel, because the panel unmounts the moment the host leaves a tradition
    that has a pack, and state that unmounts with its editor would quietly
    survive on the card.
  */
  const [ornamentConfig, setOrnamentConfig] = useState<OrnamentConfig>(
    initial.ornamentConfig,
  );
  const [style, setStyle] = useState<CardStyle>(initial.style);

  /*
    Which function in the timeline has its fields open, and the counter that
    names a new custom section.

    Both were local to their own editor until those editors started unmounting
    every time the host switched tab. The open row would have collapsed under
    them; the counter would have restarted at 1 and minted an id a section in
    the list already had. See the props on SubEventEditor and SectionManager.
  */
  const [openSubEventId, setOpenSubEventId] = useState<string | null>(null);
  const nextCustomId = useRef<number>(1);

  const [blocks, setBlocks] = useState<readonly CardBlock[]>(initial.blocks);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * The next unused `custom-n`.
   *
   * The skip loop is not belt and braces. A card that arrives already holding
   * custom-1 and custom-2 — restored from the sign-in stash, or loaded out of a
   * saved event — leaves this counter at 1 while those ids exist, so it is
   * stepped past anything the list already holds rather than trusted blind.
   */
  const mintCustomId = useCallback((): string => {
    let id = "";

    do {
      id = `custom-${nextCustomId.current}`;
      nextCustomId.current += 1;
    } while (
      blocks.some((block) => block.kind === "custom" && block.section.id === id)
    );

    return id;
  }, [blocks]);

  const handleChange = useCallback<
    <K extends keyof EventDraft>(field: K, value: EventDraft[K]) => void
  >((field, value) => {
    setDraft((previous) => ({ ...previous, [field]: value }));
  }, []);

  /**
   * An occasion click is the only thing that overwrites the theme and motion.
   * Every other render leaves them alone, so a host who picks a theme after
   * choosing an occasion keeps their choice — and a host who opens a saved card
   * and never touches the occasion keeps everything they chose last time.
   */
  const handleOccasionSelect = useCallback((id: OccasionId) => {
    const occasion = getOccasion(id);
    setOccasionId(id);
    setDecorMotion(occasion.defaultMotion);
    setDraft((previous) => ({ ...previous, themeId: occasion.defaultThemeId }));
    /* Palette follows the occasion; a custom accent is cleared with it. */
    setStyle((previous) => ({
      ...previous,
      paletteId: occasion.defaultPaletteId,
      accentOverride: null,
    }));
  }, []);

  /**
   * A tradition click is the one thing that can clear the ornament pack.
   *
   * EVERY tradition click resets it, including a click that lands on another
   * tradition with a pack of its own. That is what stops a selection crossing
   * between packs: a host who picks Bismillah under Muslim and then chooses
   * Hindu gets an empty Hindu panel, not a greeting id from the wrong content
   * file sitting in the slot. It also covers leaving a pack entirely — a host
   * who tries the lanterns, changes their mind, and never opens that panel
   * again would otherwise ship a Sikh or a Christian card with a lantern
   * hanging off it and no control anywhere on the page that could switch it
   * off. Arriving at a pack resets it too, so a pack always opens from a known
   * state.
   */
  const handleTraditionSelect = useCallback((id: TraditionId) => {
    setTraditionId(id);
    setOrnamentConfig(DEFAULT_ORNAMENT_CONFIG);
  }, []);

  const setFontPair = useCallback((fontPairId: FontPairId) => {
    setStyle((previous) => ({ ...previous, fontPairId }));
  }, []);

  const setPalette = useCallback((paletteId: PaletteId) => {
    setStyle((previous) => ({ ...previous, paletteId }));
  }, []);

  const setDensity = useCallback((density: CardDensity) => {
    setStyle((previous) => ({ ...previous, density }));
  }, []);

  const setAccent = useCallback((accentOverride: string | null) => {
    setStyle((previous) => ({ ...previous, accentOverride }));
  }, []);

  /* The card as it stands, and the only place this component builds one. */
  const snapshot = toSnapshot({
    draft,
    blocks,
    decorMotion,
    decorIntensity,
    occasionId,
    traditionId,
    scratchTarget,
    borderStyle,
    style,
    ornamentConfig,
    musicUrl,
    isPaid: initial.isPaid,
    coverAnimation,
    showWeather,
    weatherTheme,
  });
  const config: CardConfig = snapshot.config;

  /*
    What the editor was handed, and what "unchanged" is measured against.

    Built by toSnapshot over the same unpacked state the controls started from,
    rather than from the props directly, so the two sides of the comparison
    below are the same construction over the same values. A stored card missing
    a field the editor now has cannot register as an edit nobody made.

    State rather than a memo, because it moves exactly once: a successful save
    makes what was just written the new baseline, so the guard stops guarding
    something that is now safely in the database. A card recovered from the
    sign-in stash moves it too — that card is what the host started from, not
    the empty defaults it replaced.
  */
  const [baseline, setBaseline] = useState<EditorSnapshot>(() =>
    toSnapshot(initial),
  );

  /*
    Structural, not by reference. Every control here replaces state rather than
    mutating it, so re-picking the palette that was already selected builds a
    new object holding the same choices — and a dirty check that counted that
    would put a "discard your changes?" prompt in front of a host who changed
    nothing. See lib/deepEqual.ts.

    Only in edit mode. On /create the baseline is an empty card and a host who
    has typed their own name is "dirty" by the second keystroke; there is
    nothing saved to lose there, no Cancel, and the sign-in detour deliberately
    navigates away, so the guard would be pure friction on the commonest path
    this editor has.
  */
  const isDirty = mode === "edit" && !deepEqual(snapshot, baseline);

  /*
    A card stashed before a sign-in detour comes back here.

    Runs once, after mount rather than during render: sessionStorage does not
    exist on the server, and seeding useState from it would make the first
    client render disagree with the HTML and tear hydration. The reader clears
    the entry as it reads — restoring it twice would overwrite whatever the host
    had started typing in the meantime.

    Read through a ref so an inline `restore` prop cannot re-run this on a
    later render and drop the stash over live edits.
  */
  const restoreRef = useRef(restore);

  useEffect(() => {
    const pending = restoreRef.current?.() ?? null;

    if (pending === null) {
      return;
    }

    /*
      Unpacked exactly as the props were, so a card stashed by an older build
      lands in the same known state a stored one would — and so the baseline
      below is built from the same values the controls are now showing.

      `isPaid` is not taken from the stash. It is not the stash's to say: only
      /create has one, and nothing in /create has been paid for.
    */
    const restored: EditorState = { ...toState(pending), isPaid: initial.isPaid };

    setDraft(restored.draft);
    setOccasionId(restored.occasionId);
    setTraditionId(restored.traditionId);
    setDecorMotion(restored.decorMotion);
    setDecorIntensity(restored.decorIntensity);
    setBorderStyle(restored.borderStyle);
    setScratchTarget(restored.scratchTarget);
    setMusicUrl(restored.musicUrl);
    setOrnamentConfig(restored.ornamentConfig);
    setStyle(restored.style);
    setBlocks(restored.blocks);
    setCoverAnimation(restored.coverAnimation);
    setShowWeather(restored.showWeather);
    setWeatherTheme(restored.weatherTheme);
    setBaseline(toSnapshot(restored));
  }, []);

  /*
    The browser's own "leave site?" prompt, and the only thing here that can
    catch a closed tab or a typed URL.

    Registered only while there is something to lose and torn down the moment
    there is not — which covers the save, because a successful one moves the
    baseline and clears `isDirty` — and on unmount, by the cleanup. A handler
    left behind would prompt a host who had already saved.
  */
  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
      /*
        Both halves, and neither is redundant: preventDefault is what the spec
        now asks for, `returnValue` is what older browsers still read. Whatever
        string is assigned, every current browser shows its own wording.
      */
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  /*
    Where a guarded control was trying to go, held while the host answers the
    dialog. Null means nothing is being asked.
  */
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  /**
   * Leaves, or asks first.
   *
   * The two controls that exist to walk away from the editor come through here.
   * Everything else — the wordmark, the back button, a typed URL — is left
   * alone on purpose: a guard on every route change is a guard that will one
   * day fire on the wrong one, and a host it will not let out is worse off than
   * a host who lost an edit.
   */
  const leave = useCallback(
    (href: string): void => {
      if (isDirty) {
        setPendingHref(href);
        return;
      }

      router.push(href);
    },
    [isDirty, router],
  );

  const handleSave = useCallback((): void => {
    if (isSaving) {
      return;
    }

    setError(null);
    setIsSaving(true);

    void onSave(snapshot)
      .then((outcome) => {
        if (!outcome.ok) {
          setIsSaving(false);
          setError(outcome.error);
          return;
        }

        /*
          Clean, as of what was just written. This is what removes the
          beforeunload handler, and it has to happen whether the route is
          navigating to a new dashboard, back to this event's, or off to sign in.
          `isSaving` deliberately stays true: the page is leaving.
        */
        setBaseline(snapshot);
      })
      .catch((cause: unknown) => {
        console.error("[editor] save failed:", cause);
        setIsSaving(false);
        setError("Could not save your invitation, please try again.");
      });
  }, [isSaving, onSave, snapshot]);

  const motifs = getMotifs(occasionId, traditionId);
  const dashboardHref = eventId === undefined ? "/dashboard" : `/dashboard/${eventId}`;

  /*
    The one completion hint in the editor: Details is the only tab holding
    anything a host would regret leaving blank. Every design and decoration
    choice has a working default and the structure starts complete, so those
    three never carry a dot and there is no scoring system here to decide it.
  */
  const detailsIncomplete =
    draft.eventTitle.trim().length === 0 ||
    draft.eventDate.length === 0 ||
    draft.venueName.trim().length === 0;

  return (
    <div className="min-h-screen">
      {/* Slim top bar */}
      <header className="sticky top-0 z-10 border-b border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink)]/85 backdrop-blur">
        {/*
          Wraps rather than crushing four controls onto one line.

          In edit mode this bar carries the wordmark, the way back to the list,
          Cancel and Save, which at 360px is about 385px of content. Nothing
          here may shrink: a truncated "Save changes" is not a shorter label,
          and a Cancel narrower than 44px is not a tap target. So on a phone the
          actions take a row of their own, exactly as the dashboard's top bar
          does with its title block. At every width where it all fits — which is
          every width in create mode — this changes nothing.
        */}
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="rounded font-[family-name:var(--font-display)] text-xl font-semibold tracking-[-0.02em] text-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
            >
              Lifafa
            </Link>

            {/*
              The way back to the list, and one of the two controls the discard
              prompt covers. A real link rather than a button, so it keeps
              everything a link has — the status bar preview, middle-click, open
              in a new tab — and the guard only intercepts the plain click that
              would actually take this page away.
            */}
            {mode === "edit" ? (
              <Link
                href="/dashboard"
                onClick={(event) => {
                  /*
                    A modified click is not this page leaving: ctrl, meta and
                    shift all open the list somewhere else and leave the editor
                    exactly where it is, with the edit still in it. Intercepting
                    those would refuse a host a second tab and ask them about
                    changes they are not walking away from.
                  */
                  if (
                    !isDirty ||
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey ||
                    event.button !== 0
                  ) {
                    return;
                  }

                  event.preventDefault();
                  setPendingHref("/dashboard");
                }}
                className="flex min-h-11 items-center rounded text-[0.8125rem] font-medium whitespace-nowrap text-[var(--lifafa-muted)] transition-colors duration-150 hover:text-[var(--lifafa-cream)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
              >
                {/* Decorative: the words already say which direction this goes. */}
                <span aria-hidden="true" className="mr-1.5">
                  ←
                </span>
                All my invitations
              </Link>
            ) : null}
          </div>

          {/*
            `ml-auto` so that when this wraps onto its own row it stays against
            the right edge. justify-between does nothing for a row holding one
            item, and right-aligned actions sitting at the left would read as a
            mistake.
          */}
          <div className="ml-auto flex flex-col items-end gap-2">
            <div className="flex items-center gap-3">
              {mode === "edit" ? (
                <button
                  type="button"
                  onClick={() => leave(dashboardHref)}
                  className="min-h-11 rounded px-1 text-[0.8125rem] font-medium whitespace-nowrap text-[var(--lifafa-muted)] transition-colors duration-150 hover:text-[var(--lifafa-cream)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
                >
                  Cancel
                </button>
              ) : null}

              {/*
                On /create this is the first point that needs an account, and it
                asks for one only when it is clicked — the editor itself stays
                open to everyone. What that means is the route's business; this
                button only knows that saving is a thing it can start.
              */}
              <button
                type="button"
                onClick={handleSave}
                /* Only while saving. A signed-out host on /create may still click — that is what sends them to sign in. */
                disabled={isSaving}
                className="min-h-11 rounded-full bg-[var(--lifafa-marigold)] px-5 text-[0.8125rem] font-semibold whitespace-nowrap text-[var(--lifafa-ink)] transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] enabled:hover:-translate-y-px disabled:opacity-60"
              >
                {isSaving
                  ? "Saving…"
                  : mode === "edit"
                    ? "Save changes"
                    : "Save and get my link"}
              </button>
            </div>

            {/*
              The price, next to the button that commits to it.

              One invitation is one payment, and the moment a host is about to
              make a second one is the moment that has to be true in writing
              rather than discovered on a bill. Muted and small: it is a footnote
              to the button, not a second call to action, and nothing on this
              page charges anyone anything yet.

              Not shown when editing, and that is the point of the condition
              rather than a detail of it: this invitation has already been made,
              and a line about a separate payment beside a "Save changes" button
              reads as a charge for fixing a typo.
            */}
            {mode === "create" ? (
              <p className="text-right text-[0.6875rem] leading-snug text-[var(--lifafa-muted)]">
                Each invitation is a separate ₹999 payment.
              </p>
            ) : null}

            {error !== null ? (
              <p
                role="alert"
                className="max-w-[38ch] rounded-xl border border-[var(--lifafa-rose)]/40 bg-[var(--lifafa-rose)]/10 px-3 py-2 text-right text-xs leading-relaxed text-[var(--lifafa-cream)]"
              >
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      {/*
        Two columns at lg: the controls on the left, the card sticking on the
        right while they scroll. Below lg the card comes off the page entirely
        and lives behind PreviewBar, pinned to the bottom of the screen.

        The ratio moved from 45/55 to 58/42 when the tabs arrived, because the
        left column now spends 11rem of itself on the tab sidebar and the
        controls need the rest. Nothing is taken from the card: the preview
        frame is `max-w-[380px]` and 42% of this container clears that at every
        width from 1024px up, so it draws at exactly the size it always did.
      */}
      {/*
        `pb-52` is room for two stacked bars on a phone — the tab bar and the
        preview bar below it, about 150px between them over the safe area — so
        the last control of every panel can be scrolled clear of both. Dropped
        at lg, where there is neither.
      */}
      <main className="mx-auto grid max-w-6xl gap-10 px-5 pt-8 pb-52 lg:grid-cols-[58fr_42fr] lg:items-start lg:px-8 lg:py-12">
        {/*
          The editor's visible headings all describe one part of the card —
          Occasion, Card sections, Style — and none of them names the page, so
          without this the document outline starts at h2 and a screen reader
          user arriving by heading has nothing that says where they are.
          Off screen rather than drawn: the design's entry point is the card
          itself, and a visible title would compete with it.
        */}
        <h1 className="sr-only">
          {mode === "edit" ? "Edit your invitation" : "Create your invitation"}
        </h1>

        {/*
          Above everything, and spanning both columns at lg. Whatever this route
          has to say before the host starts: see the `notice` prop. Both of the
          notices that go here render null when they have nothing to say and
          carry their own `lg:col-span-2`, so no grid item is created at all in
          the ordinary case — which a wrapper here would not manage.
        */}
        {notice}

        {/*
          `min-w-0` on both columns, and it is load-bearing rather than tidy.

          A grid item's automatic minimum size is its *min-content* width, not
          zero, so anything inside that refuses to wrap sets a floor the column
          cannot go below. The typography specimens are `white-space: nowrap` by
          design — they are type samples, and a sample that wraps stops showing
          the face — so a host typing a long pair of names pushed that floor to
          472px on a 360px screen. The page did not scroll sideways; it did
          something worse and zoomed out to fit, shrinking the whole editor and
          the card preview with it.

          `min-w-0` lets the column shrink to the space it actually has, which
          is what finally lets the specimens' own `truncate` do its job.
          EditorTabs carries it on its own root and passes it to the panel.
        */}
        {/*
          FOUR TABS, AND ONLY THE SELECTED ONE IS BUILT.

          The order is the order a card gets made in: the facts, then the look,
          then what goes on it, then what appears and in what order. What each
          tab holds is decided here and nowhere else — EditorTabs draws the bar
          and mounts whatever it is handed, and has no idea what a palette or a
          sub-event is.

          Every value below is state on this component, which is what makes
          unmounting three panels safe: a control that leaves the screen leaves
          nothing behind it. See the notes on `openSubEventId` and
          `nextCustomId` for the two pieces that had to be lifted out of their
          editors to make that true.
        */}
        <EditorTabs
          selected={tab}
          onSelect={setTab}
          detailsIncomplete={detailsIncomplete}
        >
          {/* 1 — DETAILS. Who, what, where. */}
          {tab === "details" ? (
            <>
              <OccasionGrid
                occasionId={occasionId}
                onOccasionChange={handleOccasionSelect}
              />
              <EventForm
                draft={draft}
                onChange={handleChange}
                occasionId={occasionId}
              />
              <SubEventEditor
                subEvents={draft.subEvents}
                openId={openSubEventId}
                onChange={(subEvents) => handleChange("subEvents", subEvents)}
                onOpenIdChange={setOpenSubEventId}
              />
            </>
          ) : null}

          {/* 2 — DESIGN. How it looks. */}
          {tab === "design" ? (
            <>
              <StylePanel
                style={style}
                /* Resolved, so the specimen shows the same line the cover will. */
                hostNames={coverNameLine(resolveCoverNames(draft, occasionId))}
                paletteAccent={getPalette(style.paletteId).accent}
                borderStyle={borderStyle}
                onFontPairChange={setFontPair}
                onPaletteChange={setPalette}
                onDensityChange={setDensity}
                onAccentChange={setAccent}
                onBorderStyleChange={setBorderStyle}
              />
              <MotionPicker
                motion={decorMotion}
                intensity={decorIntensity}
                onMotionChange={setDecorMotion}
                onIntensityChange={setDecorIntensity}
              />
            </>
          ) : null}

          {/*
            3 — DECORATION. What is on it.

            The weather panel is here rather than under Structure, which is the
            other tab it could have gone to. It is an optional treatment drawn
            on the card, off until a host turns it on, which is what everything
            else in this tab is; Structure is about the sections and the order
            they come in, and the weather is not one of them.
          */}
          {tab === "decoration" ? (
            <>
              <TraditionPicker
                traditionId={traditionId}
                ornamentConfig={ornamentConfig}
                onTraditionChange={handleTraditionSelect}
                onOrnamentConfigChange={setOrnamentConfig}
              />
              <RevealPanel
                scratchTarget={scratchTarget}
                onScratchTargetChange={setScratchTarget}
              />
              <WeatherPicker
                showWeather={showWeather}
                weatherTheme={weatherTheme}
                onShowWeatherChange={setShowWeather}
                onWeatherThemeChange={setWeatherTheme}
              />
            </>
          ) : null}

          {/* 4 — STRUCTURE. What appears, and in what order. */}
          {tab === "structure" ? (
            <>
              <SectionManager
                blocks={blocks}
                mintCustomId={mintCustomId}
                onBlocksChange={setBlocks}
              />
              <CoverAnimationPicker
                coverAnimation={coverAnimation}
                onChange={setCoverAnimation}
              />
              <MusicPanel musicUrl={musicUrl} onMusicUrlChange={setMusicUrl} />
            </>
          ) : null}
        </EditorTabs>

        {/*
          The preview belongs to no tab and never moves into one. Staying
          mounted across all four is also what keeps it from resetting:
          switching tabs re-renders this column, it does not remount it, so the
          frame's own scroll position and the overlay's state survive a tab
          switch untouched.
        */}
        <div className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-24">
          <CardPreview
            draft={draft}
            config={config}
            motifs={motifs}
            coverAnimation={coverAnimation}
          />
        </div>
      </main>

      {/*
        The phone's way to the card: one bar, pinned to the bottom of the
        screen, reachable from anywhere in the form. Renders nothing at lg,
        where the card is already sitting in a sticky column beside it.
      */}
      <PreviewBar
        draft={draft}
        config={config}
        motifs={motifs}
        coverAnimation={coverAnimation}
      />

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
    </div>
  );
}
