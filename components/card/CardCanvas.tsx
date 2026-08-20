"use client";

import { Fragment, type ReactElement } from "react";
import DecorLayer, { CardFlourish } from "@/components/card/decor/DecorLayer";
import CoverSection from "@/components/card/sections/CoverSection";
import DetailsSection from "@/components/card/sections/DetailsSection";
import VenueSection from "@/components/card/sections/VenueSection";
import MessageSection from "@/components/card/sections/MessageSection";
import CustomSection from "@/components/card/sections/CustomSection";
import type { Motif } from "@/lib/motifs";
import type { Theme } from "@/lib/themes";
import type { CardConfig, CardSizing } from "@/types/card";
import type { CardBlock } from "@/types/customSection";
import type { EventDraft } from "@/types/event";

/**
 * Section min-height per sizing mode.
 *
 * "viewport" is right for the guest, whose screen is the frame. In the editor
 * the frame is a fixed 620px box, so a viewport-relative height would make
 * every section taller than the frame on a desktop monitor and misrepresent the
 * proportions — 80% of the frame height is the honest equivalent there.
 */
const PREVIEW_FRAME_HEIGHT = 620;

const SECTION_MIN_HEIGHT: Record<CardSizing, string> = {
  viewport: "80svh",
  frame: `${Math.round(PREVIEW_FRAME_HEIGHT * 0.8)}px`,
};

/**
 * Whether a block will actually put something on the page.
 *
 * Computed up front rather than discovered during render, because the dividers
 * depend on it: a divider belongs between two *rendered* sections, never
 * beside one that returned null.
 */
function blockRenders(block: CardBlock, draft: EventDraft): boolean {
  if (block.kind === "custom") {
    return (
      block.section.heading.trim().length > 0 ||
      block.section.body.trim().length > 0
    );
  }

  if (!block.enabled) {
    return false;
  }

  /* The message section hides itself when the host wrote no note. */
  return block.id !== "message" || draft.message.trim().length > 0;
}

function blockKey(block: CardBlock): string {
  return block.kind === "custom" ? block.section.id : block.id;
}

function renderBlock(
  block: CardBlock,
  draft: EventDraft,
  theme: Theme,
  minHeight: string,
): ReactElement | null {
  if (block.kind === "custom") {
    return (
      <CustomSection
        section={block.section}
        theme={theme}
        minHeight={minHeight}
      />
    );
  }

  switch (block.id) {
    case "cover":
      return <CoverSection draft={draft} theme={theme} minHeight={minHeight} />;
    case "details":
      return (
        <DetailsSection draft={draft} theme={theme} minHeight={minHeight} />
      );
    case "venue":
      return <VenueSection draft={draft} theme={theme} minHeight={minHeight} />;
    case "message":
      return (
        <MessageSection draft={draft} theme={theme} minHeight={minHeight} />
      );
  }
}

/**
 * The invitation itself: a narrow vertical page the guest scrolls through,
 * rather than one fixed rectangle.
 *
 * The canvas owns the background so the whole run of sections reads as a single
 * continuous card — sections are transparent and only contribute content.
 */
export default function CardCanvas({
  draft,
  theme,
  config,
  motifs,
  sizing,
}: {
  draft: EventDraft;
  theme: Theme;
  config: CardConfig;
  motifs: readonly Motif[];
  sizing: CardSizing;
}): ReactElement {
  const minHeight = SECTION_MIN_HEIGHT[sizing];
  const visible = config.blocks.filter((block) => blockRenders(block, draft));

  return (
    <div
      className="relative mx-auto w-full max-w-[420px] overflow-hidden"
      style={{
        backgroundColor: theme.background,
        color: theme.textPrimary,
        fontFamily: theme.fontFamily,
      }}
    >
      <DecorLayer
        accent={theme.accent}
        motion={config.decorMotion}
        motifs={motifs}
        intensity={config.decorIntensity}
      />

      {/* Content rides above the decor layer. */}
      <div className="relative z-10">
        {visible.map((block, index) => (
          <Fragment key={blockKey(block)}>
            {index > 0 ? (
              <div className="flex justify-center py-2">
                <CardFlourish accent={theme.accent} className="opacity-50" />
              </div>
            ) : null}
            {renderBlock(block, draft, theme, minHeight)}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
