"use client";

import {
  useCallback,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AutoTranslate from "@/components/create/AutoTranslate";
import CardPreview from "@/components/create/CardPreview";
import CheckinPanel from "@/components/create/CheckinPanel";
import CoverAnimationPicker from "@/components/create/CoverAnimationPicker";
import DiscardChangesDialog from "@/components/create/DiscardChangesDialog";
import EditorTabs, { type EditorTabId } from "@/components/create/EditorTabs";
import EventForm from "@/components/create/EventForm";
import LanguagePicker from "@/components/create/LanguagePicker";
import MotionPicker from "@/components/create/MotionPicker";
import MusicPanel from "@/components/create/MusicPanel";
import PdfPanel from "@/components/create/PdfPanel";
import OccasionGrid from "@/components/create/OccasionGrid";
import PreviewBar from "@/components/create/PreviewBar";
import ReplyFormPanel from "@/components/create/ReplyFormPanel";
import RevealPanel from "@/components/create/RevealPanel";
import SectionManager from "@/components/create/SectionManager";
import SubEventEditor from "@/components/create/SubEventEditor";
import TraditionPicker from "@/components/create/TraditionPicker";
import TraditionQuestion from "@/components/create/TraditionQuestion";
import TranslationPanel from "@/components/create/TranslationPanel";
import WeatherPicker from "@/components/create/WeatherPicker";
import StylePanel from "@/components/create/StylePanel";
import type { Accordion } from "@/components/editor/CollapsibleSection";
import PresetPicker from "@/components/editor/PresetPicker";
import { dividerStyleOf } from "@/lib/cardDecor";
import DividerPanel from "@/components/create/DividerPanel";
import DateRevealPanel from "@/components/create/DateRevealPanel";
import CoupleIllustrationPanel from "@/components/create/CoupleIllustrationPanel";
import InvitedHeadingPanel from "@/components/create/InvitedHeadingPanel";
import VenueIllustrationPanel from "@/components/create/VenueIllustrationPanel";
import ScenePanel from "@/components/create/ScenePanel";
import NamesFramePanel from "@/components/create/NamesFramePanel";
import { dateRevealOf, scrollArtFor } from "@/lib/royalScroll";
import { getTraditionPack } from "@/lib/traditionPacks";
import { type ChangeAllowance } from "@/lib/eventLock";
import { coverNameLine, resolveCoverNames } from "@/lib/cardFormat";
import { cardPalette } from "@/lib/textColors";
import type { CardConfig } from "@/types/card";
import type { CoverAnimationId } from "@/types/coverAnimation";
import type { WeatherThemeId } from "@/types/weather";
import type { EventDraft } from "@/types/event";

import {
  useCardEditor,
  type EditorSnapshot,
  type SaveOutcome,
} from "@/hooks/useCardEditor";

/* Still exported from here, where /create and the edit route have always imported them. */
export type { EditorSnapshot, SaveOutcome };

/* The three tabs whose controls fold into sections; Details is a form. */
type AccordionTabId = Exclude<EditorTabId, "details">;

type CardEditorProps = {
  initialDraft: EventDraft;
  initialConfig: CardConfig;
  initialCoverAnimation: CoverAnimationId;
  initialShowWeather: boolean;
  initialWeatherTheme: WeatherThemeId;
  initialQrCheckinEnabled: boolean;
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
   * Sends a signed-out host to sign in with this card kept, for the Translate
   * button; returns an error to show if the card could not be kept. Only
   * /create passes it: the edit page is behind sign-in already.
   */
  onSignInRequired?: (snapshot: EditorSnapshot) => string | null;
  /**
   * The event is over and locked (lib/eventLock.ts): every control is inert
   * and there is nothing to save. The edit page decides, on the server, and
   * says why in `notice`; the server and the database refuse a save anyway.
   */
  readOnly?: boolean;
  /**
   * After payment: the draft as it was saved and the date and name changes it
   * has used, so each field can say how many are left and refuse, inline, a
   * change the server would refuse. Absent for an unpaid invitation.
   */
  paidLimits?: { baseline: EventDraft; allowance: ChangeAllowance };
  /**
   * Whether this invitation has been paid for, which decides the watermark in
   * the full screen preview.
   *
   * A prop of its own rather than `initialConfig.isPaid`, and the difference is
   * where it was read. The edit route passes the event row's column as the
   * server loaded it; /create passes false, because a card with no event yet
   * has nothing that could have been paid for. The card's JSON also carries a
   * copy, but that copy is state the browser holds, and a watermark decided by
   * it is decided by the client.
   */
  isPaid: boolean;
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
  initialQrCheckinEnabled,
  onSave,
  onSignInRequired,
  readOnly = false,
  paidLimits,
  notice,
  isPaid,
}: CardEditorProps): ReactElement {
  const router = useRouter();

  /* The card itself: its state, its dirty check and its save. See hooks/useCardEditor.ts. */
  const {
    draft,
    occasionId,
    traditionId,
    language,
    previewLanguage,
    setPreviewLanguage,
    rsvpEnabled,
    setRsvpEnabled,
    decorMotion,
    setDecorMotion,
    decorIntensity,
    setDecorIntensity,
    butterflies,
    setButterflies,
    leaves,
    setLeaves,
    flying,
    setFlying,
    nature,
    setNature,
    petals,
    setPetals,
    petalFlower,
    setPetalFlower,
    lastButterflies,
    lastPetals,
    borderStyle,
    setBorderStyle,
    scratchTarget,
    scratchFrame,
    setScratchFrame,
    dateReveal,
    coupleIllustration,
    setCoupleIllustration,
    invitedHeading,
    setInvitedHeading,
    venueIllustration,
    setVenueIllustration,
    scene,
    setScene,
    royalTexture,
    setRoyalTexture,
    royalTexturePattern,
    setRoyalTexturePattern,
    namesFrame,
    setNamesFrame,
    pdfDownload,
    setPdfDownload,
    handleDateReveal,
    handleScratchSection,
    handleShowDateSimply,
    divider,
    setDivider,
    musicUrl,
    setMusicUrl,
    coverAnimation,
    setCoverAnimation,
    showWeather,
    setShowWeather,
    weatherTheme,
    setWeatherTheme,
    previewWeather,
    qrCheckinEnabled,
    setQrCheckinEnabled,
    ornamentConfig,
    setOrnamentConfig,
    style,
    openSubEventId,
    setOpenSubEventId,
    blocks,
    setBlocks,
    isSaving,
    error,
    mintCustomId,
    handleChange,
    handleOccasionSelect,
    handleLanguageSelect,
    handleDraftWord,
    handleSubEventWord,
    handleSectionWord,
    translatedSignal,
    handleTranslated,
    handleCardId,
    handleTraditionSelect,
    setFontPair,
    setPalette,
    setTextPair,
    setCustomInk,
    setDensity,
    setAccent,
    design,
    handleApplyPreset,
    snapshot,
    isDirty,
    handleSave,
    motifs,
    limitNotes,
    preview,
  } = useCardEditor({
    start: {
      draft: initialDraft,
      config: initialConfig,
      coverAnimation: initialCoverAnimation,
      showWeather: initialShowWeather,
      weatherTheme: initialWeatherTheme,
      qrCheckinEnabled: initialQrCheckinEnabled,
    },
    guardUnsaved: mode === "edit",
    onSave,
    paidLimits,
  });

  /*
    Which pile of controls is on screen. React state and nothing else: no
    localStorage, which is unavailable here, and nothing in the URL either — a
    tab is where the host happens to be looking, not a place to come back to.
    Details, because the facts are what an empty card needs first, and because
    they are what a host reopening a saved card has almost always come to fix.
  */
  const [tab, setTab] = useState<EditorTabId>("details");
  /*
    Set by Quick presets' "Choose tradition", and cleared by the Details
    question once it has scrolled itself into view and taken the focus.
  */
  const [focusTraditionQuestion, setFocusTraditionQuestion] = useState(false);
  const handleChooseTradition = useCallback((): void => {
    setTab("details");
    setFocusTraditionQuestion(true);
  }, []);
  const handleTraditionQuestionFocused = useCallback((): void => {
    setFocusTraditionQuestion(false);
  }, []);

  /*
    Which section of each tab is unfolded, lifted here for the same reason as
    `openSubEventId`: the panels unmount on every tab switch, and a host coming
    back to Design should find the section they left open. Each tab starts on
    its first section — Design on the presets for a new card, where starting
    from a ready-made look is the likeliest first move, and on Typography for a
    saved one, whose host has come back to change something in particular. One
    id per tab, so opening a section closes the last. Nothing here is saved; it
    is where the host is looking, like `tab`.
  */
  const [openSections, setOpenSections] = useState<
    Record<AccordionTabId, string | null>
  >({
    design: mode === "create" ? "presets" : "typography",
    structure: "sections",
    extras: "cover",
  });

  const accordionFor = (tabId: AccordionTabId): Accordion => ({
    openId: openSections[tabId],
    onToggle: (id) =>
      setOpenSections((previous) => ({
        ...previous,
        [tabId]: previous[tabId] === id ? null : id,
      })),
  });

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
                  {readOnly ? "Back to dashboard" : "Cancel"}
                </button>
              ) : null}

              {/*
                On /create this is the first point that needs an account, and it
                asks for one only when it is clicked — the editor itself stays
                open to everyone. What that means is the route's business; this
                button only knows that saving is a thing it can start.
              */}
              {readOnly ? null : (
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
              )}
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
        {/*
          Read-only once the event is over: every control inert, so nothing can
          be focused or changed. `contents` keeps the wrapper out of the grid,
          so the tabs sit exactly where they always do. The preview beside them
          stays live.
        */}
        <div className="contents" inert={readOnly}>
          <EditorTabs
            selected={tab}
            onSelect={setTab}
            detailsIncomplete={detailsIncomplete}
          >
            {/*
              1 — DETAILS. Which language, then who, what, where.

              The language comes first, above even the occasion: it decides what
              the host is about to type everything below in, so it is the one
              choice that cannot sensibly be made afterwards. The tradition sits
              under it: the same traditionId as the Traditional motifs section in
              Design, through the same handler.
            */}
            {tab === "details" ? (
              <>
                {/*
                  The card's own words, wrapped only so that typing in any of
                  them turns the preview back to the card's own language after
                  the host has been writing the other one below. The same column
                  and gap as the tab panel, so the wrapper changes no layout.
                */}
                <div
                  className="flex min-w-0 flex-col gap-9"
                  onFocusCapture={() => setPreviewLanguage(language)}
                >
                  {/*
                    The Translate button sits with the language it translates
                    from, closer than the tab's own gap so the two read as one.
                  */}
                  <div className="flex min-w-0 flex-col gap-4">
                    <LanguagePicker
                      language={language}
                      onLanguageChange={handleLanguageSelect}
                    />
                    <AutoTranslate
                      cardLanguage={language}
                      draft={draft}
                      blocks={blocks}
                      occasionId={occasionId}
                      eventId={eventId}
                      onTranslated={handleTranslated}
                      onCardId={handleCardId}
                      onSignInRequired={
                        onSignInRequired === undefined
                          ? undefined
                          : () => onSignInRequired(snapshot)
                      }
                    />
                  </div>
                  <TraditionQuestion
                    traditionId={traditionId}
                    ornamentConfig={ornamentConfig}
                    onTraditionChange={handleTraditionSelect}
                    focusRequested={focusTraditionQuestion}
                    onFocused={handleTraditionQuestionFocused}
                  />
                  <OccasionGrid
                    occasionId={occasionId}
                    onOccasionChange={handleOccasionSelect}
                  />
                  <EventForm
                    draft={draft}
                    onChange={handleChange}
                    occasionId={occasionId}
                    language={language}
                    paidLimits={limitNotes}
                  />
                  <SubEventEditor
                    subEvents={draft.subEvents}
                    openId={openSubEventId}
                    onChange={(subEvents) => handleChange("subEvents", subEvents)}
                    onOpenIdChange={setOpenSubEventId}
                  />
                </div>

                {/*
                  Last, under the words it translates. See TranslationPanel for
                  why it is not a second copy of the form above.
                */}
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
              </>
            ) : null}

            {/* 2 — DESIGN. How it looks, ornament included. */}
            {tab === "design" ? (
              /*
                Sections sit closer together than the tab's own groups do: a
                stack of headers reads as one list, and a 36px gap between them
                would scatter it.
              */
              <div className="flex min-w-0 flex-col gap-3">
                <PresetPicker
                  design={design}
                  occasionId={occasionId}
                  /* The couple as the card names them, set in each look's own face. */
                  hostNames={coverNameLine(
                    resolveCoverNames(preview.draft, occasionId, previewLanguage),
                  )}
                  onApply={handleApplyPreset}
                  onChooseTradition={handleChooseTradition}
                  accordion={accordionFor("design")}
                />
                <StylePanel
                  style={style}
                  /*
                    Resolved from the card as the preview shows it, so the
                    specimen is the same line the cover will set, in the same
                    language: Hindi names in Hindi mode.
                  */
                  hostNames={coverNameLine(
                    resolveCoverNames(preview.draft, occasionId, previewLanguage),
                  )}
                  language={previewLanguage}
                  paletteAccent={cardPalette(style).accent}
                  borderStyle={borderStyle}
                  royalTexture={royalTexture}
                  onRoyalTextureChange={setRoyalTexture}
                  royalTexturePattern={royalTexturePattern}
                  onRoyalTexturePatternChange={setRoyalTexturePattern}
                  onFontPairChange={setFontPair}
                  onPaletteChange={setPalette}
                  onTextPairChange={setTextPair}
                  onCustomInkChange={setCustomInk}
                  onDensityChange={setDensity}
                  onAccentChange={setAccent}
                  onBorderStyleChange={setBorderStyle}
                  accordion={accordionFor("design")}
                />
                <MotionPicker
                  motion={decorMotion}
                  intensity={decorIntensity}
                  butterflies={butterflies}
                  leaves={leaves}
                  flying={flying}
                  nature={nature}
                  petals={petals}
                  petalFlower={petalFlower}
                  onMotionChange={setDecorMotion}
                  onIntensityChange={setDecorIntensity}
                  onButterfliesChange={setButterflies}
                  onLeavesChange={setLeaves}
                  onFlyingChange={setFlying}
                  onNatureChange={setNature}
                  onPetalsChange={setPetals}
                  onPetalFlowerChange={setPetalFlower}
                  lastButterflies={lastButterflies}
                  lastPetals={lastPetals}
                  accordion={accordionFor("design")}
                />
                {/*
                  The ornament had a tab of its own and does not need one. Which
                  motifs a card carries is the same question as which palette and
                  which faces it is set in — a host deciding how their invitation
                  should look is on one errand, and making them cross to another
                  tab for the sprigs was asking them to sort their own taste into
                  our filing.
                */}
                <TraditionPicker
                  traditionId={traditionId}
                  ornamentConfig={ornamentConfig}
                  onTraditionChange={handleTraditionSelect}
                  onOrnamentConfigChange={setOrnamentConfig}
                  accordion={accordionFor("design")}
                />
                {/* Only for a card whose pack sets its names in a frame. */}
                {getTraditionPack(traditionId)?.framedNames === true ? (
                  <NamesFramePanel
                    namesFrame={namesFrame}
                    onNamesFrameChange={setNamesFrame}
                    accordion={accordionFor("design")}
                  />
                ) : null}
                {/* Under the opening it sits above: the calligraphy and blessing are chosen just before it. */}
                <InvitedHeadingPanel
                  enabled={invitedHeading}
                  onEnabledChange={setInvitedHeading}
                  accordion={accordionFor("design")}
                />
                {/* Beside the tradition it follows: the figures are that tradition's pair. */}
                <CoupleIllustrationPanel
                  enabled={coupleIllustration}
                  onEnabledChange={setCoupleIllustration}
                  accordion={accordionFor("design")}
                />
                <ScenePanel
                  scene={scene}
                  onSceneChange={setScene}
                  accordion={accordionFor("design")}
                />
                <VenueIllustrationPanel
                  venueIllustration={venueIllustration}
                  onVenueIllustrationChange={setVenueIllustration}
                  accordion={accordionFor("design")}
                />
                {/*
                  The rule between sections and the frame round a hidden date
                  are both drawn on the card, and both are flowers: the same
                  errand as the ornament above them. They sat under Extras,
                  where a host choosing how the card looks did not think to
                  look. Only where they are offered has changed; what each one
                  writes to the card is what it always wrote.
                */}
                <DividerPanel
                  divider={dividerStyleOf(divider, traditionId)}
                  onDividerChange={setDivider}
                  accordion={accordionFor("design")}
                />
                <DateRevealPanel
                  dateReveal={dateRevealOf(dateReveal, scratchTarget)}
                  scrollVariant={scrollArtFor(cardPalette(style).background).variant}
                  onDateRevealChange={handleDateReveal}
                  scratchFrame={scratchFrame}
                  onScratchFrameChange={setScratchFrame}
                  accordion={accordionFor("design")}
                />
                <RevealPanel
                  scratchTarget={scratchTarget}
                  dateTorn={dateRevealOf(dateReveal, scratchTarget) === "tear"}
                  onScratchSectionChange={handleScratchSection}
                  onShowDateSimply={handleShowDateSimply}
                  scratchFrame={scratchFrame}
                  onScratchFrameChange={setScratchFrame}
                  accordion={accordionFor("design")}
                />
              </div>
            ) : null}

            {/*
              3 — STRUCTURE. What appears, and in what order — down to the reply
              form, which always comes last and which the host can leave off.
            */}
            {tab === "structure" ? (
              <div className="flex min-w-0 flex-col gap-3">
                <SectionManager
                  blocks={blocks}
                  mintCustomId={mintCustomId}
                  onBlocksChange={setBlocks}
                  accordion={accordionFor("structure")}
                />
                <ReplyFormPanel
                  enabled={rsvpEnabled}
                  onEnabledChange={setRsvpEnabled}
                  accordion={accordionFor("structure")}
                />
              </div>
            ) : null}

            {/*
              4 — EXTRAS. Everything that is off until the host turns it on.

              These four used to be split between Decoration and Structure by an
              argument about what each one technically was: the weather was a
              treatment drawn on the card, the cover and the music were about how
              the day runs, check-in changed nothing a guest sees. Every one of
              those readings is defensible and none of them is how a host looks
              for them. What they actually have in common is the only thing that
              matters here — a card has none of them until somebody asks for it,
              and a host who wants to know what they can add should find the
              answer in one list rather than by opening two tabs and reasoning
              about our categories.

              In the order a guest meets them: the cover they tap, the music
              behind it, the sky over the venue, and the code at the door. The
              scratch panel and the divider were here too, and are under Design
              now, beside the ornament.
            */}
            {tab === "extras" ? (
              <div className="flex min-w-0 flex-col gap-3">
                <CoverAnimationPicker
                  coverAnimation={coverAnimation}
                  onChange={setCoverAnimation}
                  accordion={accordionFor("extras")}
                />
                <MusicPanel
                  musicUrl={musicUrl}
                  onMusicUrlChange={setMusicUrl}
                  accordion={accordionFor("extras")}
                />
                <WeatherPicker
                  showWeather={showWeather}
                  weatherTheme={weatherTheme}
                  onShowWeatherChange={setShowWeather}
                  onWeatherThemeChange={setWeatherTheme}
                  accordion={accordionFor("extras")}
                />
                <CheckinPanel
                  enabled={qrCheckinEnabled}
                  onEnabledChange={setQrCheckinEnabled}
                  repliesOpen={rsvpEnabled}
                  accordion={accordionFor("extras")}
                />
                <PdfPanel
                  enabled={pdfDownload}
                  onEnabledChange={setPdfDownload}
                  accordion={accordionFor("extras")}
                />
              </div>
            ) : null}

          </EditorTabs>
        </div>

        {/*
          The preview belongs to no tab and never moves into one. Staying
          mounted across all four is also what keeps it from resetting:
          switching tabs re-renders this column, it does not remount it, so the
          frame's own scroll position and the overlay's state survive a tab
          switch untouched.
        */}
        <div className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-24">
          <CardPreview
            draft={preview.draft}
            config={preview.config}
            onPreviewLanguageChange={setPreviewLanguage}
            motifs={motifs}
            coverAnimation={coverAnimation}
            weather={previewWeather}
            weatherTheme={weatherTheme}
            isPaid={isPaid}
          />
        </div>
      </main>

      {/*
        The phone's way to the card: one bar, pinned to the bottom of the
        screen, reachable from anywhere in the form. Renders nothing at lg,
        where the card is already sitting in a sticky column beside it.
      */}
      <PreviewBar
        draft={preview.draft}
        config={preview.config}
        onPreviewLanguageChange={setPreviewLanguage}
        motifs={motifs}
        coverAnimation={coverAnimation}
        weather={previewWeather}
        weatherTheme={weatherTheme}
        isPaid={isPaid}
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
