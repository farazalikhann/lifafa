/**
 * Greetings and shloks offered on a Hindu card.
 *
 * The parallel of lib/arabicContent.ts, and it inherits that file's rules:
 *
 * EVERY DEVANAGARI STRING HERE WAS SUPPLIED AND MUST STAY BYTE FOR BYTE AS
 * GIVEN. Nothing in this file was transliterated, reconstructed or recalled
 * from memory, and nothing may be. Any future value must be copied from a
 * verified source and reviewed by someone knowledgeable before release.
 *
 * Do not "tidy" what is already here. The matras and conjuncts are load
 * bearing: a dropped anusvara or virama changes the word, and a normalisation
 * pass — NFC/NFD, a collapsed space, a ZWJ stripped out of a conjunct, an
 * editor's auto-format — will do it silently and read as a whitespace diff. If
 * a string ever needs to change, it gets replaced wholesale from the source,
 * never edited in place.
 *
 * An empty string renders nothing at all, so a value that has not been supplied
 * is safe to leave blank; it is filling one in casually that is unsafe.
 *
 * RENDERING RULE, since a data file is the only place it can be recorded
 * before the editor exists: every Devanagari field below goes on the page
 * inside a `<span lang="hi">`, and nothing here is ever given `dir="rtl"`.
 * Devanagari runs left to right — the Muslim panel's `dir="rtl"` belongs to
 * Arabic and must not be copied across with the markup around it. Use
 * DEVANAGARI_LANG for the attribute rather than spelling it at each call site.
 *
 * FIELD NAMES follow the Muslim set rather than the words used when this
 * content was handed over, so that a component can read either tradition
 * without a second vocabulary: `label` is the title, `translation` is the
 * English, `occasionNote` is the occasion. `devanagari` stands where the
 * Muslim types have `arabic`.
 */

/** The `lang` every Devanagari string is rendered under. */
export const DEVANAGARI_LANG = "hi";

export type HinduGreetingId =
  | "om"
  | "ganeshaya"
  | "namaste"
  | "shubh-mangal"
  | "none";

export interface HinduGreeting {
  id: HinduGreetingId;
  /** Latin-script name of the greeting, shown in the editor's option list. */
  label: string;
  /** Devanagari script, exactly as supplied. See the file header before touching. */
  devanagari: string;
  /** Latin transliteration, exactly as supplied. Empty where none was given. */
  transliteration: string;
  /** English rendering, exactly as supplied. Empty where none was given. */
  translation: string;
}

export const HINDU_GREETINGS: readonly HinduGreeting[] = [
  {
    id: "om",
    label: "Om",
    devanagari: "ॐ",
    transliteration: "Om",
    translation: "The sacred sound",
  },
  {
    id: "ganeshaya",
    label: "Shri Ganeshaya Namah",
    devanagari: "श्री गणेशाय नमः",
    transliteration: "Shri Ganeshaya Namah",
    translation: "Salutations to Lord Ganesha",
  },
  {
    id: "namaste",
    label: "Namaste",
    devanagari: "नमस्ते",
    transliteration: "Namaste",
    translation: "I bow to the divine in you",
  },
  {
    id: "shubh-mangal",
    label: "Shubh Mangal",
    devanagari: "शुभ मंगल",
    transliteration: "Shubh Mangal",
    translation: "Auspicious beginnings",
  },
  {
    /*
      The opt-out. Every field stays empty permanently — this entry is not
      waiting on content, it is the absence of content, and nothing that
      inspects it should offer to fill it in.
    */
    id: "none",
    label: "No greeting",
    devanagari: "",
    transliteration: "",
    translation: "",
  },
];

export type ShlokId =
  | "vakratunda"
  | "sanmangalani"
  | "vastoshpate"
  | "ayushman"
  | "sarve-sukhinah"
  | "none";

export interface Shlok {
  id: ShlokId;
  /** Latin-script name of the shlok, shown in the editor's option list. */
  label: string;
  /** Devanagari script, exactly as supplied. See the file header before touching. */
  devanagari: string;
  /**
   * Latin transliteration, exactly as supplied. Empty where none was given.
   *
   * Empty on every entry today: no transliteration was handed over for the
   * shloks, and the label is a name for the verse rather than a reading of it,
   * so it must not be copied down here to fill the field.
   */
  transliteration: string;
  /** English rendering, exactly as supplied. Empty where none was given. */
  translation: string;
  /** Which occasion the shlok suits, in the host's words. Never Devanagari. */
  occasionNote: string;
}

export const SHLOKS: readonly Shlok[] = [
  {
    id: "vakratunda",
    label: "Vakratunda Mahakaya",
    devanagari: "वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ",
    transliteration: "",
    translation:
      "O Lord of the curved trunk and mighty form, remove all obstacles from my endeavours",
    occasionNote: "Any occasion",
  },
  {
    id: "sanmangalani",
    label: "Samasta Sanmangalani Bhavantu",
    devanagari: "समस्त सन्मंगलानि भवन्तु",
    transliteration: "",
    translation: "May all auspiciousness be yours",
    occasionNote: "Blessing for the couple",
  },
  {
    id: "vastoshpate",
    label: "Vastoshpate Prati Janihi",
    devanagari: "वास्तोष्पते प्रति जानीहि",
    transliteration: "",
    translation: "Lord of this dwelling, accept us with grace",
    occasionNote: "Housewarming",
  },
  {
    id: "ayushman",
    label: "Ayushman Bhava",
    devanagari: "आयुष्मान् भव",
    transliteration: "",
    translation: "May you be blessed with a long life",
    occasionNote: "Birthday",
  },
  {
    id: "sarve-sukhinah",
    label: "Sarve Bhavantu Sukhinah",
    devanagari: "सर्वे भवन्तु सुखिनः",
    transliteration: "",
    translation: "May all beings be happy",
    occasionNote: "Any occasion",
  },
  {
    /* The opt-out — see the matching note on the "none" greeting. */
    id: "none",
    label: "No shlok",
    devanagari: "",
    transliteration: "",
    translation: "",
    occasionNote: "",
  },
];

/** Sits under the shlok list in the editor. */
export const SHLOK_NOTE = "The shlok appears at the top of your card.";

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

/** Null for an unknown or unset id, so a caller renders nothing. */
export function getHinduGreeting(id: string | null): HinduGreeting | null {
  if (id === null) {
    return null;
  }

  return HINDU_GREETINGS.find((greeting) => greeting.id === id) ?? null;
}

/** Null for an unknown or unset id, so a caller renders nothing. */
export function getShlok(id: string | null): Shlok | null {
  if (id === null) {
    return null;
  }

  return SHLOKS.find((shlok) => shlok.id === id) ?? null;
}
