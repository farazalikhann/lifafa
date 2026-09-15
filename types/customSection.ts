import type { CardSectionId } from "@/types/card";
import type { Translations } from "@/types/event";

/** A custom section's words in another language. See DraftWords in types/event.ts. */
export interface CustomSectionWords {
  heading?: string;
  body?: string;
}

export interface CustomSection {
  id: string;
  heading: string;
  body: string;
  /**
   * The heading and body in the card's other languages. Absent until the host
   * writes one; kept on the section so removing it removes these with it.
   */
  translations?: Translations<CustomSectionWords>;
}

/**
 * One entry in the card's running order. Built in sections carry an enabled
 * flag so a host can switch one off without losing its place; custom sections
 * carry their own content. Both live in the same ordered array, which is what
 * lets the host interleave them freely.
 */
export type CardBlock =
  | { kind: "builtin"; id: CardSectionId; enabled: boolean }
  | { kind: "custom"; section: CustomSection };
