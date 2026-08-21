"use client";

import { useCallback, useRef, useState, type ReactElement } from "react";
import CardCanvas from "@/components/card/CardCanvas";
import FullScreenPreview from "@/components/create/FullScreenPreview";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { Motif } from "@/lib/motifs";
import { getPalette } from "@/lib/palettes";
import { getTheme } from "@/lib/themes";
import type { CardConfig } from "@/types/card";
import type { EventDraft } from "@/types/event";

/** Tailwind's `lg` as a query: 64rem, the breakpoint the page grid uses. */
const FRAME_QUERY = "(min-width: 64rem)";

/**
 * The invitation beside the form, at `lg` and up only.
 *
 * It sits in a phone-shaped frame with its own scrollbar, in a column that
 * sticks while the form scrolls, so the host scrolls the card exactly as a
 * guest would and never loses sight of it. A mouse can leave that nested
 * scroller whenever it likes, so it costs nothing there.
 *
 * BELOW `lg` THIS RENDERS NOTHING, and that is the fix rather than an omission.
 * The card used to flow inline at the top of the phone layout with every
 * control beneath it, which meant a host changing a colour or a font had to
 * scroll several screens back up to see the result and several screens back
 * down to make the next change. On a phone the card now lives behind
 * PreviewBar, pinned to the bottom of the screen and reachable from anywhere in
 * the form, and the controls get the top of the page to themselves.
 *
 * Not merely hidden with a class either: `isFramed` gates the mount, so a phone
 * does not pay to render and re-render a several-screen-tall card on every
 * keystroke for something it will never show.
 *
 * Under the frame sits the way out of the editor entirely: a full screen
 * preview, which is the only place the host sees the card at a real device
 * width with nothing beside it.
 */
export default function CardPreview({
  draft,
  config,
  motifs,
}: {
  draft: EventDraft;
  config: CardConfig;
  motifs: readonly Motif[];
}): ReactElement | null {
  /*
    The frame behind the card takes its colour from the selected palette, the
    same source CardCanvas resolves from, so the two can never disagree. The
    theme object is still handed down as CardCanvas's documented last-resort
    fallback; every colour on it is overridden by the palette.
  */
  const theme = getTheme(draft.themeId);
  const palette = getPalette(config.style.paletteId);
  const isFramed = useMediaQuery(FRAME_QUERY);

  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  /* Handed to the overlay, which returns focus here when it unmounts. */
  const triggerRef = useRef<HTMLButtonElement>(null);

  const closePreview = useCallback((): void => {
    setIsPreviewOpen(false);
  }, []);

  /* The phone gets PreviewBar instead — see the note above. */
  if (!isFramed) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="lifafa-no-scrollbar mx-auto h-[620px] w-full max-w-[380px] overflow-y-auto overscroll-contain rounded-[2rem] border border-[var(--lifafa-hairline)] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.65)]"
        style={{ backgroundColor: palette.background }}
      >
        {/* Sections size against the 620px frame, which is what scrolls here. */}
        <CardCanvas
          draft={draft}
          theme={theme}
          config={config}
          motifs={motifs}
          sizing="frame"
          /*
            This repaints on every keystroke, so a scratch panel here would ask
            the host to clear it again after each one. They get the panel drawn
            open, with a line underneath saying what a guest will meet; the full
            screen preview is where they can try the real interaction.
          */
          audience="host-preview"
        />
      </div>

      {/* Directly under the frame, because it is an action on that card. */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsPreviewOpen(true)}
        className="mx-auto min-h-11 rounded-full border border-[var(--lifafa-hairline)] px-4 text-[0.8125rem] font-medium text-[var(--lifafa-muted)] transition-colors duration-150 hover:text-[var(--lifafa-cream)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
      >
        Preview full screen
      </button>

      {/*
        Mounted only while open, so the scroll lock and the focus trap are set
        up and torn down by the overlay's own lifecycle rather than by a flag
        it has to keep watching.
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
    </div>
  );
}
