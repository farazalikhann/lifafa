import type { CardSectionId } from "@/types/card";

export interface CustomSection {
  id: string;
  heading: string;
  body: string;
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
