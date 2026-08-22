/**
 * Greetings and blessings offered on a Buddhist card.
 *
 * EVERY PALI, TRANSLITERATION AND TRANSLATION STRING IN THIS FILE SHIPS EMPTY.
 * Nothing here was written, transliterated, reconstructed or recalled from
 * memory, and nothing may be. Each empty field carries a TODO naming exactly
 * what belongs in it; every value must be copied from a verified source and
 * reviewed by someone knowledgeable before release.
 *
 * An empty string renders nothing at all, so an unfilled entry is safe — it is
 * filling one in casually that is unsafe. The editor shows "Text pending"
 * against a row whose text has not arrived; the opt-out row is exempt.
 *
 * PALI IS STORED IN ROMAN SCRIPT ONLY. Pali is written in whichever script the
 * tradition around it uses — Sinhala, Thai, Burmese, Khmer, Tibetan for related
 * material — and picking one of those would be picking a lineage on the host's
 * behalf. Roman Pali is the neutral form and the one an invitation in this app
 * can actually set. NO TIBETAN, SINHALA OR THAI FONT IS LOADED AND NONE SHOULD
 * BE: that is out of scope, and adding one would mean committing to a script
 * this pack has deliberately not chosen.
 *
 * Because the text is Roman, it sets in the card's own body face and needs no
 * webfont of its own. Diacritics matter even so — Roman Pali carries macrons
 * and dots (ā, ī, ū, ṃ, ṇ, ñ, ṭ) — so once a value is supplied, do not "tidy"
 * it: a normalisation pass or an editor stripping a combining mark changes the
 * word and reads as a whitespace diff.
 *
 * RENDERING: every Pali field goes on the page with lang="pi" and dir="ltr".
 */

/** The `lang` every Pali string in this file is rendered under. */
export const PALI_LANG = "pi";

export type BuddhistGreetingId = "namoBuddhaya" | "sabbeSatta" | "none";

export interface BuddhistGreeting {
  id: BuddhistGreetingId;
  /** Name of the greeting, shown in the editor's option list. */
  label: string;
  /**
   * Pali in Roman script, exactly as supplied. Named for its language rather
   * than a script, because the script here is a deliberate choice — see the
   * file header.
   */
  pali: string;
  /**
   * A further Latin transliteration, exactly as supplied. Usually empty in this
   * pack: `pali` is already Roman, so this only carries a simplified spelling
   * where one was given for readers who cannot place the diacritics.
   */
  transliteration: string;
  /** English rendering, exactly as supplied. Empty where none was given. */
  translation: string;
}

export const BUDDHIST_GREETINGS: readonly BuddhistGreeting[] = [
  {
    id: "namoBuddhaya",
    label: "Namo Buddhaya",
    /* TODO: "Namo Buddhaya" in Roman Pali, with correct diacritics. */
    pali: "",
    /* TODO: optionally a diacritic-free spelling of the same line; leave empty if not wanted. */
    transliteration: "",
    /* TODO: the English rendering of "Namo Buddhaya". */
    translation: "",
  },
  {
    id: "sabbeSatta",
    label: "Sabbe satta sukhi hontu",
    /* TODO: "Sabbe satta sukhi hontu" in Roman Pali, with correct diacritics. */
    pali: "",
    /* TODO: optionally a diacritic-free spelling of the same line; leave empty if not wanted. */
    transliteration: "",
    /* TODO: the English rendering of that line. */
    translation: "",
  },
  {
    /*
      The opt-out. Every field stays empty permanently — this entry is not
      waiting on content, it is the absence of content, and nothing that
      inspects it should offer to fill it in.
    */
    id: "none",
    label: "No greeting",
    pali: "",
    transliteration: "",
    translation: "",
  },
];

export type BuddhistBlessingId = "mettaBlessing" | "unionBlessing" | "none";

export interface BuddhistBlessing {
  id: BuddhistBlessingId;
  /** Name of the blessing, shown in the editor's option list. */
  label: string;
  /** Pali in Roman script, exactly as supplied. */
  pali: string;
  /** A diacritic-free spelling, where one was given. Usually empty. */
  transliteration: string;
  /** English rendering, exactly as supplied. Empty where none was given. */
  translation: string;
  /** Which occasion the blessing suits, in the host's words. Never Pali. */
  occasionNote: string;
}

export const BUDDHIST_BLESSINGS: readonly BuddhistBlessing[] = [
  {
    id: "mettaBlessing",
    label: "A blessing of loving kindness",
    /* TODO: a short metta blessing in Roman Pali, with correct diacritics. */
    pali: "",
    /* TODO: optionally a diacritic-free spelling of the same line. */
    transliteration: "",
    /* TODO: the English rendering of that blessing. */
    translation: "",
    occasionNote: "Any occasion",
  },
  {
    id: "unionBlessing",
    label: "A blessing for a union",
    /* TODO: a short blessing for a union in Roman Pali, with correct diacritics. */
    pali: "",
    /* TODO: optionally a diacritic-free spelling of the same line. */
    transliteration: "",
    /* TODO: the English rendering of that blessing. */
    translation: "",
    occasionNote: "Wedding",
  },
  {
    /* The opt-out — see the matching note on the "none" greeting. */
    id: "none",
    label: "No blessing",
    pali: "",
    transliteration: "",
    translation: "",
    occasionNote: "",
  },
];

/**
 * Whether an entry is the deliberate opt-out rather than one still awaiting its
 * text.
 *
 * The two states are indistinguishable from the outside, both being empty
 * strings, and only one of them is waiting on anything — this is what stops a
 * "text pending" note being printed under "No greeting". Every entry in this
 * file is empty today, so this is doing real work right now.
 */
export function isOptOut(id: string | null): boolean {
  return id === "none";
}

/** Null for an unknown or unset id, so a caller renders nothing. */
export function getBuddhistGreeting(
  id: string | null,
): BuddhistGreeting | null {
  if (id === null) {
    return null;
  }

  return BUDDHIST_GREETINGS.find((greeting) => greeting.id === id) ?? null;
}

/** Null for an unknown or unset id, so a caller renders nothing. */
export function getBuddhistBlessing(
  id: string | null,
): BuddhistBlessing | null {
  if (id === null) {
    return null;
  }

  return BUDDHIST_BLESSINGS.find((blessing) => blessing.id === id) ?? null;
}
