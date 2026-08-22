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
  HINDU_GREETINGS,
  SHLOKS,
  SHLOK_NOTE,
  isOptOut as isDevanagariOptOut,
  type HinduGreeting,
  type Shlok,
} from "@/lib/devanagariContent";
import { HINDU_ORNAMENTS, HINDU_ORNAMENTS_NOTE } from "@/lib/ornaments/hindu";
import { MUSLIM_ORNAMENTS, type Ornament } from "@/lib/ornaments/muslim";
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
}

/** Devanagari sits in a span tagged `hi`; this is the block that centres it. */
const DevanagariRun: ScriptRun = ({ children, className, style }) => {
  if (children.length === 0) {
    return null;
  }

  return (
    <p className={className} style={style}>
      <DevanagariText>{children}</DevanagariText>
    </p>
  );
};

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

const MUSLIM_GREETINGS = GREETINGS.map(fromArabic);
const MUSLIM_DUAS = DUAS.map(fromArabic);
const HINDU_GREETING_ROWS = HINDU_GREETINGS.map(fromDevanagari);
const HINDU_SHLOK_ROWS = SHLOKS.map(fromDevanagari);

const MUSLIM_PACK: TraditionPack = {
  traditionId: "muslim",
  ornaments: MUSLIM_ORNAMENTS,
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
};

const HINDU_PACK: TraditionPack = {
  traditionId: "hindu",
  ornaments: HINDU_ORNAMENTS,
  ornamentsNote: HINDU_ORNAMENTS_NOTE,
  greetings: HINDU_GREETING_ROWS,
  blessings: HINDU_SHLOK_ROWS,
  blessingLabel: "Shlok",
  blessingNote: SHLOK_NOTE,
  ScriptRun: DevanagariRun,
  /* No leading: DevanagariText carries the measured one with the face. */
  panelScriptClass: "text-[1.0625rem]",
  pendingLabel: "Devanagari text pending",
  isOptOut: isDevanagariOptOut,
  findGreeting: (id) => find(HINDU_GREETING_ROWS, id),
  findBlessing: (id) => find(HINDU_SHLOK_ROWS, id),
};

const PACKS: Partial<Record<TraditionId, TraditionPack>> = {
  muslim: MUSLIM_PACK,
  hindu: HINDU_PACK,
};

/**
 * The pack for a tradition, or null where that tradition has none.
 *
 * The one gate on the whole feature. Sikh, Christian, Jain, Buddhist and "none"
 * return null today and get no panel and no ornaments, which is the same
 * behaviour they had before either pack existed.
 */
export function getTraditionPack(
  traditionId: TraditionId,
): TraditionPack | null {
  return PACKS[traditionId] ?? null;
}
