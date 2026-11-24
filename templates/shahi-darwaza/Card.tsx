"use client";

import type { CSSProperties, ReactElement } from "react";
import MusicToggle from "@/components/card/MusicToggle";
import { ScratchRevealProvider } from "@/components/card/ScratchReveal";
import WeatherPanel from "@/components/card/WeatherPanel";
import ContactSection from "@/components/card/sections/ContactSection";
import CountdownSection from "@/components/card/sections/CountdownSection";
import CustomSection from "@/components/card/sections/CustomSection";
import DetailsSection from "@/components/card/sections/DetailsSection";
import FamilySection from "@/components/card/sections/FamilySection";
import MessageSection from "@/components/card/sections/MessageSection";
import TimelineSection from "@/components/card/sections/TimelineSection";
import VenueSection from "@/components/card/sections/VenueSection";
import { useCoverReady } from "@/hooks/useCoverOpen";
import { cardLanguage } from "@/lib/cardLanguage";
import {
  hasCountdown,
  hasCustomContent,
  hasFamily,
  hasMessage,
} from "@/lib/cardSections";
import { effectiveTheme } from "@/lib/cardTheme";
import { hasContacts } from "@/lib/contacts";
import ShahiDarwazaClosing from "@/templates/shahi-darwaza/Closing";
import ShahiDarwazaHero from "@/templates/shahi-darwaza/Hero";
import styles from "@/templates/shahi-darwaza/darwaza.module.css";
import { darwazaFonts } from "@/templates/shahi-darwaza/shared";
import type { TemplateCardProps } from "@/templates/types";
import type { CardBlock } from "@/types/customSection";

/* The editor's preview frame, where a caller names no height of its own. */
const FRAME_HEIGHT = 620;
/* A section's inset, as the shared card's. */
const PAD = 40;

/**
 * Shahi Darwaza's card.
 *
 * A FIRST VERSION: the hero is its own (the courtyard the door opens onto),
 * and every other section is the shared card's own, set in this card's ivory
 * and gold on maroon velvet. Its own dress for them, from the section
 * pictures in public/decor/shahi-darwaza/, comes next.
 *
 * THE RUNNING ORDER IS THE CARD'S: `config.blocks`, in the host's order. A
 * block that is switched off, or has nothing to say, is left out by the same
 * tests the shared card uses.
 *
 * Takes exactly what CardCanvas takes (see TemplateCardProps), because the
 * same callers place it.
 */
export default function ShahiDarwazaCard(props: TemplateCardProps): ReactElement {
  const {
    draft,
    theme,
    config,
    sizing,
    invite,
    weather = null,
    weatherTheme = null,
    fluid = false,
    ground = "card",
    closingNote,
    frameHeight = FRAME_HEIGHT,
  } = props;

  const language = cardLanguage(config.language);
  /* The pictures below the first screen wait for the cover to be drawn: `.artLater`. */
  const coverReady = useCoverReady();
  const cardTheme = effectiveTheme(theme, config.style);
  const fonts = darwazaFonts(config.style.fontPairId);
  const { occasionId } = config;

  /* Less a live demo's bar on a phone (components/invite/DemoCreateBar.tsx); 0 everywhere else. */
  const screen = sizing === "viewport" ? "calc(100svh - var(--lifafa-foot-h, 0px))" : `${frameHeight}px`;
  const band = sizing === "viewport" ? "100dvh" : `${frameHeight}px`;
  const sectionHeight = sizing === "viewport" ? "100svh" : `${frameHeight}px`;
  const musicUrl = config.musicUrl ?? null;
  const pagewide = ground === "page";
  const scratchKey = invite.url === null ? null : invite.code;

  const section = (block: CardBlock): ReactElement | null => {
    if (block.kind === "custom") {
      return hasCustomContent(block.section) ? (
        <CustomSection section={block.section} theme={cardTheme} minHeight={sectionHeight} pad={PAD} />
      ) : null;
    }

    if (!block.enabled) {
      return null;
    }

    switch (block.id) {
      case "cover":
        return (
          <ShahiDarwazaHero
            draft={draft}
            config={config}
            language={language}
            minHeight={screen}
            band={band}
            fonts={fonts}
          />
        );
      case "family":
        return hasFamily(draft, occasionId) ? (
          <FamilySection
            draft={draft}
            theme={cardTheme}
            minHeight={sectionHeight}
            pad={PAD}
            occasionId={occasionId}
            traditionId="none"
            language={language}
            illustration={false}
          />
        ) : null;
      case "details":
        return (
          <DetailsSection
            draft={draft}
            theme={cardTheme}
            minHeight={sectionHeight}
            pad={PAD}
            scratch={null}
            language={language}
            invite={invite}
            occasionId={occasionId}
            venueScratched={false}
            scroll={null}
            tear={null}
          />
        );
      case "countdown":
        return hasCountdown(draft) ? (
          <CountdownSection
            draft={draft}
            theme={cardTheme}
            minHeight={sectionHeight}
            pad={PAD}
            padTop={PAD}
            scratch={null}
            dateScratch={null}
            sessionKey={scratchKey}
            language={language}
            isWedding={occasionId === "wedding"}
            invite={invite}
            occasionId={occasionId}
            traditionId="none"
            calendarButton
          />
        ) : null;
      case "venue":
        return (
          <VenueSection
            draft={draft}
            theme={cardTheme}
            minHeight={sectionHeight}
            pad={PAD}
            scratch={null}
            language={language}
            illustration={null}
          />
        );
      case "timeline":
        return (
          <TimelineSection
            draft={draft}
            theme={cardTheme}
            minHeight={sectionHeight}
            pad={PAD}
            language={language}
            invite={invite}
            occasionId={occasionId}
            traditionId="none"
          />
        );
      case "contact":
        return hasContacts(draft) ? (
          <ContactSection draft={draft} theme={cardTheme} minHeight={sectionHeight} pad={PAD} language={language} />
        ) : null;
      case "message":
        return hasMessage(draft) ? (
          <MessageSection draft={draft} theme={cardTheme} minHeight={sectionHeight} pad={PAD} />
        ) : null;
    }
  };

  return (
    <ScratchRevealProvider persistKey={scratchKey} concealed="none">
      <div
        lang={language}
        className={`${styles.root} ${coverReady ? "" : styles.artLater} relative ${pagewide ? "" : "isolate"}`}
        style={{ color: cardTheme.textPrimary }}
      >
        <div
          aria-hidden="true"
          className={`${styles.ground} ${pagewide ? styles.groundFixed : styles.groundPinned}`}
          style={pagewide ? undefined : ({ "--sd-band": band } as CSSProperties)}
        />

        {/* The music button, top right, for the whole length of the card: the card's own, with its own player. */}
        {musicUrl !== null ? (
          <div className="pointer-events-none sticky top-3 z-20 mx-auto h-0 w-full max-w-[26rem]">
            <MusicToggle
              musicUrl={musicUrl}
              accent={cardTheme.accent}
              surface={cardTheme.surface}
              language={language}
            />
          </div>
        ) : null}

        {/* The reading column, under the name the printed copy looks for. */}
        <div className={`lifafa-card-content relative z-10 ${fluid ? styles.fluid : ""}`}>
          {config.blocks.map((block) => {
            const drawn = section(block);

            return drawn === null ? null : (
              <div key={block.kind === "custom" ? block.section.id : block.id} className={styles.block}>
                {drawn}
              </div>
            );
          })}
        </div>

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
        {closingNote === "card" ? <ShahiDarwazaClosing draft={draft} config={config} /> : null}
      </div>
    </ScratchRevealProvider>
  );
}
