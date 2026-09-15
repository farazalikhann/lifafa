import { cardLanguage, swapJoinerWord } from "@/lib/cardLanguage";
import type { CardConfig, CardLanguage } from "@/types/card";
import type {
  CardBlock,
  CustomSection,
  CustomSectionWords,
} from "@/types/customSection";
import type {
  DraftWords,
  EventDraft,
  SubEventWords,
  Translations,
} from "@/types/event";

/**
 * One invitation, in more than one language.
 *
 * THE MODEL. A card is written in its own language — the ordinary fields of
 * the draft — and may carry the host's words in each other language beside
 * them, in `translations`. Seeing the card in a language is laying those words
 * over the ordinary ones, field by field, wherever the host wrote one; and the
 * card's own words (the date, the headings, the reply form) follow the language
 * by themselves, because CardCanvas reads them from `config.language`.
 *
 * THE RULE THAT KEEPS IT SIMPLE FOR A HOST: a blank is a fallback, never a gap.
 * A host who writes the English names and nothing else sends an English card
 * whose venue is still in Hindi, which beats a card with no venue at all, and
 * nobody has to finish a whole second copy before they can share one.
 *
 * Pure functions over the stored shapes, so the guest page, the share image,
 * the editor and its previews all see a language the same way.
 */

/** The draft fields that are words, in the order the editor lists them. */
export const DRAFT_WORD_FIELDS: readonly (keyof DraftWords)[] = [
  "partyOneName",
  "partyTwoName",
  "joinerWord",
  "hostNames",
  "partyOneParents",
  "partyOneCity",
  "partyTwoParents",
  "partyTwoCity",
  "eventTitle",
  "venueName",
  "venueAddress",
  "message",
];

export const SUB_EVENT_WORD_FIELDS: readonly (keyof SubEventWords)[] = [
  "label",
  "venueName",
  "venueAddress",
  "note",
];

export const SECTION_WORD_FIELDS: readonly (keyof CustomSectionWords)[] = [
  "heading",
  "body",
];

/** Something with word fields of its own and a translation of them. */
type Worded<F extends string> = Partial<Record<F, string>> & {
  translations?: Translations<Partial<Record<F, string>>>;
};

/** Whether a word is actually there, rather than empty or a stray space. */
export function isWritten(value: string | undefined): value is string {
  return value !== undefined && value.trim().length > 0;
}

/** The entity with its words in `language` laid over its own, where written. */
function inLanguage<F extends string, E extends Worded<F>>(
  entity: E,
  fields: readonly F[],
  language: CardLanguage,
): E {
  const words = entity.translations?.[language];

  if (words === undefined) {
    return entity;
  }

  const next: E = { ...entity };

  for (const field of fields) {
    const word = words[field];

    if (isWritten(word)) {
      (next as Partial<Record<F, string>>)[field] = word;
    }
  }

  return next;
}

/**
 * The entity with `translations` replaced, and the key left off entirely when
 * there is nothing in it.
 *
 * Left off rather than set to undefined or to {}: the editor's dirty check
 * compares the card it holds with the card it was handed, and a host who
 * typed a word and deleted it again has changed nothing.
 */
function withTranslations<E extends { translations?: unknown }>(
  entity: E,
  translations: E["translations"] | undefined,
): E {
  const { translations: _previous, ...rest } = entity;

  return translations === undefined
    ? (rest as E)
    : ({ ...rest, translations } as E);
}

/** One word written or cleared, with empty languages and maps pruned away. */
function setWord<F extends string>(
  translations: Translations<Partial<Record<F, string>>> | undefined,
  language: CardLanguage,
  field: F,
  value: string,
): Translations<Partial<Record<F, string>>> | undefined {
  const words: Partial<Record<F, string>> = { ...translations?.[language] };

  if (value.length === 0) {
    delete words[field];
  } else {
    words[field] = value;
  }

  const next: Translations<Partial<Record<F, string>>> = { ...translations };

  if (Object.keys(words).length === 0) {
    delete next[language];
  } else {
    next[language] = words;
  }

  return Object.keys(next).length === 0 ? undefined : next;
}

/* ---------------------------------------------------------------------------
   Reading.
   --------------------------------------------------------------------------- */

/**
 * The card as a guest sees it in `language`.
 *
 * The card's own language hands back exactly what it was given, so a card
 * nobody translated renders byte for byte as it always has.
 *
 * The joining word is the one field with a better fallback than the host's
 * own. Left blank, a preset follows the language — "संग" reads as "weds" on the
 * English card — because a Hindi word between two English names is the one
 * blank that would look like a mistake rather than a fallback.
 */
export function cardInLanguage(
  draft: EventDraft,
  config: CardConfig,
  language: CardLanguage,
): { draft: EventDraft; config: CardConfig } {
  if (language === config.language) {
    return { draft, config };
  }

  const joiner = draft.translations?.[language]?.joinerWord;

  return {
    draft: {
      ...inLanguage(draft, DRAFT_WORD_FIELDS, language),
      joinerWord: isWritten(joiner)
        ? joiner
        : swapJoinerWord(draft.joinerWord, config.language, language),
      subEvents: draft.subEvents.map((entry) =>
        inLanguage(entry, SUB_EVENT_WORD_FIELDS, language),
      ),
    },
    config: {
      ...config,
      language,
      blocks: config.blocks.map((block) =>
        block.kind === "custom"
          ? {
              ...block,
              section: inLanguage(block.section, SECTION_WORD_FIELDS, language),
            }
          : block,
      ),
    },
  };
}

/**
 * How many words the host has written in `language`, across the whole card.
 *
 * What the editor counts on its "Add English words" button and what the share
 * bar asks before offering a language nobody has written anything in.
 */
export function wordsWrittenIn(
  draft: EventDraft,
  blocks: readonly CardBlock[],
  language: CardLanguage,
): number {
  const count = (words: object | undefined): number =>
    Object.values(words ?? {}).filter(
      (word): word is string => typeof word === "string" && isWritten(word),
    ).length;

  return (
    count(draft.translations?.[language]) +
    draft.subEvents.reduce(
      (total, entry) => total + count(entry.translations?.[language]),
      0,
    ) +
    blocks.reduce(
      (total, block) =>
        block.kind === "custom"
          ? total + count(block.section.translations?.[language])
          : total,
      0,
    )
  );
}

/**
 * The language a link asked for, if the card can be read in it; the card's own
 * language otherwise.
 *
 * Every language is always on offer — a card is readable in each whether or
 * not the host wrote words for it — so the only link this turns away is one
 * naming a language Lifafa does not have.
 */
export function requestedLanguage(
  value: unknown,
  cardLanguageValue: CardLanguage,
): CardLanguage {
  return typeof value === "string" && cardLanguage(value) === value
    ? value
    : cardLanguageValue;
}

/**
 * An invite link that opens the card in `language`.
 *
 * Always carries the language, the card's own included. A link a host sent to
 * the Hindi side of the family should stay Hindi even if the host later
 * changes which language the card is written in.
 */
export function inviteLinkIn(url: string, language: CardLanguage): string {
  const link = new URL(url);
  link.searchParams.set("lang", language);
  return link.toString();
}

/* ---------------------------------------------------------------------------
   Writing, for the editor.
   --------------------------------------------------------------------------- */

/** One of the draft's own words, in `language`. Empty clears it. */
export function setDraftWord(
  draft: EventDraft,
  language: CardLanguage,
  field: keyof DraftWords,
  value: string,
): EventDraft {
  return withTranslations(
    draft,
    setWord(draft.translations, language, field, value),
  );
}

/** One function's word, in `language`. Empty clears it. */
export function setSubEventWord(
  draft: EventDraft,
  language: CardLanguage,
  subEventId: string,
  field: keyof SubEventWords,
  value: string,
): EventDraft {
  return {
    ...draft,
    subEvents: draft.subEvents.map((entry) =>
      entry.id === subEventId
        ? withTranslations(
            entry,
            setWord(entry.translations, language, field, value),
          )
        : entry,
    ),
  };
}

/** One custom section's word, in `language`. Empty clears it. */
export function setSectionWord(
  blocks: readonly CardBlock[],
  language: CardLanguage,
  sectionId: string,
  field: keyof CustomSectionWords,
  value: string,
): readonly CardBlock[] {
  return blocks.map((block) =>
    block.kind === "custom" && block.section.id === sectionId
      ? {
          ...block,
          section: withTranslations<CustomSection>(
            block.section,
            setWord(block.section.translations, language, field, value),
          ),
        }
      : block,
  );
}

/**
 * The entity rewritten for a change of its own language, `from` to `to`.
 *
 * A word the host already wrote in `to` becomes the ordinary field, and the
 * ordinary field it replaces moves into the translations as `from`. So a host
 * who wrote a Hindi card with English names and then says the card is really
 * English loses nothing: the English names are now the card's own, and the
 * Hindi ones are its translation.
 *
 * A word with nothing written in `to` stays where it is. There is nothing to
 * swap it with, and moving it would only empty the card.
 */
function swapLanguage<F extends string, E extends Worded<F>>(
  entity: E,
  fields: readonly F[],
  from: CardLanguage,
  to: CardLanguage,
): E {
  const incoming = entity.translations?.[to];

  if (incoming === undefined) {
    return entity;
  }

  const next: E = { ...entity };
  let translations = entity.translations;

  for (const field of fields) {
    const word = incoming[field];

    if (!isWritten(word)) {
      continue;
    }

    const own = entity[field] ?? "";

    (next as Partial<Record<F, string>>)[field] = word;
    translations = setWord(translations, to, field, "");
    translations = setWord(translations, from, field, own);
  }

  return withTranslations(next, translations as E["translations"]);
}

/**
 * The whole card rewritten for a change of its own language.
 *
 * The draft, every function and every custom section, so no word is left in a
 * slot that now means the other language. The joining word also takes the new
 * language's preset when the host wrote none of their own — the behaviour the
 * language picker already had before a card could hold two languages.
 */
export function swapCardLanguage(
  draft: EventDraft,
  blocks: readonly CardBlock[],
  from: CardLanguage,
  to: CardLanguage,
): { draft: EventDraft; blocks: readonly CardBlock[] } {
  if (from === to) {
    return { draft, blocks };
  }

  const hadJoiner = isWritten(draft.translations?.[to]?.joinerWord);
  const swapped = swapLanguage(draft, DRAFT_WORD_FIELDS, from, to);

  return {
    draft: {
      ...swapped,
      joinerWord: hadJoiner
        ? swapped.joinerWord
        : swapJoinerWord(swapped.joinerWord, from, to),
      subEvents: swapped.subEvents.map((entry) =>
        swapLanguage(entry, SUB_EVENT_WORD_FIELDS, from, to),
      ),
    },
    blocks: blocks.map((block) =>
      block.kind === "custom"
        ? {
            ...block,
            section: swapLanguage(block.section, SECTION_WORD_FIELDS, from, to),
          }
        : block,
    ),
  };
}
