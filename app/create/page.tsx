"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import CardPreview from "@/components/create/CardPreview";
import EventForm from "@/components/create/EventForm";
import OccasionPicker from "@/components/create/OccasionPicker";
import MotionPicker from "@/components/create/MotionPicker";
import SectionManager from "@/components/create/SectionManager";
import StylePanel from "@/components/create/StylePanel";
import { DEFAULT_SECTION_ORDER } from "@/lib/cardSections";
import { DEFAULT_FONT_PAIR_ID } from "@/lib/fontPairs";
import { coverNameLine, resolveCoverNames } from "@/lib/cardFormat";
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
};

export default function CreatePage() {
  const [draft, setDraft] = useState<EventDraft>(EMPTY_DRAFT);
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
  /*
    The Muslim ornament pack's choices. Kept here rather than inside the panel,
    because the panel unmounts the moment the host leaves that tradition and
    state that unmounts with its editor would quietly survive on the card.
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

  /* Every built in section starts enabled, in the registry order. */
  const [blocks, setBlocks] = useState<readonly CardBlock[]>(() =>
    DEFAULT_SECTION_ORDER.map((id) => ({
      kind: "builtin" as const,
      id,
      enabled: true,
    })),
  );

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
   * Leaving "muslim" resets the config outright rather than merely hiding the
   * panel: a host who tries the lanterns, changes their mind about the
   * tradition, and never opens that panel again would otherwise ship a Sikh or
   * a Christian card with a lantern hanging off it and no control anywhere on
   * the page that could switch it off. Arriving at "muslim" resets it too, so
   * the pack always opens from a known state.
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
    /* Nothing in the editor has been paid for — that is what /create is. */
    isPaid: false,
  };

  const motifs = getMotifs(occasionId, traditionId);

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

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-[var(--lifafa-muted)] sm:inline">
              Coming soon
            </span>
            <button
              type="button"
              disabled
              title="Coming soon"
              aria-describedby="payment-note"
              className="cursor-not-allowed rounded-full border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-4 py-2 text-[0.8125rem] font-medium text-[var(--lifafa-muted)] opacity-70"
            >
              Continue to payment
            </button>
            <span id="payment-note" className="sr-only">
              Coming soon
            </span>
          </div>
        </div>
      </header>

      {/*
        Below lg the preview comes first, so the card is the first thing a host
        sees. At lg the form takes the left ~45% and the preview sticks on the
        right ~55% while the form scrolls.
      */}
      <main className="mx-auto grid max-w-6xl gap-10 px-5 py-8 lg:grid-cols-[45fr_55fr] lg:items-start lg:gap-14 lg:px-8 lg:py-12">
        {/*
          The editor's visible headings all describe one part of the card —
          Occasion, Card sections, Style — and none of them names the page, so
          without this the document outline starts at h2 and a screen reader
          user arriving by heading has nothing that says where they are.
          Off screen rather than drawn: the design's entry point is the card
          itself, and a visible title would compete with it.
        */}
        <h1 className="sr-only">Create your invitation</h1>

        <div className="order-2 flex flex-col gap-9 lg:order-1">
          <OccasionPicker
            occasionId={occasionId}
            traditionId={traditionId}
            ornamentConfig={ornamentConfig}
            onOccasionChange={handleOccasionSelect}
            onTraditionChange={handleTraditionSelect}
            onOrnamentConfigChange={setOrnamentConfig}
          />
          <EventForm draft={draft} onChange={handleChange} />
          <SectionManager blocks={blocks} onBlocksChange={setBlocks} />
        </div>

        <div className="order-1 flex flex-col gap-6 lg:order-2 lg:sticky lg:top-24">
          <CardPreview draft={draft} config={config} motifs={motifs} />
          <MotionPicker
            motion={decorMotion}
            intensity={decorIntensity}
            onMotionChange={setDecorMotion}
            onIntensityChange={setDecorIntensity}
          />
          <StylePanel
            style={style}
            /* Resolved, so the specimen shows the same line the cover will. */
            hostNames={coverNameLine(resolveCoverNames(draft))}
            paletteAccent={getPalette(style.paletteId).accent}
            scratchTarget={scratchTarget}
            borderStyle={borderStyle}
            onFontPairChange={setFontPair}
            onPaletteChange={setPalette}
            onDensityChange={setDensity}
            onAccentChange={setAccent}
            onScratchTargetChange={setScratchTarget}
            onBorderStyleChange={setBorderStyle}
          />
        </div>
      </main>
    </div>
  );
}
