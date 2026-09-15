"use client";

import { useId, useState, type ReactElement, type ReactNode } from "react";
import { CARD_LANGUAGES, swapJoinerWord } from "@/lib/cardLanguage";
import { isWritten, wordsWrittenIn } from "@/lib/cardTranslation";
import { pairsNames } from "@/lib/occasions";
import type { CardLanguage } from "@/types/card";
import type {
  CardBlock,
  CustomSectionWords,
} from "@/types/customSection";
import type { DraftWords, EventDraft, SubEventWords } from "@/types/event";
import type { OccasionId } from "@/types/occasion";

const INPUT_CLASS = [
  "w-full min-h-11 rounded-xl px-4 py-2.5",
  "border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)]",
  "text-[0.9375rem] text-[var(--lifafa-cream)] placeholder:text-[var(--lifafa-muted)]/70",
  "transition-colors duration-150",
  "focus:border-[var(--lifafa-marigold)] focus:ring-2 focus:ring-[var(--lifafa-marigold)]/30 focus:outline-none",
].join(" ");

/** What each of the draft's words is called, in the editor's own words. */
const DRAFT_LABELS: Record<keyof DraftWords, string> = {
  partyOneName: "First name",
  partyTwoName: "Second name",
  joinerWord: "Joining word",
  hostNames: "Name on the card",
  partyOneParents: "Parents",
  partyOneCity: "City",
  partyTwoParents: "Parents",
  partyTwoCity: "City",
  eventTitle: "Event title",
  venueName: "Venue name",
  venueAddress: "Address",
  message: "Note for your guests",
};

const SUB_EVENT_LABELS: Record<keyof SubEventWords, string> = {
  label: "Function name",
  venueName: "Venue name",
  venueAddress: "Address",
  note: "Note",
};

const SECTION_LABELS: Record<keyof CustomSectionWords, string> = {
  heading: "Section heading",
  body: "Section text",
};

/** One word to translate: what the host wrote, and what they have written for it. */
interface WordRow {
  id: string;
  label: string;
  original: string;
  value: string;
  /** Shown in the empty box — what the card will say if it is left blank. */
  placeholder: string;
  multiline?: boolean;
  onChange: (value: string) => void;
}

interface WordGroup {
  id: string;
  heading: string;
  rows: readonly WordRow[];
}

/**
 * One row, when there is anything to show in it.
 *
 * A word the host never wrote in the card's own language has nothing to be
 * translated from, so it is not asked about — which is what keeps this list as
 * short as the card. A translation still standing after its original was
 * cleared keeps its row, so it can be cleared too rather than lingering on the
 * card with no way to reach it.
 */
function shows(row: WordRow): boolean {
  return isWritten(row.original) || isWritten(row.value);
}

function Row({
  row,
  cardLanguage,
  language,
}: {
  row: WordRow;
  cardLanguage: CardLanguage;
  language: CardLanguage;
}): ReactElement {
  const originalId = `${row.id}-original`;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={row.id}
        className="text-[0.8125rem] font-medium text-[var(--lifafa-cream)]"
      >
        {row.label}
      </label>

      {/*
        What the host wrote, right above the box it is being written into, so
        they translate from the card rather than from memory. Tagged with its
        own language and tied to the input, so a screen reader reads it as the
        thing being translated.
      */}
      <p
        id={originalId}
        lang={cardLanguage}
        className="text-xs leading-relaxed break-words whitespace-pre-line text-[var(--lifafa-muted)]"
      >
        {isWritten(row.original) ? row.original : "—"}
      </p>

      {row.multiline === true ? (
        <textarea
          id={row.id}
          lang={language}
          rows={3}
          value={row.value}
          placeholder={row.placeholder}
          aria-describedby={originalId}
          onChange={(event) => row.onChange(event.target.value)}
          className={`${INPUT_CLASS} resize-y`}
        />
      ) : (
        <input
          id={row.id}
          lang={language}
          type="text"
          value={row.value}
          placeholder={row.placeholder}
          aria-describedby={originalId}
          autoComplete="off"
          onChange={(event) => row.onChange(event.target.value)}
          className={INPUT_CLASS}
        />
      )}
    </div>
  );
}

function Group({ heading, children }: { heading: string; children: ReactNode }): ReactElement {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-[0.6875rem] tracking-[0.2em] text-[var(--lifafa-muted)] uppercase">
        {heading}
      </h3>
      {children}
    </div>
  );
}

/**
 * The card's words in one other language.
 *
 * Closed until asked for, so a host with no use for a second language meets a
 * single line and a button, not a second copy of the form. Opens by itself for
 * a host who has already written some, since they came back to change them.
 */
function LanguageWords({
  cardLanguage,
  language,
  draft,
  blocks,
  occasionId,
  onDraftWord,
  onSubEventWord,
  onSectionWord,
  onFocusLanguage,
}: {
  cardLanguage: CardLanguage;
  language: CardLanguage;
} & Omit<TranslationPanelProps, "cardLanguage">): ReactElement {
  const written = wordsWrittenIn(draft, blocks, language);
  const [isOpen, setIsOpen] = useState<boolean>(written > 0);
  const listId = useId();

  const option = CARD_LANGUAGES.find((entry) => entry.id === language);
  const name = option?.englishLabel ?? language;
  const blank = "Leave blank to show it as written";
  const words = draft.translations?.[language];

  const draftRow = (field: keyof DraftWords, label?: string): WordRow => ({
    id: `words-${language}-${field}`,
    label: label ?? DRAFT_LABELS[field],
    original: draft[field] ?? "",
    value: words?.[field] ?? "",
    placeholder: blank,
    multiline: field === "message",
    onChange: (value) => onDraftWord(language, field, value),
  });

  const first = draft.partyOneName.trim() || draft.hostNames.trim();
  const second = draft.partyTwoName.trim();

  /*
    The joining word only where the cover will actually set one: an occasion
    that joins two people, with both names written. Its blank is not the host's
    word but the preset in this language — "संग" becomes "weds" on its own — so
    that is what the empty box says.
  */
  const joiner: WordRow = {
    ...draftRow("joinerWord"),
    placeholder: `Leave blank for "${swapJoinerWord(draft.joinerWord, cardLanguage, language)}"`,
  };
  const showsJoiner =
    pairsNames(occasionId) &&
    isWritten(draft.partyOneName) &&
    isWritten(draft.partyTwoName);

  const groups: readonly WordGroup[] = [
    {
      id: "names",
      heading: "Names",
      rows: [
        draftRow("partyOneName"),
        ...(showsJoiner ? [joiner] : []),
        draftRow("partyTwoName"),
        draftRow("hostNames"),
        draftRow("partyOneParents", first ? `Parents of ${first}` : undefined),
        draftRow("partyOneCity", first ? `City of ${first}` : undefined),
        draftRow("partyTwoParents", second ? `Parents of ${second}` : undefined),
        draftRow("partyTwoCity", second ? `City of ${second}` : undefined),
      ].filter(shows),
    },
    {
      id: "event",
      heading: "The event",
      rows: [
        draftRow("eventTitle"),
        draftRow("venueName"),
        draftRow("venueAddress"),
        draftRow("message"),
      ].filter(shows),
    },
    ...draft.subEvents.map((entry): WordGroup => ({
      id: entry.id,
      heading: entry.label.trim() || "Untitled function",
      rows: (Object.keys(SUB_EVENT_LABELS) as (keyof SubEventWords)[])
        .map(
          (field): WordRow => ({
            id: `words-${language}-${entry.id}-${field}`,
            label: SUB_EVENT_LABELS[field],
            original: entry[field] ?? "",
            value: entry.translations?.[language]?.[field] ?? "",
            placeholder: blank,
            onChange: (value) =>
              onSubEventWord(language, entry.id, field, value),
          }),
        )
        .filter(shows),
    })),
    ...blocks.flatMap((block): WordGroup[] =>
      block.kind === "custom"
        ? [
            {
              id: block.section.id,
              heading: block.section.heading.trim() || "Your own section",
              rows: (Object.keys(SECTION_LABELS) as (keyof CustomSectionWords)[])
                .map(
                  (field): WordRow => ({
                    id: `words-${language}-${block.section.id}-${field}`,
                    label: SECTION_LABELS[field],
                    original: block.section[field],
                    value: block.section.translations?.[language]?.[field] ?? "",
                    placeholder: blank,
                    multiline: field === "body",
                    onChange: (value) =>
                      onSectionWord(language, block.section.id, field, value),
                  }),
                )
                .filter(shows),
            },
          ]
        : [],
    ),
  ].filter((group) => group.rows.length > 0);

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-[var(--lifafa-hairline)] px-4 py-4">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[0.6875rem] tracking-[0.26em] text-[var(--lifafa-marigold)] uppercase">
          Share in {name} too
        </h2>
        <p className="text-xs leading-relaxed text-[var(--lifafa-muted)]">
          For guests who read {name}. Write your names and details in {name},
          then pick {name} when you share the link from your dashboard. Anything
          you leave blank shows as you wrote it.
        </p>
      </div>

      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={listId}
        onClick={() => setIsOpen((open) => !open)}
        className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-[var(--lifafa-hairline)] px-4 text-left text-[0.8125rem] font-medium text-[var(--lifafa-cream)] transition-colors duration-150 hover:border-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
      >
        <span>
          {written === 0 ? `Add ${name} words` : `${name} words`}
          {written > 0 ? (
            <span className="ml-2 text-xs font-normal text-[var(--lifafa-muted)]">
              {written} written
            </span>
          ) : null}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className={`h-4 w-4 shrink-0 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 7.5 10 12.5 15 7.5" />
        </svg>
      </button>

      {isOpen ? (
        <div
          id={listId}
          /*
            Focusing any box here turns the preview to this language, so the
            host sees the English card while typing English — and the details
            above turn it back. See `previewLanguage` in CardEditor.
          */
          onFocusCapture={() => onFocusLanguage(language)}
          className="flex flex-col gap-7"
        >
          {groups.length === 0 ? (
            <p className="text-xs leading-relaxed text-[var(--lifafa-muted)]">
              Fill in the details above first. Their {name} words go here.
            </p>
          ) : (
            groups.map((group) => (
              <Group key={group.id} heading={group.heading}>
                {group.rows.map((row) => (
                  <Row
                    key={row.id}
                    row={row}
                    cardLanguage={cardLanguage}
                    language={language}
                  />
                ))}
              </Group>
            ))
          )}
        </div>
      ) : null}
    </section>
  );
}

type TranslationPanelProps = {
  /** The language the card is written in. Every other language gets a panel. */
  cardLanguage: CardLanguage;
  draft: EventDraft;
  blocks: readonly CardBlock[];
  occasionId: OccasionId;
  onDraftWord: (
    language: CardLanguage,
    field: keyof DraftWords,
    value: string,
  ) => void;
  onSubEventWord: (
    language: CardLanguage,
    subEventId: string,
    field: keyof SubEventWords,
    value: string,
  ) => void;
  onSectionWord: (
    language: CardLanguage,
    sectionId: string,
    field: keyof CustomSectionWords,
    value: string,
  ) => void;
  /** Called when the host starts typing in a language, to preview it. */
  onFocusLanguage: (language: CardLanguage) => void;
};

/**
 * The card's words in its other languages, so one invitation can be shared in
 * each.
 *
 * AT THE END OF THE DETAILS TAB, under the form it translates. The words it
 * asks for are the ones just typed above it, and a host who has not typed any
 * yet has nothing to translate — at the top it would be a list of blanks.
 *
 * NOT A SECOND FORM. It lists only the words the host actually wrote, each with
 * the original shown over its box, and asks for nothing else: dates, the design
 * and the running order are the event's and are never repeated. Every box can
 * be left empty, and an empty one shows the original on the card.
 *
 * One panel per other language, which today is one.
 */
export default function TranslationPanel(
  props: TranslationPanelProps,
): ReactElement {
  return (
    <>
      {CARD_LANGUAGES.filter((option) => option.id !== props.cardLanguage).map(
        (option) => (
          <LanguageWords key={option.id} {...props} language={option.id} />
        ),
      )}
    </>
  );
}
