import type { CSSProperties, ReactElement } from "react";
import ArabicText from "@/components/type/ArabicText";
import DevanagariText from "@/components/type/DevanagariText";
import {
  DUAS,
  GREETINGS,
  isOptOut as isArabicOptOut,
  type Dua,
  type Greeting,
} from "@/lib/arabicContent";
import {
  DEVANAGARI_LANG,
  HINDU_GREETINGS,
  SHLOKS,
  SHLOK_NOTE,
  isOptOut as isDevanagariOptOut,
  type HinduGreeting,
  type Shlok,
} from "@/lib/devanagariContent";
import GurmukhiText from "@/components/type/GurmukhiText";
import LatinScriptText from "@/components/type/LatinScriptText";
import {
  BUDDHIST_BLESSINGS,
  BUDDHIST_GREETINGS,
  PALI_LANG,
  isOptOut as isPaliOptOut,
  type BuddhistBlessing,
  type BuddhistGreeting,
} from "@/lib/buddhistContent";
import {
  CHRISTIAN_BLESSINGS,
  CHRISTIAN_GREETINGS,
  CHRISTIAN_LANG,
  isOptOut as isEnglishOptOut,
  type ChristianBlessing,
  type ChristianGreeting,
} from "@/lib/christianContent";
import {
  SIKH_BLESSINGS,
  SIKH_GREETINGS,
  isOptOut as isGurmukhiOptOut,
  type SikhBlessing,
  type SikhGreeting,
} from "@/lib/gurmukhiContent";
import {
  JAIN_BLESSINGS,
  JAIN_GREETINGS,
  JAIN_LANG,
  isOptOut as isJainOptOut,
  type JainBlessing,
  type JainGreeting,
} from "@/lib/jainContent";
import {
  BUDDHIST_ORNAMENTS,
  BUDDHIST_ORNAMENTS_NOTE,
  BUDDHIST_ORNAMENT_ASPECT,
} from "@/lib/ornaments/buddhist";
import {
  CHRISTIAN_ORNAMENTS,
  CHRISTIAN_ORNAMENTS_NOTE,
  CHRISTIAN_ORNAMENT_ASPECT,
} from "@/lib/ornaments/christian";
import {
  HINDU_ORNAMENTS,
  HINDU_ORNAMENTS_NOTE,
  HINDU_ORNAMENT_ASPECT,
} from "@/lib/ornaments/hindu";
import {
  JAIN_ORNAMENTS,
  JAIN_ORNAMENTS_NOTE,
  JAIN_ORNAMENT_ASPECT,
} from "@/lib/ornaments/jain";
import {
  GURUDWARA_ARCH_DOORWAY,
  SIKH_ORNAMENTS,
  SIKH_ORNAMENTS_NOTE,
  SIKH_ORNAMENT_ASPECT,
} from "@/lib/ornaments/sikh";
import type { Ornament } from "@/lib/ornaments/frame";
import { MUSLIM_ORNAMENTS, ORNAMENT_ASPECT } from "@/lib/ornaments/muslim";
import type { TraditionId } from "@/types/occasion";
import type { AnyOrnamentId } from "@/types/ornament";

/**
 * What one tradition offers the card, as data.
 *
 * THIS FILE EXISTS SO THERE IS ONE EDITOR AND ONE CARD, not one per tradition.
 * The panel and the canvas are written once against a TraditionPack and take
 * the tradition as a parameter; adding a third pack is a row in the table at
 * the bottom of this file and nothing else. The alternative — a Hindu panel
 * beside the Muslim one — is two copies of a layout, a selection model and a
 * set of accessibility decisions that would drift apart on the first change to
 * either.
 *
 * A tradition with no pack has no entry, and getTraditionPack returns null for
 * it. That null is the single gate: no pack, no chips, no greeting, no
 * ornaments on the card.
 */

/**
 * One ornament a pack offers.
 *
 * A structural subset of the pack registries' own entry types, so both
 * MUSLIM_ORNAMENTS and HINDU_ORNAMENTS satisfy it as they stand. Fields a
 * single pack cares about — Hindu's topRegionOnly — stay on that pack's own
 * type and are read where they matter rather than being forced onto every pack
 * as a column of falses.
 */
export interface PackOrnament {
  id: AnyOrnamentId;
  label: string;
  Component: Ornament;
  chipSize: number;
  /**
   * The drawing's width over its height, from its own viewBox.
   *
   * Composed in this file from each pack's own ASPECT record rather than
   * declared on the pack entries, so the ornament files keep one source for it.
   * The card needs it to work out how far down the screen a hanging ornament
   * reaches without measuring the DOM.
   */
  aspect: number;
  /**
   * Whether this shape must never be rotated or tilted by a placer.
   *
   * True for the two swastikas and nothing else so far. Both are upright,
   * clockwise symbols whose meaning depends on exactly that: tilt one to 45
   * degrees or mirror it and it becomes a different symbol carrying a meaning
   * nobody wants on an invitation. The scatter slots in CornerLayer carry a
   * rotation, so without this flag the placer would quietly do it.
   */
  uprightOnly?: boolean;
  /**
   * The published file, for an ornament that is a picture rather than a
   * drawing. The card preloads the ones in use, so a chosen picture is in hand
   * before the envelope opens rather than arriving after it.
   */
  src?: string;
  /**
   * The published file of an ornament drawn as a mask filled with the accent.
   * Preloaded apart from `src`, because a mask is fetched in CORS mode.
   */
  mask?: string;
  /**
   * For an ornament that turns: the shape the card turns, with its fade cut
   * into its file. See components/card/decor/TopCorners.tsx.
   */
  turning?: Ornament;
  /**
   * How tall the ornament stands above the names, in card px, for a picture
   * too detailed for the usual height. See components/card/decor/SlotOrnaments.tsx.
   */
  aboveNamesHeight?: number;
  /** And how tall in a bottom corner, for one that is a spray rather than an object. */
  cornerHeight?: number;
  /** And how tall beside the names, for one far wider than the flag that place was made for. */
  sideHeight?: number;
}

/**
 * The fixed places a pack's ornaments go, one ornament to a place.
 *
 * FOR A PACK WHOSE ORNAMENTS HAVE PLACES OF THEIR OWN. A garland hangs, a
 * murti heads the invitation, a lamp stands at the foot — and letting each be
 * put anywhere is how a Ganesh ended up beside the venue and two garlands
 * ended up on one card. A pack that declares slots gets them: the panel groups
 * its tiles by place and keeps one to each, and the card draws each place in
 * its own spot and nowhere else.
 *
 * STORED AS IT ALWAYS WAS, in `enabledOrnaments`. A slot is a reading of that
 * list, not a new field — so every card saved before there were slots still
 * loads, and where one of those has two ornaments in a place that now holds
 * one, the one picked last is the one drawn (see lib/ornaments/slots.ts).
 */
interface OrnamentSlots {
  /** Hangs the full width of the card, just below the controls at its top. */
  top: readonly AnyOrnamentId[];
  /** Centred above the names. The only place a figure of a deity is drawn. */
  aboveNames: readonly AnyOrnamentId[];
  /**
   * The two bottom corners of the names' screen, and what may stand in them.
   * Of two on the card, the one earlier in this list stands at the left and
   * the other at the right; one alone stands in both. A pack with one corner
   * ornament names it twice. A pack may offer more than two, and the card
   * still holds two: see lib/ornaments/slots.ts. Absent for a pack with
   * nothing that stands in a corner.
   */
  corners?: readonly AnyOrnamentId[];
  /**
   * Frames the names: the names, the title and the rule under it are set
   * inside its opening. Absent for a pack with no such frame.
   */
  frame?: readonly AnyOrnamentId[];
  /**
   * Stands in the side margins of the names' screen, one on each side, the
   * far one turned to face the other way. Absent for a pack with none.
   */
  sides?: readonly AnyOrnamentId[];
  /** What the panel calls that place, where "Side flags" is not what stands in it. */
  sidesLabel?: string;
  /**
   * Turns slowly in the two top corners of the card's first screen, behind
   * what hangs there: one ornament, a copy in each corner. Absent for a pack
   * with none. See components/card/decor/TopCorners.tsx.
   */
  topCorners?: readonly AnyOrnamentId[];
}

/**
 * How the card sets a pack's greeting and blessing, for a pack that sets them
 * as one composed block rather than at the default sizes.
 *
 * The Hindu opening is a mantra, its reading and its meaning, then a shlok and
 * its meaning, under brush calligraphy. Set at the default sizes, each line was
 * a different face and weight and the shlok out-shouted the mantra. So: one
 * traditional serif for every Devanagari line, the card's body face for every
 * English one (inherited, never named here), the mantra at a medium size and
 * the shlok smaller, both regular.
 */
interface CardHeadType {
  /** The font stack for the script lines, in place of the script's text face. */
  scriptFace: string;
  /** Size classes for the greeting's and the blessing's script line. */
  greetingClass: string;
  blessingClass: string;
  /** Their leading. The blessing's is looser: it runs to two lines. */
  greetingLeading: string;
  blessingLeading: string;
  /** Size class for the English lines under each. */
  englishClass: string;
  /**
   * The font stack for those English lines, in place of the card's body face.
   * A serif beside the serif Devanagari, inside this block and nowhere else.
   */
  englishFace: string;
  /**
   * Whether the opening screen sets its block from the top of the space it
   * has, rather than centred in it. The top is already held clear of the
   * hanging border and the fade, so this only closes the extra gap centring
   * adds under a tall block.
   */
  alignTop: boolean;
}

/**
 * One row in a greeting or blessing list, with the script field named for its
 * role rather than for its alphabet.
 *
 * `script` is the Arabic in a Muslim pack and the Devanagari in a Hindu one.
 * Renaming it at this boundary is what lets the panel and the card hold one
 * list-rendering path: the content files keep their own honest field names,
 * which is where the review happens, and the UI never learns either.
 */
export interface PackBlessing {
  id: string;
  label: string;
  script: string;
  transliteration: string;
  translation: string;
  /** Which occasion it suits. Empty on greetings, which are not occasion bound. */
  occasionNote: string;
  /** Where a quoted blessing is from, set small under its meaning. */
  source?: string;
}

/**
 * Renders one run of the pack's script, owning its font, its lang and — the
 * point of the indirection — whether it carries a `dir` at all.
 *
 * A pack supplies this rather than a font name and a direction string, because
 * Devanagari's rule is not "dir is ltr", it is "there is no dir here and the
 * text sits in a span tagged hi". That is not expressible as a pair of values,
 * and a caller reconstructing it from parts is a caller that can get it wrong.
 */
type ScriptRun = (props: {
  children: string;
  className?: string;
  style?: CSSProperties;
}) => ReactElement | null;

export interface TraditionPack {
  traditionId: TraditionId;
  ornaments: readonly PackOrnament[];
  /** Muted line under the ornament grid. */
  ornamentsNote: string;
  greetings: readonly PackBlessing[];
  blessings: readonly PackBlessing[];
  /** Heading over the blessing list — the slot the dua and the shlok share. */
  blessingLabel: string;
  /** Muted line under the blessing list. */
  blessingNote: string;
  ScriptRun: ScriptRun;
  /**
   * Type size and leading for a script line in the editor's panel.
   *
   * Per pack because leading is a property of the script, not of the layout:
   * naskh with full harakat wants 1.9, and Devanagari brings its own measured
   * line-height with the face, so the Hindu class deliberately sets none.
   */
  panelScriptClass: string;
  /** Shown in place of a line of script that has not been supplied yet. */
  pendingLabel: string;
  /**
   * Whether an id is the deliberate opt-out rather than an entry still awaiting
   * its text. Taken from the tradition's own content file — callers must ask
   * this and never compare against "none" themselves, because the two states
   * are indistinguishable from outside and only the content file knows which
   * is which.
   */
  isOptOut: (id: string | null) => boolean;
  findGreeting: (id: string | null) => PackBlessing | null;
  findBlessing: (id: string | null) => PackBlessing | null;
  findOrnament: (id: AnyOrnamentId) => PackOrnament | null;
  /**
   * The ornament that frames the cover, if this pack has one.
   *
   * An arch is not decor scattered on the card; it is a frame the cover's
   * content sits inside, so it gets a slot of its own rather than being placed
   * like the rest. Null for a pack with no arch.
   */
  coverArchId: AnyOrnamentId | null;
  /**
   * The ornament used as the rule between sections, if this pack has one.
   *
   * A long, wide, low drawing — a vine, a running border, a branch. Null for a
   * pack with none, in which case the card keeps its plain hairline.
   */
  dividerId: AnyOrnamentId | null;
  /**
   * The calligraphic panels that head the card, in the order they are set.
   *
   * A fourth claim beside the arch and the divider, and it exists for the same
   * reason they do: CardCanvas hands every ornament no layer has claimed to the
   * scatter, so without a slot of their own these would be sprinkled across the
   * card at 30px like stars. They are not decor placed on the card — they are
   * lines that are read, and they belong at the head with the greeting.
   *
   * A list rather than a single id, because a pack can offer more than one and
   * a host can want more than one: the Bismillah opens a card and the verse
   * speaks to the occasion, and whoever wants both should get both. Whichever
   * are switched on render in this order, above the greeting.
   *
   * Empty for a pack with none, which is every pack but the Muslim one. The
   * other five have their own scripts and their own opening lines, but no
   * artwork set in them; a pack gets entries here when there is calligraphy to
   * put in them, and not before.
   */
  calligraphyIds: readonly AnyOrnamentId[];
  /**
   * Where this pack's ornaments go, if they have fixed places. Null for a pack
   * whose ornaments hang, frame and scatter as they always have.
   */
  slots: OrnamentSlots | null;
  /** How the card sets the greeting and blessing, or null for the default. */
  cardHead: CardHeadType | null;
  /**
   * Whether the card's opening and its names are one screen: the calligraphy,
   * the blessing in its own script alone, with neither its reading nor its
   * meaning, and under it the names inside a frame the host picks
   * (lib/namesFrame.ts), with the event's title below. See
   * components/card/NamesOpening.tsx.
   *
   * On such a card no greeting is drawn, the names have no screen of their
   * own after the opening, and nothing is drawn above the names: the
   * calligraphy already heads the card. The host's stored greeting and
   * above-names ornament are kept as they are, and the panel does not offer
   * either. The pair from the bottom corners stands beside the frame's foot.
   */
  namesOpening?: true;
  /**
   * The box inside the pack's frame that the names are set in, as shares of
   * the frame's picture. Only for a pack whose slots have a `frame`.
   */
  frameOpening?: { x: number; y: number; width: number; height: number };
}

/**
 * Devanagari sits in a tagged span; this is the block that centres it.
 *
 * Built per language rather than once, because three packs set Devanagari and
 * they are not the same language — Hindi for the Hindu pack, Sanskrit and
 * Prakrit for the Jain one, Pali for the Buddhist one. The face and the
 * leading are identical either way.
 */
function devanagariRun(lang: string): ScriptRun {
  const Run: ScriptRun = ({ children, className, style }) => {
    if (children.length === 0) {
      return null;
    }

    return (
      <p className={className} style={style}>
        <DevanagariText lang={lang}>{children}</DevanagariText>
      </p>
    );
  };

  return Run;
}

/** Gurmukhi sits in a span tagged `pa`; this is the block that centres it. */
const GurmukhiRun: ScriptRun = ({ children, className, style }) => {
  if (children.length === 0) {
    return null;
  }

  return (
    <p className={className} style={style}>
      <GurmukhiText>{children}</GurmukhiText>
    </p>
  );
};

/**
 * A run of Latin-alphabet text in the card's own body face.
 *
 * Serves the Christian pack, whose lines are English. No family is set — see
 * components/type/LatinScriptText.tsx.
 */
function latinRun(lang: string, leading?: number): ScriptRun {
  const Run: ScriptRun = ({ children, className, style }) => {
    if (children.length === 0) {
      return null;
    }

    return (
      <p
        className={className}
        /*
          The card sets its script lines at a leading made for Arabic and
          Devanagari, double the size. A pack whose lines are sentences of
          English says its own, or a four line verse fills the screen.
        */
        style={leading === undefined ? style : { lineHeight: leading, ...style }}
      >
        <LatinScriptText lang={lang}>{children}</LatinScriptText>
      </p>
    );
  };

  return Run;
}

function fromArabic(entry: Greeting | Dua): PackBlessing {
  return {
    id: entry.id,
    label: entry.label,
    script: entry.arabic,
    transliteration: entry.transliteration,
    translation: entry.translation,
    occasionNote: "occasionNote" in entry ? entry.occasionNote : "",
  };
}

function fromGurmukhi(entry: SikhGreeting | SikhBlessing): PackBlessing {
  return {
    id: entry.id,
    label: entry.label,
    script: entry.gurmukhi,
    transliteration: entry.transliteration,
    translation: entry.translation,
    occasionNote: "occasionNote" in entry ? entry.occasionNote : "",
    ...("source" in entry && entry.source !== undefined ? { source: entry.source } : null),
  };
}

function fromEnglish(
  entry: ChristianGreeting | ChristianBlessing,
): PackBlessing {
  return {
    id: entry.id,
    label: entry.label,
    script: entry.english,
    transliteration: entry.transliteration,
    translation: entry.translation,
    occasionNote: "occasionNote" in entry ? entry.occasionNote : "",
    /* Chapter and verse, set where every pack's source is: small, under the line. */
    ...(entry.reference !== undefined ? { source: entry.reference } : null),
  };
}

function fromJain(entry: JainGreeting | JainBlessing): PackBlessing {
  return {
    id: entry.id,
    label: entry.label,
    script: entry.devanagari,
    transliteration: entry.transliteration,
    translation: entry.translation,
    occasionNote: "occasionNote" in entry ? entry.occasionNote : "",
  };
}

function fromPali(
  entry: BuddhistGreeting | BuddhistBlessing,
): PackBlessing {
  return {
    id: entry.id,
    label: entry.label,
    script: entry.pali,
    transliteration: entry.transliteration,
    translation: entry.translation,
    occasionNote: "occasionNote" in entry ? entry.occasionNote : "",
  };
}

function fromDevanagari(entry: HinduGreeting | Shlok): PackBlessing {
  return {
    id: entry.id,
    label: entry.label,
    script: entry.devanagari,
    transliteration: entry.transliteration,
    translation: entry.translation,
    occasionNote: "occasionNote" in entry ? entry.occasionNote : "",
  };
}

/** Attaches each pack's aspect ratios to its entries. See PackOrnament.aspect. */
function withAspect<T extends { id: string }>(
  entries: readonly (T & { id: string })[],
  aspects: Record<string, number>,
): readonly PackOrnament[] {
  return entries.map((entry) => ({
    ...(entry as unknown as PackOrnament),
    aspect: aspects[entry.id],
  }));
}

/** Null for an unknown or unset id, so a caller renders nothing. */
function find(
  rows: readonly PackBlessing[],
  id: string | null,
): PackBlessing | null {
  if (id === null) {
    return null;
  }

  return rows.find((row) => row.id === id) ?? null;
}

const MUSLIM_PACK_ORNAMENTS = withAspect(MUSLIM_ORNAMENTS, ORNAMENT_ASPECT);
const HINDU_PACK_ORNAMENTS = withAspect(HINDU_ORNAMENTS, HINDU_ORNAMENT_ASPECT);
const SIKH_PACK_ORNAMENTS = withAspect(SIKH_ORNAMENTS, SIKH_ORNAMENT_ASPECT);
const CHRISTIAN_PACK_ORNAMENTS = withAspect(CHRISTIAN_ORNAMENTS, CHRISTIAN_ORNAMENT_ASPECT);
const JAIN_PACK_ORNAMENTS = withAspect(JAIN_ORNAMENTS, JAIN_ORNAMENT_ASPECT);
const BUDDHIST_PACK_ORNAMENTS = withAspect(BUDDHIST_ORNAMENTS, BUDDHIST_ORNAMENT_ASPECT);

const MUSLIM_GREETINGS = GREETINGS.map(fromArabic);
const MUSLIM_DUAS = DUAS.map(fromArabic);
const HINDU_GREETING_ROWS = HINDU_GREETINGS.map(fromDevanagari);
const HINDU_SHLOK_ROWS = SHLOKS.map(fromDevanagari);

const MUSLIM_PACK: TraditionPack = {
  traditionId: "muslim",
  ornaments: MUSLIM_PACK_ORNAMENTS,
  ornamentsNote: "Lanterns, moons and lights hang from the top of your card.",
  greetings: MUSLIM_GREETINGS,
  blessings: MUSLIM_DUAS,
  blessingLabel: "Dua",
  blessingNote: "The dua appears at the top of your card.",
  ScriptRun: ArabicText,
  panelScriptClass: "text-[1.0625rem] leading-[1.9]",
  pendingLabel: "Arabic text pending",
  isOptOut: isArabicOptOut,
  findGreeting: (id) => find(MUSLIM_GREETINGS, id),
  findBlessing: (id) => find(MUSLIM_DUAS, id),
  findOrnament: (id) => MUSLIM_PACK_ORNAMENTS.find((o) => o.id === id) ?? null,
  /*
    No arch. The Muslim pack had one and it is gone — the drawing framed the
    cover in the card's accent and read as a diagram beside the photographed
    lanterns it now shares a card with. The Sikh and Christian packs keep
    theirs; this slot is per pack for exactly that reason.
  */
  coverArchId: null,
  dividerId: "arabesqueBorder",
  slots: null,
  cardHead: null,
  /*
    This order is the order they stack at the head of a card, so the
    Bismillah stays first. The four added later go after the original two,
    which leaves every card already saved with those two exactly as it was.
  */
  calligraphyIds: [
    "bismillah",
    "versePairs",
    "barakallah",
    "alhamdulillah",
  ],
};

/*
  Tiro Devanagari Hindi, the traditional serif the app already loads for
  Hindi names and headings (--font-hi-tiro, app/layout.tsx), so nothing new is
  fetched. It has conjuncts for क्र, र्य, र्व, ग्न and र्ये drawn as ligatures,
  and one weight, so "regular" is what it has.

  Shared by the Jain and Buddhist packs, whose lines are Devanagari too: one
  face for the script on all three.
*/
const DEVANAGARI_CARD_HEAD: CardHeadType = {
  scriptFace:
    'var(--font-hi-tiro), var(--font-devanagari), "Noto Serif Devanagari", serif',
  greetingClass:
    "text-[calc(1.375rem*var(--card-opening-text,1))] sm:text-[calc(1.5*var(--card-rem,1rem)*var(--card-opening-text,1))]",
  blessingClass:
    "text-[calc(1.0625rem*var(--card-opening-text,1))] sm:text-[calc(1.1875*var(--card-rem,1rem)*var(--card-opening-text,1))]",
  greetingLeading: "1.6",
  blessingLeading: "1.9",
  englishClass:
    "text-[calc(0.875*var(--card-rem,1rem)*var(--card-opening-text,1))] leading-[1.5]",
  /* Lora, already loaded by app/layout.tsx for the card's pairs. */
  englishFace: 'var(--font-lora), Georgia, "Times New Roman", serif',
  alignTop: true,
};

const HINDU_PACK: TraditionPack = {
  traditionId: "hindu",
  ornaments: HINDU_PACK_ORNAMENTS,
  ornamentsNote: HINDU_ORNAMENTS_NOTE,
  greetings: HINDU_GREETING_ROWS,
  blessings: HINDU_SHLOK_ROWS,
  blessingLabel: "Shlok",
  blessingNote: SHLOK_NOTE,
  ScriptRun: devanagariRun(DEVANAGARI_LANG),
  /* No leading: DevanagariText carries the measured one with the face. */
  panelScriptClass: "text-[1.0625rem]",
  pendingLabel: "Devanagari text pending",
  isOptOut: isDevanagariOptOut,
  findGreeting: (id) => find(HINDU_GREETING_ROWS, id),
  findBlessing: (id) => find(HINDU_SHLOK_ROWS, id),
  findOrnament: (id) => HINDU_PACK_ORNAMENTS.find((o) => o.id === id) ?? null,
  coverArchId: null,
  /*
    No divider. The toran was the rule between sections and is now one of the
    two things that can hang across the top — one ornament cannot be in two
    places — so the sections are divided by the card's plain hairline.
  */
  dividerId: null,
  slots: {
    top: ["toran", "marigold"],
    aboveNames: ["ganesh", "om", "swastik"],
    corners: ["diya", "kalash"],
    topCorners: ["mandala"],
  },
  cardHead: DEVANAGARI_CARD_HEAD,
  namesOpening: true,
  calligraphyIds: [
    "shubhVivah",
    "sadarNimantran",
    "shriGaneshaya",
    "vivahotsav",
    "radheKrishna",
  ],
};

const SIKH_GREETING_ROWS = SIKH_GREETINGS.map(fromGurmukhi);
const SIKH_BLESSING_ROWS = SIKH_BLESSINGS.map(fromGurmukhi);
const CHRISTIAN_GREETING_ROWS = CHRISTIAN_GREETINGS.map(fromEnglish);
const CHRISTIAN_BLESSING_ROWS = CHRISTIAN_BLESSINGS.map(fromEnglish);
const JAIN_GREETING_ROWS = JAIN_GREETINGS.map(fromJain);
const JAIN_BLESSING_ROWS = JAIN_BLESSINGS.map(fromJain);
const BUDDHIST_GREETING_ROWS = BUDDHIST_GREETINGS.map(fromPali);
const BUDDHIST_BLESSING_ROWS = BUDDHIST_BLESSINGS.map(fromPali);

const SIKH_PACK: TraditionPack = {
  traditionId: "sikh",
  ornaments: SIKH_PACK_ORNAMENTS,
  ornamentsNote: SIKH_ORNAMENTS_NOTE,
  greetings: SIKH_GREETING_ROWS,
  blessings: SIKH_BLESSING_ROWS,
  blessingLabel: "Blessing",
  blessingNote: "The blessing appears at the top of your card.",
  ScriptRun: GurmukhiRun,
  /* No leading: GurmukhiText carries the measured one with the face. */
  panelScriptClass: "text-[1.0625rem]",
  pendingLabel: "Gurmukhi text pending",
  isOptOut: isGurmukhiOptOut,
  findGreeting: (id) => find(SIKH_GREETING_ROWS, id),
  findBlessing: (id) => find(SIKH_BLESSING_ROWS, id),
  findOrnament: (id) => SIKH_PACK_ORNAMENTS.find((o) => o.id === id) ?? null,
  /*
    Neither any more: both ornaments have places of their own now. The arch is
    a picture set round the names (`frame` below), not an outline stretched
    over the cover, and the band is the top border, not the rule between
    sections, which the card's garland divider has taken over.
  */
  coverArchId: null,
  dividerId: null,
  /*
    The same ids the pack has always stored, read as places. A card saved
    before there were places keeps every ornament it had; each simply moves to
    where it belongs.
  */
  slots: {
    top: ["kandaFloralBorder"],
    aboveNames: ["ikOnkar", "khanda"],
    corners: ["lotus", "lotus"],
    frame: ["gurudwaraArch"],
    sides: ["nishanSahibPennant"],
  },
  frameOpening: GURUDWARA_ARCH_DOORWAY,
  /*
    The Hindu block's type system, in Gurmukhi: Tiro Gurmukhi for the script
    lines, with the card's own Gurmukhi face behind it, and Lora for the
    English under them. The blessing is two lines of verse, each of which has
    to stay one line on a 360px card, so it is set a step smaller than the
    Hindu shlok.
  */
  cardHead: {
    scriptFace:
      'var(--font-pa-tiro), var(--font-gurmukhi), "Noto Serif Gurmukhi", "Noto Sans Gurmukhi", serif',
    greetingClass:
      "text-[calc(1.375rem*var(--card-opening-text,1))] sm:text-[calc(1.5*var(--card-rem,1rem)*var(--card-opening-text,1))]",
    blessingClass:
      "text-[calc(1rem*var(--card-opening-text,1))] sm:text-[calc(1.125*var(--card-rem,1rem)*var(--card-opening-text,1))]",
    greetingLeading: "1.7",
    blessingLeading: "1.9",
    englishClass:
      "text-[calc(0.875*var(--card-rem,1rem)*var(--card-opening-text,1))] leading-[1.5]",
    englishFace: 'var(--font-lora), Georgia, "Times New Roman", serif',
    alignTop: true,
  },
  /* The order the panel offers them: the ceremony's own name first. */
  calligraphyIds: [
    "anandKaraj",
    "shubhViah",
    "satnamWaheguru",
    "waheguru",
    "guruKirpa",
    "sarbatDaBhala",
  ],
};

const CHRISTIAN_PACK: TraditionPack = {
  traditionId: "christian",
  ornaments: CHRISTIAN_PACK_ORNAMENTS,
  ornamentsNote: CHRISTIAN_ORNAMENTS_NOTE,
  greetings: CHRISTIAN_GREETING_ROWS,
  blessings: CHRISTIAN_BLESSING_ROWS,
  blessingLabel: "Blessing",
  blessingNote: "The blessing appears at the top of your card.",
  ScriptRun: latinRun(CHRISTIAN_LANG, 1.5),
  /* Latin in the body face; the run above carries its own leading. */
  panelScriptClass: "text-[1.0625rem] leading-[1.6]",
  pendingLabel: "Text pending",
  isOptOut: isEnglishOptOut,
  findGreeting: (id) => find(CHRISTIAN_GREETING_ROWS, id),
  findBlessing: (id) => find(CHRISTIAN_BLESSING_ROWS, id),
  findOrnament: (id) => CHRISTIAN_PACK_ORNAMENTS.find((o) => o.id === id) ?? null,
  /*
    No cover arch any more. The gothic arch was an outline the cover's content
    sat inside; its picture is a church window, full of glass, and nothing can
    be set inside it. It stands above the names instead, as the cross does.
  */
  coverArchId: null,
  dividerId: "oliveBranch",
  /*
    The same ids the pack has always stored, read as places. The bells and the
    rings are not here: they hang, as they always have, from HangingLayer's own
    table, and the olive branch is the divider. Nothing in this pack is
    scattered any more: the dove and the chalice were, behind the writing and
    at the foot of the screen, which is no place for a painting of either.
  */
  slots: {
    top: [],
    aboveNames: ["plainCross", "gothicArch", "bibleRings", "chalice"],
    corners: ["lilyCorner", "lilyCorner"],
    sides: ["dove"],
    sidesLabel: "Beside the names",
  },
  cardHead: null,
  /* The order the panel offers them. */
  calligraphyIds: [
    "godIsLove",
    "loveNeverFails",
    "twoBecomeOne",
    "godHasJoined",
    "holyMatrimony",
    "loveIsPatient",
  ],
};

const JAIN_PACK: TraditionPack = {
  traditionId: "jain",
  ornaments: JAIN_PACK_ORNAMENTS,
  ornamentsNote: JAIN_ORNAMENTS_NOTE,
  greetings: JAIN_GREETING_ROWS,
  blessings: JAIN_BLESSING_ROWS,
  blessingLabel: "Blessing",
  blessingNote: "The blessing appears at the top of your card.",
  /* The Hindu pack's face, declared as Sanskrit rather than Hindi. */
  ScriptRun: devanagariRun(JAIN_LANG),
  panelScriptClass: "text-[1.0625rem]",
  pendingLabel: "Devanagari text pending",
  isOptOut: isJainOptOut,
  findGreeting: (id) => find(JAIN_GREETING_ROWS, id),
  findBlessing: (id) => find(JAIN_BLESSING_ROWS, id),
  findOrnament: (id) => JAIN_PACK_ORNAMENTS.find((o) => o.id === id) ?? null,
  coverArchId: null,
  dividerId: null,
  /*
    The same ids the pack has always stored, read as places. The toran hangs
    across the top. The swastika, the ahimsa hand and the Siddhashila are
    emblems of the faith: they stand above the names, one at a time, and are
    never scattered behind the writing or stood at the foot of the card, which
    is where the scatter used to put them. The kalash and the lotus stand in
    the bottom corners, as the Hindu pack's diya and kalash do.
  */
  slots: {
    top: ["tornGate"],
    aboveNames: ["swastika", "ahimsaHand", "siddhaShila"],
    corners: ["kalash", "lotus"],
  },
  /* The Hindu block's type, so the Devanagari is the same face on both. */
  cardHead: DEVANAGARI_CARD_HEAD,
  /* The order the panel offers them: the greeting first. */
  calligraphyIds: [
    "jainJaiJinendra",
    "jainShubhVivah",
    "jainMangalParinay",
    "jainNamoArihantanam",
    "jainShriMahaviraya",
  ],
};

const BUDDHIST_PACK: TraditionPack = {
  traditionId: "buddhist",
  ornaments: BUDDHIST_PACK_ORNAMENTS,
  ornamentsNote: BUDDHIST_ORNAMENTS_NOTE,
  greetings: BUDDHIST_GREETING_ROWS,
  blessings: BUDDHIST_BLESSING_ROWS,
  blessingLabel: "Blessing",
  blessingNote: "The blessing appears at the top of your card.",
  /* The Hindu pack's face, declared as Pali — see the header of lib/buddhistContent.ts. */
  ScriptRun: devanagariRun(PALI_LANG),
  panelScriptClass: "text-[1.0625rem]",
  pendingLabel: "Devanagari text pending",
  isOptOut: isPaliOptOut,
  findGreeting: (id) => find(BUDDHIST_GREETING_ROWS, id),
  findBlessing: (id) => find(BUDDHIST_BLESSING_ROWS, id),
  findOrnament: (id) => BUDDHIST_PACK_ORNAMENTS.find((o) => o.id === id) ?? null,
  coverArchId: null,
  dividerId: null,
  /*
    The same ids the pack has always stored, read as places. The prayer flags
    hang across the top, as the Jain toran does. The dharma wheel, the endless
    knot and the stupa are emblems of the faith: they stand above the names,
    one at a time, and are never scattered behind the writing or stood at the
    foot of the card, which is where the scatter used to put them. The lotus,
    the Bodhi leaf and the conch stand in the bottom corners, two of the three
    at a time. Nothing in this pack is scattered any more.
  */
  slots: {
    top: ["prayerFlagString"],
    aboveNames: ["dharmaWheel", "endlessKnot", "stupaOutline"],
    corners: ["lotus", "bodhiLeaf", "conchShell"],
  },
  /* The Hindu block's type, so the Devanagari is the same face on all three. */
  cardHead: DEVANAGARI_CARD_HEAD,
  /* The order the panel offers them: the pack's own line first. */
  calligraphyIds: [
    "buddhistBuddhamSaranam",
    "buddhistMangalParinay",
    "buddhistShubhVivah",
  ],
};

const PACKS: Partial<Record<TraditionId, TraditionPack>> = {
  muslim: MUSLIM_PACK,
  hindu: HINDU_PACK,
  sikh: SIKH_PACK,
  christian: CHRISTIAN_PACK,
  jain: JAIN_PACK,
  buddhist: BUDDHIST_PACK,
};

/**
 * The pack for a tradition, or null where that tradition has none.
 *
 * The one gate on the whole feature. Only "none" returns null now — the other
 * six all have packs — and a null still means no panel, no chips and no
 * ornaments on the card, exactly as it did when five traditions returned it.
 */
export function getTraditionPack(
  traditionId: TraditionId,
): TraditionPack | null {
  return PACKS[traditionId] ?? null;
}
