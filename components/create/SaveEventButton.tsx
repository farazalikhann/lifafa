"use client";

import { useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { createEvent } from "@/lib/db/events";
import { useUser } from "@/hooks/useUser";
import { isCoverAnimationId } from "@/lib/coverAnimations";
import { isWeatherThemeId } from "@/lib/weatherThemes";
import type { CardConfig } from "@/types/card";
import type { CoverAnimationId } from "@/types/coverAnimation";
import type { EventDraft } from "@/types/event";
import type { WeatherThemeId } from "@/types/weather";

/**
 * Where an unsaved card waits while the host signs in.
 *
 * sessionStorage rather than localStorage: this is a card in progress, not a
 * preference, and it should not still be here next week on a shared machine.
 * Cleared the moment the event is saved.
 */
export const PENDING_DRAFT_KEY = "lifafa:pending-card";

export interface PendingCard {
  draft: EventDraft;
  config: CardConfig;
  /**
   * Optional, because it is not part of CardConfig.
   *
   * The cover is its own column rather than a field in the card's JSON, so it
   * has to be stashed alongside rather than travelling inside `config`. Older
   * entries written before this existed have no key here, which is exactly
   * what `undefined` means, and the reader below checks it before trusting it.
   */
  coverAnimation?: CoverAnimationId;
  /** Optional for the same reason: neither of these lives inside CardConfig. */
  showWeather?: boolean;
  weatherTheme?: WeatherThemeId;
}

/** Reads the stashed card, tolerating anything that is not one. */
export function readPendingCard(): PendingCard | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_DRAFT_KEY);

    if (raw === null) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);

    /*
      Shape-checked before it is trusted. This value has been through storage,
      where a stale version of the app or a hand-edited entry could have left
      something that is not a card at all; restoring it blindly would throw
      inside a render the host cannot get out of.
    */
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("draft" in parsed) ||
      !("config" in parsed)
    ) {
      return null;
    }

    const card = parsed as PendingCard;

    /*
      The one field worth re-checking. Everything else in here is restored into
      state that only feeds the renderer, but this one is written to a column
      with a check constraint, and a stale or hand-edited entry naming an id
      that no longer exists would be carried all the way to a failed insert.
    */
    /*
      The stored ids are re-checked, the boolean is not: a boolean cannot name
      something that has stopped existing. Anything that fails is dropped rather
      than repaired, and the editor falls back to its own default.
    */
    return {
      draft: card.draft,
      config: card.config,
      coverAnimation: isCoverAnimationId(card.coverAnimation)
        ? card.coverAnimation
        : undefined,
      showWeather: card.showWeather === true,
      weatherTheme: isWeatherThemeId(card.weatherTheme)
        ? card.weatherTheme
        : undefined,
    };
  } catch {
    /* Private mode, disabled storage, malformed JSON — all mean "nothing saved". */
    return null;
  }
}

export function clearPendingCard(): void {
  try {
    window.sessionStorage.removeItem(PENDING_DRAFT_KEY);
  } catch {
    /* Nothing to clear if storage was never available. */
  }
}

export default function SaveEventButton({
  draft,
  config,
  coverAnimation,
  showWeather,
  weatherTheme,
}: {
  draft: EventDraft;
  config: CardConfig;
  coverAnimation: CoverAnimationId;
  showWeather: boolean;
  weatherTheme: WeatherThemeId;
}): ReactElement {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = (): void => {
    if (isSaving) {
      return;
    }

    setError(null);

    /*
      Signed out: stash the card and send them to sign in. The draft has to
      survive a full round trip out of the browser and back — the magic link
      often opens in a different tab — so component state is no use and
      sessionStorage is.
    */
    if (user === null) {
      try {
        window.sessionStorage.setItem(
          PENDING_DRAFT_KEY,
          JSON.stringify({
            draft,
            config,
            coverAnimation,
            showWeather,
            weatherTheme,
          } satisfies PendingCard),
        );
      } catch (cause) {
        /*
          Storage can be unavailable or full. Saying so beats sending them off
          to sign in and losing everything they typed on the way back.
        */
        console.error("[create] could not stash the draft:", cause);
        setError(
          "Your browser would not let us hold onto this card. Please try again, or check your privacy settings.",
        );
        return;
      }

      router.push(`/login?redirectTo=${encodeURIComponent("/create")}`);
      return;
    }

    setIsSaving(true);

    void createEvent(draft, config, coverAnimation, {
      showWeather,
      themeId: weatherTheme,
    })
      .then((result) => {
        if (!result.ok) {
          setIsSaving(false);
          setError(result.error);
          return;
        }

        /* Saved — the stash has done its job. */
        clearPendingCard();
        router.push(`/dashboard/${result.data.id}`);
      })
      .catch((cause: unknown) => {
        console.error("[create] save failed:", cause);
        setIsSaving(false);
        setError("Could not save your event, please try again.");
      });
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleSave}
        /* Only while saving. A signed-out host may still click — that is what sends them to sign in. */
        disabled={isSaving || isLoading}
        className="min-h-11 rounded-full bg-[var(--lifafa-marigold)] px-5 text-[0.8125rem] font-semibold whitespace-nowrap text-[var(--lifafa-ink)] transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] enabled:hover:-translate-y-px disabled:opacity-60"
      >
        {isSaving ? "Saving…" : "Save and get my link"}
      </button>

      {error !== null ? (
        <p
          role="alert"
          className="max-w-[38ch] rounded-xl border border-[var(--lifafa-rose)]/40 bg-[var(--lifafa-rose)]/10 px-3 py-2 text-right text-xs leading-relaxed text-[var(--lifafa-cream)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
