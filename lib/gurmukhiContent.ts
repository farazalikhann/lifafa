/**
 * Greetings and blessings offered on a Sikh card.
 *
 * THE GURMUKHI AND THE ENGLISH BELOW WERE SUPPLIED BY THE OWNER, and are here
 * character for character as supplied. Nothing in this file was written,
 * transliterated, reconstructed or recalled from memory, and nothing may be.
 * No transliteration was supplied, so every transliteration is empty, and an
 * empty string renders nothing at all.
 *
 * Do not "tidy" a value. Gurmukhi matras and the addak, bindi and tippi are
 * load bearing, and a normalisation pass — NFC/NFD, a collapsed space, an
 * editor's auto-format — will change a word silently and read as a whitespace
 * diff. A string that needs changing gets replaced wholesale from the source,
 * never edited in place. A line break inside a value is a line break on the
 * card.
 *
 * GURBANI. This file used to rule full Gurbani passages out: an invitation is
 * handled casually and thrown away after the event, and many families
 * consider that treatment inappropriate for Gurbani. The owner has since
 * supplied one, the salok on Ang 788, as the blessing for a couple, and it is
 * here with its source. The point stands for anything further: extending
 * this file is a decision for the people whose practice it is, not a gap in
 * the data. DO NOT ADD ENTRIES to either array without being given them.
 *
 * RENDERING: every Gurmukhi field goes on the page inside an element carrying
 * lang="pa" and dir="ltr". Gurmukhi runs left to right — never copy the Arabic
 * pack's dir="rtl" across with the markup around it. The face and the leading
 * come from --lifafa-gurmukhi and --lifafa-gurmukhi-leading in globals.css,
 * which the card's opening block sets to Tiro Gurmukhi (see `cardHead` on
 * the Sikh pack in lib/traditionPacks.tsx).
 */

/** The `lang` every Gurmukhi string is rendered under. */
export const GURMUKHI_LANG = "pa";

type SikhGreetingId =
  | "ikOnkar"
  | "waheguruKhalsa"
  | "satNaam"
  | "none";

export interface SikhGreeting {
  id: SikhGreetingId;
  /** Latin-script name of the greeting, shown in the editor's option list. */
  label: string;
  /** Gurmukhi script, exactly as supplied. See the file header before touching. */
  gurmukhi: string;
  /** Latin transliteration, exactly as supplied. Empty where none was given. */
  transliteration: string;
  /** English rendering, exactly as supplied. Empty where none was given. */
  translation: string;
}

export const SIKH_GREETINGS: readonly SikhGreeting[] = [
  {
    id: "ikOnkar",
    label: "Ik Onkar Satgur Prasad",
    gurmukhi: "ੴ ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ ॥",
    transliteration: "",
    translation: "One Creator, realised by the Guru's grace",
  },
  {
    id: "waheguruKhalsa",
    label: "Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh",
    /* Two lines, one to each ॥. */
    gurmukhi: "ਵਾਹਿਗੁਰੂ ਜੀ ਕਾ ਖ਼ਾਲਸਾ ॥\nਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫ਼ਤਹਿ ॥",
    transliteration: "",
    translation: "The Khalsa belongs to Waheguru, victory belongs to Waheguru",
  },
  {
    id: "satNaam",
    label: "Satnam Waheguru",
    gurmukhi: "ਸਤਿਨਾਮ ਵਾਹਿਗੁਰੂ",
    transliteration: "",
    translation: "True is the Name, Wondrous Lord",
  },
  {
    /*
      The opt-out. Every field stays empty permanently — this entry is not
      waiting on content, it is the absence of content, and nothing that
      inspects it should offer to fill it in.
    */
    id: "none",
    label: "No greeting",
    gurmukhi: "",
    transliteration: "",
    translation: "",
  },
];

type SikhBlessingId = "anandBlessing" | "chardiKala" | "none";

export interface SikhBlessing {
  id: SikhBlessingId;
  /** Latin-script name of the blessing, shown in the editor's option list. */
  label: string;
  /** Gurmukhi script, exactly as supplied. See the file header before touching. */
  gurmukhi: string;
  /** Latin transliteration, exactly as supplied. Empty where none was given. */
  transliteration: string;
  /** English rendering, exactly as supplied. Empty where none was given. */
  translation: string;
  /** Which occasion the blessing suits, in the host's words. Never Gurmukhi. */
  occasionNote: string;
  /** Where the lines are from, for a blessing that is a quotation. Set small under the meaning. */
  source?: string;
}

export const SIKH_BLESSINGS: readonly SikhBlessing[] = [
  {
    id: "anandBlessing",
    label: "Blessing for the couple",
    /* Gurbani, as supplied, in its two lines. See the file header. */
    gurmukhi: "ਧਨ ਪਿਰੁ ਏਹਿ ਨ ਆਖੀਅਨਿ ਬਹਨਿ ਇਕਠੇ ਹੋਇ ॥\nਏਕ ਜੋਤਿ ਦੁਇ ਮੂਰਤੀ ਧਨ ਪਿਰੁ ਕਹੀਐ ਸੋਇ ॥",
    transliteration: "",
    translation:
      "They are not husband and wife who merely sit together. They alone are husband and wife who have one light in two bodies.",
    occasionNote: "Wedding",
    source: "Sri Guru Granth Sahib Ji, Ang 788",
  },
  {
    id: "chardiKala",
    label: "Chardi Kala",
    gurmukhi: "ਨਾਨਕ ਨਾਮ ਚੜ੍ਹਦੀ ਕਲਾ ॥\nਤੇਰੇ ਭਾਣੇ ਸਰਬੱਤ ਦਾ ਭਲਾ ॥",
    transliteration: "",
    translation:
      "Through the Name, may our spirits always rise. By Your will, may all be blessed.",
    occasionNote: "Any occasion",
  },
  {
    /* The opt-out — see the matching note on the "none" greeting. */
    id: "none",
    label: "No blessing",
    gurmukhi: "",
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
