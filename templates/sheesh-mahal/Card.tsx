"use client";

import { useRef, type CSSProperties, type ReactElement } from "react";
import MusicToggle from "@/components/card/MusicToggle";
import { ScratchRevealProvider } from "@/components/card/ScratchReveal";
import { cardLanguage } from "@/lib/cardLanguage";
import {
  hasCountdown,
  hasCustomContent,
  hasFamily,
  hasMessage,
} from "@/lib/cardSections";
import { effectiveTheme } from "@/lib/cardTheme";
import { hasContacts } from "@/lib/contacts";
import { useCardStill } from "@/hooks/useCardStill";
import { ART } from "@/templates/sheesh-mahal/art";
import SheeshClosing from "@/templates/sheesh-mahal/Closing";
import { useLite } from "@/templates/sheesh-mahal/lite";
import SheeshNamesPage from "@/templates/sheesh-mahal/NamesPage";
import SheeshPager from "@/templates/sheesh-mahal/Pager";
import SheeshRoomPage from "@/templates/sheesh-mahal/RoomPage";
import styles from "@/templates/sheesh-mahal/sheesh.module.css";
import { INDIGO, sheeshCopy, sheeshFonts } from "@/templates/sheesh-mahal/shared";
import { SCREEN_VAR, useStableScreen } from "@/templates/sheesh-mahal/stableScreen";
import type { TemplateCardProps } from "@/templates/types";
import type { CardSectionId } from "@/types/card";

/* The editor's preview frame, where a caller names no height of its own. */
const FRAME_HEIGHT = 620;

/*
  Nothing may ever show black behind the card: going fullscreen, the browser
  draws the page's root, and a fullscreen element's backdrop is black unless
  told otherwise. Both in the night's own indigo, on the guest's page only.
*/
const NIGHT_BEHIND = `html:fullscreen,:fullscreen::backdrop,html::backdrop{background-color:${INDIGO}}`;

/**
 * Sheesh Mahal's card: a night palace of mirrors, walked through room by
 * room, one swipe each.
 *
 * THE PRESENTATION IS ITS OWN, THE LOGIC IS THE CARD'S. Each page reads the
 * event through the same functions the shared card does, and the same tests
 * decide what a card contains: a section switched off in `config.blocks`, or
 * one with nothing to say, is not a room.
 *
 * THE ORDER IS THE TEMPLATE'S:
 *
 *   1  the opening      the doors of mirrors: the cover, Cover.tsx
 *   2  the names        in the hall of mirrors, NamesPage.tsx
 *   3  the date         through the jharokha, under the moon
 *   4  the couple       two jharokhas
 *   5  the functions    down the hall
 *   6  the venue        the jharokha again
 *   7  the details      on a farmaan; only if any
 *   8  the reply        drawn by the guest's page, on a farmaan (RsvpFrame)
 *   9  the thanks       under a kandeel, after the reply (Closing), or here
 *                       in a preview, which has no reply form
 *
 * Pages 3 to 7 are their rooms and headings for now (RoomPage), so the walk
 * through all nine can be seen; what they say is built in the parts to come.
 *
 * Takes exactly what CardCanvas takes (see TemplateCardProps), because the
 * same callers place it: the guest's page, the two previews and the printed
 * copy, which gets every room as it rests.
 */
export default function SheeshMahalCard(props: TemplateCardProps): ReactElement {
  const {
    draft,
    theme,
    config,
    sizing,
    invite,
    ground = "card",
    closingNote,
    frameHeight = FRAME_HEIGHT,
  } = props;

  const rootRef = useRef<HTMLDivElement>(null);
  const still = useCardStill();
  const language = cardLanguage(config.language);
  const cardTheme = effectiveTheme(theme, config.style);
  const fonts = sheeshFonts(config.style.fontPairId);
  const own = sheeshCopy(language);
  const { occasionId } = config;

  /*
    A page is the screen with the browser's bars away, measured once and held
    (useStableScreen), so no page ever changes height while the guest
    scrolls. `--sm-bars` is what the bars take while they show, for what sits
    at a page's foot.
  */
  const screen = sizing === "viewport" ? `var(${SCREEN_VAR}, 100lvh)` : `${frameHeight}px`;
  const bars = sizing === "viewport" ? "calc(100lvh - 100svh)" : "0px";
  const lite = useLite();
  const band = sizing === "viewport" ? "100dvh" : `${frameHeight}px`;
  const musicUrl = config.musicUrl ?? null;
  /*
    On the guest's page the night is fixed under the whole page, the
    document is what pages and every room is fixed over the screen. Anywhere
    else the card is in a box that scrolls: the night is pinned to the top of
    that box instead, and each room goes by in its own page (`.boxed`).
  */
  const pagewide = ground === "page";
  useStableScreen(sizing === "viewport" && !still);

  const on = (id: CardSectionId): boolean =>
    config.blocks.some((block) => block.kind !== "custom" && block.id === id && block.enabled);

  const hasCustom = config.blocks.some(
    (block) => block.kind === "custom" && hasCustomContent(block.section),
  );
  const hasDetails =
    (on("contact") && hasContacts(draft)) || hasCustom || (on("message") && hasMessage(draft));

  return (
    <ScratchRevealProvider
      persistKey={invite.url === null ? null : invite.code}
      concealed="none"
    >
      <div
        ref={rootRef}
        lang={language}
        data-sm-root=""
        className={`${styles.palette} ${styles.root} ${still ? styles.still : ""} ${lite ? styles.lite : ""} ${pagewide ? "" : `isolate ${styles.boxed}`}`}
        style={{ "--sm-screen": screen, "--sm-bars": bars } as CSSProperties}
      >
        {pagewide ? <style>{NIGHT_BEHIND}</style> : null}

        <div
          aria-hidden="true"
          className={`${styles.ground} ${pagewide ? styles.groundFixed : styles.groundPinned}`}
          style={pagewide ? undefined : ({ "--sm-band": band } as CSSProperties)}
        />

        <SheeshPager pagewide={pagewide} rootRef={rootRef} />

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

        {/* The rooms, under the name the printed copy looks for. */}
        <div className="lifafa-card-content relative">
          <SheeshNamesPage draft={draft} config={config} language={language} fonts={fonts} />

          {on("details") || (on("countdown") && hasCountdown(draft)) ? (
            <SheeshRoomPage heading={own.pages.date} src={ART.jharokhaMoon} lay="cover" language={language} fonts={fonts} />
          ) : null}

          {on("family") && hasFamily(draft, occasionId) ? (
            <SheeshRoomPage heading={own.pages.couple} src={ART.jharokhaFrame} lay="object" language={language} fonts={fonts} />
          ) : null}

          {on("timeline") ? (
            <SheeshRoomPage
              heading={own.pages.functions}
              src={ART.hall}
              lay="cover"
              /* Further down the hall than page 2, its floor and far arches. */
              framing={{ scale: 1.4, origin: "50% 78%" }}
              language={language}
              fonts={fonts}
            />
          ) : null}

          {on("venue") ? (
            <SheeshRoomPage
              heading={own.pages.venue}
              src={ART.jharokhaMoon}
              lay="cover"
              /* Nearer than page 3, the moon lower, below the heading. */
              framing={{ scale: 1.3, origin: "50% 0%" }}
              language={language}
              fonts={fonts}
            />
          ) : null}

          {hasDetails ? (
            <SheeshRoomPage heading={own.pages.details} src={ART.farmaan} lay="object" language={language} fonts={fonts} />
          ) : null}

          {/* The thanks end the card where nothing follows it; on the guest's page they follow the reply. */}
          {closingNote === "card" ? <SheeshClosing draft={draft} config={config} /> : null}
        </div>
      </div>
    </ScratchRevealProvider>
  );
}
