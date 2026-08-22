/**
 * Greetings and blessings offered on a Christian card.
 *
 * EVERY TEXT AND TRANSLATION STRING IN THIS FILE SHIPS EMPTY. Nothing here was
 * written, paraphrased, reconstructed or recalled from memory, and nothing may
 * be. Each empty field carries a TODO naming exactly what belongs in it; every
 * value must be copied from a verified source and reviewed by someone
 * knowledgeable before release.
 *
 * That applies with full force even though the text is English and would be the
 * easiest in the app to write from memory. A blessing is not a turn of phrase
 * to be improvised, wordings differ between traditions and translations, and a
 * scriptural line carries requirements around attribution and version that this
 * structure makes no provision for. An empty string renders nothing at all, so
 * an unfilled entry is safe; filling one in casually is not.
 *
 * THE SCRIPT FIELD AND THE TRANSLATION FIELD WILL HOLD THE SAME TEXT once
 * filled, because the language is already English. Both are kept anyway: the
 * shape is shared across every tradition's content file, and the card and the
 * panel read the same two fields whatever the tradition. `transliteration` has
 * nothing to carry here and stays empty permanently.
 *
 * RENDERING: the English line goes on the page with lang="en" and dir="ltr", in
 * the card's own body face. No webfont is loaded for this pack and none should
 * be — Latin text is already covered by the faces in app/layout.tsx.
 */

/** The `lang` every line in this file is rendered under. */
export const CHRISTIAN_LANG = "en";

export type ChristianGreetingId =
  | "graceAndPeace"
  | "inChristName"
  | "none";

export interface ChristianGreeting {
  id: ChristianGreetingId;
  /** Name of the greeting, shown in the editor's option list. */
  label: string;
  /**
   * The line itself, exactly as supplied. Named for its script like every other
   * pack's — which here is the Latin alphabet, in English.
   */
  english: string;
  /** Unused in this pack: the text is already English. Stays empty. */
  transliteration: string;
  /**
   * English rendering, exactly as supplied. The same text as `english` once
   * filled — see the file header.
   */
  translation: string;
}

export const CHRISTIAN_GREETINGS: readonly ChristianGreeting[] = [
  {
    id: "graceAndPeace",
    label: "Grace and peace to you",
    /* TODO: the exact wording of the "Grace and peace to you" greeting, from a verified source. */
    english: "",
    transliteration: "",
    /* TODO: the same wording again — see the file header on why both fields exist. */
    translation: "",
  },
  {
    id: "inChristName",
    label: "In the name of the Father, Son and Holy Spirit",
    /* TODO: the exact wording of the trinitarian invocation, from a verified source. */
    english: "",
    transliteration: "",
    /* TODO: the same wording again. */
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
    english: "",
    transliteration: "",
    translation: "",
  },
];

export type ChristianBlessingId =
  | "loveBlessing"
  | "homeBlessing"
  | "generalGrace"
  | "none";

export interface ChristianBlessing {
  id: ChristianBlessingId;
  /** Name of the blessing, shown in the editor's option list. */
  label: string;
  /** The line itself, exactly as supplied. */
  english: string;
  /** Unused in this pack: the text is already English. Stays empty. */
  transliteration: string;
  /** English rendering, exactly as supplied. The same text as `english`. */
  translation: string;
  /** Which occasion the blessing suits, in the host's words. */
  occasionNote: string;
}

export const CHRISTIAN_BLESSINGS: readonly ChristianBlessing[] = [
  {
    id: "loveBlessing",
    label: "Blessing on love",
    /* TODO: the exact wording of a blessing on love, suitable for a wedding invitation. */
    english: "",
    transliteration: "",
    /* TODO: the same wording again. */
    translation: "",
    occasionNote: "Wedding",
  },
  {
    id: "homeBlessing",
    label: "Blessing on a home",
    /* TODO: the exact wording of a blessing on a home, suitable for a housewarming. */
    english: "",
    transliteration: "",
    /* TODO: the same wording again. */
    translation: "",
    occasionNote: "Housewarming",
  },
  {
    id: "generalGrace",
    label: "A general blessing",
    /* TODO: the exact wording of a general blessing, suitable for any occasion. */
    english: "",
    transliteration: "",
    /* TODO: the same wording again. */
    translation: "",
    occasionNote: "Any occasion",
  },
  {
    /* The opt-out — see the matching note on the "none" greeting. */
    id: "none",
    label: "No blessing",
    english: "",
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
export function getChristianGreeting(
  id: string | null,
): ChristianGreeting | null {
  if (id === null) {
    return null;
  }

  return CHRISTIAN_GREETINGS.find((greeting) => greeting.id === id) ?? null;
}

/** Null for an unknown or unset id, so a caller renders nothing. */
export function getChristianBlessing(
  id: string | null,
): ChristianBlessing | null {
  if (id === null) {
    return null;
  }

  return CHRISTIAN_BLESSINGS.find((blessing) => blessing.id === id) ?? null;
}
