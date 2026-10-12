"use client";

import type { CSSProperties, ReactElement } from "react";
import MusicToggle from "@/components/card/MusicToggle";
import { ScratchRevealProvider } from "@/components/card/ScratchReveal";
import WeatherPanel from "@/components/card/WeatherPanel";
import { cardLanguage } from "@/lib/cardLanguage";
import {
  hasCountdown,
  hasCustomContent,
  hasFamily,
  hasMessage,
} from "@/lib/cardSections";
import { effectiveTheme } from "@/lib/cardTheme";
import { hasContacts } from "@/lib/contacts";
import EmeraldShahiClosing from "@/templates/emerald-shahi/Closing";
import EmeraldShahiCountdown from "@/templates/emerald-shahi/Countdown";
import EmeraldShahiCouple from "@/templates/emerald-shahi/Couple";
import EmeraldShahiEvents from "@/templates/emerald-shahi/Events";
import EmeraldShahiFloating from "@/templates/emerald-shahi/Floating";
import EmeraldShahiHero from "@/templates/emerald-shahi/Hero";
import {
  EmeraldShahiContacts,
  EmeraldShahiCustom,
  EmeraldShahiNote,
} from "@/templates/emerald-shahi/Notes";
import EmeraldShahiSaveDate from "@/templates/emerald-shahi/SaveDate";
import EmeraldShahiVenues from "@/templates/emerald-shahi/Venues";
import styles from "@/templates/emerald-shahi/emerald.module.css";
import { emeraldFonts } from "@/templates/emerald-shahi/shared";
import type { TemplateCardProps } from "@/templates/types";
import type { CardBlock } from "@/types/customSection";

/* The editor's preview frame, where a caller names no height of its own. */
const FRAME_HEIGHT = 620;

/**
 * Emerald Shahi's card: every section in this template's own dress.
 *
 * THE PRESENTATION IS ITS OWN, THE LOGIC IS THE CARD'S. Each section here is
 * drawn by this folder, and each one reads the event through the same
 * functions the shared card does: the names through resolveCoverNames, the
 * functions through timelineEntries, the countdown through CountdownSection's
 * own `measure`, the calendar through AddToCalendar itself, a venue's link
 * through directionsUrl, the numbers through contactsOf, the scratch panels
 * through ScratchPanel and the card's one ScratchRevealProvider. Nothing about
 * what an invitation says or does is decided a second time in this folder.
 *
 * THE RUNNING ORDER IS THE CARD'S: `config.blocks`, in the host's order, each
 * block drawn by the section that has taken its place here:
 *
 *   cover       the hero                    venue      the venues, in tabs
 *   family      Meet the Couple             timeline   a parchment card each
 *   details     Save the Date               contact    who to ring
 *   countdown   the four gold coins         message    the host's note
 *   (a host's own section)                  the same emerald card
 *
 * A block that is switched off, or has nothing to say, is left out by the
 * same tests the shared card uses, so the two agree on what a card contains.
 *
 * Takes exactly what CardCanvas takes (see TemplateCardProps), because the
 * same callers place it: the guest's page, the two previews and the printed
 * copy. The printed copy is this card too, turned ink-friendly by the
 * stylesheet; see "On paper" there.
 */
export default function EmeraldShahiCard(
  props: TemplateCardProps,
): ReactElement {
  const {
    draft,
    theme,
    config,
    sizing,
    audience,
    invite,
    weather = null,
    weatherTheme = null,
    fluid = false,
    ground = "card",
    closingNote,
    frameHeight = FRAME_HEIGHT,
  } = props;

  const language = cardLanguage(config.language);
  const cardTheme = effectiveTheme(theme, config.style);
  const fonts = emeraldFonts(config.style.fontPairId);
  const { occasionId } = config;

  const screen = sizing === "viewport" ? "100svh" : `${frameHeight}px`;
  const band = sizing === "viewport" ? "100dvh" : `${frameHeight}px`;
  const musicUrl = config.musicUrl ?? null;
  /* Only the countdown is hidden on this card; the coins are its scratch panels. */
  const scratchCountdown = config.scratchTarget === "countdown";
  /*
    On the guest's page the ground is fixed under the whole page, the reply
    form and all. Anywhere else the card is in a box that scrolls, and the
    ground is pinned to the top of that box instead; the root is then its own
    layer so the ground stays under this card and nothing else.
  */
  const pagewide = ground === "page";

  const section = (block: CardBlock): ReactElement | null => {
    if (block.kind === "custom") {
      return hasCustomContent(block.section) ? (
        <EmeraldShahiCustom section={block.section} fonts={fonts} />
      ) : null;
    }

    if (!block.enabled) {
      return null;
    }

    switch (block.id) {
      case "cover":
        return (
          <EmeraldShahiHero
            draft={draft}
            config={config}
            language={language}
            minHeight={screen}
            namesFont={fonts.names}
            headingFont={fonts.heading}
          />
        );
      case "family":
        return hasFamily(draft, occasionId) ? (
          <EmeraldShahiCouple
            draft={draft}
            occasionId={occasionId}
            language={language}
            namesFont={fonts.names}
            headingFont={fonts.heading}
            bodyFont={fonts.body}
          />
        ) : null;
      case "details":
        return (
          <EmeraldShahiSaveDate
            draft={draft}
            language={language}
            occasionId={occasionId}
            invite={invite}
            theme={cardTheme}
            fonts={fonts}
          />
        );
      case "countdown":
        return hasCountdown(draft) ? (
          <EmeraldShahiCountdown
            draft={draft}
            language={language}
            scratch={scratchCountdown}
            audience={audience}
            persistKey={invite.url === null ? null : invite.code}
            fonts={fonts}
          />
        ) : null;
      case "venue":
        return (
          <EmeraldShahiVenues draft={draft} language={language} fonts={fonts} />
        );
      case "timeline":
        return (
          <EmeraldShahiEvents draft={draft} language={language} fonts={fonts} />
        );
      case "contact":
        return hasContacts(draft) ? (
          <EmeraldShahiContacts draft={draft} language={language} fonts={fonts} />
        ) : null;
      case "message":
        return hasMessage(draft) ? (
          <EmeraldShahiNote draft={draft} fonts={fonts} />
        ) : null;
    }
  };

  return (
    /*
      The card's scratch state, for anything on it that asks. The countdown's
      coins keep their own, coin by coin; see Countdown.tsx.
    */
    <ScratchRevealProvider
      persistKey={invite.url === null ? null : invite.code}
      concealed="none"
    >
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
          style={pagewide ? undefined : ({ "--es-band": band } as CSSProperties)}
        />

        <EmeraldShahiFloating pagewide={pagewide} band={band} />

        {/*
          The music button, top right, for the whole length of the card: a row
          of no height pinned to the top of the screen. The card's own button,
          with its own player; the wrapper only dresses it as an emerald disc
          in a gold ring.
        */}
        {musicUrl !== null ? (
          <div className={`${styles.music} pointer-events-none sticky top-3 z-20 mx-auto h-0 w-full max-w-[26rem]`}>
            <MusicToggle
              musicUrl={musicUrl}
              accent={cardTheme.accent}
              surface={cardTheme.surface}
              language={language}
            />
          </div>
        ) : null}

        {/*
          The reading column, under the name the printed copy looks for: it
          measures this box on each sheet and zooms it to fit the paper
          (fitSheets in components/print/PrintDocument.tsx), as it does the
          shared card's.
        */}
        <div className="lifafa-card-content relative z-10">
          {config.blocks.map((block) => {
            const drawn = section(block);

            return drawn === null ? null : (
              <div key={block.kind === "custom" ? block.section.id : block.id}>
                {drawn}
              </div>
            );
          })}
        </div>

        {/* After the last section, as on every card: the sky over the day belongs to no one section. */}
        {weather !== null ? (
          <WeatherPanel
            weather={weather}
            themeId={weatherTheme}
            theme={cardTheme}
            draft={draft}
            language={language}
          />
        ) : null}

        {/* The closing words end the card where nothing follows it; on the guest's page they follow the reply form. */}
        {closingNote === "card" ? (
          <EmeraldShahiClosing draft={draft} config={config} fluid={fluid} />
        ) : null}
      </div>
    </ScratchRevealProvider>
  );
}
