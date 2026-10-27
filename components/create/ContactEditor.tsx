"use client";

import { useRef, type ReactElement } from "react";
import {
  CONTACT_LABEL_MAX,
  CONTACT_PHONE_MAX,
  MAX_CONTACTS,
  telHref,
} from "@/lib/contacts";
import type { EventContact } from "@/types/event";

const INPUT_CLASS = [
  "w-full min-h-11 rounded-xl px-4 py-2.5",
  "border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)]",
  "text-[0.9375rem] text-[var(--lifafa-cream)] placeholder:text-[var(--lifafa-muted)]",
  "transition-colors duration-150 [color-scheme:dark]",
  "focus:border-[var(--lifafa-marigold)] focus:ring-2 focus:ring-[var(--lifafa-marigold)]/30 focus:outline-none",
].join(" ");

const LABEL_CLASS = "text-[0.8125rem] font-medium text-[var(--lifafa-cream)]";

/**
 * The contact numbers: up to two people a guest can ring with a question.
 *
 * Optional from end to end. A card with none has no contact section, and a row
 * whose number cannot be dialled yet is kept here and left off the card, so a
 * host half way through typing one is never shown a broken link. See
 * lib/contacts.ts for what counts as a number.
 */
export default function ContactEditor({
  contacts,
  onChange,
}: {
  contacts: readonly EventContact[];
  onChange: (contacts: readonly EventContact[]) => void;
}): ReactElement {
  /* Names a new row. Never the clock or Math.random: the id is saved with the card. */
  const counter = useRef<number>(0);
  const isFull = contacts.length >= MAX_CONTACTS;

  const handleAdd = (): void => {
    if (isFull) {
      return;
    }

    let id = "";

    /* Stepped past any id a restored or saved card already holds. */
    do {
      counter.current += 1;
      id = `contact-${counter.current}`;
    } while (contacts.some((contact) => contact.id === id));

    onChange([...contacts, { id, label: "", phone: "" }]);
  };

  const handleField = (
    id: string,
    field: "label" | "phone",
    value: string,
  ): void => {
    onChange(
      contacts.map((contact) =>
        contact.id === id ? { ...contact, [field]: value } : contact,
      ),
    );
  };

  return (
    <section aria-labelledby="contacts-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2
          id="contacts-heading"
          className="text-[0.6875rem] tracking-[0.26em] text-[var(--lifafa-marigold)] uppercase"
        >
          Contact numbers
        </h2>
        <p className="text-xs leading-relaxed text-[var(--lifafa-muted)]">
          Optional. Up to two people guests can call with a question. They are
          shown on the card, so add only numbers you are happy to share.
        </p>
      </div>

      {contacts.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {contacts.map((contact, index) => {
            const labelId = `${contact.id}-label`;
            const phoneId = `${contact.id}-phone`;
            const typed = contact.phone.trim().length > 0;
            const dialable = telHref(contact.phone) !== null;

            return (
              <li
                key={contact.id}
                className="flex flex-col gap-3 rounded-2xl border border-[var(--lifafa-hairline)] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[0.8125rem] font-medium text-[var(--lifafa-muted)]">
                    Contact {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      onChange(
                        contacts.filter((entry) => entry.id !== contact.id),
                      )
                    }
                    className="-mr-2 min-h-11 rounded px-2 text-[0.8125rem] font-medium text-[var(--lifafa-muted)] transition-colors duration-150 hover:text-[var(--lifafa-cream)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
                  >
                    Remove
                    <span className="sr-only"> contact {index + 1}</span>
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <label htmlFor={labelId} className={LABEL_CLASS}>
                      Who is this?
                    </label>
                    <input
                      id={labelId}
                      type="text"
                      value={contact.label}
                      maxLength={CONTACT_LABEL_MAX}
                      placeholder="e.g. Bride's side, Rahul"
                      autoComplete="off"
                      onChange={(event) =>
                        handleField(contact.id, "label", event.target.value)
                      }
                      className={INPUT_CLASS}
                    />
                  </div>

                  <div className="flex min-w-0 flex-col gap-1.5">
                    <label htmlFor={phoneId} className={LABEL_CLASS}>
                      Phone number
                    </label>
                    <input
                      id={phoneId}
                      type="tel"
                      inputMode="tel"
                      value={contact.phone}
                      maxLength={CONTACT_PHONE_MAX}
                      placeholder="e.g. 98765 43210"
                      autoComplete="off"
                      aria-describedby={
                        typed && !dialable ? `${phoneId}-hint` : undefined
                      }
                      onChange={(event) =>
                        handleField(contact.id, "phone", event.target.value)
                      }
                      className={INPUT_CLASS}
                    />
                    {typed && !dialable ? (
                      <p
                        id={`${phoneId}-hint`}
                        className="text-xs leading-relaxed text-[var(--lifafa-muted)]"
                      >
                        Enter the full number. It is left off the card until
                        then.
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {isFull ? (
        <p className="text-xs text-[var(--lifafa-muted)]">
          You can add up to two contact numbers.
        </p>
      ) : (
        <button
          type="button"
          onClick={handleAdd}
          className="min-h-11 rounded-xl border border-[var(--lifafa-hairline)] px-4 text-[0.8125rem] font-medium text-[var(--lifafa-cream)] transition-colors duration-150 hover:border-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
        >
          {contacts.length === 0
            ? "Add a contact number"
            : "Add another contact number"}
        </button>
      )}
    </section>
  );
}
