"use client";

import type { CSSProperties, ReactElement } from "react";
import MusicToggle from "@/components/card/MusicToggle";
import { ScratchRevealProvider } from "@/components/card/ScratchReveal";
import WeatherPanel from "@/components/card/WeatherPanel";
import { cardLanguage } from "@/lib/cardLanguage";
import { hasCountdown, hasCustomContent, hasFamily, hasMessage } from "@/lib/cardSections";
import { effectiveTheme } from "@/lib/cardTheme";
import { hasContacts } from "@/lib/contacts";
import DakGharClock from "@/templates/dak-ghar/Clock";
import DakGharClosing from "@/templates/dak-ghar/Closing";
import DakGharNames from "@/templates/dak-ghar/Names";
import { DakGharContacts, DakGharCouple, DakGharCustom, DakGharSaveDate } from "@/templates/dak-ghar/Paper";
import DakGharPostcard from "@/templates/dak-ghar/Postcard";
import DakGharStamps from "@/templates/dak-ghar/Stamps";
import DakGharTelegram from "@/templates/dak-ghar/Telegram";
import styles from "@/templates/dak-ghar/dak.module.css";
import type { TemplateCardProps } from "@/templates/types";
import type { CardBlock } from "@/types/customSection";

/* The editor's preview frame, where a caller names no height of its own. */
const FRAME_HEIGHT = 620;

/**
 * Dak Ghar's card: every section in the post office's own dress.
 *
 * THE PRESENTATION IS ITS OWN, THE LOGIC IS THE CARD'S. Each section reads
 * the event through the same functions the shared card does (the names
 * through resolveCoverNames, the functions through timelineEntries, the
 * countdown through the shared `measure`, the calendar through AddToCalendar,
 * a venue's link through directionsUrl, the numbers through contactsOf), and
 * a block that is switched off, or has nothing to say, is left out by the
 * same tests.
 *
 * THE RUNNING ORDER IS THE HOST'S (`config.blocks`), each block drawn by the
 * page that has taken its place:
 *
 *   cover       the names on letter paper    venue      a postcard
 *   family      the couple, on paper         timeline   a postage stamp each
 *   details     Save the Date, in a ring     contact    who to ring
 *   countdown   a brass clock                message    a telegram
 *   (a host's own section)                   on paper
 *
 * The reply form follows on the guest's page, on the reply card (RsvpFrame),
 * then the closing words.
 */
export default function DakGharCard(props: TemplateCardProps): ReactElement {
  const {
    draft,
    theme,
    config,
    sizing,
    invite,
    weather = null,
    weatherTheme = null,
    ground = "card",
    closingNote,
    frameHeight = FRAME_HEIGHT,
  } = props;

  const language = cardLanguage(config.language);
  const cardTheme = effectiveTheme(theme, config.style);
  const { occasionId } = config;
  const screen = sizing === "viewport" ? "100svh" : `${frameHeight}px`;
  const band = sizing === "viewport" ? "100dvh" : `${frameHeight}px`;
  const musicUrl = config.musicUrl ?? null;
  /*
    On the guest's page the paper is fixed under the whole page, the reply
    form and all. Anywhere else the card is in a box that scrolls, and the
    paper is pinned to the top of that box instead.
  */
  const pagewide = ground === "page";

  const section = (block: CardBlock): ReactElement | null => {
    if (block.kind === "custom") {
      return hasCustomContent(block.section) ? <DakGharCustom section={block.section} /> : null;
    }

    if (!block.enabled) {
      return null;
    }

    switch (block.id) {
      case "cover":
        return <DakGharNames draft={draft} config={config} language={language} minHeight={screen} />;
      case "family":
        return hasFamily(draft, occasionId) ? (
          <DakGharCouple draft={draft} occasionId={occasionId} language={language} />
        ) : null;
      case "details":
        return (
          <DakGharSaveDate draft={draft} language={language} occasionId={occasionId} invite={invite} theme={cardTheme} />
        );
      case "countdown":
        return hasCountdown(draft) ? <DakGharClock draft={draft} language={language} /> : null;
      case "venue":
        return <DakGharPostcard draft={draft} language={language} />;
      case "timeline":
        return <DakGharStamps draft={draft} language={language} />;
      case "contact":
        return hasContacts(draft) ? <DakGharContacts draft={draft} language={language} /> : null;
      case "message":
        return hasMessage(draft) ? <DakGharTelegram message={draft.message.trim()} language={language} /> : null;
    }
  };

  return (
    <ScratchRevealProvider persistKey={invite.url === null ? null : invite.code} concealed="none">
      <div lang={language} className={`${styles.root} relative ${pagewide ? "" : "isolate"}`}>
        <div
          aria-hidden="true"
          className={`${styles.ground} ${pagewide ? styles.groundFixed : styles.groundPinned}`}
          style={pagewide ? undefined : ({ "--dg-band": band } as CSSProperties)}
        />

        {/*
          The music button, top right, for the whole length of the card: a row
          of no height pinned to the top of the screen, holding the card's own
          button and player.
        */}
        {musicUrl !== null ? (
          <div className="pointer-events-none sticky top-3 z-20 mx-auto h-0 w-full max-w-[28rem]">
            <MusicToggle musicUrl={musicUrl} accent={cardTheme.accent} surface={cardTheme.surface} language={language} />
          </div>
        ) : null}

        {/* The reading column, under the name the printed copy looks for. */}
        <div className="lifafa-card-content relative z-10">
          {config.blocks.map((block) => {
            const drawn = section(block);
            return drawn === null ? null : (
              <div key={block.kind === "custom" ? block.section.id : block.id}>{drawn}</div>
            );
          })}
        </div>

        {/* After the last section, as on every card. */}
        {weather !== null ? (
          <WeatherPanel weather={weather} themeId={weatherTheme} theme={cardTheme} draft={draft} language={language} />
        ) : null}

        {/* The closing words end the card where nothing follows it; on the guest's page they follow the reply form. */}
        {closingNote === "card" ? <DakGharClosing draft={draft} config={config} /> : null}
      </div>
    </ScratchRevealProvider>
  );
}
