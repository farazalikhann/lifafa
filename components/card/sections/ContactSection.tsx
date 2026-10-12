"use client";

import type { ReactElement } from "react";
import { useInView } from "@/hooks/useInView";
import {
  REVEAL_BASE,
  SECTION_REVEAL_OPTIONS,
  lineDelay,
  revealClass,
} from "@/lib/cardFormat";
import { cardCopy } from "@/lib/cardLanguage";
import { cardPx } from "@/lib/cardScale";
import { contactsOf, telHref } from "@/lib/contacts";
import { textRoles, type Theme } from "@/lib/themes";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";

/**
 * Who to ring with a question: up to two names, each over its number.
 *
 * Renders nothing at all when the host has added no number that can be
 * dialled. CardCanvas filters the section out of the running order in that
 * case too, and both ask `contactsOf`, so a divider is never left beside
 * nothing.
 *
 * Each number is a `tel:` link built by telHref from its digits alone, and a
 * tap target of its own: on a phone it opens the dial pad.
 */
export default function ContactSection({
  draft,
  theme,
  minHeight,
  pad,
  language,
}: {
  draft: EventDraft;
  theme: Theme;
  minHeight: string;
  /** Content inset, top and bottom, in px — see CoverSection for what it is for. */
  pad: number;
  language: CardLanguage;
}): ReactElement | null {
  const { ref, isInView } = useInView<HTMLElement>(SECTION_REVEAL_OPTIONS);
  const contacts = contactsOf(draft);

  if (contacts.length === 0) {
    return null;
  }

  const copy = cardCopy(language);
  const roles = textRoles(theme);
  const reveal = `${REVEAL_BASE} ${revealClass(isInView)}`;

  return (
    <section
      ref={ref}
      className="flex flex-col items-center justify-center px-7 text-center"
      style={{
        minHeight,
        paddingTop: cardPx(pad),
        paddingBottom: cardPx(pad),
        gap: `calc(1.5 * var(--card-rem, 1rem) * var(--card-gap-scale, 1))`,
      }}
    >
      <p
        className={`text-[calc(0.7*var(--card-rem,1rem))] tracking-[0.24em] uppercase ${reveal}`}
        style={{ color: theme.textMuted, ...lineDelay(0) }}
      >
        {copy.contact.heading}
      </p>

      <ul
        className="flex w-full flex-col items-center"
        style={{
          gap: `calc(1.25 * var(--card-rem, 1rem) * var(--card-gap-scale, 1))`,
        }}
      >
        {contacts.map((contact, index) => (
          <li
            key={contact.id}
            className={`flex max-w-full flex-col items-center gap-1 ${reveal}`}
            style={lineDelay(index + 1)}
          >
            {contact.label.length > 0 ? (
              <span
                className="max-w-[28ch] text-[calc(0.9*var(--card-rem,1rem))] leading-snug break-words text-balance"
                style={{ color: roles.detail }}
              >
                {contact.label}
              </span>
            ) : null}
            <a
              href={telHref(contact.phone) ?? undefined}
              aria-label={`${copy.contact.call} ${contact.label} ${contact.phone}`.replace(
                /\s+/g,
                " ",
              )}
              /* Digits read left to right in either language. */
              dir="ltr"
              className="inline-flex min-h-11 items-center rounded-full px-4 text-[calc(1.2*var(--card-rem,1rem))] font-semibold tracking-wide whitespace-nowrap underline decoration-transparent underline-offset-4 transition-colors duration-150 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: roles.heading, outlineColor: theme.accent }}
            >
              {contact.phone}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
