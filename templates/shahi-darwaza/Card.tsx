"use client";

import type { CSSProperties, ReactElement } from "react";
import MusicToggle from "@/components/card/MusicToggle";
import { ScratchRevealProvider } from "@/components/card/ScratchReveal";
import WeatherPanel from "@/components/card/WeatherPanel";
import ContactSection from "@/components/card/sections/ContactSection";
import CustomSection from "@/components/card/sections/CustomSection";
import { useCoverReady } from "@/hooks/useCoverOpen";
import { cardLanguage } from "@/lib/cardLanguage";
import { hasCustomContent } from "@/lib/cardSections";
import { effectiveTheme } from "@/lib/cardTheme";
import { hasContacts } from "@/lib/contacts";
import ShahiDarwazaCalendar from "@/templates/shahi-darwaza/Calendar";
import ShahiDarwazaClosing from "@/templates/shahi-darwaza/Closing";
import ShahiDarwazaCountdown from "@/templates/shahi-darwaza/Countdown";
import ShahiDarwazaCouple from "@/templates/shahi-darwaza/Couple";
import ShahiDarwazaHero from "@/templates/shahi-darwaza/Hero";
import ShahiDarwazaLetter from "@/templates/shahi-darwaza/Letter";
import ShahiDarwazaPetals from "@/templates/shahi-darwaza/Petals";
import ShahiDarwazaTimeline from "@/templates/shahi-darwaza/Timeline";
import ShahiDarwazaVenue from "@/templates/shahi-darwaza/Venue";
import styles from "@/templates/shahi-darwaza/darwaza.module.css";
import { darwazaFonts } from "@/templates/shahi-darwaza/shared";
import type { TemplateCardProps } from "@/templates/types";
import type { CardBlock } from "@/types/customSection";

/* The editor's preview frame, where a caller names no height of its own. */
const FRAME_HEIGHT = 620;
/* The inset of the shared sections still drawn here (contacts, a host's own section). */
const PAD = 40;

/*
  This card's own running order: the letter straight after the courtyard,
  the countdown last before the reply. A host cannot reorder the built-in
  sections (DEFAULT_SECTION_ORDER in lib/cardSections.ts), so this changes
  only where they fall on this template.
*/
const ORDER: readonly string[] = [
  "cover",
  "message",
  "family",
  "details",
  "timeline",
  "venue",
  "countdown",
  "contact",
];

/**
 * The card's blocks in this card's order. A host's own section keeps its
 * place after the built-in one it followed; anything this order does not
 * name keeps its place at the end, in the order it came.
 */
function inOrder(blocks: readonly CardBlock[]): readonly CardBlock[] {
  let after = -1;

  return blocks
    .map((block, index) => {
      if (block.kind !== "custom") {
        const rank = ORDER.indexOf(block.id);
        after = rank === -1 ? ORDER.length : rank;
      }

      return { block, index, rank: block.kind === "custom" ? after + 0.5 : after };
    })
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.block);
}

/**
 * Shahi Darwaza's card: the courtyard the door opens onto, then each section
 * on ivory paper, with a garland between one and the next and rose petals
 * drifting behind them.
 *
 * WHICH SECTIONS ARE THE CARD'S, THE ORDER IS THIS TEMPLATE'S: each of
 * `config.blocks` that is switched on, in the order of ORDER below, drawn by
 * the section that has taken its place here:
 *
 *   cover       the courtyard (Hero)        venue      the palace card
 *   message     the letter in its envelope  countdown  the courtyard at night
 *   family      the couple in the arch      contact    the shared section, on paper
 *   details     the month, the day circled  (a host's own section)  the shared one
 *   timeline    the functions on a thread
 *
 * Every word is the host's, from the event's own fields; a section with
 * nothing to say is left out. There is no field for a dress code, a list of
 * questions or a photograph of the couple, so the card has no section for
 * the first two and the arch holds the couple's initials.
 *
 * The reply form (the Swagat Patra scroll) and the closing are the page's,
 * after the card: RsvpFrame.tsx and Closing.tsx.
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
  const musicUrl = config.musicUrl ?? null;
  const pagewide = ground === "page";
  const scratchKey = invite.url === null ? null : invite.code;

  const section = (block: CardBlock): ReactElement | null => {
    if (block.kind === "custom") {
      return hasCustomContent(block.section) ? (
        <CustomSection section={block.section} theme={cardTheme} minHeight="0px" pad={PAD} />
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
      case "message":
        return <ShahiDarwazaLetter draft={draft} config={config} language={language} fonts={fonts} />;
      case "family":
        return <ShahiDarwazaCouple draft={draft} config={config} language={language} fonts={fonts} />;
      case "details":
        return (
          <ShahiDarwazaCalendar
            draft={draft}
            language={language}
            occasionId={occasionId}
            invite={invite}
            theme={cardTheme}
            fonts={fonts}
          />
        );
      case "timeline":
        return <ShahiDarwazaTimeline draft={draft} language={language} fonts={fonts} />;
      case "venue":
        return <ShahiDarwazaVenue draft={draft} language={language} fonts={fonts} />;
      case "countdown":
        return <ShahiDarwazaCountdown draft={draft} language={language} fonts={fonts} />;
      case "contact":
        return hasContacts(draft) ? (
          <ContactSection draft={draft} theme={cardTheme} minHeight="0px" pad={PAD} language={language} />
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

        <ShahiDarwazaPetals pagewide={pagewide} band={band} />

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
          {inOrder(config.blocks).map((block) => {
            const drawn = section(block);

            return drawn === null ? null : (
              <div
                key={block.kind === "custom" ? block.section.id : block.id}
                data-sd-block={block.kind === "custom" ? "custom" : block.id}
                className={styles.block}
              >
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
