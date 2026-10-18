"use client";

import { useRef, type CSSProperties, type ReactElement } from "react";
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
import { contactsOf, hasContacts } from "@/lib/contacts";
import GulabClosing from "@/templates/gulab-mahal/Closing";
import GulabNamesPage from "@/templates/gulab-mahal/NamesPage";
import GulabPager from "@/templates/gulab-mahal/Pager";
import GulabPetals from "@/templates/gulab-mahal/Petals";
import GulabDetailsPage from "@/templates/gulab-mahal/DetailsPage";
import GulabScrollPage from "@/templates/gulab-mahal/ScrollPage";
import GulabStackPage from "@/templates/gulab-mahal/StackPage";
import GulabTagsPage from "@/templates/gulab-mahal/TagsPage";
import GulabVenuePage from "@/templates/gulab-mahal/VenuePage";
import styles from "@/templates/gulab-mahal/gulab.module.css";
import { gulabFonts } from "@/templates/gulab-mahal/shared";
import type { TemplateCardProps } from "@/templates/types";
import type { CardSectionId } from "@/types/card";

/* The editor's preview frame, where a caller names no height of its own. */
const FRAME_HEIGHT = 620;

/**
 * Gulab Mahal's card: a stack of full-screen pages, one swipe each, over
 * blush velvet.
 *
 * THE PRESENTATION IS ITS OWN, THE LOGIC IS THE CARD'S. Each page reads the
 * event through the same functions the shared card does (the names through
 * resolveCoverNames, the functions through timelineEntries, the numbers
 * through contactsOf) and the same tests decide what a card contains.
 *
 * THE ORDER IS THE TEMPLATE'S, NOT `config.blocks`': a stack of pages reads as
 * one story, and its order is part of the design.
 *
 *   1  the opening         the envelope and its seal: the cover, Cover.tsx
 *   2  the names           in the rose cameo
 *   3  the date            the scroll and the countdown
 *   4  the couple          their tags
 *   5  the functions       a stack of cards
 *   6  the venue
 *   7  the details         contacts, the host's sections, the note; only if any
 *   8  the reply           drawn by the guest's page, on our paper (RsvpFrame)
 *   9  the thanks          drawn by the guest's page after the reply (Closing),
 *                          or here in a preview, which has no reply form
 *
 * Which of them a card has is still the host's: a section switched off in
 * `config.blocks`, or one with nothing to say, is not a page. Pages 3 to 7
 * are each their own file (ScrollPage, TagsPage, StackPage, VenuePage,
 * DetailsPage); 8 and 9 are RsvpFrame and Closing.
 *
 * Takes exactly what CardCanvas takes (see TemplateCardProps), because the
 * same callers place it: the guest's page, the two previews and the printed
 * copy.
 */
export default function GulabMahalCard(props: TemplateCardProps): ReactElement {
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

  const rootRef = useRef<HTMLDivElement>(null);
  const language = cardLanguage(config.language);
  const cardTheme = effectiveTheme(theme, config.style);
  const fonts = gulabFonts(config.style.fontPairId);
  const { occasionId } = config;

  const screen = sizing === "viewport" ? "100svh" : `${frameHeight}px`;
  const band = sizing === "viewport" ? "100dvh" : `${frameHeight}px`;
  const musicUrl = config.musicUrl ?? null;
  /*
    On the guest's page the ground and the petals are fixed under the whole
    page and the document is what pages. Anywhere else the card is in a box
    that scrolls, and both are pinned to the top of that box instead.
  */
  const pagewide = ground === "page";

  const on = (id: CardSectionId): boolean =>
    config.blocks.some((block) => block.kind !== "custom" && block.id === id && block.enabled);

  const custom = config.blocks.flatMap((block) =>
    block.kind === "custom" && hasCustomContent(block.section) ? [block.section] : [],
  );
  const contacts = on("contact") && hasContacts(draft) ? contactsOf(draft) : [];
  const note = on("message") && hasMessage(draft) ? draft.message.trim() : null;
  const hasDetails = contacts.length > 0 || custom.length > 0 || note !== null;

  return (
    <ScratchRevealProvider
      persistKey={invite.url === null ? null : invite.code}
      concealed="none"
    >
      <div
        ref={rootRef}
        lang={language}
        data-gm-root=""
        className={`${styles.palette} ${styles.root} ${pagewide ? "" : "isolate"}`}
        style={{ "--gm-screen": screen } as CSSProperties}
      >
        <div
          aria-hidden="true"
          className={`${styles.ground} ${pagewide ? styles.groundFixed : styles.groundPinned}`}
          style={pagewide ? undefined : ({ "--gm-band": band } as CSSProperties)}
        />

        <GulabPetals pagewide={pagewide} band={band} />
        <GulabPager pagewide={pagewide} rootRef={rootRef} />

        {/*
          The music button, top right of the column for every page: fixed on
          the guest's page, which is paged by the document; a row of no height
          pinned to the top of a preview's box.
        */}
        {musicUrl !== null ? (
          <div
            className={`pointer-events-none z-20 mx-auto h-0 w-full max-w-[30rem] ${
              pagewide ? "fixed inset-x-0 top-3" : "sticky top-3"
            }`}
          >
            <MusicToggle
              musicUrl={musicUrl}
              accent={cardTheme.accent}
              surface={cardTheme.surface}
              language={language}
            />
          </div>
        ) : null}

        {/*
          The pages, under the name the printed copy looks for: it measures
          this box and zooms it to fit the paper, as it does every card's.
        */}
        <div className="lifafa-card-content relative">
          <GulabNamesPage draft={draft} config={config} language={language} fonts={fonts} />

          {/* The scroll is this card's own reveal: the host's scratch panels are not used here. */}
          {on("details") || (on("countdown") && hasCountdown(draft)) ? (
            <GulabScrollPage
              draft={draft}
              language={language}
              occasionId={occasionId}
              invite={invite}
              theme={cardTheme}
              fonts={fonts}
              showCountdown={on("countdown") && hasCountdown(draft)}
            />
          ) : null}

          {on("family") && hasFamily(draft, occasionId) ? (
            <GulabTagsPage draft={draft} occasionId={occasionId} language={language} fonts={fonts} />
          ) : null}

          {on("timeline") ? (
            <GulabStackPage draft={draft} language={language} fonts={fonts} />
          ) : null}

          {on("venue") ? (
            <GulabVenuePage draft={draft} language={language} fonts={fonts}>
              {/* The sky over the day, with the place it is over. */}
              {weather !== null ? (
                <WeatherPanel
                  weather={weather}
                  themeId={weatherTheme}
                  theme={cardTheme}
                  draft={draft}
                  language={language}
                />
              ) : null}
            </GulabVenuePage>
          ) : null}

          {hasDetails ? (
            <GulabDetailsPage
              contacts={contacts}
              custom={custom}
              note={note}
              language={language}
              fonts={fonts}
            />
          ) : null}

          {/* The thanks end the card where nothing follows it; on the guest's page they follow the reply. */}
          {closingNote === "card" ? <GulabClosing draft={draft} config={config} /> : null}
        </div>
      </div>
    </ScratchRevealProvider>
  );
}
