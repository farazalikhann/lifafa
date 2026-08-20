"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import CardPreview from "@/components/create/CardPreview";
import EventForm from "@/components/create/EventForm";
import ThemePicker from "@/components/create/ThemePicker";
import { DEFAULT_THEME_ID } from "@/lib/themes";
import type { EventDraft, ThemeId } from "@/types/event";

const EMPTY_DRAFT: EventDraft = {
  hostNames: "",
  eventTitle: "",
  eventDate: "",
  eventTime: "",
  venueName: "",
  venueAddress: "",
  message: "",
  themeId: DEFAULT_THEME_ID,
};

export default function CreatePage() {
  const [draft, setDraft] = useState<EventDraft>(EMPTY_DRAFT);

  const handleChange = useCallback<
    <K extends keyof EventDraft>(field: K, value: EventDraft[K]) => void
  >((field, value) => {
    setDraft((previous) => ({ ...previous, [field]: value }));
  }, []);

  const handleThemeSelect = useCallback((themeId: ThemeId) => {
    setDraft((previous) => ({ ...previous, themeId }));
  }, []);

  return (
    <div className="min-h-screen">
      {/* Slim top bar */}
      <header className="sticky top-0 z-10 border-b border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink)]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 lg:px-8">
          <Link
            href="/"
            className="rounded font-[family-name:var(--font-display)] text-xl font-semibold tracking-[-0.02em] text-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
          >
            Lifafa
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-[var(--lifafa-muted)] sm:inline">
              Coming soon
            </span>
            <button
              type="button"
              disabled
              title="Coming soon"
              aria-describedby="payment-note"
              className="cursor-not-allowed rounded-full border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-4 py-2 text-[0.8125rem] font-medium text-[var(--lifafa-muted)] opacity-70"
            >
              Continue to payment
            </button>
            <span id="payment-note" className="sr-only">
              Coming soon
            </span>
          </div>
        </div>
      </header>

      {/*
        Below lg the preview comes first, so the card is the first thing a host
        sees. At lg the form takes the left ~45% and the preview sticks on the
        right ~55% while the form scrolls.
      */}
      <main className="mx-auto grid max-w-6xl gap-10 px-5 py-8 lg:grid-cols-[45fr_55fr] lg:items-start lg:gap-14 lg:px-8 lg:py-12">
        <div className="order-2 lg:order-1">
          <EventForm draft={draft} onChange={handleChange} />
        </div>

        <div className="order-1 flex flex-col gap-6 lg:order-2 lg:sticky lg:top-24">
          <CardPreview draft={draft} />
          <ThemePicker
            selectedId={draft.themeId}
            onSelect={handleThemeSelect}
          />
        </div>
      </main>
    </div>
  );
}
