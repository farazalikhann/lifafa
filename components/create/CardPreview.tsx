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
 * The invitation, shown two ways.
 *
 * At `lg` and up it sits in a phone-shaped frame with its own scrollbar, so the
 * host scrolls the card exactly as a guest would while the form stays put
 * beside it. A mouse can leave that box whenever it likes, so the nested
 * scroller costs nothing there.
 *
 * Below `lg` there is no frame and no nested scroller at all: the card flows
 * inline at its natural height, and one swipe carries the host from the top of
 * the card straight down into the form. A fixed-height `overflow-y-auto` box
 * would swallow that swipe and strand the form below it — no amount of
 * `overscroll-behavior` gives a finger a way out of a scroller that has more
 * content to show.
 *
 * Both branches come from one `isFramed` value, so the card is a single mounted
 * `CardCanvas`: crossing the breakpoint restyles it instead of remounting it,
 * and the host keeps their place in the card.
 *
 * Under both sits the way out of the editor entirely: a full screen preview,
 * which is the only place the host sees the card at a real device width with
 * nothing beside it.
 */
export default function CardPreview({
  draft,
  config,
  motifs,
}: {
  draft: EventDraft;
  config: CardConfig;
  motifs: readonly Motif[];
}): ReactElement {
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

  return (
    <div className="flex flex-col gap-3">
      <div
        className={
          isFramed
            ? "lifafa-no-scrollbar mx-auto h-[620px] w-full max-w-[380px] overflow-y-auto overscroll-contain rounded-[2rem] border border-[var(--lifafa-hairline)] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.65)]"
            : "mx-auto w-full max-w-[420px]"
        }
        style={{ backgroundColor: palette.background }}
      >
        {/*
          Sections size against whatever is doing the scrolling: the 620px frame
          when there is one, the phone screen when the card owns the page.
        */}
        <CardCanvas
          draft={draft}
          theme={theme}
          config={config}
          motifs={motifs}
          sizing={isFramed ? "frame" : "viewport"}
          /*
            The inline preview repaints on every keystroke, so a scratch panel
            here would ask the host to clear it again after each one. They get
            the panel drawn open, with a line underneath saying what a guest
            will meet; the full screen preview is where they can try the real
            interaction.
          */
          audience="host-preview"
        />
      </div>

      {/*
        Directly under whichever of the two the host is looking at — the frame
        on a desktop, the card itself on a phone — because it is an action on
        that card and nothing else.
      */}
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
