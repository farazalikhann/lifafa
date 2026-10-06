/**
 * Greetings and blessings offered on a Jain card.
 *
 * TODO(Faraz): have every Devanagari line, transliteration and meaning in this
 * file checked by a Jain reader before launch.
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
 * Do not "tidy" a value. Devanagari matras and conjuncts
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
 * MICHHAMI DUKKADAM ASKS FORGIVENESS. It is said at Kshamavani, at the close
 * of Paryushan, and its occasion note says so: it does not suit a wedding.
 *
 * THE FONT IS THE ONE THE HINDU PACK ALREADY LOADS. Devanagari is Devanagari;
 * app/layout.tsx loads Noto Sans Devanagari once and both packs resolve it
 * through --lifafa-devanagari, and on the card both are set in the same Tiro
 * Devanagari (DEVANAGARI_CARD_HEAD in lib/traditionPacks.tsx). Do not add a
 * second face for this pack.
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

type JainGreetingId = "jaiJinendra" | "navkarOpening" | "none";

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
    devanagari: "जय जिनेन्द्र",
    transliteration: "Jai Jinendra",
    translation: "Victory to the Jinas",
  },
  {
    id: "navkarOpening",
    label: "Navkar Mantra opening line",
    /* The OPENING LINE only: the first salutation, not the full mantra. See the file header. */
    devanagari: "णमो अरिहंताणं",
    transliteration: "Namo Arihantanam",
    translation: "I bow to the Arihants",
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

type JainBlessingId = "michhami" | "mangalBlessing" | "none";

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
    devanagari: "मिच्छामि दुक्कडम्",
    transliteration: "Michhami Dukkadam",
    translation: "May all my wrongdoings be forgiven",
    /* Not "Any occasion": it asks forgiveness. See the file header. */
    occasionNote: "Kshamavani / Paryushan",
  },
  {
    id: "mangalBlessing",
    label: "A blessing",
    devanagari:
      "मंगलं भगवान वीरो, मंगलं गौतमः प्रभु। मंगलं स्थूलभद्राद्या, जैन धर्मोऽस्तु मंगलम्॥",
    transliteration:
      "Mangalam Bhagavan Viro, Mangalam Gautamah Prabhu, Mangalam Sthulabhadradya, Jain Dharmostu Mangalam",
    translation:
      "Auspicious is Lord Mahavira, auspicious is Gautam Swami, auspicious are Sthulabhadra and the acharyas, may the Jain dharma be auspicious",
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
 * "text pending" note being printed under "No greeting".
 */
export function isOptOut(id: string | null): boolean {
  return id === "none";
}
