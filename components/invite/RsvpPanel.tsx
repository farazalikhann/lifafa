"use client";

import { useState, type ReactElement } from "react";
import type { Theme } from "@/lib/themes";
import type { GuestReply, RsvpSubmission } from "@/types/guest";

const REPLIES: readonly { id: GuestReply; label: string }[] = [
  { id: "accepted", label: "Yes, I'll be there" },
  { id: "maybe", label: "Maybe" },
  { id: "declined", label: "Sorry, can't make it" },
];

const MIN_PARTY = 1;
const MAX_PARTY = 10;
const MESSAGE_LIMIT = 200;
const PHONE_LENGTH = 10;
/** Dropped rather than counted, so a pasted "+91 ..." keeps the right ten. */
const COUNTRY_CODE = "91";

/**
 * Reduces anything that can reach the field — "+91 98765 43210", "098765
 * 43210" — to the ten digits a host would actually dial. A country code or
 * trunk zero is removed before the length is trimmed; counting it would push
 * the real last digits off the end and hand the host a number that silently
 * does not ring.
 *
 * Every route into the field runs through here: typing, pasting, browser
 * autofill and speech input all arrive as a change event, so none of them can
 * take a shortcut past the normalising.
 */
function normalisePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");

  /*
    Both guards are behind a length check, so a genuine ten digit number that
    happens to open with 91 or 0 is left exactly as the guest entered it.
  */
  if (digits.length > PHONE_LENGTH) {
    digits = digits.replace(/^0+/, "");
  }
  if (digits.length > PHONE_LENGTH && digits.startsWith(COUNTRY_CODE)) {
    digits = digits.slice(COUNTRY_CODE.length);
  }

  return digits.slice(0, PHONE_LENGTH);
}

const EMPTY: RsvpSubmission = {
  status: "accepted",
  partySize: 1,
  name: "",
  phone: "",
  message: "",
};

interface TouchedFields {
  name: boolean;
  phone: boolean;
}

export default function RsvpPanel({
  theme,
  initial,
  onSubmit,
  isSending = false,
  submitError = null,
}: {
  theme: Theme;
  /** Previous answers, so "Change my reply" returns a filled form. */
  initial: RsvpSubmission | null;
  onSubmit: (submission: RsvpSubmission) => void;
  /** True while the reply is in flight, so it cannot be sent twice. */
  isSending?: boolean;
  /** A readable failure from the write, rendered under the button. */
  submitError?: string | null;
}): ReactElement {
  const seed = initial ?? EMPTY;

  const [status, setStatus] = useState<GuestReply | null>(
    initial === null ? null : seed.status,
  );
  const [partySize, setPartySize] = useState<number>(seed.partySize);
  const [name, setName] = useState<string>(seed.name);
  const [phone, setPhone] = useState<string>(seed.phone);
  const [message, setMessage] = useState<string>(seed.message);
  const [touched, setTouched] = useState<TouchedFields>({
    name: false,
    phone: false,
  });

  const trimmedName = name.trim();
  const nameValid = trimmedName.length > 0;
  const phoneValid = phone.length === PHONE_LENGTH;
  const canSubmit = status !== null && nameValid && phoneValid && !isSending;

  /** Names the first thing still missing, in the order the form reads. */
  const blockingHint: string | null =
    status === null
      ? "Choose your reply to continue"
      : !nameValid
        ? "Add your name to continue"
        : !phoneValid
          ? `Enter a ${PHONE_LENGTH} digit phone number`
          : null;

  const fieldStyle = {
    backgroundColor: theme.surface,
    borderColor: `${theme.textMuted}55`,
    color: theme.textPrimary,
    outlineColor: theme.accent,
  };

  const fieldClass =
    "w-full min-h-12 rounded-xl border px-4 py-3 text-base transition-colors duration-150 focus:outline-2 focus:outline-offset-2";

  const handlePhoneChange = (raw: string): void => {
    /* Strip rather than reject, so "+91 98450 21174" still works. */
    setPhone(normalisePhone(raw));
  };

  const handleSubmit = (): void => {
    if (status === null || !canSubmit) {
      return;
    }

    onSubmit({
      status,
      /* Only an acceptance carries companions. */
      partySize: status === "accepted" ? partySize : 1,
      name: trimmedName,
      phone,
      message: message.trim(),
    });
  };

  /*
    Padding rather than a viewport height: the panel is the next thing after the
    card, not another full screen after it. Comfortable top and bottom, and an
    internal rhythm tight enough that the heading and the submit button stay
    within about one screen at 360px.
  */
  return (
    <section className="mx-auto w-full max-w-[480px] px-5 pt-10 pb-12 sm:px-6 sm:pt-12 sm:pb-14">
      <h2
        className="text-center font-[family-name:var(--font-display)] text-2xl font-semibold"
        style={{ color: theme.textPrimary }}
      >
        Will you join us?
      </h2>

      {/* Reply buttons */}
      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
        {REPLIES.map((option) => {
          const isSelected = option.id === status;

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setStatus(option.id)}
              className="min-h-14 flex-1 rounded-xl border px-4 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                backgroundColor: isSelected ? theme.accent : "transparent",
                borderColor: isSelected ? theme.accent : `${theme.textMuted}55`,
                color: isSelected ? theme.background : theme.textPrimary,
                outlineColor: theme.accent,
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Companion stepper — acceptances only */}
      {status === "accepted" ? (
        <div className="mt-6">
          <p
            className="text-center text-sm font-medium"
            style={{ color: theme.textPrimary }}
          >
            How many people are coming, including you?
          </p>

          <div className="mt-3 flex items-center justify-center gap-5">
            <button
              type="button"
              aria-label="One fewer person"
              disabled={partySize <= MIN_PARTY}
              onClick={() => setPartySize((n) => Math.max(MIN_PARTY, n - 1))}
              className="h-11 w-11 rounded-full border text-xl leading-none transition-opacity duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-35"
              style={{
                borderColor: `${theme.textMuted}55`,
                color: theme.textPrimary,
                outlineColor: theme.accent,
              }}
            >
              −
            </button>

            <output
              aria-live="polite"
              className="min-w-12 text-center font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums"
              style={{ color: theme.textPrimary }}
            >
              {partySize}
            </output>

            <button
              type="button"
              aria-label="One more person"
              disabled={partySize >= MAX_PARTY}
              onClick={() => setPartySize((n) => Math.min(MAX_PARTY, n + 1))}
              className="h-11 w-11 rounded-full border text-xl leading-none transition-opacity duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-35"
              style={{
                borderColor: `${theme.textMuted}55`,
                color: theme.textPrimary,
                outlineColor: theme.accent,
              }}
            >
              +
            </button>
          </div>

          <p
            className="mt-3 text-center text-xs"
            style={{ color: theme.textMuted }}
          >
            This helps the hosts plan the catering.
          </p>
        </div>
      ) : null}

      {/* Identity — the whole point of collecting a reply */}
      <div className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="rsvp-name"
            className="text-sm font-medium"
            style={{ color: theme.textPrimary }}
          >
            Your name
          </label>
          <input
            id="rsvp-name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            aria-invalid={touched.name && !nameValid}
            className={fieldClass}
            style={fieldStyle}
          />
          {touched.name && !nameValid ? (
            <p className="text-xs" style={{ color: theme.accent }}>
              Please enter your name.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <label
              htmlFor="rsvp-phone"
              className="text-sm font-medium"
              style={{ color: theme.textPrimary }}
            >
              Phone number
            </label>
            <span
              className="text-xs tabular-nums"
              style={{ color: theme.textMuted }}
            >
              {phone.length}/{PHONE_LENGTH}
            </span>
          </div>
          <input
            id="rsvp-phone"
            type="text"
            required
            inputMode="tel"
            autoComplete="tel-national"
            /*
              No maxLength. It counts characters, not digits, so the browser
              would cut "+91 98765 43210" to ten *characters* before onChange
              could strip the separators — and autofill, which never fires a
              paste event, had no way around it. normalisePhone is the only
              length limit the field needs.
            */
            value={phone}
            onChange={(event) => handlePhoneChange(event.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
            aria-invalid={touched.phone && !phoneValid}
            className={`${fieldClass} tabular-nums`}
            style={fieldStyle}
          />
          {touched.phone && !phoneValid ? (
            <p className="text-xs" style={{ color: theme.accent }}>
              Phone number must be {PHONE_LENGTH} digits.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <label
              htmlFor="rsvp-message"
              className="text-sm font-medium"
              style={{ color: theme.textPrimary }}
            >
              A message for the hosts
            </label>
            <span
              className="text-xs tabular-nums"
              style={{ color: theme.textMuted }}
            >
              {message.length}/{MESSAGE_LIMIT}
            </span>
          </div>
          <textarea
            id="rsvp-message"
            rows={2}
            maxLength={MESSAGE_LIMIT}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className={`${fieldClass} resize-y`}
            style={fieldStyle}
          />
        </div>
      </div>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={handleSubmit}
        className="mt-7 min-h-[52px] w-full rounded-xl px-4 text-base font-semibold transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 enabled:hover:-translate-y-px disabled:cursor-not-allowed"
        style={{
          backgroundColor: canSubmit ? theme.accent : "transparent",
          border: canSubmit ? "1px solid transparent" : `1px solid ${theme.textMuted}55`,
          color: canSubmit ? theme.background : theme.textMuted,
          outlineColor: theme.accent,
        }}
      >
        {isSending ? "Sending…" : "Send my reply"}
      </button>

      {/* The write failed. Inline and re-readable, never an alert. */}
      {submitError !== null ? (
        <p
          role="alert"
          className="mt-3 rounded-xl px-4 py-3 text-center text-sm"
          style={{
            backgroundColor: `${theme.accent}1a`,
            color: theme.textPrimary,
          }}
        >
          {submitError}
        </p>
      ) : null}

      {blockingHint !== null ? (
        <p
          aria-live="polite"
          className="mt-3 text-center text-xs"
          style={{ color: theme.textMuted }}
        >
          {blockingHint}
        </p>
      ) : null}
    </section>
  );
}
