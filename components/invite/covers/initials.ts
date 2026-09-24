/*
  The couple's initials, for the covers that letter them into the drawing:
  pressed into the envelope's wax, stitched into the curtain's crest.
*/

/**
 * Words that join two names rather than being one, skipped when taking initials.
 *
 * The Hindi presets are here too, so "आरव संग मीरा" gives आम rather than आसं —
 * and एवं and व, the two a host writing formally reaches for instead.
 */
const JOINERS = new Set([
  "and",
  "weds",
  "with",
  "the",
  "of",
  "to",
  "&",
  "+",
  "x",
  "संग",
  "और",
  "एवं",
  "व",
]);

/**
 * Up to two initials for the seal, or an empty string when there is nothing
 * usable. "Aarav weds Meera" gives AM, not AWM.
 */
export function initialsOf(title: string | undefined): string {
  if (title === undefined) {
    return "";
  }

  const letters: string[] = [];

  for (const word of title.split(/\s+/)) {
    /*
      Marks are kept along with letters. Devanagari writes its vowel signs and
      the anusvara as combining marks, and stripping them turned "संग" into
      "सग" — which is not in the joiner list, so it was sealed as an initial.
    */
    const cleaned = word.replace(/[^\p{L}\p{M}\p{N}]/gu, "");

    if (cleaned.length === 0 || JOINERS.has(cleaned.toLowerCase())) {
      continue;
    }

    letters.push(cleaned.charAt(0).toUpperCase());

    if (letters.length === 2) {
      break;
    }
  }

  return letters.join("");
}
