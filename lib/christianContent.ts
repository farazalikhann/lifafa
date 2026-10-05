/**
 * Greetings and blessings offered on a Christian card.
 *
 * THE TEXT IS FILLED, FROM THE KING JAMES VERSION, which is in the public
 * domain. Every line and its reference were supplied by Faraz and are here
 * exactly as supplied, character for character: nothing was written,
 * paraphrased, modernised, reconstructed or recalled from memory, and nothing
 * may be. A blessing is not a turn of phrase to be improvised, and wordings
 * differ between traditions and translations; a line that needs changing is
 * changed by being supplied again.
 *
 * TODO(Faraz): have every line and reference below checked by a Christian
 * reader before launch.
 *
 * THE SCRIPT FIELD AND THE TRANSLATION FIELD HOLD THE SAME TEXT, because the
 * language is already English. Both are kept anyway: the shape is shared
 * across every tradition's content file, and the card and the panel read the
 * same two fields whatever the tradition. They show the line once, not twice,
 * where the two are the same. `transliteration` has nothing to carry here and
 * stays empty permanently.
 *
 * `reference` is where the line is from, chapter and verse. The card sets it
 * on its own line under the text, small and muted.
 *
 * RENDERING: the English line goes on the page with lang="en" and dir="ltr", in
 * the card's own body face. No webfont is loaded for this pack and none should
 * be — Latin text is already covered by the faces in app/layout.tsx.
 */

/** The `lang` every line in this file is rendered under. */
export const CHRISTIAN_LANG = "en";

type ChristianGreetingId =
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
   * English rendering, exactly as supplied. The same text as `english` — see
   * the file header.
   */
  translation: string;
  /** Chapter and verse, exactly as supplied. Absent on the opt-out. */
  reference?: string;
}

export const CHRISTIAN_GREETINGS: readonly ChristianGreeting[] = [
  {
    id: "graceAndPeace",
    label: "Grace and peace to you",
    english: "Grace be unto you, and peace, from God our Father, and from the Lord Jesus Christ.",
    transliteration: "",
    translation: "Grace be unto you, and peace, from God our Father, and from the Lord Jesus Christ.",
    reference: "1 Corinthians 1:3",
  },
  {
    id: "inChristName",
    label: "In the name of the Father, Son and Holy Spirit",
    english: "In the name of the Father, and of the Son, and of the Holy Spirit.",
    transliteration: "",
    translation: "In the name of the Father, and of the Son, and of the Holy Spirit.",
    reference: "Matthew 28:19",
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

type ChristianBlessingId =
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
  /** Chapter and verse, exactly as supplied. Absent on the opt-out. */
  reference?: string;
}

export const CHRISTIAN_BLESSINGS: readonly ChristianBlessing[] = [
  {
    id: "loveBlessing",
    label: "Blessing on love",
    english: "What therefore God hath joined together, let not man put asunder.",
    transliteration: "",
    translation: "What therefore God hath joined together, let not man put asunder.",
    occasionNote: "Wedding",
    reference: "Mark 10:9",
  },
  {
    id: "homeBlessing",
    label: "Blessing on a home",
    english: "As for me and my house, we will serve the Lord.",
    transliteration: "",
    translation: "As for me and my house, we will serve the Lord.",
    occasionNote: "Housewarming",
    reference: "Joshua 24:15",
  },
  {
    id: "generalGrace",
    label: "A general blessing",
    english: "The Lord bless thee, and keep thee: the Lord make his face shine upon thee, and be gracious unto thee.",
    transliteration: "",
    translation: "The Lord bless thee, and keep thee: the Lord make his face shine upon thee, and be gracious unto thee.",
    occasionNote: "Any occasion",
    reference: "Numbers 6:24-25",
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
 * "text pending" note being printed under "No greeting". Every other entry in
 * this file is filled now, so the opt-outs are the only empty ones.
 */
export function isOptOut(id: string | null): boolean {
  return id === "none";
}
