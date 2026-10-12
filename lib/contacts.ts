import type { CardBlock } from "@/types/customSection";
import type { EventContact, EventDraft } from "@/types/event";

/**
 * The contact numbers on a card: who a guest can ring with a question.
 *
 * Optional, and at most two. The card's contact section reads them through
 * `contactsOf` and draws nothing when it hands back none, which is every card
 * saved before the field existed.
 */

/** How many a card may carry. Two is one for each side of a wedding. */
export const MAX_CONTACTS = 2;

/** Long enough for a label to say who it is; a card is not a phone book. */
export const CONTACT_LABEL_MAX = 40;
/** A full international number with its spaces and its plus. */
export const CONTACT_PHONE_MAX = 20;

/** Fewer digits than this is not a number anybody can ring. */
const MIN_DIGITS = 6;

/**
 * A phone number as a `tel:` link, or null when it is not one.
 *
 * Only its digits and one leading plus are ever put into the link, whatever
 * was typed or reached the stored draft, so nothing a host writes here can
 * become a link to anywhere but a dial pad.
 */
export function telHref(phone: string): string | null {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (digits.length < MIN_DIGITS) {
    return null;
  }

  return `tel:${trimmed.startsWith("+") ? "+" : ""}${digits}`;
}

/**
 * The contacts a card shows: the ones with a number that can be dialled, in
 * the host's order, trimmed, and never more than MAX_CONTACTS.
 */
export function contactsOf(
  draft: Pick<EventDraft, "contacts">,
): readonly EventContact[] {
  const contacts = Array.isArray(draft.contacts) ? draft.contacts : [];

  return contacts
    .filter(
      (contact) =>
        typeof contact?.phone === "string" && telHref(contact.phone) !== null,
    )
    .slice(0, MAX_CONTACTS)
    .map((contact) => ({
      id: contact.id,
      label: typeof contact.label === "string" ? contact.label.trim() : "",
      phone: contact.phone.trim(),
    }));
}

/** Whether the contact section puts anything on the card. */
export function hasContacts(draft: Pick<EventDraft, "contacts">): boolean {
  return contactsOf(draft).length > 0;
}

/**
 * The running order with the contact section in it, for a card that has
 * contacts and no block for them yet.
 *
 * "contact" is deliberately outside DEFAULT_SECTION_ORDER, so a card with no
 * numbers carries no block for them and nothing lists a section it cannot
 * fill. The block is added here the first time there is something for it to
 * show: before the note, which closes the card, or last where there is none.
 *
 * Only ever adds. A block that is already there is left where the host put it
 * and as they set it, switched off included.
 */
export function withContactBlock(
  blocks: readonly CardBlock[],
  draft: Pick<EventDraft, "contacts">,
): readonly CardBlock[] {
  if (
    !hasContacts(draft) ||
    blocks.some((block) => block.kind === "builtin" && block.id === "contact")
  ) {
    return blocks;
  }

  const note = blocks.findIndex(
    (block) => block.kind === "builtin" && block.id === "message",
  );
  const at = note === -1 ? blocks.length : note;

  return [
    ...blocks.slice(0, at),
    { kind: "builtin", id: "contact", enabled: true },
    ...blocks.slice(at),
  ];
}
