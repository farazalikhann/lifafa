"use client";

import type { CSSProperties, ReactElement } from "react";
import CardCanvas from "@/components/card/CardCanvas";
import MusicToggle from "@/components/card/MusicToggle";
import { cardLanguage } from "@/lib/cardLanguage";
import { hasFamily } from "@/lib/cardSections";
import { effectiveTheme } from "@/lib/cardTheme";
import {
  fontFamilyOf,
  getFontPair,
  namesFaceOf,
  pairRoleVar,
} from "@/lib/fontPairs";
import EmeraldShahiCouple from "@/templates/emerald-shahi/Couple";
import EmeraldShahiHero from "@/templates/emerald-shahi/Hero";
import styles from "@/templates/emerald-shahi/emerald.module.css";
import type { TemplateCardProps } from "@/templates/types";
import type { CardBlock } from "@/types/customSection";

/* The editor's preview frame, where a caller names no height of its own. */
const FRAME_HEIGHT = 620;

const isBuiltin = (block: CardBlock, id: string): boolean =>
  block.kind === "builtin" && block.id === id;

/**
 * Emerald Shahi's card.
 *
 * WHAT IS ITS OWN is the presentation of the first two things a guest meets:
 * the ground the whole card is printed on (the emerald pattern under a dark
 * emerald wash), the hero, and "Meet the Couple". Those are drawn here.
 *
 * EVERYTHING ELSE IS THE CARD'S, UNCHANGED. The date and its reveals, the
 * countdown, the venue and its map, every function, the contact numbers, the
 * host's own sections, the note, the weather and the calendar buttons are
 * drawn by CardCanvas, handed the same card with the two sections above taken
 * out of its running order. So the scratch panel, the strip of paper, the
 * calendar links and the rest are the same code a guest of any other card
 * gets, in this card's emerald and gold, and nothing about them is written a
 * second time. They get designs of their own in the template's second part.
 *
 * So the hero is always first and the couple second, wherever a host who
 * reordered sections in the full editor put them; the rest keep their order.
 *
 * Takes exactly what CardCanvas takes (see TemplateCardProps), because the
 * same callers place it: the guest's page, the two previews and the printed
 * copy.
 */
export default function EmeraldShahiCard(
  props: TemplateCardProps,
): ReactElement {
  const {
    draft,
    theme,
    config,
    sizing,
    fluid = false,
    ground = "card",
    frameHeight = FRAME_HEIGHT,
  } = props;

  const language = cardLanguage(config.language);
  const cardTheme = effectiveTheme(theme, config.style);
  const pair = getFontPair(config.style.fontPairId);
  const namesFace = namesFaceOf(pair);

  const namesFont: CSSProperties = {
    fontFamily: fontFamilyOf(namesFace.variable, namesFace.fallback),
    fontWeight: namesFace.weight,
    letterSpacing: namesFace.tracking,
  };
  const headingFont: CSSProperties = {
    fontFamily: fontFamilyOf(pairRoleVar(pair, "heading"), pair.headingFallback),
    fontWeight: pair.headingWeight,
  };
  const bodyFont: CSSProperties = {
    fontFamily: fontFamilyOf(pairRoleVar(pair, "body"), pair.bodyFallback),
  };

  /*
    A printed sheet is this card with only that sheet's sections on it, so the
    hero and the couple are each drawn only where their own block is.
  */
  const showHero = config.blocks.some(
    (block) => isBuiltin(block, "cover") && block.kind === "builtin" && block.enabled,
  );
  const showCouple =
    config.blocks.some(
      (block) =>
        isBuiltin(block, "family") && block.kind === "builtin" && block.enabled,
    ) && hasFamily(draft, config.occasionId);
  const rest = config.blocks.filter(
    (block) => !isBuiltin(block, "cover") && !isBuiltin(block, "family"),
  );

  const screen = sizing === "viewport" ? "100svh" : `${frameHeight}px`;
  const musicUrl = config.musicUrl ?? null;
  /*
    On the guest's page the ground is fixed under the whole page, the reply
    form and all. Anywhere else the card is in a box that scrolls, and the
    ground is pinned to the top of that box instead; the root is then its own
    layer so the ground stays under this card and nothing else.
  */
  const pagewide = ground === "page";

  return (
    <div
      lang={language}
      className={`${styles.root} ${fluid ? styles.fluid : ""} relative ${
        pagewide ? "" : "isolate"
      }`}
    >
      <div
        aria-hidden="true"
        className={`${styles.ground} ${
          pagewide ? styles.groundFixed : styles.groundPinned
        }`}
        style={
          pagewide
            ? undefined
            : ({
                "--es-band": sizing === "viewport" ? "100dvh" : `${frameHeight}px`,
              } as CSSProperties)
        }
      />

      {/*
        The music button, top right, for the whole length of the card: a row
        of no height pinned to the top of the screen, as on every card. Drawn
        here and not by the card below, whose own would only appear once the
        guest had scrolled down to it.
      */}
      {musicUrl !== null ? (
        <div className="pointer-events-none sticky top-3 z-20 mx-auto h-0 w-full max-w-[26rem] px-4">
          <MusicToggle
            musicUrl={musicUrl}
            accent={cardTheme.accent}
            surface={cardTheme.surface}
            language={language}
          />
        </div>
      ) : null}

      {showHero ? (
        <EmeraldShahiHero
          draft={draft}
          config={config}
          language={language}
          minHeight={screen}
          namesFont={namesFont}
          headingFont={headingFont}
        />
      ) : null}

      {showCouple ? (
        <EmeraldShahiCouple
          draft={draft}
          occasionId={config.occasionId}
          language={language}
          namesFont={namesFont}
          headingFont={headingFont}
          bodyFont={bodyFont}
        />
      ) : null}

      <CardCanvas
        {...props}
        config={{
          ...config,
          blocks: rest,
          /* Drawn above, once. */
          musicUrl: null,
          /* None of these is this template's: its ground and its florals are its decoration. */
          scene: "off",
          invitedHeading: false,
          borderStyle: "none",
          royalTexture: false,
          /* The garlands between sections are another card's flowers. */
          divider: "none",
        }}
        /* It starts part way down this card: no band of flat colour across the pattern. */
        dissolve={false}
        /* This card lays the ground, here, whoever placed it. */
        ground="page"
        frame={false}
      />
    </div>
  );
}
