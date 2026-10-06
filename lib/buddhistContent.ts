/**
 * Greetings and blessings offered on a Buddhist card.
 *
 * TODO(Faraz): have every Devanagari line, transliteration and meaning in this
 * file checked by a Buddhist reader before launch.
 *
 * THE TEXT WAS SUPPLIED, AND IS SET CHARACTER FOR CHARACTER AS IT CAME. Nothing
 * here was written, reconstructed or recalled from memory, and nothing may be:
 * a change to any of it comes from a verified source, reviewed by someone
 * knowledgeable.
 *
 * An empty string renders nothing at all. Only the two opt-out rows are empty,
 * and they stay empty; the editor shows "Devanagari text pending" against any
 * other row whose script is missing.
 *
 * THE PALI IS SET IN DEVANAGARI. Pali has no script of its own and is written
 * in whichever the tradition around it uses; for the families this app is
 * made for, that is Devanagari. This file once held Roman Pali only, on the
 * reasoning that any script was a lineage chosen on the host's behalf. The
 * Roman reading is still on the card, as each row's transliteration. NO
 * TIBETAN, SINHALA OR THAI FONT IS LOADED AND NONE SHOULD BE.
 *
 * Do not "tidy" a value. Devanagari matras and conjuncts are load bearing: a
 * dropped anusvara or virama changes the word, and a normalisation pass —
 * NFC/NFD, a collapsed space, a ZWJ stripped out of a conjunct, an editor's
 * auto-format — will do it silently and read as a whitespace diff. A string
 * that needs changing gets replaced wholesale from the source, never edited
 * in place.
 *
 * THE WEDDING BLESSING IS A VERSE OF THE MANGALA SUTTA, and its meaning says
 * so. Do not extend it into more of the sutta.
 *
 * THE FONT IS THE ONE THE HINDU AND JAIN PACKS ALREADY LOAD. app/layout.tsx
 * loads Noto Sans Devanagari once and all three packs resolve it through
 * --lifafa-devanagari, and on the card all three are set in the same Tiro
 * Devanagari (DEVANAGARI_CARD_HEAD in lib/traditionPacks.tsx). Do not add a
 * second face for this pack.
 *
 * RENDERING: every Pali field goes on the page with lang="pi" and dir="ltr".
 */

/**
 * The `lang` every Pali string in this file is rendered under: the language,
 * not the script. The face and the leading resolve as they do for "hi" and "sa".
 */
export const PALI_LANG = "pi";

type BuddhistGreetingId = "namoBuddhaya" | "sabbeSatta" | "none";

export interface BuddhistGreeting {
  id: BuddhistGreetingId;
  /** Name of the greeting, shown in the editor's option list. */
  label: string;
  /**
   * Pali in Devanagari, exactly as supplied. Named for its language rather
   * than its script — see the file header before touching.
   */
  pali: string;
  /** Latin transliteration, exactly as supplied. Empty where none was given. */
  transliteration: string;
  /** English rendering, exactly as supplied. Empty where none was given. */
  translation: string;
}

export const BUDDHIST_GREETINGS: readonly BuddhistGreeting[] = [
  {
    id: "namoBuddhaya",
    label: "Namo Buddhaya",
    pali: "नमो बुद्धाय",
    transliteration: "Namo Buddhaya",
    translation: "Homage to the Buddha",
  },
  {
    id: "sabbeSatta",
    label: "Sabbe satta sukhi hontu",
    pali: "सब्बे सत्ता सुखी होन्तु",
    transliteration: "Sabbe satta sukhi hontu",
    translation: "May all beings be happy",
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

type BuddhistBlessingId = "mettaBlessing" | "unionBlessing" | "none";

export interface BuddhistBlessing {
  id: BuddhistBlessingId;
  /** Name of the blessing, shown in the editor's option list. */
  label: string;
  /** Pali in Devanagari, exactly as supplied. See the file header before touching. */
  pali: string;
  /** Latin transliteration, exactly as supplied. Empty where none was given. */
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
    pali: "भवतु सब्ब मङ्गलं",
    transliteration: "Bhavatu sabba mangalam",
    translation: "May all blessings be yours",
    occasionNote: "Any occasion",
  },
  {
    id: "unionBlessing",
    label: "A blessing for a union",
    pali:
      "मातापितु उपट्ठानं, पुत्तदारस्स सङ्गहो। अनाकुला च कम्मन्ता, एतं मङ्गलमुत्तमं॥",
    transliteration:
      "Matapitu upatthanam, puttadarassa sangaho, anakula ca kammanta, etam mangalamuttamam",
    translation:
      "Caring for mother and father, cherishing spouse and children, and a peaceful livelihood: this is the highest blessing (Mangala Sutta)",
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
 * "text pending" note being printed under "No greeting".
 */
export function isOptOut(id: string | null): boolean {
  return id === "none";
}
