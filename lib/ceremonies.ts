import { CEREMONY_GLOSSARY } from "@/lib/autoTranslate";

/**
 * Which drawing a function's medallion carries on the timeline.
 *
 * Decided from the name the host gave the function, in English or Hindi and
 * in any case, so "HALDI", "Haldi ceremony" and "हल्दी की रस्म" all get the
 * turmeric bowl. Anything not recognised gets a diya, which suits every
 * occasion Lifafa is used for.
 */
export type CeremonyKind =
  | "haldi"
  | "mehndi"
  | "nikah"
  | "sangeet"
  | "feast"
  | "engagement"
  | "baraat"
  | "diya";

/**
 * The words that pick each drawing. The glossary's own spellings are pulled in
 * below, so a spelling the translate feature learns is recognised here too;
 * these are the words it does not hold, because it never needs to keep them
 * from being translated: "Dinner", भोज, "Ring ceremony".
 */
const EXTRA_WORDS: Readonly<Record<Exclude<CeremonyKind, "diya">, readonly string[]>> = {
  haldi: ["pithi", "पीठी"],
  mehndi: ["mehandi", "henna", "मेहन्दी"],
  nikah: ["nikaah"],
  sangeet: ["sangit", "संगीत संध्या"],
  feast: ["dinner", "lunch", "banquet", "valima", "डिनर", "भोज", "प्रीतिभोज", "रात्रिभोज"],
  engagement: ["ring ceremony", "roka", "रोका", "मंगनी", "अंगूठी"],
  baraat: ["barat", "बरात"],
};

/** The glossary entries each drawing takes its spellings from. */
const GLOSSARY_FOR: Readonly<Record<Exclude<CeremonyKind, "diya">, readonly string[]>> = {
  haldi: ["Haldi"],
  mehndi: ["Mehndi"],
  nikah: ["Nikah"],
  sangeet: ["Sangeet"],
  feast: ["Walima", "Reception"],
  engagement: ["Engagement", "Sagai"],
  baraat: ["Baraat"],
};

/** Letters and combining marks in any script: what a word is made of. */
const WORD_CHAR = "\\p{L}\\p{M}";

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * One pattern per drawing, matching any of its words as a whole word, so the
 * name "Sangeeta" is not the Sangeet and a Devanagari word keeps its matras.
 */
const PATTERNS: readonly (readonly [CeremonyKind, RegExp])[] = (
  Object.keys(EXTRA_WORDS) as Exclude<CeremonyKind, "diya">[]
).map((kind) => {
  const glossary = CEREMONY_GLOSSARY.filter((entry) =>
    GLOSSARY_FOR[kind].includes(entry.en[0]),
  ).flatMap((entry) => [...entry.en, ...entry.hi]);

  const words = [...glossary, ...EXTRA_WORDS[kind]].map(escape);

  return [
    kind,
    new RegExp(`(?<![${WORD_CHAR}])(?:${words.join("|")})(?![${WORD_CHAR}])`, "iu"),
  ] as const;
});

/** The drawing for a function called `label`. */
export function ceremonyKind(label: string): CeremonyKind {
  const text = label.trim();

  for (const [kind, pattern] of PATTERNS) {
    if (pattern.test(text)) {
      return kind;
    }
  }

  return "diya";
}
