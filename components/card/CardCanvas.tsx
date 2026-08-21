"use client";

import { Fragment, type CSSProperties, type ReactElement } from "react";
import DecorLayer, { CardFlourish } from "@/components/card/decor/DecorLayer";
import HangingLayer from "@/components/card/decor/HangingLayer";
import CoverSection from "@/components/card/sections/CoverSection";
import DetailsSection from "@/components/card/sections/DetailsSection";
import VenueSection from "@/components/card/sections/VenueSection";
import MessageSection from "@/components/card/sections/MessageSection";
import CustomSection from "@/components/card/sections/CustomSection";
import { getDua, getGreeting } from "@/lib/arabicContent";
import { hasCustomContent, hasMessage } from "@/lib/cardSections";
import { maxOverlayAlpha } from "@/lib/contrast";
import { fontFamilyOf, getFontPair } from "@/lib/fontPairs";
import type { Motif } from "@/lib/motifs";
import { ArabesqueBorder, MosqueArch } from "@/lib/ornaments/muslim";
import { getPalette } from "@/lib/palettes";
import type { Theme } from "@/lib/themes";
import type { CardConfig, CardSizing } from "@/types/card";
import type { CardDensity } from "@/types/style";
import type { CardBlock } from "@/types/customSection";
import type { EventDraft } from "@/types/event";
import type { OrnamentId } from "@/types/ornament";

/**
 * The most opaque any decor shape is ever authored to be, and so the highest
 * alpha worth testing for contrast. Mirrors OPACITY_AT_SMALLEST in DecorLayer.
 */
const DECOR_CEILING = 0.38;

/**
 * What Arabic script is set in, for now.
 *
 * NO ARABIC WEBFONT IS LOADED IN THIS STEP — this is the guest's own device and
 * nothing more, which means the same greeting is a naskh on one phone and a
 * default UI face on another. A proper Arabic webfont should be added later and
 * this stack kept underneath it as the fallback. components/create/
 * OrnamentPanel.tsx repeats the same list on purpose, so the editor and the
 * card can never show the host two different faces.
 */
const ARABIC_FONT_STACK =
  '"Noto Naskh Arabic", "Noto Sans Arabic", "Geeza Pro", "Arabic Typesetting", "Traditional Arabic", "Segoe UI", serif';

/**
 * One Arabic line with its transliteration and translation under it, or nothing
 * at all.
 *
 * The empty check is the whole safety mechanism behind lib/arabicContent.ts
 * shipping with every string blank: a greeting whose Arabic has not been
 * supplied yet renders as absence, not as a gap, a placeholder or a guess.
 * The two Latin lines are independent — a line that exists is shown even if its
 * neighbours do not.
 */
function Blessing({
  arabic,
  transliteration,
  translation,
  theme,
  sizeClass,
}: {
  arabic: string;
  transliteration: string;
  translation: string;
  theme: Theme;
  sizeClass: string;
}): ReactElement | null {
  if (arabic.length === 0) {
    return null;
  }

  return (
    <div className="flex w-full flex-col items-center gap-1.5">
      {/*
        `dir` and `lang` on the element that actually holds the script, never on
        a wrapper: the bidi algorithm and the font matcher both key off the
        element carrying the text. `wrap-anywhere` is what keeps a long unbroken
        run inside a 360px card, which is the width this was checked at.
      */}
      <p
        dir="rtl"
        lang="ar"
        className={`w-full text-center wrap-anywhere ${sizeClass}`}
        style={{ fontFamily: ARABIC_FONT_STACK, color: theme.accent }}
      >
        {arabic}
      </p>

      {/*
        Latin script, so both of these are explicitly left to right — they sit
        inside a block that has just been told it is RTL, and an unmarked Latin
        line there has its punctuation pushed to the wrong end. They inherit the
        card's body font from the canvas root rather than setting one.
      */}
      {transliteration.length > 0 ? (
        <p
          dir="ltr"
          className="w-full text-center text-[0.75rem] leading-relaxed wrap-anywhere italic"
          style={{ color: theme.textMuted }}
        >
          {transliteration}
        </p>
      ) : null}

      {translation.length > 0 ? (
        <p
          dir="ltr"
          className="w-full text-center text-[0.75rem] leading-relaxed wrap-anywhere"
          style={{ color: theme.textMuted }}
        >
          {translation}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Section min-height per sizing mode.
 *
 * "viewport" is right for the guest, whose screen is the frame. In the editor
 * the frame is a fixed 620px box, so a viewport-relative height would make
 * every section taller than the frame on a desktop monitor and misrepresent the
 * proportions — 80% of the frame height is the honest equivalent there.
 */
const PREVIEW_FRAME_HEIGHT = 620;

/**
 * Density scales section height and the gaps between lines together.
 *
 * "comfortable" is 0.8 of the base, which is exactly the previous fixed
 * behaviour, so an existing card is unchanged. The same scale is applied in
 * both sizing modes, so the editor preview stays proportionally honest.
 */
const DENSITY_HEIGHT_SCALE: Record<CardDensity, number> = {
  compact: 0.6,
  comfortable: 0.8,
  airy: 1,
};

/** 1 leaves every section's existing gap untouched. */
const DENSITY_GAP_SCALE: Record<CardDensity, number> = {
  compact: 0.6,
  comfortable: 1,
  airy: 1.4,
};

function sectionMinHeight(sizing: CardSizing, density: CardDensity): string {
  const scale = DENSITY_HEIGHT_SCALE[density];

  return sizing === "viewport"
    ? `${Math.round(scale * 100)}svh`
    : `${Math.round(PREVIEW_FRAME_HEIGHT * scale)}px`;
}

/**
 * Whether a block will actually put something on the page.
 *
 * Computed up front rather than discovered during render, because the dividers
 * depend on it: a divider belongs between two *rendered* sections, never
 * beside one that returned null.
 */
function blockRenders(block: CardBlock, draft: EventDraft): boolean {
  if (block.kind === "custom") {
    return hasCustomContent(block.section);
  }

  if (!block.enabled) {
    return false;
  }

  return block.id !== "message" || hasMessage(draft);
}

function blockKey(block: CardBlock): string {
  return block.kind === "custom" ? block.section.id : block.id;
}

function renderBlock(
  block: CardBlock,
  draft: EventDraft,
  theme: Theme,
  minHeight: string,
): ReactElement | null {
  if (block.kind === "custom") {
    return (
      <CustomSection
        section={block.section}
        theme={theme}
        minHeight={minHeight}
      />
    );
  }

  switch (block.id) {
    case "cover":
      return <CoverSection draft={draft} theme={theme} minHeight={minHeight} />;
    case "details":
      return (
        <DetailsSection draft={draft} theme={theme} minHeight={minHeight} />
      );
    case "venue":
      return <VenueSection draft={draft} theme={theme} minHeight={minHeight} />;
    case "message":
      return (
        <MessageSection draft={draft} theme={theme} minHeight={minHeight} />
      );
  }
}

/**
 * The invitation itself: a narrow vertical page the guest scrolls through,
 * rather than one fixed rectangle.
 *
 * The canvas owns the background so the whole run of sections reads as a single
 * continuous card — sections are transparent and only contribute content.
 */
export default function CardCanvas({
  draft,
  theme,
  config,
  motifs,
  sizing,
}: {
  draft: EventDraft;
  theme: Theme;
  config: CardConfig;
  motifs: readonly Motif[];
  sizing: CardSizing;
}): ReactElement {
  const { style } = config;
  const minHeight = sectionMinHeight(sizing, style.density);
  const visible = config.blocks.filter((block) => blockRenders(block, draft));

  /*
    Colour resolution order: the host's accent override, then the selected
    palette, then the theme as the last resort. Sections read colours from the
    theme object they are handed, so composing one effective theme here is what
    makes an override reach every divider, motif, scroll cue and accent line at
    once.
  */
  const palette = getPalette(style.paletteId);
  const fontPair = getFontPair(style.fontPairId);

  const effectiveTheme: Theme = {
    ...theme,
    background: palette.background ?? theme.background,
    surface: palette.surface ?? theme.surface,
    accent: style.accentOverride ?? palette.accent ?? theme.accent,
    textPrimary: palette.textPrimary ?? theme.textPrimary,
    textMuted: palette.textMuted ?? theme.textMuted,
    fontFamily: fontFamilyOf(fontPair.bodyVar, fontPair.bodyFallback),
  };

  /*
    How strong the decor is allowed to get on this particular card.

    Measured rather than fixed, because the answer genuinely varies: the same
    scatter that leaves midnight's muted text at 5.6:1 would take cream's below
    3:1, and a host who picks their own accent moves the number again — which a
    hardcoded ceiling could never follow. textMuted is what is measured because
    it is the closest of the card's colours to its background, so whatever it
    can carry, textPrimary can carry comfortably.

    Cheap enough to sit in render: one scan of at most 76 steps of integer
    arithmetic, with no allocation per step and no dependence on the clock.
  */
  const decorMaxAlpha = maxOverlayAlpha(
    effectiveTheme.accent,
    effectiveTheme.background,
    effectiveTheme.textMuted,
    DECOR_CEILING,
  );

  /*
    The single gate on the whole ornament pack.

    Everything below reads `ornaments` rather than `config.ornamentConfig`, so
    on any other tradition the list is empty, every `includes` is false, the
    greeting and dua lookups are handed null, and HangingLayer is never mounted.
    One boolean, checked once — not seven separate places that could disagree.
  */
  const isMuslim = config.traditionId === "muslim";
  const ornaments: readonly OrnamentId[] = isMuslim
    ? config.ornamentConfig.enabledOrnaments
    : [];

  const greeting = isMuslim ? getGreeting(config.ornamentConfig.greetingId) : null;
  const dua = isMuslim ? getDua(config.ornamentConfig.duaId) : null;

  /* Both resolve to nothing while lib/arabicContent.ts ships empty strings. */
  const hasBlessing =
    (greeting?.arabic.length ?? 0) > 0 || (dua?.arabic.length ?? 0) > 0;

  const useArabesqueDivider = ornaments.includes("arabesqueBorder");
  const useArch = ornaments.includes("mosqueArch");

  /* Consumed by the sections through inheritance, so a change is instant. */
  const cssVariables = {
    "--card-heading": fontFamilyOf(
      fontPair.headingVar,
      fontPair.headingFallback,
    ),
    "--card-heading-weight": String(fontPair.headingWeight),
    "--card-gap-scale": String(DENSITY_GAP_SCALE[style.density]),
  } as CSSProperties;

  return (
    <div
      className="relative mx-auto w-full max-w-[420px] overflow-hidden"
      style={{
        ...cssVariables,
        backgroundColor: effectiveTheme.background,
        color: effectiveTheme.textPrimary,
        fontFamily: effectiveTheme.fontFamily,
      }}
    >
      <DecorLayer
        accent={effectiveTheme.accent}
        motion={config.decorMotion}
        motifs={motifs}
        intensity={config.decorIntensity}
        maxAlpha={decorMaxAlpha}
      />

      {/*
        Mounted only on a Muslim card. Not merely handed an empty list — the
        component is absent from the tree entirely on every other tradition,
        which is the difference between "renders nothing" and "cannot render".

        Sits between the decor layer and the content column: `z-[5]` against the
        column's `z-10`, so an ornament hangs in front of the scattered motifs
        and behind every line of text. It is `pointer-events-none` throughout,
        so it can never take a tap or a scroll meant for the card underneath.
      */}
      {isMuslim ? (
        <HangingLayer
          enabledOrnaments={ornaments}
          accent={effectiveTheme.accent}
        />
      ) : null}

      {/* Content rides above the decor layer. */}
      <div className="relative z-10">
        {/*
          Dividers are driven off `visible`, never off `config.blocks`: an
          index > 0 test on the filtered list is what guarantees no divider can
          appear before the first rendered section, after the last, or beside a
          section that returned null. A section that hides itself is absent from
          this list, so its divider is absent with it.
        */}
        {visible.map((block, index) => {
          const section = renderBlock(block, draft, effectiveTheme, minHeight);

          /*
            The greeting and dua head the cover, so they are anchored to the
            cover block rather than to the top of the card. The host can reorder
            sections, and a blessing left pinned to position zero would end up
            introducing the venue.
          */
          const isCover = block.kind === "builtin" && block.id === "cover";

          const head =
            isCover && hasBlessing ? (
              /* No bottom padding — this heads the cover rather than sitting above it. */
              <div className="flex flex-col items-center gap-4 px-7 pt-12 text-center">
                {greeting !== null ? (
                  <Blessing
                    arabic={greeting.arabic}
                    transliteration={greeting.transliteration}
                    translation={greeting.translation}
                    theme={effectiveTheme}
                    /*
                      The greeting is the smaller of the two. It is a form of
                      address; the dua is the blessing being offered, and the
                      card should read in that order of weight.
                    */
                    sizeClass="text-[1.25rem] leading-[2] sm:text-[1.375rem]"
                  />
                ) : null}

                {dua !== null ? (
                  <Blessing
                    arabic={dua.arabic}
                    transliteration={dua.transliteration}
                    translation={dua.translation}
                    theme={effectiveTheme}
                    sizeClass="text-[1.375rem] leading-[2.1] sm:text-[1.5rem]"
                  />
                ) : null}
              </div>
            ) : null;

          const covered = (
            <>
              {head}
              {section}
            </>
          );

          return (
            <Fragment key={blockKey(block)}>
              {index > 0 ? (
                <div className="flex justify-center py-2">
                  {/*
                    The vine takes the divider's place rather than joining it —
                    two ornaments stacked on one hairline reads as a mistake.
                    Sized wider than the flourish because it is a repeating band
                    and needs the width to show more than one repeat.
                  */}
                  {useArabesqueDivider ? (
                    <ArabesqueBorder
                      instanceId={`divider-${index}`}
                      size={168}
                      style={{ color: effectiveTheme.accent, opacity: 0.55 }}
                    />
                  ) : (
                    <CardFlourish
                      accent={effectiveTheme.accent}
                      className="opacity-50"
                    />
                  )}
                </div>
              ) : null}

              {/*
                The arch frames the cover rather than replacing anything: an
                outline behind the content, inset from the card's edges, with
                the content column drawn on top of it. Stretched with
                preserveAspectRatio="none" because a frame has to match the box
                it frames, and held well under half opacity so a name set over
                a jamb still carries.
              */}
              {isCover && useArch ? (
                <div className="relative">
                  <MosqueArch
                    instanceId="cover-frame"
                    className="pointer-events-none absolute inset-x-4 top-5 bottom-0"
                    preserveAspectRatio="none"
                    /*
                      Drawn at roughly 3.4x here, which would turn the authored
                      2 unit line into a 7px band. 0.5 lands back at the ~1.7px
                      the rest of the card's line work is set in.
                    */
                    strokeWidth={0.5}
                    style={{ color: effectiveTheme.accent, opacity: 0.38 }}
                  />
                  <div className="relative">{covered}</div>
                </div>
              ) : (
                covered
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
