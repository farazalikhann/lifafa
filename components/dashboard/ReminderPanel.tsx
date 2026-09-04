"use client";

import { useState, type ReactElement } from "react";
import type { Guest } from "@/types/guest";

/**
 * India's country code. Every phone the reply form accepts is ten local
 * digits, so wa.me — which wants a full international number and no plus, no
 * spaces, no dashes — gets this in front of it.
 */
const COUNTRY_CODE = "91";

/**
 * Reduces whatever is stored to the ten digits wa.me needs.
 *
 * The column is normalised in SQL and should already be ten digits, but a
 * seeded row or an older import could carry a leading zero or a +91, and a
 * wa.me link built from "+919876543210" opens WhatsApp on an error rather than
 * on a chat. Taking the last ten digits is right for every one of those shapes.
 */
function toWhatsAppNumber(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");

  return digits.length < 10 ? null : `${COUNTRY_CODE}${digits.slice(-10)}`;
}

/**
 * The reminder itself: plain, professional, and short enough to read in a
 * notification. No emoji — this goes out under the host's own name, from the
 * host's own number, to people they know.
 *
 * The date is dropped rather than faked when the host has not set one. A
 * reminder that says "on" and then nothing is worse than one that simply asks.
 */
function reminderMessage(
  guestName: string,
  eventTitle: string,
  when: string | null,
  inviteUrl: string,
): string {
  const occasion = when === null ? eventTitle : `${eventTitle} on ${when}`;

  return [
    `Hello ${guestName}, a gentle reminder about ${occasion}.`,
    "We have not received your reply yet.",
    `Please let us know whether you can join us: ${inviteUrl}`,
    "Thank you.",
  ].join(" ");
}

/** Muted tick for a guest already opened in this session, hollow ring for not. */
function OpenedMark({ opened }: { opened: boolean }): ReactElement {
  return (
    <svg
      viewBox="0 0 20 20"
      role="img"
      aria-label={opened ? "Reminder opened" : "Not opened yet"}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px] shrink-0 text-[var(--lifafa-muted)]"
    >
      {opened ? (
        <path d="M4 10.5 L8 14.5 L16 5.5" />
      ) : (
        <circle cx={10} cy={10} r={6} />
      )}
    </svg>
  );
}

/**
 * Working down the list of guests who have not replied, one tap at a time.
 *
 * NOT a WhatsApp button per guest. A wedding list runs to a couple of hundred
 * people and a third of them are usually still pending, which would put a wall
 * of identical buttons under the table — and a host chasing replies on a phone
 * would lose their place in it after the fourth. One button, one guest, and it
 * names whoever is next, so the host can keep tapping without reading.
 *
 * WHAT IS AND IS NOT SAVED: which reminders have been opened is session state
 * and nothing more. It never reaches the database, deliberately — opening a
 * WhatsApp draft is not evidence that anything was sent, let alone read, and a
 * "reminded" column that actually meant "the host once tapped a button" would
 * be a fact the dashboard could not stand behind. Reloading the page starts the
 * list over, which is the honest behaviour: the only durable record of a guest
 * being chased is their reply arriving.
 */
export default function ReminderPanel({
  guests,
  eventTitle,
  when,
  inviteUrl,
}: {
  guests: readonly Guest[];
  eventTitle: string;
  /** The formatted date and time, or null when the host has not set one. */
  when: string | null;
  inviteUrl: string;
}): ReactElement | null {
  const [opened, setOpened] = useState<readonly string[]>([]);

  const pending = guests.filter((guest) => guest.rsvp === "pending");

  /* Nothing to chase: the panel is not a heading over an empty list. */
  if (pending.length === 0) {
    return null;
  }

  const next = pending.find((guest) => !opened.includes(guest.id)) ?? null;
  const remaining = pending.length - opened.length;

  const handleOpen = (): void => {
    if (next === null) {
      return;
    }

    const number = toWhatsAppNumber(next.phone);
    const message = reminderMessage(next.name, eventTitle, when, inviteUrl);

    /*
      Opened before the state update, and synchronously inside the click: a
      window.open that happens after an await or inside an effect has lost its
      user gesture and is blocked as a popup.

      A guest whose stored number cannot make a valid link is still marked
      opened rather than becoming a button that does nothing when tapped — the
      host would tap it twice, decide the panel is broken, and stop.
    */
    if (number !== null) {
      window.open(
        `https://wa.me/${number}?text=${encodeURIComponent(message)}`,
        "_blank",
        "noopener,noreferrer",
      );
    }

    setOpened((previous) => [...previous, next.id]);
  };

  const isDone = next === null;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-5 py-5 sm:px-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-[0.6875rem] tracking-[0.26em] text-[var(--lifafa-marigold)] uppercase">
          Chase the stragglers
        </h2>
        <p className="text-[0.9375rem] text-[var(--lifafa-cream)]">
          {pending.length} {pending.length === 1 ? "guest has" : "guests have"}{" "}
          not replied yet.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <button
          type="button"
          disabled={isDone}
          onClick={handleOpen}
          className="flex min-h-11 items-center justify-center rounded-xl border border-[var(--lifafa-hairline)] px-4 text-[0.8125rem] font-medium whitespace-nowrap text-[var(--lifafa-cream)] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] enabled:hover:border-[var(--lifafa-marigold)] disabled:cursor-not-allowed disabled:opacity-45 sm:text-sm"
        >
          Open WhatsApp reminder
        </button>

        {/*
          Polite and on its own element, so the host who has just tapped hears
          who they are about to message next without having to look back up.
        */}
        <p
          aria-live="polite"
          className="text-[0.8125rem] text-[var(--lifafa-muted)]"
        >
          {isDone
            ? "You have gone through the list."
            : `Next: ${next.name} · ${remaining} to go`}
        </p>
      </div>

      <ul className="flex flex-col gap-1.5 border-t border-[var(--lifafa-hairline)] pt-4">
        {pending.map((guest) => {
          const isOpened = opened.includes(guest.id);

          return (
            <li key={guest.id} className="flex items-center gap-2.5">
              <OpenedMark opened={isOpened} />
              <span
                className={`min-w-0 truncate text-[0.8125rem] ${
                  isOpened
                    ? "text-[var(--lifafa-muted)] line-through"
                    : "text-[var(--lifafa-cream)]"
                }`}
              >
                {guest.name}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-[var(--lifafa-muted)]">
        Ticks are remembered for this visit only. Nothing is saved against a
        guest, because opening a draft is not the same as sending it.
      </p>
    </section>
  );
}
