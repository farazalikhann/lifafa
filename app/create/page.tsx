"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import CardPreview from "@/components/create/CardPreview";
import SaveEventButton, {
  clearPendingCard,
  readPendingCard,
} from "@/components/create/SaveEventButton";
import CoverAnimationPicker from "@/components/create/CoverAnimationPicker";
import EditorTabs, { type EditorTabId } from "@/components/create/EditorTabs";
import EventForm from "@/components/create/EventForm";
import ExistingInvitationsNotice from "@/components/create/ExistingInvitationsNotice";
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
import { DEFAULT_SECTION_ORDER } from "@/lib/cardSections";
import { DEFAULT_FONT_PAIR_ID } from "@/lib/fontPairs";
import { coverNameLine, resolveCoverNames } from "@/lib/cardFormat";
import { DEFAULT_COVER_ANIMATION } from "@/lib/coverAnimations";
import { DEFAULT_WEATHER_THEME } from "@/lib/weatherThemes";
import { getMotifs } from "@/lib/motifs";
import { DEFAULT_ORNAMENT_CONFIG } from "@/lib/ornaments/muslim";
import { getPalette } from "@/lib/palettes";
import {
  DEFAULT_OCCASION_ID,
  DEFAULT_TRADITION_ID,
  getOccasion,
} from "@/lib/occasions";
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

export default function CreatePage() {
  const [draft, setDraft] = useState<EventDraft>(EMPTY_DRAFT);
  /*
    Which pile of controls is on screen. React state and nothing else: no
    localStorage, which is unavailable here, and nothing in the URL either — a
    tab is where the host happens to be looking, not a place to come back to.
    Details, because the facts are what an empty card needs first.
  */
  const [tab, setTab] = useState<EditorTabId>("details");
  const [occasionId, setOccasionId] = useState<OccasionId>(DEFAULT_OCCASION_ID);
  const [traditionId, setTraditionId] =
    useState<TraditionId>(DEFAULT_TRADITION_ID);
  const [decorMotion, setDecorMotion] = useState<DecorMotion>(
    DEFAULT_OCCASION.defaultMotion,
  );
  const [decorIntensity, setDecorIntensity] = useState<DecorIntensity>("normal");
  /* Off by default: a border is an addition to the card, not a part of it. */
  const [borderStyle, setBorderStyle] = useState<CardBorderStyle>("none");
  /* Off by default: a card that hides its own date has to be asked for. */
  const [scratchTarget, setScratchTarget] = useState<ScratchTarget>("none");
  /* A link the host pastes. Null is "no music", and nothing ever autoplays. */
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  /*
    Not part of CardConfig: the cover wraps the card rather than being on it,
    and it is stored in its own column. See supabase/migrations/0003.
  */
  const [coverAnimation, setCoverAnimation] = useState<CoverAnimationId>(
    DEFAULT_COVER_ANIMATION,
  );
  /*
    Off, and off is the default a host has to change rather than one they have
    to find. Also its own column rather than part of CardConfig; see 0004.
  */
  const [showWeather, setShowWeather] = useState(false);
  const [weatherTheme, setWeatherTheme] = useState<WeatherThemeId>(
    DEFAULT_WEATHER_THEME,
  );
  /*
    The current tradition's ornament pack choices. Kept here rather than inside
    the panel, because the panel unmounts the moment the host leaves a tradition
    that has a pack, and state that unmounts with its editor would quietly
    survive on the card.
  */
  const [ornamentConfig, setOrnamentConfig] = useState<OrnamentConfig>(
    DEFAULT_ORNAMENT_CONFIG,
  );
  const [style, setStyle] = useState<CardStyle>({
    fontPairId: DEFAULT_FONT_PAIR_ID,
    paletteId: DEFAULT_OCCASION.defaultPaletteId,
    density: "comfortable",
    accentOverride: null,
  });

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

  /* Every built in section starts enabled, in the registry order. */
  const [blocks, setBlocks] = useState<readonly CardBlock[]>(() =>
    DEFAULT_SECTION_ORDER.map((id) => ({
      kind: "builtin" as const,
      id,
      enabled: true,
    })),
  );

  /**
   * The next unused `custom-n`.
   *
   * The skip loop is not belt and braces. A card restored from the sign-in
   * stash arrives carrying custom-1 and custom-2 while this counter is still at
   * 1 — exactly what a restored draft does to SubEventEditor's counter — so it
   * is stepped past anything the list already holds rather than trusted blind.
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
   * choosing an occasion keeps their choice.
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

  /*
    A card stashed before a sign-in detour comes back here.

    Runs once, after mount rather than during render: sessionStorage does not
    exist on the server, and seeding useState from it would make the first
    client render disagree with the HTML and tear hydration. The entry is
    cleared as it is read — restoring it twice would overwrite whatever the
    host had started typing in the meantime.
  */
  useEffect(() => {
    const pending = readPendingCard();

    if (pending === null) {
      return;
    }

    clearPendingCard();

    setDraft(pending.draft);
    setOccasionId(pending.config.occasionId);
    setTraditionId(pending.config.traditionId);
    setDecorMotion(pending.config.decorMotion);
    setDecorIntensity(pending.config.decorIntensity);
    setBorderStyle(pending.config.borderStyle);
    setScratchTarget(pending.config.scratchTarget);
    /* Absent on a card stashed before this field existed. */
    setMusicUrl(pending.config.musicUrl ?? null);
    setOrnamentConfig(pending.config.ornamentConfig);
    setStyle(pending.config.style);
    setBlocks(pending.config.blocks);

    /* Absent on an entry stashed before covers existed; the default stands. */
    if (pending.coverAnimation !== undefined) {
      setCoverAnimation(pending.coverAnimation);
    }

    setShowWeather(pending.showWeather === true);

    if (pending.weatherTheme !== undefined) {
      setWeatherTheme(pending.weatherTheme);
    }
  }, []);

  const config: CardConfig = {
    themeId: draft.themeId,
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
    /* Nothing in the editor has been paid for — that is what /create is. */
    isPaid: false,
  };

  const motifs = getMotifs(occasionId, traditionId);

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
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 lg:px-8">
          <Link
            href="/"
            className="rounded font-[family-name:var(--font-display)] text-xl font-semibold tracking-[-0.02em] text-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
          >
            Lifafa
          </Link>

          {/*
            The editor stays open to everyone; this is the first point that
            needs an account, and it asks for one only when it is clicked.
          */}
          <SaveEventButton
            draft={draft}
            config={config}
            coverAnimation={coverAnimation}
            showWeather={showWeather}
            weatherTheme={weatherTheme}
          />
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
        <h1 className="sr-only">Create your invitation</h1>

        {/*
          Above everything, and spanning both columns at lg.

          It is a fact about the page rather than about any one control, so it
          sits over the whole editor rather than inside the Details tab — a host
          who happens to open on Design would otherwise never be told. It
          renders null for a signed-out visitor and for a host with nothing
          saved yet, which is most of the traffic /create sees, so no grid item
          is created at all in the ordinary case.
        */}
        <ExistingInvitationsNotice />

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

          Every value below is page state, which is what makes unmounting three
          panels safe: a control that leaves the screen leaves nothing behind
          it. See the notes on `openSubEventId` and `nextCustomId` for the two
          pieces that had to be lifted out of their editors to make that true.
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
    </div>
  );
}
