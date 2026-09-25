import type { ReactElement, ReactNode } from "react";
import MapsLinkField from "@/components/create/MapsLinkField";
import { JOINER_PRESETS } from "@/lib/cardLanguage";
import { pairsNames } from "@/lib/occasions";
import type { CardLanguage } from "@/types/card";
import type { DraftChangeHandler, EventDraft } from "@/types/event";
import type { OccasionId } from "@/types/occasion";

const MESSAGE_LIMIT = 200;

const INPUT_CLASS = [
  "w-full min-h-11 rounded-xl px-4 py-2.5",
  "border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)]",
  "text-[0.9375rem] text-[var(--lifafa-cream)] placeholder:text-[var(--lifafa-muted)]/70",
  "transition-colors duration-150 [color-scheme:dark]",
  "focus:border-[var(--lifafa-marigold)] focus:ring-2 focus:ring-[var(--lifafa-marigold)]/30 focus:outline-none",
].join(" ");

function Section({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): ReactElement {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[0.6875rem] tracking-[0.26em] text-[var(--lifafa-marigold)] uppercase">
        {label}
      </h2>
      {children}
    </section>
  );
}

function Field({
  id,
  label,
  children,
  hint,
}: {
  id: string;
  label: string;
  children: ReactNode;
  hint?: string;
}): ReactElement {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[0.8125rem] font-medium text-[var(--lifafa-cream)]"
      >
        {label}
      </label>
      {children}
      {hint !== undefined ? (
        <p
          id={`${id}-hint`}
          className="text-xs leading-relaxed text-[var(--lifafa-muted)]"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const HOST_HINT = "Used only when the two name fields are empty.";

/** One of the two allowances a paid invitation has; see lib/eventLock.ts. */
export interface ChangeNote {
  left: number;
  limit: number;
  /** Why the change on screen cannot be saved, or null when it can. */
  error: string | null;
}

/** The date and name allowances, after payment. Absent before it. */
export interface PaidLimitNotes {
  dates: ChangeNote;
  names: ChangeNote;
}

/**
 * "1 of 2 date changes left", or the reason the change on screen will not be
 * saved. The server counts and refuses; this only says so before the host
 * presses Save.
 */
function LimitNote({
  note,
  noun,
}: {
  note: ChangeNote;
  noun: string;
}): ReactElement {
  return note.error !== null ? (
    <p
      role="alert"
      className="rounded-xl border border-[var(--lifafa-rose)]/40 bg-[var(--lifafa-rose)]/10 px-3 py-2 text-xs leading-relaxed text-[var(--lifafa-cream)]"
    >
      {note.error}
    </p>
  ) : (
    <p className="text-xs leading-relaxed text-[var(--lifafa-muted)]">
      {note.left} of {note.limit} {noun} changes left
    </p>
  );
}

/**
 * The example in each field that goes on the card, in the card's language.
 *
 * The labels stay in English with the rest of the editor; the placeholders are
 * what the card will say, so they are written the way the card will be. A host
 * who picks Hindi and meets "आरव" in the first box has been told, without a
 * sentence about it, that the names go in in Hindi too.
 */
interface FieldExamples {
  partyOneName: string;
  partyTwoName: string;
  pairLine: string;
  parents: string;
  city: string;
  eventTitle: string;
  venueName: string;
  venueAddress: string;
  message: string;
  customJoiner: string;
}

const EXAMPLES: Readonly<Record<CardLanguage, FieldExamples>> = {
  en: {
    partyOneName: "Aarav",
    partyTwoName: "Meera",
    pairLine: "Aarav and Meera",
    parents: "Mr Rajesh and Mrs Sunita Sharma",
    city: "Jaipur",
    eventTitle: "Wedding Reception",
    venueName: "The Grand Ballroom",
    venueAddress: "12 MG Road, Bengaluru 560001",
    message: "We would love to have you with us.",
    customJoiner: "ties with",
  },
  hi: {
    partyOneName: "आरव",
    partyTwoName: "मीरा",
    pairLine: "आरव और मीरा",
    parents: "श्री राजेश एवं श्रीमती सुनीता शर्मा",
    city: "जयपुर",
    eventTitle: "शुभ विवाह",
    venueName: "होटल ग्रैंड पैलेस",
    venueAddress: "12, एम. जी. रोड, बेंगलुरु 560001",
    message: "आप सपरिवार सादर आमंत्रित हैं।",
    customJoiner: "के संग",
  },
};

/**
 * Short by design. This word is set at hero size between two names, and the
 * card has one narrow column to draw all three in — a phrase long enough to
 * wrap would stop reading as a joint and start reading as a sentence.
 */
const CUSTOM_JOINER_LIMIT = 12;

function pillClass(isSelected: boolean): string {
  return [
    "min-h-11 rounded-full border px-3.5 text-[0.8125rem] font-medium transition-colors duration-150",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]",
    isSelected
      ? "border-transparent bg-[var(--lifafa-ink-raised)] text-[var(--lifafa-cream)] ring-2 ring-[var(--lifafa-marigold)]"
      : "border-[var(--lifafa-hairline)] text-[var(--lifafa-muted)] hover:text-[var(--lifafa-cream)]",
  ].join(" ");
}

/**
 * The word between the two names.
 *
 * Holds no state of its own: "is this custom?" is read back out of the draft —
 * any word that is not one of the presets is a custom one — so there is no
 * second source of truth to fall out of step with what the card is showing.
 * The Custom pill writes an empty word, which is both unrecognised (so the
 * input stays open) and blank (so the card shows its own fallback until the
 * host types something).
 */
function JoinerControl({
  value,
  onChange,
  language,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Which language's presets to offer. See JOINER_PRESETS. */
  language: CardLanguage;
}): ReactElement {
  const presets = JOINER_PRESETS[language];
  const isCustom = !presets.includes(value);

  return (
    <div
      role="group"
      aria-labelledby="joinerWord-label"
      className="flex flex-col items-center gap-2"
    >
      <span
        id="joinerWord-label"
        className="text-[0.8125rem] font-medium text-[var(--lifafa-cream)]"
      >
        Joining word
      </span>

      <div className="flex flex-wrap justify-center gap-2">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={value === preset}
            onClick={() => onChange(preset)}
            className={pillClass(value === preset)}
          >
            {preset}
          </button>
        ))}

        <button
          type="button"
          aria-pressed={isCustom}
          /* Already custom: leave the typed word alone rather than wiping it. */
          onClick={() => {
            if (!isCustom) {
              onChange("");
            }
          }}
          className={pillClass(isCustom)}
        >
          Custom
        </button>
      </div>

      {isCustom ? (
        <input
          id="joinerWord"
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={CUSTOM_JOINER_LIMIT}
          placeholder={EXAMPLES[language].customJoiner}
          aria-label="Custom joining word"
          autoComplete="off"
          /* Asked for by tapping Custom, so opening the keyboard is expected. */
          autoFocus
          className={`${INPUT_CLASS} max-w-[11rem] text-center`}
        />
      ) : null}
    </div>
  );
}

/*
  Every date on the card is formatted in Indian time (see lib/cardFormat.ts), so
  a guest abroad sees exactly what was typed here rather than a converted hour.
  The hint used to promise the opposite.
*/
const DATE_HINT =
  "Guests see the date and time exactly as you enter them, in Indian time.";

/**
 * Parents and home town, one side at a time.
 *
 * Compact on purpose: these are two optional fields on a form that already
 * has plenty, and giving them the full field treatment would make them read as
 * something a host has to answer. Headed with the person's own name once they
 * have typed one, so the two groups are told apart by whose family they are
 * rather than by their position on the page.
 */
function FamilyGroup({
  idPrefix,
  heading,
  parents,
  city,
  onParentsChange,
  onCityChange,
  examples,
}: {
  idPrefix: string;
  heading: string;
  parents: string;
  city: string;
  onParentsChange: (value: string) => void;
  onCityChange: (value: string) => void;
  examples: FieldExamples;
}): ReactElement {
  return (
    <div
      className="flex flex-col gap-3"
      role="group"
      aria-labelledby={`${idPrefix}-family-heading`}
    >
      <h4
        id={`${idPrefix}-family-heading`}
        className="truncate text-[0.8125rem] font-medium text-[var(--lifafa-cream)]"
      >
        {heading}
      </h4>

      <Field id={`${idPrefix}Parents`} label="Parents">
        <input
          id={`${idPrefix}Parents`}
          type="text"
          value={parents}
          onChange={(event) => onParentsChange(event.target.value)}
          placeholder={examples.parents}
          autoComplete="off"
          className={INPUT_CLASS}
        />
      </Field>

      <Field id={`${idPrefix}City`} label="City">
        <input
          id={`${idPrefix}City`}
          type="text"
          value={city}
          onChange={(event) => onCityChange(event.target.value)}
          placeholder={examples.city}
          autoComplete="off"
          className={INPUT_CLASS}
        />
      </Field>
    </div>
  );
}

export default function EventForm({
  draft,
  onChange,
  occasionId,
  language,
  paidLimits,
}: {
  draft: EventDraft;
  onChange: DraftChangeHandler;
  /**
   * Which occasion this is, and so how many people the card is about.
   *
   * A wedding, an engagement and an anniversary join two names; a birthday, a
   * baby shower, a housewarming and a corporate invitation do not. Asking a
   * host planning a birthday for a "first name" and a "second name" with
   * "weds" between them is asking a question their event has no answer to, so
   * those occasions are shown one name field instead of three.
   *
   * The answer comes from the occasion table rather than a list kept here, so
   * this and `resolveCoverNames` cannot drift into disagreeing about it.
   */
  occasionId: OccasionId;
  /** The card's language, which the examples and the joining words follow. */
  language: CardLanguage;
  /** After payment: how many date and name changes remain. */
  paidLimits?: PaidLimitNotes;
}): ReactElement {
  const remaining = MESSAGE_LIMIT - draft.message.length;
  const isPair = pairsNames(occasionId);
  const examples = EXAMPLES[language];

  /*
    Named by whoever they belong to once there is a name to use. The fallbacks
    are positional rather than descriptive because that is all that is known:
    "First person" says where the field is, which beats guessing a relationship.
  */
  const firstHeading =
    draft.partyOneName.trim() || draft.hostNames.trim() || "First person";
  const secondHeading = draft.partyTwoName.trim() || "Second person";

  return (
    /* Deliberately a div, not a <form>: nothing submits in this step. */
    <div className="flex flex-col gap-9">
      <Section label="Who">
        {/*
          The two party fields and the joining word are one thought — they
          build a single line of the card between them — so they sit under
          their own heading rather than loose among the other fields.

          Shown only where the occasion joins two people. Everything else gets
          the single field below, promoted from a fallback to the way the name
          is entered.
        */}
        {isPair ? (
        <div
          className="flex flex-col gap-3"
          role="group"
          aria-labelledby="cardNames-heading"
        >
          <h3
            id="cardNames-heading"
            className="text-[0.6875rem] tracking-[0.2em] text-[var(--lifafa-muted)] uppercase"
          >
            Names on the card
          </h3>

          {/*
            One grid, two layouts. Stacked below 640px in reading order — name,
            joining word, name — which is the order the card sets them in. At
            640px and up the two names take a column each on the first row and
            the joining word is pulled under both, centred, so the control sits
            where its result will.

            Placement is by explicit row and column rather than by reordering,
            so the DOM keeps the reading order the mobile layout needs and the
            tab order stays first name → joiner → second name on both.
          */}
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-x-4">
            <div className="sm:col-start-1 sm:row-start-1">
              <Field id="partyOneName" label="First name">
                <input
                  id="partyOneName"
                  type="text"
                  value={draft.partyOneName}
                  onChange={(event) =>
                    onChange("partyOneName", event.target.value)
                  }
                  placeholder={examples.partyOneName}
                  autoComplete="off"
                  className={INPUT_CLASS}
                />
              </Field>
            </div>

            <div className="sm:col-span-2 sm:row-start-2">
              <JoinerControl
                value={draft.joinerWord}
                onChange={(joinerWord) => onChange("joinerWord", joinerWord)}
                language={language}
              />
            </div>

            <div className="sm:col-start-2 sm:row-start-1">
              <Field id="partyTwoName" label="Second name">
                <input
                  id="partyTwoName"
                  type="text"
                  value={draft.partyTwoName}
                  onChange={(event) =>
                    onChange("partyTwoName", event.target.value)
                  }
                  placeholder={examples.partyTwoName}
                  autoComplete="off"
                  className={INPUT_CLASS}
                />
              </Field>
            </div>
          </div>
        </div>
        ) : null}

        {/*
          One field, two jobs. Beside the pair it is the escape hatch for a line
          the three fields cannot make — "The Sharma family", a name with a
          title in it. On its own it *is* the name, so it takes the plain label
          and drops the hint about fields that are not on screen.
        */}
        <Field
          id="hostNames"
          label={isPair ? "Or write one line yourself" : "Name on the card"}
          hint={isPair ? HOST_HINT : undefined}
        >
          <input
            id="hostNames"
            type="text"
            value={draft.hostNames}
            onChange={(event) => onChange("hostNames", event.target.value)}
            placeholder={isPair ? examples.pairLine : examples.partyOneName}
            autoComplete="off"
            aria-describedby={isPair ? "hostNames-hint" : undefined}
            className={INPUT_CLASS}
          />
        </Field>

        {paidLimits !== undefined ? (
          <LimitNote note={paidLimits.names} noun="name" />
        ) : null}

        {/*
          The families, under the names they belong to.

          Two groups where the occasion joins two people and one where it does
          not: a birthday has one person, and asking whose parents the second
          set are would be asking about somebody who is not on the card.
        */}
        <div
          className="flex flex-col gap-5"
          role="group"
          aria-labelledby="families-heading"
        >
          <h3
            id="families-heading"
            className="text-[0.6875rem] tracking-[0.2em] text-[var(--lifafa-muted)] uppercase"
          >
            Families
          </h3>

          <FamilyGroup
            idPrefix="partyOne"
            heading={firstHeading}
            parents={draft.partyOneParents ?? ""}
            city={draft.partyOneCity ?? ""}
            onParentsChange={(value) => onChange("partyOneParents", value)}
            onCityChange={(value) => onChange("partyOneCity", value)}
            examples={examples}
          />

          {isPair ? (
            <FamilyGroup
              idPrefix="partyTwo"
              heading={secondHeading}
              parents={draft.partyTwoParents ?? ""}
              city={draft.partyTwoCity ?? ""}
              onParentsChange={(value) => onChange("partyTwoParents", value)}
              onCityChange={(value) => onChange("partyTwoCity", value)}
              examples={examples}
            />
          ) : null}

          <p className="text-xs leading-relaxed text-[var(--lifafa-muted)]">
            Optional. Shown on the card if you fill it in.
          </p>
        </div>
      </Section>

      <Section label="What">
        <Field id="eventTitle" label="Event title">
          <input
            id="eventTitle"
            type="text"
            value={draft.eventTitle}
            onChange={(event) => onChange("eventTitle", event.target.value)}
            placeholder={examples.eventTitle}
            autoComplete="off"
            className={INPUT_CLASS}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="eventDate" label="Date" hint={DATE_HINT}>
            <input
              id="eventDate"
              type="date"
              value={draft.eventDate}
              onChange={(event) => onChange("eventDate", event.target.value)}
              aria-describedby="eventDate-hint"
              className={INPUT_CLASS}
            />
          </Field>

          <Field id="eventTime" label="Start time">
            <input
              id="eventTime"
              type="time"
              value={draft.eventTime}
              onChange={(event) => onChange("eventTime", event.target.value)}
              className={INPUT_CLASS}
            />
          </Field>
        </div>

        {paidLimits !== undefined ? (
          <LimitNote note={paidLimits.dates} noun="date" />
        ) : null}
      </Section>

      <Section label="Where">
        <Field id="venueName" label="Venue name">
          <input
            id="venueName"
            type="text"
            value={draft.venueName}
            onChange={(event) => onChange("venueName", event.target.value)}
            placeholder={examples.venueName}
            autoComplete="off"
            className={INPUT_CLASS}
          />
        </Field>

        <Field id="venueAddress" label="Address">
          <input
            id="venueAddress"
            type="text"
            value={draft.venueAddress}
            onChange={(event) => onChange("venueAddress", event.target.value)}
            placeholder={examples.venueAddress}
            autoComplete="off"
            className={INPUT_CLASS}
          />
        </Field>

        <MapsLinkField
          id="venueMapsLink"
          value={draft.venueMapsLink ?? ""}
          onChange={(value) => onChange("venueMapsLink", value)}
          inputClass={INPUT_CLASS}
        />
      </Section>

      <Section label="Message">
        <Field id="message" label="A short note for your guests">
          <textarea
            id="message"
            rows={3}
            maxLength={MESSAGE_LIMIT}
            value={draft.message}
            onChange={(event) => onChange("message", event.target.value)}
            placeholder={examples.message}
            className={`${INPUT_CLASS} resize-y`}
          />
          <p
            aria-live="polite"
            className={[
              "self-end text-xs tabular-nums",
              remaining <= 20
                ? "text-[var(--lifafa-marigold)]"
                : "text-[var(--lifafa-muted)]",
            ].join(" ")}
          >
            {draft.message.length}/{MESSAGE_LIMIT}
          </p>
        </Field>
      </Section>
    </div>
  );
}
