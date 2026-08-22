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
export type ScriptRun = (props: {
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
}

/**
 * Devanagari sits in a tagged span; this is the block that centres it.
 *
 * Built per language rather than once, because two packs set Devanagari and
 * they are not the same language — Hindi for the Hindu pack, Sanskrit and
 * Prakrit for the Jain one. The face and the leading are identical either way.
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
 * Serves the Christian pack, whose lines are English, and the Buddhist one,
 * whose Pali is Roman by deliberate choice. No family is set — see
 * components/type/LatinScriptText.tsx.
 */
function latinRun(lang: string): ScriptRun {
  const Run: ScriptRun = ({ children, className, style }) => {
    if (children.length === 0) {
      return null;
    }

    return (
      <p className={className} style={style}>
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
  coverArchId: "mosqueArch",
  dividerId: "arabesqueBorder",
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
  dividerId: "toran",
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
  coverArchId: "gurudwaraArch",
  dividerId: "kandaFloralBorder",
};

const CHRISTIAN_PACK: TraditionPack = {
  traditionId: "christian",
  ornaments: CHRISTIAN_PACK_ORNAMENTS,
  ornamentsNote: CHRISTIAN_ORNAMENTS_NOTE,
  greetings: CHRISTIAN_GREETING_ROWS,
  blessings: CHRISTIAN_BLESSING_ROWS,
  blessingLabel: "Blessing",
  blessingNote: "The blessing appears at the top of your card.",
  ScriptRun: latinRun(CHRISTIAN_LANG),
  /* Latin in the body face, so the card's own leading is already right. */
  panelScriptClass: "text-[1.0625rem] leading-[1.6]",
  pendingLabel: "Text pending",
  isOptOut: isEnglishOptOut,
  findGreeting: (id) => find(CHRISTIAN_GREETING_ROWS, id),
  findBlessing: (id) => find(CHRISTIAN_BLESSING_ROWS, id),
  findOrnament: (id) => CHRISTIAN_PACK_ORNAMENTS.find((o) => o.id === id) ?? null,
  coverArchId: "gothicArch",
  dividerId: "oliveBranch",
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
};

const BUDDHIST_PACK: TraditionPack = {
  traditionId: "buddhist",
  ornaments: BUDDHIST_PACK_ORNAMENTS,
  ornamentsNote: BUDDHIST_ORNAMENTS_NOTE,
  greetings: BUDDHIST_GREETING_ROWS,
  blessings: BUDDHIST_BLESSING_ROWS,
  blessingLabel: "Blessing",
  blessingNote: "The blessing appears at the top of your card.",
  /* Roman Pali in the body face — see the header of lib/buddhistContent.ts. */
  ScriptRun: latinRun(PALI_LANG),
  panelScriptClass: "text-[1.0625rem] leading-[1.6]",
  pendingLabel: "Pali text pending",
  isOptOut: isPaliOptOut,
  findGreeting: (id) => find(BUDDHIST_GREETING_ROWS, id),
  findBlessing: (id) => find(BUDDHIST_BLESSING_ROWS, id),
  findOrnament: (id) => BUDDHIST_PACK_ORNAMENTS.find((o) => o.id === id) ?? null,
  coverArchId: null,
  dividerId: null,
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
