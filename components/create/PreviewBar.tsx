"use client";

import { useCallback, useRef, useState, type ReactElement } from "react";
import FullScreenPreview from "@/components/create/FullScreenPreview";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { Motif } from "@/lib/motifs";
import { getPalette, type Palette } from "@/lib/palettes";
import { getTheme } from "@/lib/themes";
import type { CardConfig } from "@/types/card";
import type { EventDraft } from "@/types/event";

/** Tailwind's `lg`, the breakpoint the editor's two-column grid starts at. */
const FRAME_QUERY = "(min-width: 64rem)";

/**
 * A miniature of the card, drawn from the palette the card is actually using.
 *
 * Every colour here comes from the same `Palette` object CardCanvas resolves
 * from, so switching the card to Cream or Midnight repaints this in the same
 * click — which is the point of it. A grey thumbnail would say "preview"; this
 * one says "preview *your* card", and it is the only piece of the card the host
 * can see while they are working on the form.
 *
 * Deliberately not a scaled CardCanvas. At 30px across, a real card is a smudge;
 * what reads at this size is the *shape* of one — a bordered leaf with a heading
 * line, a rule and two lines of text.
 */
function MiniCard({ palette }: { palette: Palette }): ReactElement {
  return (
    <svg
      viewBox="0 0 30 40"
      className="h-10 w-[30px] shrink-0"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x={0.7}
        y={0.7}
        width={28.6}
        height={38.6}
        rx={3.4}
        fill={palette.background}
        stroke={palette.accent}
        strokeWidth={1.2}
      />
      {/* The inner rule, which is what makes it read as stationery. */}
      <rect
        x={3.6}
        y={3.6}
        width={22.8}
        height={32.8}
        rx={1.8}
        fill="none"
        stroke={palette.accent}
        strokeOpacity={0.4}
        strokeWidth={0.7}
      />
      {/* Names, a divider, and two lines under it. */}
      <path
        d="M 9 15.5 H 21"
        stroke={palette.textPrimary}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <path
        d="M 12 20 H 18"
        stroke={palette.accent}
        strokeWidth={1.3}
        strokeLinecap="round"
      />
      <path
        d="M 8.5 24.5 H 21.5 M 10.5 28 H 19.5"
        stroke={palette.textMuted}
        strokeWidth={1.1}
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * The way to the card on a phone.
 *
 * WHY THIS EXISTS. Below `lg` the editor used to open with the whole card and
 * put every control underneath it, so a host adjusting a colour or a font had
 * to scroll back to the top after each change to see what it did. The card is
 * several screens tall, so that was a long way up and a long way back down, on
 * every single edit.
 *
 * The card comes off the top of the page entirely on a phone and lives behind
 * this instead: one bar, pinned to the bottom of the screen, reachable from
 * anywhere in the form without scrolling at all. The controls get the top of
 * the page, which is where the work happens.
 *
 * At `lg` there is no problem to solve — the card sits in a sticky column beside
 * the form and is never out of sight — so this renders nothing there and
 * CardPreview takes over.
 */
export default function PreviewBar({
  draft,
  config,
  motifs,
}: {
  draft: EventDraft;
  config: CardConfig;
  motifs: readonly Motif[];
}): ReactElement | null {
  const isFramed = useMediaQuery(FRAME_QUERY);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  /* Handed to the overlay, which returns focus here when it unmounts. */
  const triggerRef = useRef<HTMLButtonElement>(null);

  const closePreview = useCallback((): void => {
    setIsPreviewOpen(false);
  }, []);

  const theme = getTheme(draft.themeId);
  const palette = getPalette(config.style.paletteId);
  const accent = config.style.accentOverride ?? palette.accent;

  /*
    Gone at lg rather than hidden, so the desktop layout carries no fixed bar it
    would have to leave room for. `useMediaQuery` reports false on the server and
    on the first client pass by design, which is the right way round here: the
    phone — the case this exists for — gets the bar in the very first paint, and
    a desktop drops it one commit later.
  */
  if (isFramed) {
    return null;
  }

  return (
    <>
      {/*
        Fixed to the screen, not sticky in the flow: sticky would pin it to the
        bottom of whichever column it sat in and let it scroll away with that
        column's end. The page leaves room for it with its own bottom padding.
      */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink)]/92 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsPreviewOpen(true)}
          className="flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-transform duration-150 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
          /*
            The control wears the card's own colours — background, border and
            both text tones — so the host sees the palette they picked before
            they open anything. Change the colour and this changes with it.
          */
          style={{
            backgroundColor: palette.background,
            borderColor: accent,
          }}
        >
          <MiniCard palette={{ ...palette, accent }} />

          <span className="flex min-w-0 flex-1 flex-col">
            <span
              className="text-[0.9375rem] font-medium"
              style={{ color: palette.textPrimary }}
            >
              Preview your card
            </span>
            <span
              className="truncate text-xs"
              style={{ color: palette.textMuted }}
            >
              Exactly what your guests will see
            </span>
          </span>

          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5 shrink-0"
            fill="none"
            stroke={accent}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      {/*
        Mounted only while open, so the scroll lock, the focus trap and the
        fullscreen request are set up and torn down by the overlay's own
        lifecycle rather than by a flag it has to keep watching.
      */}
      {isPreviewOpen ? (
        <FullScreenPreview
          draft={draft}
          theme={theme}
          config={config}
          motifs={motifs}
          triggerRef={triggerRef}
          onClose={closePreview}
        />
      ) : null}
    </>
  );
}
