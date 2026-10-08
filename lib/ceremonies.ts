import { CEREMONY_GLOSSARY } from "@/lib/autoTranslate";
import type { TraditionId } from "@/types/occasion";

/**
 * Which painting a function carries, on its timeline medallion and on its
 * chip under the countdown.
 *
 * Decided from the name the host gave the function, in English or Hindi and
 * in any case, so "HALDI", "Haldi ceremony" and "हल्दी की रस्म" all get the
 * turmeric bowl. A function has no stored type: the name is all there is.
 * Anything not recognised gets the rings and roses, which suit every occasion
 * Lifafa is used for.
 */
export type FunctionIconId =
  | "mehndi"
  | "haldi"
  | "sangeet"
  | "engagement"
  | "baraat"
  | "pheras"
  | "nikah"
  | "walima"
  | "reception"
  | "general";

/** Where the paintings are published; see public/decor/functions/. */
export function functionIconSrc(icon: FunctionIconId): string {
  return `/decor/functions/${icon}.webp`;
}

/**
 * What a name can say. Two more than there are paintings: "wedding" is a
 * word that picks the fire altar on some cards and the rings on others, so it
 * is kept apart from the words that mean the pheras whoever says them.
 */
type NamedKind = Exclude<FunctionIconId, "general"> | "wedding";

/**
 * The order the names are tried in, which is what settles a name that says
 * two things: a "Wedding Reception" is the reception and a "Reception Dinner"
 * is too, a "Walima Dinner" is the walima, and "wedding" is asked last of
 * all, when nothing more exact has been said.
 */
const ORDER: readonly NamedKind[] = [
  "mehndi",
  "haldi",
  "sangeet",
  "engagement",
  "baraat",
  "nikah",
  "reception",
  "walima",
  "pheras",
  "wedding",
];

/**
 * The words that pick each painting. The glossary's own spellings are pulled
 * in below, so a spelling the translate feature learns is recognised here too;
 * these are the words it does not hold, because it never needs to keep them
 * from being translated: "Dinner", भोज, "Ring ceremony".
 */
const EXTRA_WORDS: Readonly<Record<NamedKind, readonly string[]>> = {
  mehndi: ["mehandi", "henna", "मेहन्दी", "हिना"],
  haldi: ["pithi", "पीठी"],
  sangeet: ["sangit", "संगीत संध्या"],
  engagement: ["ring ceremony", "ring", "roka", "रोका", "मंगनी", "अंगूठी"],
  baraat: ["barat", "बरात"],
  nikah: ["nikaah"],
  reception: [],
  walima: [
    "dinner",
    "dawat",
    "daawat",
    "lunch",
    "banquet",
    "डिनर",
    "दावत",
    "भोज",
    "प्रीतिभोज",
    "रात्रिभोज",
  ],
  pheras: ["pheras", "phera", "phere", "vivah", "vivaah", "फेरे", "फेरा", "विवाह"],
  wedding: ["wedding", "shaadi", "shadi", "शादी"],
};

/** The glossary entries each painting takes its spellings from. */
const GLOSSARY_FOR: Readonly<Record<NamedKind, readonly string[]>> = {
  mehndi: ["Mehndi"],
  haldi: ["Haldi"],
  sangeet: ["Sangeet"],
  engagement: ["Engagement", "Sagai"],
  /* The sehra is the groom's, tied on for the baraat: its painting is one. */
  baraat: ["Baraat", "Sehra"],
  nikah: ["Nikah"],
  reception: ["Reception"],
  walima: ["Walima"],
  pheras: [],
  wedding: [],
};

/** Letters and combining marks in any script: what a word is made of. */
const WORD_CHAR = "\\p{L}\\p{M}";

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * One pattern per kind, matching any of its words as a whole word, so the
 * name "Sangeeta" is not the Sangeet and a Devanagari word keeps its matras.
 */
const PATTERNS: readonly (readonly [NamedKind, RegExp])[] = ORDER.map((kind) => {
  const glossary = CEREMONY_GLOSSARY.filter((entry) =>
    GLOSSARY_FOR[kind].includes(entry.en[0]),
  ).flatMap((entry) => [...entry.en, ...entry.hi]);

  const words = [...glossary, ...EXTRA_WORDS[kind]].map(escape);

  return [
    kind,
    new RegExp(`(?<![${WORD_CHAR}])(?:${words.join("|")})(?![${WORD_CHAR}])`, "iu"),
  ] as const;
});

/** The traditions whose wedding is made round a fire, or is drawn as one here. */
const FIRE_ALTAR_TRADITIONS: readonly TraditionId[] = ["hindu", "jain", "sikh"];

/**
 * The painting for a function called `label` on a card of `traditionId`.
 *
 * THE FIRE ALTAR IS NOT EVERYONE'S WEDDING. A name that says pheras or vivah
 * gets it on any card, because the host has said so. A name that only says
 * "wedding" gets it on a Hindu, Jain or Sikh card and the rings on every
 * other, so a Nikah's or a church wedding's schedule never shows a havan.
 */
export function functionIcon(label: string, traditionId: TraditionId): FunctionIconId {
  const text = label.trim();

  for (const [kind, pattern] of PATTERNS) {
    if (!pattern.test(text)) {
      continue;
    }

    if (kind === "wedding") {
      return FIRE_ALTAR_TRADITIONS.includes(traditionId) ? "pheras" : "general";
    }

    return kind;
  }

  return "general";
}
