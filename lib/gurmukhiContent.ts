/**
 * Greetings and blessings offered on a Sikh card.
 *
 * EVERY GURMUKHI, TRANSLITERATION AND TRANSLATION STRING IN THIS FILE SHIPS
 * EMPTY. Nothing here was written, transliterated, reconstructed or recalled
 * from memory, and nothing may be. Each empty field carries a TODO naming
 * exactly what belongs in it; every value must be copied from a verified source
 * and reviewed by someone knowledgeable before release.
 *
 * An empty string renders nothing at all, so an unfilled entry is safe — it is
 * filling one in casually that is unsafe. The editor shows "Text pending"
 * against a row whose script has not arrived; the opt-out row is exempt.
 *
 * Once a value is supplied, do not "tidy" it. Gurmukhi matras and the addak,
 * bindi and tippi are load bearing, and a normalisation pass — NFC/NFD, a
 * collapsed space, an editor's auto-format — will change a word silently and
 * read as a whitespace diff. A string that needs changing gets replaced
 * wholesale from the source, never edited in place.
 *
 * FULL GURBANI PASSAGES ARE DELIBERATELY OUT OF SCOPE, and this is not an
 * oversight to be corrected by adding more entries. A printed or digital
 * invitation is handled casually and discarded after the event, and many
 * families consider that treatment inappropriate for Gurbani. Only the short
 * invocations listed below are offered. DO NOT ADD FURTHER ENTRIES to either
 * array — extending this file is a decision for the people whose practice it
 * is, not a gap in the data.
 *
 * RENDERING: every Gurmukhi field goes on the page inside an element carrying
 * lang="pa" and dir="ltr". Gurmukhi runs left to right — never copy the Arabic
 * pack's dir="rtl" across with the markup around it. The face and the leading
 * come from --lifafa-gurmukhi and --lifafa-gurmukhi-leading in globals.css.
 */

/** The `lang` every Gurmukhi string is rendered under. */
export const GURMUKHI_LANG = "pa";

export type SikhGreetingId =
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
    /* TODO: the Gurmukhi for "Ik Onkar Satgur Prasad" (the Mool Mantar's opening invocation). */
    gurmukhi: "",
    /* TODO: the Roman transliteration of that line. */
    transliteration: "",
    /* TODO: the English rendering of that line. */
    translation: "",
  },
  {
    id: "waheguruKhalsa",
    label: "Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh",
    /* TODO: the Gurmukhi for the full Khalsa salutation, both halves. */
    gurmukhi: "",
    /* TODO: the Roman transliteration of the full salutation. */
    transliteration: "",
    /* TODO: the English rendering of the full salutation. */
    translation: "",
  },
  {
    id: "satNaam",
    label: "Satnam Waheguru",
    /* TODO: the Gurmukhi for "Satnam Waheguru". */
    gurmukhi: "",
    /* TODO: the Roman transliteration of "Satnam Waheguru". */
    transliteration: "",
    /* TODO: the English rendering of "Satnam Waheguru". */
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
    gurmukhi: "",
    transliteration: "",
    translation: "",
  },
];

export type SikhBlessingId = "anandBlessing" | "chardiKala" | "none";

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
}

export const SIKH_BLESSINGS: readonly SikhBlessing[] = [
  {
    id: "anandBlessing",
    label: "Blessing for the couple",
    /*
      TODO: a short Gurmukhi blessing for a couple, suitable for an Anand Karaj
      invitation. See the file header — a short invocation, not a Gurbani
      passage, and not a quotation from the Lavan.
    */
    gurmukhi: "",
    /* TODO: the Roman transliteration of that blessing. */
    transliteration: "",
    /* TODO: the English rendering of that blessing. */
    translation: "",
    occasionNote: "Wedding",
  },
  {
    id: "chardiKala",
    label: "Chardi Kala",
    /* TODO: the Gurmukhi for "Chardi Kala". */
    gurmukhi: "",
    /* TODO: the Roman transliteration of "Chardi Kala". */
    transliteration: "",
    /* TODO: the English rendering of "Chardi Kala". */
    translation: "",
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

/** Null for an unknown or unset id, so a caller renders nothing. */
export function getSikhGreeting(id: string | null): SikhGreeting | null {
  if (id === null) {
    return null;
  }

  return SIKH_GREETINGS.find((greeting) => greeting.id === id) ?? null;
}

/** Null for an unknown or unset id, so a caller renders nothing. */
export function getSikhBlessing(id: string | null): SikhBlessing | null {
  if (id === null) {
    return null;
  }

  return SIKH_BLESSINGS.find((blessing) => blessing.id === id) ?? null;
}
