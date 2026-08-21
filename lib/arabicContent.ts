/**
 * Greetings and duas offered on a Muslim card.
 *
 * EVERY ARABIC STRING IN THIS FILE SHIPS EMPTY, DELIBERATELY. Nothing here was
 * transliterated, reconstructed or recalled from memory. Each `arabic`,
 * `transliteration` and `translation` value must be copied from a verified
 * source and reviewed by someone knowledgeable before release. An empty string
 * renders nothing at all — the card simply omits the line — so the file is safe
 * to ship in this state and unsafe to fill in casually.
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
  /** Arabic script. Empty until reviewed — see the file header. */
  arabic: string;
  /** Latin transliteration. Empty until reviewed — see the file header. */
  transliteration: string;
  /** English rendering. Empty until reviewed — see the file header. */
  translation: string;
}

export const GREETINGS: readonly Greeting[] = [
  {
    id: "bismillah",
    label: "Bismillah",
    /* TODO: Arabic script for the Bismillah greeting. */
    arabic: "",
    /* TODO: Latin transliteration of the Bismillah greeting. */
    transliteration: "",
    /* TODO: English translation of the Bismillah greeting. */
    translation: "",
  },
  {
    id: "salam",
    label: "Assalamu Alaikum",
    /* TODO: Arabic script for the short salam greeting. */
    arabic: "",
    /* TODO: Latin transliteration of the short salam greeting. */
    transliteration: "",
    /* TODO: English translation of the short salam greeting. */
    translation: "",
  },
  {
    id: "salamFull",
    label: "Assalamu Alaikum wa Rahmatullahi wa Barakatuh",
    /* TODO: Arabic script for the full salam greeting. */
    arabic: "",
    /* TODO: Latin transliteration of the full salam greeting. */
    transliteration: "",
    /* TODO: English translation of the full salam greeting. */
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
  /** Arabic script. Empty until reviewed — see the file header. */
  arabic: string;
  /** Latin transliteration. Empty until reviewed — see the file header. */
  transliteration: string;
  /** English rendering. Empty until reviewed — see the file header. */
  translation: string;
  /** Which occasion the dua suits, in the host's words. Never Arabic. */
  occasionNote: string;
}

export const DUAS: readonly Dua[] = [
  {
    id: "barakallah",
    label: "Barakallahu lakuma",
    /* TODO: Arabic script for the Barakallahu lakuma dua. */
    arabic: "",
    /* TODO: Latin transliteration of the Barakallahu lakuma dua. */
    transliteration: "",
    /* TODO: English translation of the Barakallahu lakuma dua. */
    translation: "",
    occasionNote: "Blessing for the couple",
  },
  {
    id: "jamaBaynakuma",
    label: "Wa jamaa baynakuma fi khayr",
    /* TODO: Arabic script for the Wa jamaa baynakuma fi khayr dua. */
    arabic: "",
    /* TODO: Latin transliteration of the Wa jamaa baynakuma fi khayr dua. */
    transliteration: "",
    /* TODO: English translation of the Wa jamaa baynakuma fi khayr dua. */
    translation: "",
    occasionNote: "Blessing for the couple",
  },
  {
    id: "barakahHome",
    label: "Dua for a blessed home",
    /* TODO: Arabic script for the blessed-home dua. */
    arabic: "",
    /* TODO: Latin transliteration of the blessed-home dua. */
    transliteration: "",
    /* TODO: English translation of the blessed-home dua. */
    translation: "",
    occasionNote: "Housewarming",
  },
  {
    id: "generalBarakah",
    label: "Dua for blessings",
    /* TODO: Arabic script for the general blessings dua. */
    arabic: "",
    /* TODO: Latin transliteration of the general blessings dua. */
    transliteration: "",
    /* TODO: English translation of the general blessings dua. */
    translation: "",
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
 * Both look identical from the outside — every string empty — so the editor
 * needs this to tell "No greeting" apart from a row whose content has not been
 * supplied yet, and show a pending note on only the second.
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
