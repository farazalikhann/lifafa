"use client";

import type { ReactElement, ReactNode } from "react";
import FrameStage from "@/components/card/FrameStage";
import { useInView } from "@/hooks/useInView";
import type { FrameArt } from "@/lib/cardDecor";
import { CardFlourish } from "@/components/card/decor/DecorLayer";
import {
  REVEAL_BASE,
  SECTION_REVEAL_OPTIONS,
  lineDelay,
  placeholderOpacity,
  resolve,
  resolveCoverNames,
  revealClass,
} from "@/lib/cardFormat";
import { cardCopy, type CardCopy } from "@/lib/cardLanguage";
import { cardPx } from "@/lib/cardScale";
import type { Theme } from "@/lib/themes";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";
import type { OccasionId } from "@/types/occasion";

/**
 * One name, set in the pair's names face at the cover's hero size.
 *
 * Pulled out because the pair layout draws it twice and the single-line layout
 * once, and the three have to be the same size to the pixel — a first name a
 * shade larger than a second one would read as a ranking.
 *
 * `break-words` is the whole defence against a long unbroken token — the canvas
 * clips its overflow, and at this size one 60 character word is nearly three
 * times the width of the card. Everything else wraps at spaces inside the
 * container's own width, so no max-width is needed.
 *
 * The leading follows the script. 1.05 is a hero setting for Latin, where a
 * wrapped name's two lines have nothing above the cap height to collide; a
 * Devanagari name hangs its matras above the headline, and at 1.05 the second
 * line's matras land in the first line's descenders.
 */
function HeroName({
  text,
  isPlaceholder,
  script,
}: {
  text: string;
  isPlaceholder: boolean;
  script: CardCopy["script"];
}): ReactElement {
  return (
    <p
      className={`text-[calc(2.4375rem*var(--card-names-scale,1))] wrap-anywhere text-balance sm:text-[calc(2.75*var(--card-rem,1rem)*var(--card-names-scale,1))] ${
        script === "devanagari" ? "leading-[1.45]" : ""
      }`}
      style={{
        opacity: placeholderOpacity(isPlaceholder, "primary"),
        /*
          The pair's names face, which may be a script. Set here and nowhere
          else on the card — see `names` in lib/fontPairs.ts.
        */
        fontFamily: "var(--card-names)",
        fontWeight: "var(--card-names-weight)" as unknown as number,
        letterSpacing: "var(--card-names-tracking)",
        wordSpacing: "var(--card-names-word-spacing)",
        lineHeight:
          script === "devanagari" ? undefined : "var(--card-names-leading)",
      }}
    >
      {text}
    </p>
  );
}

export default function CoverSection({
  draft,
  theme,
  minHeight,
  pad,
  occasionId,
  language,
  aboveNames = null,
  corners = null,
  bottomClearance = 0,
  frame = null,
  sides = null,
}: {
  draft: EventDraft;
  theme: Theme;
  /** The language the placeholders are written in. */
  language: CardLanguage;
  /**
   * Which occasion this is, and so whether the cover joins two names.
   *
   * A birthday has one person and a corporate invitation has none, so neither
   * sets a pair over three lines however the draft happens to be filled in.
   * Resolved through `resolveCoverNames` rather than branched on here, so the
   * card, the page title and the share image cannot disagree about it.
   */
  occasionId: OccasionId;
  minHeight: string;
  /**
   * Inset for the section's content, top and bottom, in px.
   *
   * Not decoration: the hanging ornaments are pinned to the top of the screen,
   * so whichever section is filling the screen has them over its own first
   * line. The canvas resolves this from `hangingDepth` and hands every section
   * the same number, so no section's content can begin inside the band.
   *
   * Applied to both edges so the content stays optically centred rather than
   * being pushed low, and inline rather than as a class because it is a
   * measurement the canvas computes, not a constant. Border-box sizing means it
   * never adds to `minHeight` — the section still fills its viewport exactly.
   */
  pad: number;
  /**
   * The pack's ornament for the place above the names, already drawn — see
   * SlotOrnaments. In the column's flow, so the names make room for it.
   */
  aboveNames?: ReactNode;
  /** The pair for this screen's bottom corners, already drawn and positioned. */
  corners?: ReactNode;
  /**
   * The bottom inset the corners need, in card px. The section keeps the
   * larger of this and `pad`, so its content always ends above them.
   */
  bottomClearance?: number;
  /**
   * A frame the names are set inside: the gurudwara arch. The names, the
   * title and the rule under them go in its opening, brought down a size if
   * they would not fit, so nothing is ever over a pillar (FrameStage).
   */
  frame?: FrameArt | null;
  /**
   * The pair that stands either side of the names, already drawn: the one for
   * the left margin and the one for the right. See SideFlag.
   */
  sides?: { left: ReactNode; right: ReactNode } | null;
}): ReactElement {
  const { ref, isInView } = useInView<HTMLElement>(SECTION_REVEAL_OPTIONS);

  const copy = cardCopy(language);
  const names = resolveCoverNames(draft, occasionId, language);
  const title = resolve(draft.eventTitle, copy.cover.titlePlaceholder);

  /*
    Where the stagger picks up after the names. A pair spends three steps, a
    single line one, and everything below counts on from there — hard coding
    the title at step 1 would have it arrive on top of the second name.
  */
  const stepAfterNames = names.kind === "pair" ? 3 : 1;

  /*
    Reveal lives on the wrapper, placeholder dimming on the text inside it.
    Nested opacity multiplies, so a placeholder still starts fully hidden —
    putting both on one element would let the inline value win and the line
    would never fade in.
  */
  const reveal = `${REVEAL_BASE} ${revealClass(isInView)}`;

  const gap = "calc(1.25 * var(--card-rem, 1rem) * var(--card-gap-scale, 1))";

  /*
    A card with a frame or with side flags lays its lines out as one group, so
    the group can be set inside the frame, or between the flags. Every other
    card keeps its lines as the section's own children, exactly as before.
  */
  const grouped = frame !== null || sides !== null;

  const lines = (
    <>
      {aboveNames !== null ? (
        <div className={reveal} style={lineDelay(0)}>
          {aboveNames}
        </div>
      ) : null}

      {names.kind === "pair" ? (
        /*
          Three lines, one unit. The gap here is deliberately far tighter than
          the section's own — the joining word belongs to the names, not to the
          run of cover lines, and at the section's spacing it would read as a
          third statement rather than as the hinge between two names.
        */
        <div className="flex flex-col items-center gap-1">
          <div className={reveal} style={lineDelay(0)}>
            <HeroName
              text={names.first}
              isPlaceholder={false}
              script={copy.script}
            />
          </div>

          <div className={reveal} style={lineDelay(1)}>
            {/*
              Set at roughly 45% of the hero size and in the accent, so it
              carries the eye from one name to the other without competing
              with either. Lower cased in CSS rather than on the value, so a
              host who types "Weds" still gets the card's own voice back.
            */}
            {/*
              `leading-none` only for Latin: "संग" carries a matra above its
              headline, and a line box with no room above the letters puts it
              into the name overhead.
            */}
            <p
              className={`text-[1.1rem] tracking-[0.22em] break-words lowercase sm:text-[calc(1.2*var(--card-rem,1rem))] ${
                copy.script === "devanagari" ? "leading-normal" : "leading-none"
              }`}
              style={{ color: theme.accent }}
            >
              {names.joiner}
            </p>
          </div>

          <div className={reveal} style={lineDelay(2)}>
            <HeroName
              text={names.second}
              isPlaceholder={false}
              script={copy.script}
            />
          </div>
        </div>
      ) : (
        <div className={reveal} style={lineDelay(0)}>
          <HeroName
            text={names.text}
            isPlaceholder={names.isPlaceholder}
            script={copy.script}
          />
        </div>
      )}

      <div className={reveal} style={lineDelay(stepAfterNames)}>
        <p
          className="text-[calc(0.84*var(--card-rem,1rem))] tracking-[0.28em] break-words uppercase text-balance"
          style={{
            color: theme.textMuted,
            opacity: placeholderOpacity(title.isPlaceholder, "muted"),
          }}
        >
          {title.text}
        </p>
      </div>

      <div className={reveal} style={lineDelay(stepAfterNames + 1)}>
        <CardFlourish accent={theme.accent} />
      </div>
    </>
  );

  const group = !grouped ? (
    lines
  ) : frame !== null ? (
    <FrameStage
      art={frame}
      /* As wide as the row leaves it, up to its own width: narrower between two flags. In the card's rem, so it grows with the type it frames. */
      width={`min(100%, calc(${frame.width / 16} * var(--card-rem, 1rem)))`}
      eager
    >
      {/*
        As wide as its longest line wants, up to a limit, rather than as wide
        as the doorway: a name is brought down a size to fit before it is
        broken in the middle of a word.
      */}
      <div className="flex w-max max-w-[calc(20*var(--card-rem,1rem))] flex-col items-center" style={{ gap }}>
        {lines}
      </div>
    </FrameStage>
  ) : (
    <div className="flex w-full flex-col items-center" style={{ gap }}>
      {lines}
    </div>
  );

  return (
    <section
      ref={ref}
      className="relative flex flex-col items-center justify-center px-7 text-center"
      style={{
        minHeight,
        paddingTop: cardPx(pad),
        paddingBottom: cardPx(Math.max(pad, bottomClearance)),
        /*
          1.25rem between the names, the title and the flourish. It
          was 1.5, which spaced four short lines as four separate statements
          and stood the group taller than the names needed; this reads as one
          composed block while each line still has its own breath.
        */
        gap,
      }}
    >
      {sides !== null ? (
        /*
          Flag, names, flag: one row, top aligned, so the flags stand in the
          upper part of the margins and are beside the names or the arch, never
          over them. Let out into the section's own side padding, which is the
          margin they stand in.
        */
        <div className="-mx-4 flex items-start justify-center gap-1.5 self-stretch">
          {sides.left}
          <div className="flex min-w-0 flex-1 justify-center">{group}</div>
          {sides.right}
        </div>
      ) : (
        group
      )}

      {corners}
    </section>
  );
}
