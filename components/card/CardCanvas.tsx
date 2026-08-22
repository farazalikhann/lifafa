"use client";

import { Fragment, type CSSProperties, type ReactElement } from "react";
import BorderFrame, {
  borderClearance,
} from "@/components/card/decor/BorderFrame";
import CornerLayer from "@/components/card/decor/CornerLayer";
import ScrollFade from "@/components/card/decor/ScrollFade";
import DecorLayer, { CardFlourish } from "@/components/card/decor/DecorLayer";
import HangingLayer, { hangingDepth } from "@/components/card/decor/HangingLayer";
import CoverSection from "@/components/card/sections/CoverSection";
import DetailsSection from "@/components/card/sections/DetailsSection";
import VenueSection from "@/components/card/sections/VenueSection";
import MessageSection from "@/components/card/sections/MessageSection";
import CustomSection from "@/components/card/sections/CustomSection";
import ScratchPanel from "@/components/card/ScratchPanel";
import { getDua, getGreeting } from "@/lib/arabicContent";
import { hasCustomContent, hasMessage } from "@/lib/cardSections";
import { maxOverlayAlpha } from "@/lib/contrast";
import { fontFamilyOf, getFontPair } from "@/lib/fontPairs";
import type { Motif } from "@/lib/motifs";
import { ArabesqueBorder, MosqueArch } from "@/lib/ornaments/muslim";
import { getPalette } from "@/lib/palettes";
import type { Theme } from "@/lib/themes";
import type {
  CardAudience,
  CardConfig,
  CardSectionId,
  CardSizing,
  ScratchTarget,
} from "@/types/card";
import type { CardDensity } from "@/types/style";
import type { CardBlock } from "@/types/customSection";
import type { EventDraft } from "@/types/event";
import type { OccasionId } from "@/types/occasion";
import type { AnyOrnamentId } from "@/types/ornament";

/**
 * The most opaque any decor shape is ever authored to be, and so the highest
 * alpha worth testing for contrast. Mirrors OPACITY_AT_SMALLEST in DecorLayer.
 */
const DECOR_CEILING = 0.22;

/**
 * What Arabic script is set in.
 *
 * Noto Naskh Arabic, loaded by next/font in app/layout.tsx and resolved through
 * one variable declared in globals.css, with the system faces behind it. Set on
 * the Arabic elements only — never on a wrapper — so no Latin text on the card
 * can inherit it.
 */
const ARABIC_FONT_STACK = "var(--lifafa-arabic)";

/**
 * The mosque arch's inset from the cover's edges when no border is drawn, in px.
 *
 * Exactly what `inset-x-4 top-5` used to say in Tailwind. Moved into numbers
 * because the border frame can push it further in, and a value that is
 * sometimes a class and sometimes a style is a value with two sources of truth.
 */
const ARCH_INSET_X = 16;
const ARCH_INSET_TOP = 20;

/**
 * The top padding every section already carries, in px — its `py-10`.
 *
 * Subtracted from a border's top clearance so the card only pays for the part
 * the sections were not going to clear on their own.
 */
const SECTION_TOP_PAD = 40;

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
          className="w-full text-center text-[0.9rem] leading-relaxed wrap-anywhere italic"
          style={{ color: theme.textMuted }}
        >
          {transliteration}
        </p>
      ) : null}

      {translation.length > 0 ? (
        <p
          dir="ltr"
          className="w-full text-center text-[0.9rem] leading-relaxed wrap-anywhere"
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
 * Every tier is now well under a screen, which is the point. A section is a
 * centred group of three or four lines — measured on a 360x800 phone, the date
 * is 123px of content and the note 76px — and asking for 0.8 of the viewport
 * The card is read one swipe at a time, and a swipe should deliver one thing:
 * the names, or the date, or the venue. That only holds if a section is at
 * least as tall as the screen it lands on. Cutting "comfortable" to 0.45 to
 * close up the empty space put two sections on one screen and let their content
 * collide, which is a worse failure than the slack it was fixing — so the
 * default is back to a full viewport, and the emptiness is dealt with where it
 * actually belongs, in the padding each section keeps around its own content.
 *
 * "compact" sits just under a screen for a host who wants a shorter card and
 * accepts the next section peeking in; "airy" gives a section room past the
 * screen it is read on. The same scale applies in both sizing modes, so the
 * editor preview stays proportionally honest.
 */
const DENSITY_HEIGHT_SCALE: Record<CardDensity, number> = {
  compact: 0.9,
  comfortable: 1,
  airy: 1.2,
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
 * How tall the pinned decor bands are — the height of whatever is scrolling the
 * card, which is the same question `sectionMinHeight` answers for sections.
 *
 * The guest's screen in "viewport"; the editor's fixed frame in "frame", where
 * a viewport-tall band would scatter most of the motifs outside the 620px box
 * the host is looking at.
 *
 * `dvh`, not `svh`, and that is the fix for a frame whose bottom edge kept
 * appearing mid-screen. `svh` is the *smallest* the viewport ever gets — the
 * state with the address bar fully shown — so the moment Chrome on Android
 * collapses that bar the visible area is taller than the band and everything
 * pinned inside it stops reaching the bottom of the screen. `dvh` tracks the
 * viewport as it actually is, so the frame frames the whole screen and the
 * decor covers it, in both states.
 *
 * Sections deliberately keep `svh` — see `sectionMinHeight`. A section that
 * resized every time the address bar moved would reflow the text under the
 * guest's thumb; a decor band that resizes is drawing a rectangle nobody is
 * reading.
 */
function scrollportHeight(sizing: CardSizing): string {
  return sizing === "viewport" ? "100dvh" : `${PREVIEW_FRAME_HEIGHT}px`;
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

/**
 * Which built-in section a scratch target names, if any.
 *
 * The target is phrased in the host's words — what is being hidden — and the
 * card is built out of sections, so the two need a single point of translation
 * rather than an id comparison at each place that cares.
 */
function scratchSection(target: ScratchTarget): CardSectionId | null {
  switch (target) {
    case "date":
      return "details";
    case "venue":
      return "venue";
    case "none":
      return null;
  }
}

const SCRATCH_LABEL: Record<"date" | "venue", string> = {
  date: "Scratch to see the date",
  venue: "Scratch to see the venue",
};

function renderBlock(
  block: CardBlock,
  draft: EventDraft,
  theme: Theme,
  minHeight: string,
  pad: number,
  occasionId: OccasionId,
): ReactElement | null {
  if (block.kind === "custom") {
    return (
      <CustomSection
        section={block.section}
        theme={theme}
        minHeight={minHeight}
        pad={pad}
      />
    );
  }

  switch (block.id) {
    case "cover":
      return (
        <CoverSection
          draft={draft}
          theme={theme}
          minHeight={minHeight}
          pad={pad}
          occasionId={occasionId}
        />
      );
    case "details":
      return (
        <DetailsSection
          draft={draft}
          theme={theme}
          minHeight={minHeight}
          pad={pad}
        />
      );
    case "venue":
      return (
        <VenueSection
          draft={draft}
          theme={theme}
          minHeight={minHeight}
          pad={pad}
        />
      );
    case "message":
      return (
        <MessageSection
          draft={draft}
          theme={theme}
          minHeight={minHeight}
          pad={pad}
        />
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
  audience,
}: {
  draft: EventDraft;
  theme: Theme;
  config: CardConfig;
  motifs: readonly Motif[];
  sizing: CardSizing;
  /** Decides whether guest interactions — the scratch panel — are live. */
  audience: CardAudience;
}): ReactElement {
  const { style } = config;
  const minHeight = sectionMinHeight(sizing, style.density);
  const bandHeight = scrollportHeight(sizing);
  const visible = config.blocks.filter((block) => blockRenders(block, draft));

  const isHostPreview = audience === "host-preview";
  const hiddenSection = scratchSection(config.scratchTarget);
  const scratchLabel =
    config.scratchTarget === "none" ? null : SCRATCH_LABEL[config.scratchTarget];

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
  const ornaments: readonly AnyOrnamentId[] = isMuslim
    ? config.ornamentConfig.enabledOrnaments
    : [];

  const greeting = isMuslim ? getGreeting(config.ornamentConfig.greetingId) : null;
  const dua = isMuslim ? getDua(config.ornamentConfig.blessingId) : null;

  /* Both resolve to nothing while lib/arabicContent.ts ships empty strings. */
  const hasBlessing =
    (greeting?.arabic.length ?? 0) > 0 || (dua?.arabic.length ?? 0) > 0;

  const useArabesqueDivider = ornaments.includes("arabesqueBorder");
  const useArch = ornaments.includes("mosqueArch");

  /*
    Where the arch has to sit so it does not cross the border.

    These are the only two things on the card drawn to its own edges, and at
    360px they land on each other: the arch's jambs stand at 16px, inside every
    border band, and its apex at 20px is straight through the garland. The arch
    is the one that moves — a frame that dodged the contents of the card would
    stop being a frame — so it is pushed in until it sits inside the border,
    which is also the right reading of the two: the border is the card's edge
    and the arch is a thing printed on the card.

    Zero on a card with no border, so the arch keeps exactly the inset it had.
  */
  const clearance = borderClearance(config.borderStyle);
  const archInsetX = Math.max(ARCH_INSET_X, clearance.x);
  const archInsetTop = Math.max(ARCH_INSET_TOP, clearance.y);

  /*
    Room at the head of the card for a border that hangs into it.

    Only the garland needs any: it is a 92px swag whose whole point is that it
    dips in the middle, which is exactly where the cover sets the names, and at
    360px the dip landed across the first line of them. The four framing styles
    keep to a band shallower than a section's own padding and ask for nothing.

    Applied once, to the head of the column, rather than to every section —
    the same shape as the blessing's clearance above. Further down the card it
    is not needed: a section centres its content, so by the time the guest is
    reading the date it sits around 150px from the top of the screen, well below
    anything the frame draws. Text passing under the swag mid-scroll is the same
    accepted behaviour as text passing under the lanterns, and at half opacity
    it reads as the ornament it is.
  */
  const contentTopInset = Math.max(0, clearance.y - SECTION_TOP_PAD);

  /*
    How far down the screen the ornaments reach.

    Asked of the layer that owns their positions rather than guessed here, so a
    lantern moved deeper carries the whole card's spacing with it. Feeds the
    section padding below, and the dissolve, and nothing has to be kept in sync
    by hand.
  */
  const hangingBand = hangingDepth(ornaments);

  /*
    What every section insets its content by, top and bottom alike.

    THE BUG THIS FIXES. The hanging layer is pinned to the top of the screen, so
    whichever section is filling the screen has the lanterns hanging directly
    over its own first line. Only the cover was clearing them, which is why the
    date rendered behind the string of lights and could not be read at all.
    `hangingDepth` exists for precisely this and is now asked by every section
    rather than by one of them.

    Applied to the bottom as well as the top, and that symmetry is the point: a
    section centres its content in whatever box the padding leaves, so equal
    padding is what keeps the group optically centred instead of pushing it low
    while clearing the band. Border-box sizing means neither inset adds to the
    section's height — it stays exactly the viewport it is supposed to fill.
  */
  const sectionPad = Math.max(SECTION_TOP_PAD, hangingBand);

  /*
    The blessing's inset is now the same wherever the cover sits in the running
    order. It used to be applied only to the first block, because the hanging
    layer was pinned to the top of the *card* and was long past by the second
    section. The layer is pinned to the top of the *screen* now — the lanterns
    are overhead on every section — so a cover the host has moved down the card
    meets exactly the same lanterns the first one would.
  */

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
    /*
      `overflow-x-clip`, deliberately, and not `overflow-hidden`.

      The horizontal clip is what it always was: motifs are authored to run off
      the sides and be cut by the card's edge, and a long unbroken name has to
      be cut rather than widen the page. What changed is the vertical axis.
      `hidden` makes an element a scroll container on *both* axes, and a sticky
      descendant sticks to the nearest scroll container — so with `hidden` here,
      every pinned band below was sticking to this box, which never scrolls, and
      the decor and the lanterns simply travelled up the screen with the
      content. `clip` clips without creating a scroll container, so those bands
      resolve against the real scrollport: the guest's screen, or the editor's
      phone frame. Nothing escapes sideways, and each layer clips itself.
    */
    <div
      className="relative mx-auto w-full max-w-[420px] overflow-x-clip"
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
        bandHeight={bandHeight}
        maxAlpha={decorMaxAlpha}
      />

      {/*
        Where "stars" and "geometricStar" are drawn, and the only place either
        one is: they do not hang, they do not divide and they do not frame, so
        before this layer existed a host could switch them on and nothing at all
        appeared. Gated on the tradition exactly as HangingLayer is, and given
        the same measured alpha ceiling as the scattered motifs, because it sits
        behind the same text.
      */}
      {isMuslim ? (
        <CornerLayer
          enabledOrnaments={ornaments}
          accent={effectiveTheme.accent}
          bandHeight={bandHeight}
          maxAlpha={decorMaxAlpha}
        />
      ) : null}

      {/*
        Mounted only on a Muslim card. Not merely handed an empty list — the
        component is absent from the tree entirely on every other tradition,
        which is the difference between "renders nothing" and "cannot render".

        Sits above the fade at `z-[15]`, which is a change of order and a
        deliberate one: the ornaments used to hang behind the text, and text
        crossing them was the collision this release is fixing. Now the text
        dissolves before it arrives and the lanterns are the thing left drawn,
        so they have to be the ones on top. `pointer-events-none` throughout,
        so it can never take a tap or a scroll meant for the card underneath.
      */}
      {isMuslim ? (
        <HangingLayer
          enabledOrnaments={ornaments}
          accent={effectiveTheme.accent}
        />
      ) : null}

      {/*
        The border, over every other layer of decor and still under the text.

        Last of the decor in the tree and `z-[16]` against the hanging layer's
        `z-[15]`, because a frame is the outermost thing on a piece of
        stationery: a lantern that swung across the border would read as being
        outside the card. Above the fade as well, so the frame keeps full
        opacity at the very edges where the dissolve is strongest. Independent
        of the tradition — no `isMuslim` gate here, unlike the two layers above
        it — and it returns null on its own when the style is "none".
      */}
      <BorderFrame
        borderStyle={config.borderStyle}
        accent={effectiveTheme.accent}
        bandHeight={bandHeight}
      />

      {/*
        The dissolve at the top and bottom of the screen.

        Ordered deliberately: this is `z-[12]`, the content column below it at
        `z-10`, and the hanging ornaments and the border above it at `z-[15]`
        and `z-[16]`. A layer fades what is painted beneath it and nothing
        above, so that ordering is the whole specification — text dissolves, the
        lanterns it is dissolving to avoid stay at full opacity, and so does the
        frame.
      */}
      <ScrollFade
        background={effectiveTheme.background}
        hangingBand={hangingBand}
        bandHeight={bandHeight}
      />

      {/* Content rides above the decor layer. */}
      <div className="relative z-10" style={{ paddingTop: contentTopInset }}>
        {/*
          Dividers are driven off `visible`, never off `config.blocks`: an
          index > 0 test on the filtered list is what guarantees no divider can
          appear before the first rendered section, after the last, or beside a
          section that returned null. A section that hides itself is absent from
          this list, so its divider is absent with it.
        */}
        {visible.map((block, index) => {
          const section = renderBlock(
            block,
            draft,
            effectiveTheme,
            minHeight,
            sectionPad,
            config.occasionId,
          );

          /*
            At most one panel per card, and only over a built-in section: the
            target names "date" or "venue", neither of which a custom block can
            ever be. A card with the target set to a section the host has since
            switched off simply has no panel, because that section is not in
            `visible` at all.
          */
          const isHidden =
            block.kind === "builtin" &&
            block.id === hiddenSection &&
            scratchLabel !== null;

          /*
            The greeting and dua head the cover, so they are anchored to the
            cover block rather than to the top of the card. The host can reorder
            sections, and a blessing left pinned to position zero would end up
            introducing the venue.

            Never the same block as `isHidden` above: the scratch target names
            "date" or "venue" and can never name the cover, so a blessing is
            never hidden behind a panel a guest has to scratch.
          */
          const isCover = block.kind === "builtin" && block.id === "cover";

          const head =
            isCover && hasBlessing ? (
              /*
                A screen of its own, not a header sitting on top of the names.

                It used to be a block of whatever height the Arabic came to,
                stacked above the cover with a single top inset, which put it in
                the top band of the screen — inside the dissolve, so the first
                thing a guest read was a blurred Bismillah, with the names
                already crowding in underneath.

                Given the same `minHeight` and the same symmetric padding every
                section gets, it becomes what it should have been all along: one
                swipe that shows the blessing, centred, at full strength and
                clear of both the ornaments and the fade, and a second swipe that
                brings the names up whole. Same rule as the rest of the card —
                one screen, one thing.
              */
              <div
                className="flex flex-col items-center justify-center gap-4 px-7 text-center"
                style={{
                  minHeight,
                  paddingTop: sectionPad,
                  paddingBottom: sectionPad,
                }}
              >
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
                /*
                  No padding of its own. The sections above and below each end
                  in their own `py-10`, so the divider already sits 40px clear
                  of the content on both sides — the same inset a section keeps
                  at its top. Padding here was adding a band of nothing on top
                  of that, which is what left the gap under the names.
                */
                <div className="flex justify-center">
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
                Three ways a block can be drawn, and they are checked in this
                order because only one can ever apply.

                A scratch panel and an arch frame can never land on the same
                block — the scratch target names "date" or "venue" and the arch
                only ever frames the cover — so this is a genuine three-way
                choice rather than two wrappers that might have to nest.
              */}
              {isHidden ? (
                <ScratchPanel
                  accent={effectiveTheme.accent}
                  surface={effectiveTheme.surface}
                  label={scratchLabel}
                  /* The host edits; the guest scratches. */
                  preCleared={isHostPreview}
                >
                  {covered}
                </ScratchPanel>
              ) : isCover && useArch ? (
                /*
                  The arch frames the cover rather than replacing anything: an
                  outline behind the content, inset from the card's edges, with
                  the content column drawn on top of it. Stretched with
                  preserveAspectRatio="none" because a frame has to match the
                  box it frames, and held well under half opacity so a name set
                  over a jamb still carries.
                */
                <div className="relative">
                  <MosqueArch
                    instanceId="cover-frame"
                    className="pointer-events-none absolute bottom-0"
                    preserveAspectRatio="none"
                    /*
                      Drawn at roughly 3.4x here, which would turn the authored
                      2 unit line into a 7px band. 0.5 lands back at the ~1.7px
                      the rest of the card's line work is set in.
                    */
                    strokeWidth={0.5}
                    style={{
                      color: effectiveTheme.accent,
                      opacity: 0.38,
                      left: archInsetX,
                      right: archInsetX,
                      top: archInsetTop,
                    }}
                  />
                  <div className="relative">{covered}</div>
                </div>
              ) : (
                covered
              )}

              {/*
                Said only in the editor, and only under the panel it describes:
                the host is looking at an uncovered section and would otherwise
                have no way to tell that their guests will not be.
              */}
              {isHidden && isHostPreview ? (
                <p
                  className="px-7 pb-6 text-center text-xs"
                  style={{ color: effectiveTheme.textMuted }}
                >
                  Guests will need to scratch this.
                </p>
              ) : null}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
