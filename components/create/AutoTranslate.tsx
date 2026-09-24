"use client";

import { useEffect, useId, useState, type ReactElement } from "react";
import {
  TRANSLATE_MAX_TOTAL_CHARS,
  cacheKey,
  isUpToDate,
  sourceWords,
  translationUsed,
  type SourceWord,
  type TranslateErrorResponse,
  type TranslateRequest,
  type TranslateResponse,
  type TranslatedWord,
} from "@/lib/autoTranslate";
import { CARD_LANGUAGES } from "@/lib/cardLanguage";
import { isWritten } from "@/lib/cardTranslation";
import { pairsNames } from "@/lib/occasions";
import type { CardLanguage } from "@/types/card";
import type { CardBlock } from "@/types/customSection";
import type { EventDraft } from "@/types/event";
import type { OccasionId } from "@/types/occasion";

/**
 * Results already paid for in this tab, keyed by direction, mode and exact
 * text. Module scope so it outlives the Details tab unmounting: a retry after
 * a partial failure gets the fields that did come back without a request.
 */
const translationCache = new Map<string, string>();

/**
 * Whether this invitation's one translate is used, mirrored per saved
 * invitation.
 *
 * The flag's home is the draft, which is saved with the card. This copy only
 * covers a host on the edit page who translates and reloads before saving,
 * which would otherwise hand the translate back. A new card on /create has no
 * id and nothing to reload into, so it has no mirror.
 */
function mirrorKey(eventId: string): string {
  return `lifafa:translate-used:${eventId}`;
}

function readMirror(eventId: string | undefined): boolean {
  if (eventId === undefined) {
    return false;
  }

  try {
    return window.localStorage.getItem(mirrorKey(eventId)) === "1";
  } catch {
    return false;
  }
}

function writeMirror(eventId: string | undefined): void {
  if (eventId === undefined) {
    return;
  }

  try {
    window.localStorage.setItem(mirrorKey(eventId), "1");
  } catch {
    /* Storage blocked; the draft still carries the flag. */
  }
}

/** A main field worth filling before the one translate. */
interface MainField {
  label: string;
  /** Whether it takes "are": "Names are still empty." */
  plural: boolean;
}

/** The main fields still empty, in the order the form lists them. */
function emptyMainFields(draft: EventDraft, occasionId: OccasionId): MainField[] {
  const namesEmpty = pairsNames(occasionId)
    ? !isWritten(draft.partyOneName) || !isWritten(draft.partyTwoName)
    : !isWritten(draft.hostNames);

  return [
    { label: "Names", plural: true, empty: namesEmpty },
    { label: "Event title", plural: false, empty: !isWritten(draft.eventTitle) },
    { label: "Venue", plural: false, empty: !isWritten(draft.venueName) },
    { label: "Address", plural: false, empty: !isWritten(draft.venueAddress) },
    { label: "Note", plural: false, empty: !isWritten(draft.message) },
  ]
    .filter((field) => field.empty)
    .map(({ label, plural }) => ({ label, plural }));
}

/** "Venue and note are still empty." */
function emptySentence(fields: readonly MainField[]): string {
  const words = fields.map((field, index) =>
    index === 0 ? field.label : field.label.toLowerCase(),
  );
  const list =
    words.length === 1
      ? words[0]
      : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
  const verb = fields.length > 1 || fields[0].plural ? "are" : "is";

  return `${list} ${verb} still empty.`;
}

type Stage = "idle" | "confirm" | "replace";

const USED_NOTE =
  "Auto-translated. Please check names and details before sharing. You can edit any text manually.";

/**
 * "Translate to Hindi" / "Translate to English", under the card language.
 *
 * ONCE PER INVITATION. The host confirms first, with any main field still
 * empty named in the question, because there is no second go. Only a
 * translate that fully succeeds uses it up; a failed request, or one where
 * some fields did not come back, leaves the button ready to try again.
 *
 * Fills the other language's words at the end of this tab from the ones the
 * host typed, through /api/translate, and leaves every one of them editable
 * there. Never overwrites text silently: when a target field already has
 * words the host is asked, inline, whether to replace them.
 *
 * Only this button ever calls the service. A guest opening the invitation
 * reads the saved words and nothing else.
 */
export default function AutoTranslate({
  cardLanguage,
  draft,
  blocks,
  occasionId,
  eventId,
  onTranslated,
}: {
  /** The language the host is filling in; the source. */
  cardLanguage: CardLanguage;
  draft: EventDraft;
  blocks: readonly CardBlock[];
  /** Decides which name fields count as "the names". */
  occasionId: OccasionId;
  /** Set on the edit page only; see mirrorKey. */
  eventId?: string;
  /** Writes the results into the other language's fields. */
  onTranslated: (
    from: CardLanguage,
    to: CardLanguage,
    entries: readonly TranslatedWord[],
    replaceAll: boolean,
    markUsed: boolean,
  ) => void;
}): ReactElement {
  const hintId = useId();
  const confirmId = useId();
  const replaceId = useId();

  const target =
    CARD_LANGUAGES.find((option) => option.id !== cardLanguage) ??
    CARD_LANGUAGES[0];
  const to = target.id;
  const name = target.englishLabel;

  const [mirroredUsed, setMirroredUsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  /* How many target fields already hold text, while the host is asked. */
  const [conflicts, setConflicts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  /* After mount only: localStorage does not exist on the server render. */
  useEffect(() => {
    setMirroredUsed(readMirror(eventId));
  }, [eventId]);

  const isUsed = translationUsed(draft) || mirroredUsed;

  /* A change of direction makes every message about the old one stale. */
  useEffect(() => {
    setStage("idle");
    setError(null);
    setInfo(null);
  }, [cardLanguage]);

  const ask = (): void => {
    setError(null);
    setInfo(null);
    setStage("confirm");
  };

  const translate = async (replaceAll: boolean | null): Promise<void> => {
    if (isLoading || isUsed) {
      return;
    }

    setError(null);
    setInfo(null);

    const from = cardLanguage;
    const words = sourceWords(draft, blocks, from, to);

    if (words.length === 0) {
      setStage("idle");
      setInfo("Fill in the names and details below first, then translate.");
      return;
    }

    /* Already translated from exactly this text: never sent again. */
    const pending = words.filter((word) => !isUpToDate(word, draft, from, to));

    if (pending.length === 0) {
      setStage("idle");
      setInfo(`Nothing new to translate. The ${name} text is up to date.`);
      return;
    }

    const occupied = pending.filter((word) => isWritten(word.target)).length;

    if (replaceAll === null && occupied > 0) {
      setConflicts(occupied);
      setStage("replace");
      return;
    }

    setStage("idle");

    const chosen =
      replaceAll === true
        ? pending
        : pending.filter((word) => !isWritten(word.target));

    if (chosen.length === 0) {
      setInfo(`Every field already has ${name} text, so nothing was changed.`);
      return;
    }

    const cached: TranslatedWord[] = [];
    const toSend: SourceWord[] = [];

    for (const word of chosen) {
      const hit = translationCache.get(cacheKey(from, to, word.mode, word.text));

      if (hit === undefined) {
        toSend.push(word);
      } else {
        cached.push({ word, text: hit });
      }
    }

    const finish = (): void => {
      writeMirror(eventId);
      setMirroredUsed(eventId !== undefined);
    };

    /* Everything came back on an earlier try in this tab: no request needed. */
    if (toSend.length === 0) {
      onTranslated(from, to, cached, replaceAll === true, true);
      finish();
      return;
    }

    const totalChars = toSend.reduce((total, word) => total + word.text.length, 0);

    if (totalChars > TRANSLATE_MAX_TOTAL_CHARS) {
      setError(
        `That is ${totalChars} characters, over the ${TRANSLATE_MAX_TOTAL_CHARS} a single translation can take. Shorten the longest text and try again.`,
      );
      return;
    }

    const body: TranslateRequest = {
      from,
      to,
      items: toSend.map((word) => ({
        id: word.key,
        mode: word.mode,
        text: word.text,
        keepCeremonyWords: word.keepCeremonyWords,
      })),
    };

    setIsLoading(true);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => null)) as
        | TranslateResponse
        | TranslateErrorResponse
        | null;

      /* A failed request does not use up the one translate. */
      if (!response.ok || payload === null || !("results" in payload)) {
        setError(
          `${
            payload !== null && "error" in payload
              ? payload.error
              : "Translation is not available right now."
          } Your one auto-translate has not been used.`,
        );
        return;
      }

      const byKey = new Map(toSend.map((word) => [word.key, word]));
      const fetched: TranslatedWord[] = payload.results.flatMap((result) => {
        const word = byKey.get(result.id);

        if (word === undefined) {
          return [];
        }

        translationCache.set(cacheKey(from, to, word.mode, word.text), result.text);
        return [{ word, text: result.text }];
      });

      /*
        Some fields did not come back: write the ones that did, and leave the
        translate unused so the host can fill the rest. The fingerprints keep
        the retry to the missing fields only.
      */
      const complete = payload.failed.length === 0;

      onTranslated(from, to, [...cached, ...fetched], replaceAll === true, complete);

      if (complete) {
        finish();
      } else {
        setError(
          `${payload.failed.length} ${payload.failed.length === 1 ? "field" : "fields"} could not be translated. Try again to fill ${payload.failed.length === 1 ? "it" : "them"}; your one auto-translate has not been used.`,
        );
      }
    } catch {
      setError(
        "Could not reach the translation service. Check your connection and try again. Your one auto-translate has not been used.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const missing = stage === "confirm" ? emptyMainFields(draft, occasionId) : [];
  const buttonLabel = isLoading ? "Translating…" : `Translate to ${name}`;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--lifafa-hairline)] px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          id={hintId}
          className="text-xs leading-relaxed text-[var(--lifafa-muted)] sm:max-w-[34ch]"
        >
          Fills the {name} words at the end of this tab from what you type
          here. Names and places keep their sound; other text is translated.
        </p>

        <button
          type="button"
          onClick={ask}
          disabled={isLoading || isUsed || stage !== "idle"}
          aria-busy={isLoading}
          aria-describedby={hintId}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-[var(--lifafa-marigold)] px-5 text-[0.8125rem] font-semibold whitespace-nowrap text-[var(--lifafa-marigold)] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] enabled:hover:bg-[var(--lifafa-marigold)]/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <span
              aria-hidden="true"
              className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
          ) : null}
          {buttonLabel}
        </button>
      </div>

      {stage === "confirm" ? (
        <div
          role="group"
          aria-labelledby={confirmId}
          className="flex flex-col gap-3 rounded-xl border border-[var(--lifafa-marigold)]/40 bg-[var(--lifafa-marigold)]/10 px-3.5 py-3"
        >
          <div className="flex flex-col gap-1">
            <p
              id={confirmId}
              className="text-[0.8125rem] font-medium text-[var(--lifafa-cream)]"
            >
              Auto-translate can be used only once for this invitation. Have
              you filled in all your details?
            </p>
            {missing.length > 0 ? (
              <p className="text-xs leading-relaxed text-[var(--lifafa-muted)]">
                {emptySentence(missing)}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void translate(null)}
              disabled={isLoading}
              className="min-h-11 rounded-full bg-[var(--lifafa-marigold)] px-4 text-[0.8125rem] font-semibold text-[var(--lifafa-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] disabled:opacity-60"
            >
              Translate now
            </button>
            <button
              type="button"
              onClick={() => setStage("idle")}
              className="min-h-11 rounded-full border border-[var(--lifafa-hairline)] px-4 text-[0.8125rem] font-medium text-[var(--lifafa-cream)] transition-colors duration-150 hover:border-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
            >
              Not yet
            </button>
          </div>
        </div>
      ) : null}

      {stage === "replace" ? (
        <div
          role="group"
          aria-labelledby={replaceId}
          className="flex flex-col gap-3 rounded-xl border border-[var(--lifafa-marigold)]/40 bg-[var(--lifafa-marigold)]/10 px-3.5 py-3"
        >
          <div className="flex flex-col gap-1">
            <p
              id={replaceId}
              className="text-[0.8125rem] font-medium text-[var(--lifafa-cream)]"
            >
              Replace existing text?
            </p>
            <p className="text-xs leading-relaxed text-[var(--lifafa-muted)]">
              {conflicts === 1
                ? `1 ${name} field already has text.`
                : `${conflicts} ${name} fields already have text.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void translate(true)}
              disabled={isLoading}
              className="min-h-11 rounded-full bg-[var(--lifafa-marigold)] px-4 text-[0.8125rem] font-semibold text-[var(--lifafa-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] disabled:opacity-60"
            >
              Replace all
            </button>
            <button
              type="button"
              onClick={() => void translate(false)}
              disabled={isLoading}
              className="min-h-11 rounded-full border border-[var(--lifafa-hairline)] px-4 text-[0.8125rem] font-medium text-[var(--lifafa-cream)] transition-colors duration-150 hover:border-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] disabled:opacity-60"
            >
              Only fill empty fields
            </button>
            <button
              type="button"
              onClick={() => setStage("idle")}
              className="min-h-11 px-2 text-[0.8125rem] text-[var(--lifafa-muted)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {error !== null ? (
        <p
          role="alert"
          className="rounded-xl border border-[var(--lifafa-rose)]/40 bg-[var(--lifafa-rose)]/10 px-3 py-2 text-xs leading-relaxed text-[var(--lifafa-cream)]"
        >
          {error}
        </p>
      ) : null}

      <div role="status" className="flex flex-col gap-1 text-xs leading-relaxed">
        {info !== null ? (
          <p className="text-[var(--lifafa-cream)]">{info}</p>
        ) : null}
        {isUsed ? (
          <p className="text-[var(--lifafa-cream)]">{USED_NOTE}</p>
        ) : (
          <p className="text-[var(--lifafa-muted)]">
            You can auto-translate once per invitation. Fill in all your
            details first.
          </p>
        )}
      </div>
    </div>
  );
}
