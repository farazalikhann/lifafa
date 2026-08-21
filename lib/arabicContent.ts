/**
 * Greetings and duas offered on a Muslim card.
 *
 * EVERY ARABIC STRING HERE WAS SUPPLIED AND MUST STAY BYTE FOR BYTE AS GIVEN.
 * Nothing in this file was transliterated, reconstructed or recalled from
 * memory, and nothing may be. Any future value must be copied from a verified
 * source and reviewed by someone knowledgeable before release.
 *
 * Do not "tidy" what is already here. The diacritics are load bearing: a
 * dropped shadda or kasra changes the word, and a normalisation pass — NFC/NFD,
 * a stripped tatweel, a collapsed space, an editor's auto-format — will do it
 * silently and read as a whitespace diff. If a string ever needs to change, it
 * gets replaced wholesale from the source, never edited in place.
 *
 * An empty string renders nothing at all, so a value that has not been supplied
 * is safe to leave blank; it is filling one in casually that is unsafe.
 *
 * QURANIC VERSES ARE INTENTIONALLY OUT OF SCOPE FOR THIS FILE. The entries
 * below are greetings and duas only. Do not add an ayah here, and do not
 * repurpose one of these slots to carry one: verse text has requirements around
 * attribution, orthography and presentation that this structure makes no
 * provision for.
 */

export type GreetingId = "bismillah" | "salam" | "salamFull" | "none";

export interface Greeting {
  id: GreetingId;
  /** Latin-script name of the greeting, shown in the editor's option list. */
  label: string;
  /** Arabic script, exactly as supplied. See the file header before touching. */
  arabic: string;
  /** Latin transliteration, exactly as supplied. Empty where none was given. */
  transliteration: string;
  /** English rendering, exactly as supplied. Empty where none was given. */
  translation: string;
}

export const GREETINGS: readonly Greeting[] = [
  {
    id: "bismillah",
    label: "Bismillah",
    arabic: "بِسْمِ اللَّهِ",
    transliteration: "Bismillah",
    translation: "In the name of Allah",
  },
  {
    id: "salam",
    label: "Assalamu Alaikum",
    arabic: "السَّلَامُ عَلَيْكُمْ",
    transliteration: "Assalamu Alaikum",
    translation: "Peace be upon you",
  },
  {
    id: "salamFull",
    label: "Assalamu Alaikum wa Rahmatullahi wa Barakatuh",
    arabic: "السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ",
    transliteration: "Assalamu Alaikum wa Rahmatullahi wa Barakatuh",
    translation:
      "Peace be upon you, and the mercy of Allah and His blessings",
  },
  {
    /*
      The opt-out. Every field stays empty permanently — this entry is not
      waiting on content, it is the absence of content, and nothing that
      inspects it should offer to fill it in.
    */
    id: "none",
    label: "No greeting",
    arabic: "",
    transliteration: "",
    translation: "",
  },
];

export type DuaId =
  | "barakallah"
  | "jamaBaynakuma"
  | "barakahHome"
  | "generalBarakah"
  | "none";

export interface Dua {
  id: DuaId;
  /** Latin-script name of the dua, shown in the editor's option list. */
  label: string;
  /** Arabic script, exactly as supplied. See the file header before touching. */
  arabic: string;
  /** Latin transliteration, exactly as supplied. Empty where none was given. */
  transliteration: string;
  /** English rendering, exactly as supplied. Empty where none was given. */
  translation: string;
  /** Which occasion the dua suits, in the host's words. Never Arabic. */
  occasionNote: string;
}

export const DUAS: readonly Dua[] = [
  {
    id: "barakallah",
    label: "Barakallahu lakuma",
    arabic: "بَارَكَ اللَّهُ لَكُمَا",
    transliteration: "Barakallahu lakuma",
    translation: "May Allah bless you both",
    occasionNote: "Blessing for the couple",
  },
  {
    id: "jamaBaynakuma",
    label: "Wa jamaa baynakuma fi khayr",
    arabic: "وَجَمَعَ بَيْنَكُمَا فِي خَيْرٍ",
    transliteration: "Wa jamaa baynakuma fi khayr",
    translation: "And may He unite you both in goodness",
    occasionNote: "Blessing for the couple",
  },
  {
    id: "barakahHome",
    label: "Dua for a blessed home",
    arabic: "بَارَكَ اللَّهُ لَكُمْ فِي بَيْتِكُمْ",
    transliteration: "Barakallahu lakum fi baytikum",
    translation: "May Allah bless you in your home",
    occasionNote: "Housewarming",
  },
  {
    id: "generalBarakah",
    label: "Dua for blessings",
    arabic: "بَارَكَ اللَّهُ فِيكُمْ",
    transliteration: "Barakallahu feekum",
    translation: "May Allah bless you",
    occasionNote: "Any occasion",
  },
  {
    /* The opt-out — see the matching note on the "none" greeting. */
    id: "none",
    label: "No dua",
    arabic: "",
    transliteration: "",
    translation: "",
    occasionNote: "",
  },
];

/**
 * Whether an entry is the deliberate opt-out rather than one still awaiting its
 * text.
 *
 * Every entry now carries its text except the two opt-outs, so today this is
 * what stops the editor printing "Arabic text pending" under "No greeting" —
 * the two states are indistinguishable from the outside, both being empty
 * strings, and only one of them is waiting on anything.
 */
export function isOptOut(id: string | null): boolean {
  return id === "none";
}

/** Null for an unknown or unset id, so a caller renders nothing. */
export function getGreeting(id: string | null): Greeting | null {
  if (id === null) {
    return null;
  }

  return GREETINGS.find((greeting) => greeting.id === id) ?? null;
}

/** Null for an unknown or unset id, so a caller renders nothing. */
export function getDua(id: string | null): Dua | null {
  if (id === null) {
    return null;
  }

  return DUAS.find((dua) => dua.id === id) ?? null;
}
