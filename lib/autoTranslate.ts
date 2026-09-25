import {
  isWritten,
  setDraftWord,
  setSectionWord,
  setSubEventWord,
} from "@/lib/cardTranslation";
import { JOINER_PRESETS } from "@/lib/cardLanguage";
import type { CardLanguage } from "@/types/card";
import type { CardBlock, CustomSectionWords } from "@/types/customSection";
import type { DraftWords, EventDraft, SubEventWords } from "@/types/event";

/**
 * The one-click Translate helper in the Details tab.
 *
 * WHAT IT DOES. The host writes the card in its own language; this fills the
 * other language's words (the `translations` the TranslationPanel edits) from
 * them, through /api/translate. Nothing new is stored: results land in the
 * same fields a host would type into by hand, and stay editable there.
 *
 * TWO KINDS OF FIELD. A name keeps its sound and only changes script — "Rose
 * Khan" is रोज़ ख़ान, never गुलाब खान — so names, family names, cities, venues,
 * addresses and timeline function names are TRANSLITERATED. Only free text
 * (the title, the note, custom sections) is TRANSLATED for meaning.
 *
 * CEREMONY WORDS ARE NAMES TOO. "Walima" translated for meaning is भोजन, a
 * meal, and the card has lost the name of the function. So timeline function
 * names are transliterated, and the event title and custom section headings,
 * which are still translated, keep every word in CEREMONY_GLOSSARY at its
 * fixed spelling. See splitByGlossary.
 *
 * ONCE PER INVITATION. The helper fills the other language one time; after
 * that the host edits by hand. The flag is `translationUsed` on the draft.
 *
 * WHAT IT NEVER TOUCHES. The card's fixed copy (lib/cardLanguage.ts) and the
 * religious text of the tradition packs already exist in each language and are
 * not host-typed, so they are not fields here at all.
 *
 * Pure functions and shared constants: the route and the editor import the
 * same limits, so the button and the server cannot disagree about them.
 */

/** The most characters one request may carry, across every field in it. */
export const TRANSLATE_MAX_TOTAL_CHARS = 3000;

/** Sarvam's translate model (mayura:v1) takes at most 1000 characters an input. */
export const TRANSLATE_MAX_FIELD_CHARS = 1000;

/** Script change only, or meaning. */
export type TranslateMode = "transliterate" | "translate";

export interface TranslateItem {
  /** Echoed back so the editor knows which field a result belongs to. */
  id: string;
  mode: TranslateMode;
  text: string;
  /**
   * Keep ceremony words (CEREMONY_GLOSSARY) at their fixed spelling and send
   * only the rest of the text to Sarvam.
   */
  keepCeremonyWords?: boolean;
}

export interface TranslateRequest {
  from: CardLanguage;
  to: CardLanguage;
  items: TranslateItem[];
  /**
   * The editor's id for this card, minted on its first translate and kept in
   * `autoTranslation.cardId`. What the server's one-per-card rule counts.
   */
  cardId: string;
  /** The saved invitation, on the edit page; null on /create. */
  eventId: string | null;
}

export interface TranslateResponse {
  results: { id: string; text: string }[];
  /** Ids the service failed on. The rest of the results are still good. */
  failed: string[];
}

/**
 * Why the server said no, for the editor to act on rather than only print:
 * sign the host in, mark the card used, or point at the unpaid card.
 */
export type TranslateRefusal = "signed_out" | "already_used" | "unpaid_card_pending";

export interface TranslateErrorResponse {
  error: string;
  code?: TranslateRefusal;
  /** With "unpaid_card_pending": the unpaid invitation, when it was saved. */
  pendingEventId?: string | null;
}

/* ---------------------------------------------------------------------------
   Ceremony words.
   --------------------------------------------------------------------------- */

/**
 * Ceremony words and their fixed spelling in each language.
 *
 * Replaced directly and never sent to Sarvam, which saves the credits and
 * stops "Walima" coming back as भोजन. The first spelling in each list is the
 * one written out; the others are only recognised, so "Valima" and वलिमा both
 * resolve, and रुखसती without its dot is still caught.
 *
 * "Engagement" is kept as एंगेजमेंट rather than सगाई so the table reads the
 * same both ways: सगाई is "Sagai".
 */
export const CEREMONY_GLOSSARY: readonly {
  en: readonly string[];
  hi: readonly string[];
}[] = [
  { en: ["Nikah", "Nikaah"], hi: ["निकाह"] },
  { en: ["Walima", "Valima"], hi: ["वलीमा", "वलिमा"] },
  { en: ["Mehndi", "Mehendi"], hi: ["मेहंदी", "मेहँदी", "मेंहदी"] },
  { en: ["Haldi"], hi: ["हल्दी"] },
  { en: ["Baraat", "Barat"], hi: ["बारात"] },
  { en: ["Sangeet"], hi: ["संगीत"] },
  { en: ["Rukhsati"], hi: ["रुख़सती", "रुखसती"] },
  { en: ["Manjha", "Manja"], hi: ["मांझा", "माँझा"] },
  { en: ["Mayun", "Mayoun"], hi: ["मायूं", "मायूँ"] },
  { en: ["Sehra"], hi: ["सेहरा"] },
  { en: ["Engagement"], hi: ["एंगेजमेंट", "इंगेजमेंट"] },
  { en: ["Sagai"], hi: ["सगाई"] },
  { en: ["Reception"], hi: ["रिसेप्शन"] },
];

/** Each glossary spelling in `from`, lower-cased, to the one written in `to`. */
function glossaryIn(from: CardLanguage, to: CardLanguage): Map<string, string> {
  const map = new Map<string, string>();

  for (const entry of CEREMONY_GLOSSARY) {
    for (const spelling of entry[from]) {
      map.set(spelling.toLowerCase(), entry[to][0]);
    }
  }

  return map;
}

/** One piece of a field: a ceremony word already in `to`, or text to send. */
export type GlossaryPart =
  | { kind: "fixed"; text: string }
  | { kind: "send"; text: string };

/**
 * The text cut at every ceremony word.
 *
 * A glossary word becomes its fixed spelling in `to`; everything between is
 * left for Sarvam. Whole words only and in any case, so "nikah" and "NIKAH"
 * match and "Sangeeta", a name, does not. A letter or a combining mark on
 * either side stops a match, which is what makes "whole word" hold for
 * Devanagari as well as Latin: \b does not understand matras.
 *
 * The glossary holds only letters, so its spellings go into the pattern as
 * they are.
 */
export function splitByGlossary(
  text: string,
  from: CardLanguage,
  to: CardLanguage,
): GlossaryPart[] {
  const glossary = glossaryIn(from, to);
  const spellings = [...glossary.keys()].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{M}])(?:${spellings.join("|")})(?![\\p{L}\\p{M}])`,
    "giu",
  );
  const parts: GlossaryPart[] = [];
  let last = 0;

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;

    if (index > last) {
      parts.push({ kind: "send", text: text.slice(last, index) });
    }

    parts.push({
      kind: "fixed",
      text: glossary.get(match[0].toLowerCase()) ?? match[0],
    });
    last = index + match[0].length;
  }

  if (last < text.length) {
    parts.push({ kind: "send", text: text.slice(last) });
  }

  return parts;
}

/* ---------------------------------------------------------------------------
   Which field goes through which mode.
   --------------------------------------------------------------------------- */

const DRAFT_MODES: Record<keyof DraftWords, TranslateMode> = {
  partyOneName: "transliterate",
  partyTwoName: "transliterate",
  hostNames: "transliterate",
  partyOneParents: "transliterate",
  partyTwoParents: "transliterate",
  partyOneCity: "transliterate",
  partyTwoCity: "transliterate",
  venueName: "transliterate",
  venueAddress: "transliterate",
  eventTitle: "translate",
  message: "translate",
  /* Only a word the host typed themselves; see draftWords below. */
  joinerWord: "translate",
};

const SUB_EVENT_MODES: Record<keyof SubEventWords, TranslateMode> = {
  /* A function's name is a name: "Walima" is वलीमा, not भोजन. */
  label: "transliterate",
  venueName: "transliterate",
  venueAddress: "transliterate",
  note: "translate",
};

const SECTION_MODES: Record<keyof CustomSectionWords, TranslateMode> = {
  heading: "translate",
  body: "translate",
};

/**
 * The fields whose ceremony words keep their glossary spelling: short names
 * of things, where cutting the text at a ceremony word costs nothing. Not the
 * note or a section's body, which are sentences and read worse in pieces.
 */
function keepsCeremonyWords(address: WordAddress): boolean {
  return (
    (address.kind === "draft" && address.field === "eventTitle") ||
    (address.kind === "subEvent" && address.field === "label") ||
    (address.kind === "section" && address.field === "heading")
  );
}

/** Where a word lives, so a result can be written back to the right field. */
export type WordAddress =
  | { kind: "draft"; field: keyof DraftWords }
  | { kind: "subEvent"; id: string; field: keyof SubEventWords }
  | { kind: "section"; id: string; field: keyof CustomSectionWords };

/** One host-typed field with text in the card's own language. */
export interface SourceWord {
  /** Stable per field; the request item id and the `sources` key. */
  key: string;
  address: WordAddress;
  mode: TranslateMode;
  /** Trimmed text in the card's own language. */
  text: string;
  /** See keepsCeremonyWords. */
  keepCeremonyWords: boolean;
  /** What the other language holds for it right now, possibly empty. */
  target: string;
}

function keyOf(address: WordAddress): string {
  return address.kind === "draft"
    ? `draft.${address.field}`
    : `${address.kind}.${address.id}.${address.field}`;
}

function sourceOf(
  draft: EventDraft,
  blocks: readonly CardBlock[],
  address: WordAddress,
): string {
  switch (address.kind) {
    case "draft":
      return draft[address.field] ?? "";
    case "subEvent":
      return (
        draft.subEvents.find((entry) => entry.id === address.id)?.[
          address.field
        ] ?? ""
      );
    case "section": {
      const block = blocks.find(
        (entry) => entry.kind === "custom" && entry.section.id === address.id,
      );
      return block?.kind === "custom" ? block.section[address.field] : "";
    }
  }
}

function targetOf(
  draft: EventDraft,
  blocks: readonly CardBlock[],
  to: CardLanguage,
  address: WordAddress,
): string {
  switch (address.kind) {
    case "draft":
      return draft.translations?.[to]?.[address.field] ?? "";
    case "subEvent":
      return (
        draft.subEvents.find((entry) => entry.id === address.id)
          ?.translations?.[to]?.[address.field] ?? ""
      );
    case "section": {
      const block = blocks.find(
        (entry) => entry.kind === "custom" && entry.section.id === address.id,
      );
      return block?.kind === "custom"
        ? (block.section.translations?.[to]?.[address.field] ?? "")
        : "";
    }
  }
}

/**
 * Every host-typed field with something written in the card's own language.
 *
 * The joining word only when the host typed one of their own: a preset
 * ("weds", "संग") already follows the language on the card by itself, so
 * sending it would spend a credit to get a worse answer.
 */
export function sourceWords(
  draft: EventDraft,
  blocks: readonly CardBlock[],
  from: CardLanguage,
  to: CardLanguage,
): SourceWord[] {
  const addresses: WordAddress[] = [
    ...(Object.keys(DRAFT_MODES) as (keyof DraftWords)[])
      .filter(
        (field) =>
          field !== "joinerWord" ||
          !JOINER_PRESETS[from].includes(draft.joinerWord.trim()),
      )
      .map((field): WordAddress => ({ kind: "draft", field })),
    ...draft.subEvents.flatMap((entry) =>
      (Object.keys(SUB_EVENT_MODES) as (keyof SubEventWords)[]).map(
        (field): WordAddress => ({ kind: "subEvent", id: entry.id, field }),
      ),
    ),
    ...blocks.flatMap((block) =>
      block.kind === "custom"
        ? (Object.keys(SECTION_MODES) as (keyof CustomSectionWords)[]).map(
            (field): WordAddress => ({
              kind: "section",
              id: block.section.id,
              field,
            }),
          )
        : [],
    ),
  ];

  return addresses.flatMap((address): SourceWord[] => {
    const text = sourceOf(draft, blocks, address).trim();

    if (!isWritten(text)) {
      return [];
    }

    const mode =
      address.kind === "draft"
        ? DRAFT_MODES[address.field]
        : address.kind === "subEvent"
          ? SUB_EVENT_MODES[address.field]
          : SECTION_MODES[address.field];

    return [
      {
        key: keyOf(address),
        address,
        mode,
        text,
        keepCeremonyWords: keepsCeremonyWords(address),
        target: targetOf(draft, blocks, to, address),
      },
    ];
  });
}

/* ---------------------------------------------------------------------------
   Not paying twice for the same text.
   --------------------------------------------------------------------------- */

/** Everything a result depends on: the direction, the mode and the exact text. */
export function cacheKey(
  from: CardLanguage,
  to: CardLanguage,
  mode: TranslateMode,
  text: string,
): string {
  return `${from}>${to}|${mode}|${text}`;
}

/**
 * A short FNV-1a fingerprint of a cache key.
 *
 * Stored on the draft instead of the text itself, so the saved invitation does
 * not carry a second copy of every word. A collision would only mean one field
 * is skipped that should have been sent, and the host can still type it.
 */
export function fingerprint(key: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(36);
}

/**
 * Whether this field was already translated from exactly this text, and its
 * translation (or the host's edit of it) is still in place.
 *
 * Such a field is never sent again, whichever option the host picks: the
 * answer would be the same, and "Replace all" would only undo their edits.
 */
export function isUpToDate(
  word: SourceWord,
  draft: EventDraft,
  from: CardLanguage,
  to: CardLanguage,
): boolean {
  return (
    isWritten(word.target) &&
    draft.autoTranslation?.sources?.[word.key] ===
      fingerprint(cacheKey(from, to, word.mode, word.text))
  );
}

/** The editor's id for this card, if it has had one minted. */
export function cardIdOf(draft: EventDraft): string | undefined {
  return draft.autoTranslation?.cardId;
}

/** Whether this invitation has had its one auto-translate. */
export function translationUsed(draft: EventDraft): boolean {
  return draft.autoTranslation?.translationUsed === true;
}

/* ---------------------------------------------------------------------------
   Writing results back. Called through state updaters, so a result is checked
   against the card as it is when it lands, not as it was when it was sent.
   --------------------------------------------------------------------------- */

export interface TranslatedWord {
  word: SourceWord;
  text: string;
}

/**
 * Whether a result may still be written: its source has not been edited while
 * the request was in flight, and it will not overwrite text the host chose to
 * keep.
 */
function canWrite(
  entry: TranslatedWord,
  source: string,
  target: string,
  replaceAll: boolean,
): boolean {
  return (
    source.trim() === entry.word.text &&
    isWritten(entry.text) &&
    (replaceAll || !isWritten(target))
  );
}

/**
 * The draft with every draft and function result written in `to`, the
 * fingerprints recorded, and the one translate marked used when `markUsed`.
 *
 * Every result's fingerprint is recorded, section results included, because a
 * fingerprint is of the text that was sent: if that text has since changed it
 * no longer matches and the field is simply sent again next time.
 */
export function applyToDraft(
  draft: EventDraft,
  from: CardLanguage,
  to: CardLanguage,
  entries: readonly TranslatedWord[],
  replaceAll: boolean,
  markUsed: boolean,
): EventDraft {
  let next = draft;

  for (const entry of entries) {
    const { address } = entry.word;

    if (address.kind === "section") {
      continue;
    }

    if (
      !canWrite(
        entry,
        sourceOf(next, [], address),
        targetOf(next, [], to, address),
        replaceAll,
      )
    ) {
      continue;
    }

    next =
      address.kind === "draft"
        ? setDraftWord(next, to, address.field, entry.text)
        : setSubEventWord(next, to, address.id, address.field, entry.text);
  }

  const sources = { ...next.autoTranslation?.sources };

  for (const entry of entries) {
    sources[entry.word.key] = fingerprint(
      cacheKey(from, to, entry.word.mode, entry.word.text),
    );
  }

  return {
    ...next,
    /* The card id, minted before the request, is carried through as it is. */
    autoTranslation: {
      ...next.autoTranslation,
      translationUsed: translationUsed(next) || markUsed,
      sources,
    },
  };
}

/** The blocks with every custom section result written in `to`. */
export function applyToBlocks(
  blocks: readonly CardBlock[],
  to: CardLanguage,
  entries: readonly TranslatedWord[],
  replaceAll: boolean,
): readonly CardBlock[] {
  let next = blocks;

  for (const entry of entries) {
    const { address } = entry.word;

    if (address.kind !== "section") {
      continue;
    }

    const block = next.find(
      (candidate) =>
        candidate.kind === "custom" && candidate.section.id === address.id,
    );

    if (block?.kind !== "custom") {
      continue;
    }

    if (
      !canWrite(
        entry,
        block.section[address.field],
        block.section.translations?.[to]?.[address.field] ?? "",
        replaceAll,
      )
    ) {
      continue;
    }

    next = setSectionWord(next, to, address.id, address.field, entry.text);
  }

  return next;
}
