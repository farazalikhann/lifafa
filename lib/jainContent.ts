/**
 * Greetings and blessings offered on a Jain card.
 *
 * EVERY DEVANAGARI, TRANSLITERATION AND TRANSLATION STRING IN THIS FILE SHIPS
 * EMPTY. Nothing here was written, transliterated, reconstructed or recalled
 * from memory, and nothing may be. Each empty field carries a TODO naming
 * exactly what belongs in it; every value must be copied from a verified source
 * and reviewed by someone knowledgeable before release.
 *
 * An empty string renders nothing at all, so an unfilled entry is safe — it is
 * filling one in casually that is unsafe. The editor shows "Text pending"
 * against a row whose script has not arrived; the opt-out row is exempt.
 *
 * Once a value is supplied, do not "tidy" it. Devanagari matras and conjuncts
 * are load bearing: a dropped anusvara or virama changes the word, and a
 * normalisation pass — NFC/NFD, a collapsed space, a ZWJ stripped out of a
 * conjunct, an editor's auto-format — will do it silently and read as a
 * whitespace diff. A string that needs changing gets replaced wholesale from
 * the source, never edited in place.
 *
 * ON THE NAVKAR: only the OPENING LINE is offered, and the entry below is
 * scoped to that line alone. Do not extend it into the full mantra, and do not
 * add further verses to either array — what belongs on an invitation is a
 * decision for the people whose practice it is.
 *
 * THE FONT IS THE ONE THE HINDU PACK ALREADY LOADS. Devanagari is Devanagari;
 * app/layout.tsx loads Noto Sans Devanagari once and both packs resolve it
 * through --lifafa-devanagari. Do not add a second face for this pack.
 *
 * RENDERING: every Devanagari field goes on the page inside an element carrying
 * a lang attribute and dir="ltr". Devanagari runs left to right — never copy
 * the Arabic pack's dir="rtl" across with the markup around it. The leading
 * comes from --lifafa-devanagari-leading, which is measured to clear the
 * shirorekha and the upper matras.
 */

/**
 * The `lang` every Devanagari string in this file is rendered under.
 *
 * "sa" rather than the Hindu pack's "hi": these lines are Prakrit and Sanskrit
 * set in Devanagari, not Hindi, and the tag describes the language rather than
 * the script. The face and the leading resolve identically either way.
 */
export const JAIN_LANG = "sa";

export type JainGreetingId = "jaiJinendra" | "navkarOpening" | "none";

export interface JainGreeting {
  id: JainGreetingId;
  /** Latin-script name of the greeting, shown in the editor's option list. */
  label: string;
  /** Devanagari script, exactly as supplied. See the file header before touching. */
  devanagari: string;
  /** Latin transliteration, exactly as supplied. Empty where none was given. */
  transliteration: string;
  /** English rendering, exactly as supplied. Empty where none was given. */
  translation: string;
}

export const JAIN_GREETINGS: readonly JainGreeting[] = [
  {
    id: "jaiJinendra",
    label: "Jai Jinendra",
    /* TODO: the Devanagari for "Jai Jinendra". */
    devanagari: "",
    /* TODO: the Roman transliteration of "Jai Jinendra". */
    transliteration: "",
    /* TODO: the English rendering of "Jai Jinendra". */
    translation: "",
  },
  {
    id: "navkarOpening",
    label: "Navkar Mantra opening line",
    /*
      TODO: the Devanagari for the OPENING LINE of the Navkar Mantra only — the
      first salutation, not the full mantra. See the file header.
    */
    devanagari: "",
    /* TODO: the Roman transliteration of that opening line. */
    transliteration: "",
    /* TODO: the English rendering of that opening line. */
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
    devanagari: "",
    transliteration: "",
    translation: "",
  },
];

export type JainBlessingId = "michhami" | "mangalBlessing" | "none";

export interface JainBlessing {
  id: JainBlessingId;
  /** Latin-script name of the blessing, shown in the editor's option list. */
  label: string;
  /** Devanagari script, exactly as supplied. See the file header before touching. */
  devanagari: string;
  /** Latin transliteration, exactly as supplied. Empty where none was given. */
  transliteration: string;
  /** English rendering, exactly as supplied. Empty where none was given. */
  translation: string;
  /** Which occasion the blessing suits, in the host's words. Never Devanagari. */
  occasionNote: string;
}

export const JAIN_BLESSINGS: readonly JainBlessing[] = [
  {
    id: "michhami",
    label: "Michhami Dukkadam",
    /* TODO: the Devanagari for "Michhami Dukkadam". */
    devanagari: "",
    /* TODO: the Roman transliteration of "Michhami Dukkadam". */
    transliteration: "",
    /* TODO: the English rendering of "Michhami Dukkadam". */
    translation: "",
    occasionNote: "Any occasion",
  },
  {
    id: "mangalBlessing",
    label: "A blessing",
    /* TODO: a short Devanagari blessing suitable for a Jain wedding invitation. */
    devanagari: "",
    /* TODO: the Roman transliteration of that blessing. */
    transliteration: "",
    /* TODO: the English rendering of that blessing. */
    translation: "",
    occasionNote: "Wedding",
  },
  {
    /* The opt-out — see the matching note on the "none" greeting. */
    id: "none",
    label: "No blessing",
    devanagari: "",
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
export function getJainGreeting(id: string | null): JainGreeting | null {
  if (id === null) {
    return null;
  }

  return JAIN_GREETINGS.find((greeting) => greeting.id === id) ?? null;
}

/** Null for an unknown or unset id, so a caller renders nothing. */
export function getJainBlessing(id: string | null): JainBlessing | null {
  if (id === null) {
    return null;
  }

  return JAIN_BLESSINGS.find((blessing) => blessing.id === id) ?? null;
}
