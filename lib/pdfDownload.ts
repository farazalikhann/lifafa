/**
 * "Save as PDF": whether a guest may keep a printable copy of the card, and
 * where that copy is.
 *
 * NO SERVICE DRAWS THE PDF. The copy is a page of its own, laid out for paper
 * (app/i/[inviteCode]/print), and the guest's own browser turns it into a
 * file with the Save as PDF every browser has in its print sheet. So it costs
 * nothing per card, needs nothing installed, and is drawn by the card's own
 * components in the card's own faces, which is the only way the Arabic,
 * Devanagari and Gurmukhi on it come out as they are on the card.
 *
 * ON UNLESS THE HOST TURNED IT OFF. Stored on the card's JSON, and only ever
 * as `false`: absent, which is every card saved before the switch, the copy
 * is offered. Read it through `pdfDownloadOn`, never with a truthiness test.
 * No column and no migration: it is a line of the card's own config.
 */

import type { CardLanguage } from "@/types/card";

export function pdfDownloadOn(value: unknown): boolean {
  return value !== false;
}

/** The printable copy of an invitation, in the language it is being read in. */
export function printPath(inviteCode: string, language: CardLanguage): string {
  return `/i/${encodeURIComponent(inviteCode)}/print?lang=${language}`;
}

/**
 * Added to the printable copy's address by the card's button: the page then
 * opens the print sheet by itself once it is ready, where a visitor who came
 * to it directly is left to press its own button.
 */
export const PRINT_AUTO_PARAM = "auto";

/**
 * What the printable copy tells the card that opened it in a frame, through
 * postMessage: that it is laid out and about to print, or that the sheet has
 * been closed. Namespaced, because a page hears every message sent to it.
 */
export const PRINT_MESSAGE_READY = "lifafa:print-ready";
export const PRINT_MESSAGE_DONE = "lifafa:print-done";

/** The saved file's name, less its extension: the browser takes the page's title for it. */
export function pdfTitle(names: string | null, fallback: string): string {
  const who = names === null || names.trim().length === 0 ? fallback : names.trim();

  return `${who} - Invitation`;
}
