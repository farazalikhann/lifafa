"use client";

import type { CSSProperties, ReactElement, ReactNode, Ref } from "react";
import FrameStage from "@/components/card/FrameStage";
import { OpeningCorner } from "@/components/card/decor/SlotOrnaments";
import { HeroName } from "@/components/card/sections/CoverSection";
import { placeholderOpacity, resolve, resolveCoverNames } from "@/lib/cardFormat";
import type { FrameArt } from "@/lib/cardDecor";
import { cardCopy } from "@/lib/cardLanguage";
import { cardPx } from "@/lib/cardScale";
import type { Ornament } from "@/lib/ornaments/frame";
import type { CornerPair } from "@/lib/ornaments/slots";
import { textRoles, type Theme } from "@/lib/themes";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";
import type { OccasionId } from "@/types/occasion";

/**
 * A card's opening and its names as one screen, for a pack that opens that
 * way (`namesOpening` in lib/traditionPacks.tsx): "You are invited", the
 * calligraphy, the blessing in its own script, the names inside a frame, and
 * the event's title under it. The names had a screen of their own after the
 * opening; here they are what the opening ends on.
 *
 * ONE SCREEN, AND WHAT GIVES WAY TO KEEP IT ONE. As the first screen of a
 * card sized to the phone, the block is exactly as tall as the room above the
 * scroll cue, and two things in it are let move: the calligraphy, between its
 * full size and four fifths of it, and the frame, between FRAME_MIN and
 * FRAME_HEIGHT. Everything else is the size it is. Both start at their least
 * and are grown into the room there is, the frame first by a factor of a
 * thousand, so the calligraphy is only ever smaller than full while the frame
 * is already at its full height: read the other way, on a shorter screen the
 * calligraphy comes down first, by up to a fifth, and only then the frame.
 * If even the least of both does not fit, the block is as tall as they need
 * (`min-height: fit-content`) and the screen runs on under the cue; nothing
 * is cut off or laid over anything else.
 *
 * Anywhere else (the editor's frame, a printed sheet, a card whose host moved
 * the names down) nothing has to fit a screen, and both are their full size.
 *
 * THE NAMES NEVER TOUCH THE FRAME. They are set in the box the frame's
 * picture has clear (`words`), and FrameStage brings them down a size until
 * they fit it, so a long name is smaller, not across the artwork.
 *
 * The pair from the pack's bottom corners stand either side of the title, in
 * one row with it at the foot of the screen: under the frame and the names,
 * beside the title and never over it. Beside the frame they took its width,
 * and a frame is the one thing here that is better for every pixel.
 */

/** The frame's full height and its least, in card px. */
const FRAME_HEIGHT = 240;
const FRAME_MIN = 120;

/** The least the calligraphy is drawn at, as a share of its full size. */
const CALLIGRAPHY_MIN = 0.8;

export interface OpeningCalligraphy {
  id: string;
  /** Width over height. */
  aspect: number;
  Component: Ornament;
}

export default function NamesOpening({
  rootRef,
  rootProps,
  draft,
  theme,
  occasionId,
  language,
  invited,
  calligraphy,
  calligraphyGround,
  blessing,
  frame,
  corners,
  fitted,
  style,
}: {
  rootRef?: Ref<HTMLDivElement>;
  /** Attributes for the block itself: the first screen's marker. */
  rootProps?: Record<string, string>;
  draft: EventDraft;
  theme: Theme;
  occasionId: OccasionId;
  language: CardLanguage;
  /** "You are invited", already drawn, where this is the card's first screen. */
  invited: ReactNode;
  calligraphy: readonly OpeningCalligraphy[];
  calligraphyGround: "light" | "dark";
  /** The blessing, already drawn. */
  blessing: ReactNode;
  frame: FrameArt;
  /**
   * The pack's bottom-corner pair, or null. Not drawn under 390px, where a
   * frame and two of them do not fit side by side; see globals.css.
   */
  corners: CornerPair | null;
  /**
   * Whether the block is fitted to a screen: its height is given in `style`
   * and the calligraphy and the frame move to fill it. Otherwise it is as
   * tall as its content, and at least the `minHeight` in `style`.
   */
  fitted: boolean;
  /** Height or min-height, and the insets. */
  style: CSSProperties;
}): ReactElement {
  const copy = cardCopy(language);
  const names = resolveCoverNames(draft, occasionId, language);
  const title = resolve(draft.eventTitle, copy.cover.titlePlaceholder);

  return (
    <div
      ref={rootRef}
      {...rootProps}
      className={`lifafa-names-opening relative flex flex-col items-center justify-center gap-3 px-7 text-center ${
        fitted ? "lifafa-names-opening-fitted" : ""
      }`}
      style={style}
    >
      {invited}

      {calligraphy.map((panel) => (
        <div
          key={panel.id}
          /*
            A box of the piece's own shape that may be shorter than it, with
            the piece drawn as tall as the box and centred: so it comes down
            whole, not squashed. See .lifafa-opening-calligraphy.
          */
          className="lifafa-opening-calligraphy flex justify-center"
          style={
            {
              aspectRatio: String(panel.aspect),
              "--opening-calligraphy-aspect": String(panel.aspect),
              "--opening-calligraphy-min": String(CALLIGRAPHY_MIN),
            } as CSSProperties
          }
        >
          <panel.Component
            instanceId={`cover-calligraphy-${panel.id}`}
            className="block h-full max-w-none"
            ground={calligraphyGround}
            /* What a piece drawn as a shape is filled with: the card's accent. */
            style={{ color: theme.accent }}
          />
        </div>
      ))}

      {blessing}

      <div
        className="lifafa-opening-frame-row -mx-4 flex justify-center self-stretch"
        style={
          {
            "--opening-frame-height": cardPx(FRAME_HEIGHT),
            "--opening-frame-min": cardPx(FRAME_MIN),
          } as CSSProperties
        }
      >
        {/*
          The room the frame has, as a container: the frame is drawn as large
          as fits it both ways, which a picture with one shape needs said in
          both the room's width and its height.
        */}
        <div
          className="lifafa-opening-frame-cell flex min-w-0 flex-1 items-center justify-center self-stretch"
          style={{ "--opening-frame-aspect": frame.aspect.toFixed(4) } as CSSProperties}
        >
          {/* As large as fits the cell both ways; the cell says how in globals.css. */}
          <FrameStage art={frame} width="var(--opening-frame-width)" eager>
            {names.kind === "pair" ? (
              /* Three lines, one unit, as the names' own screen set them. */
              <div className="flex w-max max-w-[calc(20*var(--card-rem,1rem))] flex-col items-center gap-1">
                <HeroName text={names.first} isPlaceholder={false} script={copy.script} />
                <p
                  className={`text-[1.1rem] tracking-[0.22em] break-words lowercase sm:text-[calc(1.2*var(--card-rem,1rem))] ${
                    copy.script === "devanagari" ? "leading-normal" : "leading-none"
                  }`}
                  style={{ color: textRoles(theme).mark }}
                >
                  {names.joiner}
                </p>
                <HeroName text={names.second} isPlaceholder={false} script={copy.script} />
              </div>
            ) : (
              <div className="flex w-max max-w-[calc(20*var(--card-rem,1rem))] flex-col items-center">
                <HeroName
                  text={names.text}
                  isPlaceholder={names.isPlaceholder}
                  script={copy.script}
                />
              </div>
            )}
          </FrameStage>
        </div>

      </div>

      {/* The title, between the pair where the card has one: let out into the screen's padding, as the frame is. */}
      <div className="-mx-4 flex items-end justify-center gap-2 self-stretch">
        {corners !== null ? (
          <OpeningCorner entry={corners.left} side="left" accent={theme.accent} />
        ) : null}

        <p
          className="min-w-0 flex-1 text-[calc(0.84*var(--card-rem,1rem))] tracking-[0.28em] break-words uppercase text-balance"
          style={{
            color: textRoles(theme).title,
            opacity: placeholderOpacity(title.isPlaceholder, "muted"),
          }}
        >
          {title.text}
        </p>

        {corners !== null ? (
          <OpeningCorner
            entry={corners.right}
            side="right"
            mirror={corners.mirrorRight}
            accent={theme.accent}
          />
        ) : null}
      </div>
    </div>
  );
}
