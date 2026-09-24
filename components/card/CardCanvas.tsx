"use client";

import { Fragment, type CSSProperties, type ReactElement } from "react";
import { calligraphyGround } from "@/lib/calligraphy";
import { butterflyStyle, leavesOn } from "@/lib/butterflies";
import { petalStyle, petalsBurst, petalsFall } from "@/lib/petals";
import BorderFrame, {
  borderClearance,
} from "@/components/card/decor/BorderFrame";
import ButterflyLayer from "@/components/card/decor/ButterflyLayer";
import PetalLayer from "@/components/card/decor/PetalLayer";
import CornerLayer from "@/components/card/decor/CornerLayer";
import ScrollFade, {
  scrollFadeDepth,
} from "@/components/card/decor/ScrollFade";
import DecorLayer, {
  CardFlourish,
  MarginDecorLayer,
} from "@/components/card/decor/DecorLayer";
import HangingLayer, {
  hangingDepth,
  hangingIdsFor,
} from "@/components/card/decor/HangingLayer";
import CoverSection from "@/components/card/sections/CoverSection";
import DetailsSection from "@/components/card/sections/DetailsSection";
import CountdownSection from "@/components/card/sections/CountdownSection";
import VenueSection from "@/components/card/sections/VenueSection";
import TimelineSection from "@/components/card/sections/TimelineSection";
import FamilySection from "@/components/card/sections/FamilySection";
import MessageSection from "@/components/card/sections/MessageSection";
import CustomSection from "@/components/card/sections/CustomSection";
import AddToCalendar from "@/components/card/AddToCalendar";
import WeatherPanel from "@/components/card/WeatherPanel";
import MusicToggle from "@/components/card/MusicToggle";
import ScrollCue from "@/components/card/ScrollCue";
import type { ScratchConfig } from "@/components/card/ScratchPanel";
import { getTraditionPack } from "@/lib/traditionPacks";
import {
  hasCountdown,
  hasCustomContent,
  hasFamily,
  hasMessage,
  hasTimeline,
} from "@/lib/cardSections";
import type { CalendarInvite } from "@/lib/calendar";
import { maxOverlayAlpha } from "@/lib/contrast";
import { cardCopy, type CardCopy } from "@/lib/cardLanguage";
import { artWidth, cardPx } from "@/lib/cardScale";
import { effectiveTheme as composeCardTheme } from "@/lib/cardTheme";
import { fontFamilyOf, getFontPair, namesFaceOf } from "@/lib/fontPairs";
import type { Motif } from "@/lib/motifs";
import type { EventWeather } from "@/types/weather";

import { getPalette } from "@/lib/palettes";
import type { Theme } from "@/lib/themes";
import type {
  CardAudience,
  CardConfig,
  CardLanguage,
  CardSectionId,
  CardSizing,
  ScratchTarget,
} from "@/types/card";
import type { CardDensity } from "@/types/style";
import type { CardBlock } from "@/types/customSection";
import type { EventDraft } from "@/types/event";
import type { OccasionId } from "@/types/occasion";
import type { PackBlessing, TraditionPack } from "@/lib/traditionPacks";
import type { AnyOrnamentId } from "@/types/ornament";

/**
 * The most opaque any decor shape is ever authored to be, and so the highest
 * alpha worth testing for contrast. Mirrors OPACITY_AT_SMALLEST in DecorLayer.
 */
const DECOR_CEILING = 0.22;

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
 * The least any section insets its content by. The ornaments and a border's
 * top clearance can only ever raise it — see `sectionPad` and `firstScreenPad`.
 */
const SECTION_TOP_PAD = 40;

/**
 * The side padding every section already carries, in px — its `px-7`.
 *
 * The horizontal twin of the constant above, and it earns its place for the
 * photographic borders alone. The five drawn frames keep to a band no wider
 * than this, so every one of them subtracts to zero and nothing about the card
 * moves; a flower frame paints opaque petals 40 to 55px in, down the full
 * height of the screen, and without this the names would be read through them.
 */
const SECTION_SIDE_PAD = 28;

/**
 * How far above the middle the card's first screen sets its content, as a
 * share of the screen.
 *
 * Every section centres its content in a box a screen tall, which is right for
 * all of them but the first. Centred on the geometric middle, the names sat a
 * third of the way down a phone with the whole top of the card empty above
 * them, and the card opened looking unfinished at the head. The eye takes the
 * middle of a page to be a little above where it really is, so the first
 * screen centres in the top 84% instead and leaves the rest empty below:
 * the group's middle lands at 42%. It is still exactly one screen tall, so
 * nothing of the next section comes up into view to crowd it.
 *
 * Not under a cover arch. The arch is drawn to the screen from a top edge the
 * border fixes, and the space above the names is where its dome stands: lifted,
 * the first name went up into the dome. An arched first screen is already
 * composed by the arch, so it keeps its centre and takes only the rest of what
 * the first screen gets — the border's floor, and arriving in one piece.
 */
const FIRST_SCREEN_LIFT = 0.16;

/** The pack divider's longer side, in px at the card's 420px design width. */
const DIVIDER_SIZE = 168;

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
  entry,
  pack,
  theme,
  sizeClass,
}: {
  entry: PackBlessing;
  pack: TraditionPack;
  theme: Theme;
  sizeClass: string;
}): ReactElement | null {
  if (entry.script.length === 0) {
    return null;
  }

  const { ScriptRun } = pack;

  return (
    <div className="flex w-full flex-col items-center gap-1.5">
      {/*
        The pack draws its own script line, because `dir` and `lang` belong on
        the element that actually holds the text — the bidi algorithm and the
        font matcher both key off it — and the rules differ per script in ways a
        shared caller must not be the one to decide. Arabic sets dir="rtl";
        Devanagari and Gurmukhi set dir="ltr" and carry their own measured
        leading with their face. `wrap-anywhere` is what keeps a long unbroken
        run inside a 360px card, which is the width this was checked at.
      */}
      <ScriptRun
        className={`w-full text-center wrap-anywhere ${sizeClass}`}
        style={{ color: theme.accent }}
      >
        {entry.script}
      </ScriptRun>

      {/*
        Latin script, so both of these are explicitly left to right — under an
        RTL pack they sit inside a block that has just been told it is RTL, and
        an unmarked Latin line there has its punctuation pushed to the wrong
        end. They inherit the card's body font from the canvas root.
      */}
      {entry.transliteration.length > 0 ? (
        <p
          dir="ltr"
          className="w-full text-center text-[calc(0.9*var(--card-rem,1rem))] leading-relaxed wrap-anywhere italic"
          style={{ color: theme.textMuted }}
        >
          {entry.transliteration}
        </p>
      ) : null}

      {entry.translation.length > 0 ? (
        <p
          dir="ltr"
          className="w-full text-center text-[calc(0.9*var(--card-rem,1rem))] leading-relaxed wrap-anywhere"
          style={{ color: theme.textMuted }}
        >
          {entry.translation}
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
 * A section is a centred group of three or four lines — measured on a 360x800
 * phone, the date is 123px of content and the note 76px.
 *
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

  /*
    A switch rather than a chain of inequalities, so a section added to
    CardSectionId that hides itself under some condition cannot quietly be
    forgotten here. The default is the honest answer for a section that always
    renders; the two that do not are named.
  */
  switch (block.id) {
    case "message":
      return hasMessage(draft);
    case "countdown":
      return hasCountdown(draft);
    case "timeline":
      return hasTimeline(draft);
    case "family":
      return hasFamily(draft);
    default:
      return true;
  }
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
    case "countdown":
      return "countdown";
    case "none":
      return null;
  }
}

/** What the panel says over each target, in the card's language. */
function scratchLabel(
  target: ScratchTarget,
  copy: CardCopy["scratch"],
): string | null {
  return target === "none" ? null : copy[target];
}

/**
 * Draws one block of the running order.
 *
 * `scratch` is non-null for at most one block on the card, and only for the
 * three built-ins that can carry a panel. It is handed down rather than applied
 * here on purpose: a panel wrapped around a whole section covers a screen-tall
 * box, which is the slab this replaces. Only the section knows which of its own
 * lines are the ones worth hiding — the date but not its rule, the venue and
 * the Maps link that would otherwise give it away, the countdown's units but
 * neither its heading nor the calendar buttons under it.
 */
function renderBlock(
  block: CardBlock,
  draft: EventDraft,
  theme: Theme,
  minHeight: string,
  pad: number,
  occasionId: OccasionId,
  invite: CalendarInvite,
  scratch: ScratchConfig | null,
  language: CardLanguage,
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
          language={language}
        />
      );
    case "details":
      return (
        <DetailsSection
          draft={draft}
          theme={theme}
          minHeight={minHeight}
          pad={pad}
          scratch={scratch}
          language={language}
        />
      );
    /*
      The one built-in that renders two things. The calendar links belong to
      the countdown — they answer the question it raises — but they are not a
      section: they carry no minHeight, take no screen of their own, and sit
      directly under it, above the divider that closes the countdown off.

      They also need the invite code and link, which no section is given and
      only the canvas is handed, so this is the one place the two can meet.
    */
    case "countdown":
      return (
        <>
          <CountdownSection
            draft={draft}
            theme={theme}
            minHeight={minHeight}
            pad={pad}
            scratch={scratch}
            language={language}
          />
          <AddToCalendar
            draft={draft}
            theme={theme}
            invite={invite}
            language={language}
          />
        </>
      );
    case "venue":
      return (
        <VenueSection
          draft={draft}
          theme={theme}
          minHeight={minHeight}
          pad={pad}
          scratch={scratch}
          language={language}
        />
      );
    case "timeline":
      return (
        <TimelineSection
          draft={draft}
          theme={theme}
          minHeight={minHeight}
          pad={pad}
          language={language}
        />
      );
    case "family":
      return (
        <FamilySection
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
  invite,
  weather = null,
  weatherTheme = null,
  fluid = false,
  fillsPhone = false,
}: {
  draft: EventDraft;
  theme: Theme;
  config: CardConfig;
  motifs: readonly Motif[];
  sizing: CardSizing;
  /**
   * Whether the card grows with a tablet or laptop screen, from 768px up.
   *
   * Only the guest's invitation passes it. The editor's frame and its full
   * screen preview both draw the card inside a phone-sized box of their own,
   * and a card that sized itself off the screen would burst out of it. Below
   * 768px it changes nothing at all — see lib/cardScale.ts.
   *
   * Implies `fillsPhone`.
   */
  fluid?: boolean;
  /**
   * Whether the card fills a phone wider than its 420px design width, and
   * grows with it, from 421px to 767px.
   *
   * The guest's invitation, through `fluid`, and the full screen preview,
   * which is the whole screen on a phone. Never the editor's frame, which is
   * a phone-sized box of its own. At 420px and below it changes nothing at
   * all — see lib/cardScale.ts.
   */
  fillsPhone?: boolean;
  /** Decides whether guest interactions — the scratch panel — are live. */
  audience: CardAudience;
  /**
   * The invitation the calendar links point back at.
   *
   * On the canvas rather than on a section because it is the one piece of the
   * card that does not come from the draft: an invite code is minted when the
   * event is saved, and the editor's previews have none yet — they pass
   * PREVIEW_INVITE and get the buttons without a link inside the file.
   */
  invite: CalendarInvite;
  /**
   * The reading to show under the card, or null for no weather at all.
   *
   * Resolved on the server and handed down finished, never fetched from here.
   * Null covers every reason there might be nothing to show — the host switched
   * it off, the venue could not be located, Open-Meteo was down, the date is in
   * the past — and every one of them renders the same way, which is nothing.
   * The editor's previews pass nothing and get a card without it.
   */
  weather?: EventWeather | null;
  /** Raw, as stored. Resolved inside the panel. */
  weatherTheme?: string | null;
}): ReactElement {
  const { style } = config;
  const minHeight = sectionMinHeight(sizing, style.density);
  const bandHeight = scrollportHeight(sizing);
  const visible = config.blocks.filter((block) => blockRenders(block, draft));

  /*
    The one place the card's language is read. Everything it writes for itself
    below is handed this rather than reaching for the config again.
  */
  const language = config.language;
  const copy = cardCopy(language);

  const isHostPreview = audience === "host-preview";
  const hiddenSection = scratchSection(config.scratchTarget);
  const panelLabel = scratchLabel(config.scratchTarget, copy.scratch);

  /*
    Colour resolution order: the host's accent override, then the selected
    palette, then the theme as the last resort. Sections read colours from the
    theme object they are handed, so composing one effective theme here is what
    makes an override reach every divider, motif, scroll cue and accent line at
    once.
  */
  const palette = getPalette(style.paletteId);
  const fontPair = getFontPair(style.fontPairId);
  const namesFace = namesFaceOf(fontPair);

  /*
    Lifted into lib/cardTheme.ts, because the card is no longer the only thing
    that needs it: the guest's reply form sits directly under this and was
    reading the raw theme, which put cream labels on a cream card.
  */
  const effectiveTheme: Theme = composeCardTheme(theme, style);

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
    THE SINGLE GATE ON THE WHOLE ORNAMENT FEATURE, for every tradition.

    One lookup, checked once. A tradition with no pack resolves to null, the
    ornament list comes out empty, every `includes` below is false, the greeting
    and blessing lookups are handed null, and no ornament layer mounts — which
    is exactly what a card carried before any pack existed. Not seven separate
    branches that could disagree, and no tradition named anywhere below.
  */
  const pack = getTraditionPack(config.traditionId);
  const ornaments: readonly AnyOrnamentId[] =
    pack !== null ? config.ornamentConfig.enabledOrnaments : [];

  const greeting = pack?.findGreeting(config.ornamentConfig.greetingId) ?? null;
  const blessing = pack?.findBlessing(config.ornamentConfig.blessingId) ?? null;

  /*
    Resolves to nothing wherever a content file still ships empty strings, which
    today is every line of four of the six packs.
  */
  const hasBlessing =
    (greeting?.script.length ?? 0) > 0 || (blessing?.script.length ?? 0) > 0;

  /*
    The three claims a pack can make on an ornament, and what is left over.

    An ornament that hangs is placed by HangingLayer, the cover arch frames the
    cover and the divider rules between sections. EVERYTHING ELSE GOES TO
    CornerLayer — computed here rather than listed, because this is the only
    place that can see all three claims at once, and an ornament that no layer
    claims is an ornament the host can switch on and never see.
  */
  const hangingIds = hangingIdsFor(pack);
  const scatterIds =
    pack === null
      ? []
      : pack.ornaments
          .map((ornament) => ornament.id)
          .filter(
            (id) =>
              !hangingIds.includes(id) &&
              id !== pack.coverArchId &&
              id !== pack.dividerId &&
              !pack.calligraphyIds.includes(id),
          );

  /*
    The calligraphy that heads the card: whichever of the pack's panels the host
    switched on, in the pack's own order.

    Resolved here beside the divider and the arch, because those three are the
    claims that keep an ornament out of the scatter — and a claim made in one
    place and honoured in another is how an ornament ends up sprinkled across
    the card at 30px.
  */
  const calligraphy =
    pack === null
      ? []
      : pack.calligraphyIds
          .filter((id) => ornaments.includes(id))
          .map((id) => pack.findOrnament(id))
          .filter((entry) => entry !== null);

  const dividerId = pack?.dividerId ?? null;
  const archId = pack?.coverArchId ?? null;
  /*
    Resolved through the pack, never named here. Each pack nominates its own
    divider and its own cover arch, so this file draws whichever the tradition
    in hand supplies — a running border and a mosque arch under Muslim, a floral
    band and a gurudwara arch under Sikh, an olive branch and a gothic arch
    under Christian, and nothing at all under a pack that nominates neither.
  */
  const dividerOrnament =
    dividerId !== null && ornaments.includes(dividerId)
      ? (pack?.findOrnament(dividerId) ?? null)
      : null;
  const archOrnament =
    archId !== null && ornaments.includes(archId)
      ? (pack?.findOrnament(archId) ?? null)
      : null;
  const useArch = archOrnament !== null;

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

    Applied once, to the first screen only, rather than to every section.
    Further down the card it is not needed: a section centres its content, so
    by the time the guest is reading the date it sits around 150px from the top
    of the screen, well below anything the frame draws. Text passing under the
    swag mid-scroll is the same accepted behaviour as text passing under the
    lanterns, and at half opacity it reads as the ornament it is.

    A FLOOR, NOT A PUSH. It used to be padding on the column above the first
    screen, which moved the whole screen down by the swag's depth whether the
    names were anywhere near it or not: a garland card opened with its names
    56px lower than the same card without one. As the least the first screen
    may inset its content by, it only ever acts when the content is tall enough
    to reach the swag — see `firstScreenPad`.
  */

  /*
    And room down each side, for a border that stands in the margin.

    Applied to the column rather than to its head, because that is where the
    two clearances differ: the top of a frame is passed once, on the way in,
    while its sides are beside every line of every section for the whole scroll.
    Zero for all five drawn borders — their deepest band is 28px, which is the
    section padding they were already clearing. The three photographs each ask
    for their own, measured off their own artwork.
  */
  const contentSideInset = Math.max(0, clearance.x - SECTION_SIDE_PAD);

  /* Normalised once here, so the gate below and the layer read the same thing. */
  const butterflies = butterflyStyle(config.butterflies);
  /* A card saved before leaves had their own switch keeps them with its butterflies. */
  const leaves = leavesOn(config.leaves, config.butterflies);
  const petals = petalStyle(config.petals);

  /*
    How far down the screen the ornaments reach.

    Asked of the layer that owns their positions rather than guessed here, so a
    lantern moved deeper carries the whole card's spacing with it. Feeds the
    section padding below, and the dissolve, and nothing has to be kept in sync
    by hand.
  */
  const hangingBand = hangingDepth(pack, ornaments);

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

  /* The first screen's inset: a section's, or the border's clearance if that is deeper. */
  const firstScreenPad = Math.max(sectionPad, clearance.y);

  /*
    The first screen's height, split between the box its content centres in
    and the empty band under it. See FIRST_SCREEN_LIFT.
  */
  const firstScreenBox = `calc(${minHeight} * ${1 - FIRST_SCREEN_LIFT})`;
  const firstScreenLift = `calc(${minHeight} * ${FIRST_SCREEN_LIFT})`;

  /*
    What the head screen insets by, which is not what a section insets by.

    A section insets to `sectionPad` — where the ornaments stop — and gets away
    with it because it centres a line of text in a screen-tall box, so the line
    lands far below the dissolve's ramp whatever the padding says. The head
    screen does not: it stacks a calligraphic panel, a greeting and a dua, and
    the taller that stack grows the higher its first item climbs. With lanterns
    on and a dua picked, the Bismillah's top edge came to rest at 125px against
    a dissolve that runs to 190 — and the upper half of it was washed into the
    background. The bug read as the calligraphy vanishing the moment a dua was
    chosen, because choosing one is what made the stack tall enough.

    So this clears the whole dissolve rather than the ornaments alone, asked of
    the layer that draws it. `min-height` and not `height`, so on the rare card
    where the stack no longer fits between the two the screen grows a little
    instead of pushing its own head off the top.
  */
  const fadeDepth = scrollFadeDepth(hangingBand);
  const headPadTop = Math.max(sectionPad, fadeDepth.top);
  const headPadBottom = Math.max(sectionPad, fadeDepth.bottom);

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
    "--card-names": fontFamilyOf(namesFace.variable, namesFace.fallback),
    "--card-names-weight": String(namesFace.weight),
    "--card-names-scale": String(namesFace.scale),
    "--card-names-leading": String(namesFace.leading),
    "--card-names-tracking": namesFace.tracking,
    "--card-names-word-spacing": namesFace.wordSpacing,
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
      /*
        On the card's own root rather than left to <html>, which says en-IN on
        every page. A Hindi card inside the English editor is still Hindi, and
        the line breaker, a screen reader's voice and the no-tracking rule in
        globals.css all read the nearest `lang` up the tree.
      */
      lang={copy.lang}
      /*
        `lifafa-card-fluid` is what lets the guest's card fill a tablet or
        laptop screen from 768px up, with its text in a scaled column down the
        middle; see globals.css and lib/cardScale.ts. Below 768px it does
        nothing at all. `lifafa-card-phone` is the same growth on a phone
        wider than 420px, and does nothing outside 421px to 767px.
      */
      className={`relative mx-auto w-full max-w-[420px] overflow-x-clip${
        fluid || fillsPhone ? " lifafa-card-phone" : ""
      }${fluid ? " lifafa-card-fluid" : ""}`}
      style={{
        ...cssVariables,
        backgroundColor: effectiveTheme.background,
        color: effectiveTheme.textPrimary,
        fontFamily: effectiveTheme.fontFamily,
      }}
    >
      {/*
        The sides of a card that fills a laptop screen, first so everything
        else paints over them. Mounts only on the guest's card, and draws
        nothing until the screen is 768px wide.
      */}
      {fluid ? (
        <MarginDecorLayer
          accent={effectiveTheme.accent}
          motion={config.decorMotion}
          motifs={motifs}
          intensity={config.decorIntensity}
          bandHeight={bandHeight}
          maxAlpha={decorMaxAlpha}
        />
      ) : null}

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
      {pack !== null ? (
        <CornerLayer
          pack={pack}
          scatterIds={scatterIds}
          enabledOrnaments={ornaments}
          accent={effectiveTheme.accent}
          bandHeight={bandHeight}
          maxAlpha={decorMaxAlpha}
        />
      ) : null}

      {/*
        Mounted only when the tradition has an ornament pack. Not merely handed
        an empty list — the component is absent from the tree entirely on a card
        with no pack, which is the difference between "renders nothing" and
        "cannot render".

        Sits above the fade at `z-[15]`, which is a change of order and a
        deliberate one: the ornaments used to hang behind the text, and text
        crossing them was the collision this release is fixing. Now the text
        dissolves before it arrives and the lanterns are the thing left drawn,
        so they have to be the ones on top. `pointer-events-none` throughout,
        so it can never take a tap or a scroll meant for the card underneath.
      */}
      {pack !== null ? (
        <HangingLayer
          pack={pack}
          enabledOrnaments={ornaments}
          accent={effectiveTheme.accent}
        />
      ) : null}

      {/*
        The border, over every other layer of decor and over the text with it.

        `z-[16]` against the hanging layer's `z-[15]`, because a frame is the
        outermost thing on a piece of stationery: a lantern that swung across
        the border would read as being outside the card. Above the fade as well,
        so the frame keeps full opacity at the very edges where the dissolve is
        strongest. Independent of the tradition — no `isMuslim` gate here,
        unlike the two layers above it — and it returns null on its own when the
        style is "none".

        Outermost of the decor until the butterflies, which are the one thing
        that had to come out in front of it — the note under them says why.
      */}
      <BorderFrame
        borderStyle={config.borderStyle}
        accent={effectiveTheme.accent}
        bandHeight={bandHeight}
      />

      {/*
        The butterflies, if the host asked for any.

        Read through `butterflyStyle` because card_config is a jsonb snapshot
        and three different shapes come back out of it: no key at all on a card
        saved before butterflies existed, `true` or `false` on one saved while
        the field was a switch, and the colour on everything since.

        Gated on the motion style as well as on its own switch. "Motion style:
        None" is two controls above this one in the same panel, and a host who
        has just asked the card to hold still would read four insects flying
        over it as a bug rather than as a second opinion.

        Last of the decor and the only thing above the frame — see the note on
        the layer itself. A butterfly is the nearest thing to the guest, and it
        has to be: it flies in the margin, which is exactly where a photographic
        border paints its flowers, so at any depth below that one the flower
        frames simply swallowed it.
      */}
      {(butterflies !== "none" || leaves) && config.decorMotion !== "none" ? (
        <ButterflyLayer
          style={butterflies}
          leaves={leaves}
          intensity={config.decorIntensity}
          bandHeight={bandHeight}
        />
      ) : null}

      {/*
        The rose petals, beside the butterflies and at their depth.

        Keyed on the choice, so a host who picks it in the editor sees the
        shower play again rather than only on the first load. The steady fall
        is gated on the motion style the way the butterflies are; the shower on
        opening is not, because it is the moment the card opens rather than the
        card's movement, and it is over in a few seconds either way.
      */}
      {petals !== "none" ? (
        <PetalLayer
          key={petals}
          burst={petalsBurst(petals)}
          fall={petalsFall(petals) && config.decorMotion !== "none"}
          intensity={config.decorIntensity}
          bandHeight={bandHeight}
        />
      ) : null}

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
      {/*
        `lifafa-card-content` is the reading column a fluid card centres at
        its scaled width. The side inset is multiplied by --card-side-inset,
        which a fluid card sets to 0 from 768px up: its border is at the edge of
        the screen by then, nowhere near the text.
      */}
      <div
        className="lifafa-card-content relative z-10"
        style={{
          paddingInline: `calc(${cardPx(contentSideInset)} * var(--card-side-inset, 1))`,
        }}
      >
        {/*
          First in the column and no height of its own, so it sticks to the top
          of the scrollport without pushing the cover down a pixel. Renders
          nothing at all when the host pasted no link, which is most cards.

          `?? null` because card_config is a jsonb snapshot: a card saved before
          this field existed has no key here, and `undefined` is not a value
          MusicToggle should have to know about.
        */}
        <MusicToggle
          musicUrl={config.musicUrl ?? null}
          accent={effectiveTheme.accent}
          surface={effectiveTheme.surface}
          language={language}
        />

        {/*
          Dividers are driven off `visible`, never off `config.blocks`: an
          index > 0 test on the filtered list is what guarantees no divider can
          appear before the first rendered section, after the last, or beside a
          section that returned null. A section that hides itself is absent from
          this list, so its divider is absent with it.
        */}
        {visible.map((block, index) => {
          /*
            At most one panel per card, and only over a built-in section: the
            target names "date", "venue" or "countdown", none of which a custom
            block can ever be. A card with the target set to a section the host
            has since switched off simply has no panel, because that section is
            not in `visible` at all.
          */
          const isHidden =
            block.kind === "builtin" &&
            block.id === hiddenSection &&
            panelLabel !== null;

          /*
            Built here and handed to the section, which decides which of its own
            lines go behind it. The canvas is where the palette, the audience
            and the chosen target are all in scope at once, and the section is
            where the content is — so this is the object those two meet in.
          */
          const scratch: ScratchConfig | null =
            isHidden && panelLabel !== null
              ? {
                  accent: effectiveTheme.accent,
                  surface: effectiveTheme.surface,
                  label: panelLabel,
                  phrases: copy.scratch,
                  /* The host edits; the guest scratches. */
                  preCleared: isHostPreview,
                }
              : null;

          /*
            The greeting and dua head the cover, so they are anchored to the
            cover block rather than to the top of the card. The host can reorder
            sections, and a blessing left pinned to position zero would end up
            introducing the venue.

            Never the same block as `isHidden` above: the scratch target names
            "date", "venue" or "countdown" and can never name the cover, so a
            blessing is never hidden behind a panel a guest has to scratch.
          */
          const isCover = block.kind === "builtin" && block.id === "cover";
          const hasHead = isCover && (hasBlessing || calligraphy.length > 0);

          /*
            The screen a guest lands on: the blessing, when the card opens with
            one, and otherwise this block's own section. Only that screen is
            lifted and floored; everything after it is spaced as it always was.
          */
          const sectionIsFirstScreen = index === 0 && !hasHead;
          const headIsFirstScreen = index === 0 && hasHead;
          const liftSection = sectionIsFirstScreen && !(isCover && useArch);

          const section = renderBlock(
            block,
            draft,
            effectiveTheme,
            liftSection ? firstScreenBox : minHeight,
            sectionIsFirstScreen ? firstScreenPad : sectionPad,
            config.occasionId,
            invite,
            scratch,
            language,
          );

          const head =
            hasHead ? (
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
                className="relative flex flex-col items-center justify-center gap-4 px-7 text-center"
                style={
                  headIsFirstScreen
                    ? {
                        minHeight,
                        paddingTop: cardPx(Math.max(headPadTop, clearance.y)),
                        paddingBottom: `calc(${cardPx(headPadBottom)} + ${firstScreenLift})`,
                      }
                    : {
                        minHeight,
                        paddingTop: cardPx(headPadTop),
                        paddingBottom: cardPx(headPadBottom),
                      }
                }
              >
                {/*
                  Above the greeting, because they open what follows rather than
                  sitting beside it: a card that carries the lot reads Bismillah,
                  then the verse, then the address, then the dua, which is the
                  order they are said in. Pack order, not the order the host
                  switched them on in — an opening does not become a closing
                  because it was chosen second.

                  `className` rather than `size`, so the width is the column's
                  and not a number chosen here — calligraphy is the only
                  ornament that spans the card rather than being placed on it.
                  Which ink it uses is decided from the card's own background;
                  see lib/calligraphy.ts.

                  Wider than the column by 16px a side, into the screen's own
                  28px padding. Every piece ends in a hairline rule and a
                  diamond, so the extra width is almost all lettering, and a
                  line that is read should not be the narrowest thing on the
                  card. Under a flower border it still keeps clear of the
                  flowers, which the column already stands 20px off. Capped at
                  20 card-rem for a card with no border, where the Bismillah —
                  lettering to its very edges — would otherwise run nearly to
                  the edges of the card.
                */}
                {calligraphy.map((panel) => (
                  <panel.Component
                    key={panel.id}
                    instanceId={`cover-calligraphy-${panel.id}`}
                    className="-mx-4 block h-auto w-[calc(100%+2rem)] max-w-[calc(20*var(--card-rem,1rem))]"
                    ground={calligraphyGround(effectiveTheme.background)}
                  />
                ))}

                {greeting !== null && pack !== null ? (
                  <Blessing
                    entry={greeting}
                    pack={pack}
                    theme={effectiveTheme}
                    /*
                      The greeting is the smaller of the two. It is a form of
                      address; the blessing is what is being offered, and the
                      card should read in that order of weight.
                    */
                    sizeClass="text-[1.25rem] leading-[2] sm:text-[calc(1.375*var(--card-rem,1rem))]"
                  />
                ) : null}

                {blessing !== null && pack !== null ? (
                  <Blessing
                    entry={blessing}
                    pack={pack}
                    theme={effectiveTheme}
                    sizeClass="text-[1.375rem] leading-[2.1] sm:text-[calc(1.5*var(--card-rem,1rem))]"
                  />
                ) : null}

                {/*
                  The screen a guest lands on says nothing of what is under it —
                  the cover and its own cue are a whole swipe away. So the cue
                  comes up here, in the empty band this screen keeps under its
                  content (the lift), and just above the bottom dissolve, which
                  is where `headPadBottom` ends.
                */}
                {headIsFirstScreen ? (
                  <ScrollCue
                    label={copy.cover.scrollCue}
                    textColor={effectiveTheme.textMuted}
                    accent={effectiveTheme.accent}
                    /*
                      Centred in the lift band rather than sat on its floor, so
                      it is clear of anything pinned to the foot of the screen —
                      the preview's watermark pill among them. 3.5rem is the
                      cue's own height, word and line together.
                    */
                    style={{
                      bottom: `calc(${cardPx(headPadBottom)} + max(0px, (${firstScreenLift} - 3.5rem) / 2))`,
                    }}
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

          const framed =
            isCover && useArch ? (
              /*
                The arch frames the cover rather than replacing anything: an
                outline behind the content, inset from the card's edges, with
                the content column drawn on top of it. Stretched with
                preserveAspectRatio="none" because a frame has to match the
                box it frames, and held well under half opacity so a name set
                over a jamb still carries.

                Never lifted as a first screen — see FIRST_SCREEN_LIFT.
              */
              <div className="relative">
                <archOrnament.Component
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
                    left: cardPx(archInsetX),
                    right: cardPx(archInsetX),
                    top: cardPx(archInsetTop),
                  }}
                />
                <div className="relative">{covered}</div>
              </div>
            ) : (
              covered
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
                /*
                  The art class only when the pack's divider is drawn: the
                  flourish sizes itself in card pixels already, and the rule
                  would size it from an --art-width it was never given.
                */
                <div
                  className={
                    dividerOrnament !== null
                      ? "lifafa-card-art flex justify-center"
                      : "flex justify-center"
                  }
                  style={
                    dividerOrnament !== null
                      ? artWidth(
                          dividerOrnament.aspect >= 1
                            ? DIVIDER_SIZE
                            : DIVIDER_SIZE * dividerOrnament.aspect,
                        )
                      : undefined
                  }
                >
                  {/*
                    The vine takes the divider's place rather than joining it —
                    two ornaments stacked on one hairline reads as a mistake.
                    Sized wider than the flourish because it is a repeating band
                    and needs the width to show more than one repeat.
                  */}
                  {dividerOrnament !== null ? (
                    <dividerOrnament.Component
                      instanceId={`divider-${index}`}
                      size={DIVIDER_SIZE}
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
                Two ways a block can be drawn now that the scratch panel has
                moved inside the sections. It used to be three, with a panel
                wrapped around the whole block here — which is precisely what
                made it a screen-tall slab rather than a sticker over the words.
                A block that is hidden is still drawn exactly like any other
                from out here; the section it renders has already put the panel
                over the lines that need it.
              */}
              {sectionIsFirstScreen ? (
                /*
                  The band under the first screen's content, and the one place
                  the card's line stagger is switched off.

                  THE FIRST SCREEN ARRIVES IN ONE PIECE. Every other section
                  sets its lines down one after another as the guest scrolls to
                  it, which is the card being read. The first screen is the card
                  being opened: a printed invitation does not typeset itself in
                  front of the person holding it, and names that arrived a word
                  at a time were the last of what made opening one feel like a
                  page loading. So its lines rise together, under the cover as
                  it leaves them — see `revealAt` in types/coverAnimation.ts.
                */
                <div
                  style={
                    {
                      paddingBottom: liftSection ? firstScreenLift : undefined,
                      "--card-line-stagger": "0ms",
                    } as CSSProperties
                  }
                >
                  {framed}
                </div>
              ) : (
                framed
              )}

              {/*
                Said only in the editor, and only under the panel it describes:
                the host is looking at an uncovered section and would otherwise
                have no way to tell that their guests will not be.

                In English whatever the card is written in, and tagged so: it
                is the editor talking to the host, not the card to a guest.
              */}
              {isHidden && isHostPreview ? (
                <p
                  lang="en-IN"
                  className="px-7 pb-6 text-center text-xs"
                  style={{ color: effectiveTheme.textMuted }}
                >
                  Guests will need to scratch this.
                </p>
              ) : null}
            </Fragment>
          );
        })}

        {/*
          After the last section rather than inside one.

          The weather belongs to the whole invitation, not to the venue block or
          the date block, and pinning it inside either would mean a host who
          switched that section off silently lost it. It is also the one thing
          on the card that is not the host's own words, so it reads better as a
          footnote under the card than as a screen of its own in the middle.
        */}
        {weather !== null ? (
          <WeatherPanel
            weather={weather}
            themeId={weatherTheme}
            theme={effectiveTheme}
            draft={draft}
            language={language}
          />
        ) : null}
      </div>
    </div>
  );
}
