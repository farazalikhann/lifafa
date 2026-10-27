"use client";

import type { CSSProperties, ReactElement } from "react";
import MusicToggle from "@/components/card/MusicToggle";
import { ScratchRevealProvider } from "@/components/card/ScratchReveal";
import { cardLanguage } from "@/lib/cardLanguage";
import { effectiveTheme } from "@/lib/cardTheme";
import DakGharNames from "@/templates/dak-ghar/Names";
import styles from "@/templates/dak-ghar/dak.module.css";
import type { TemplateCardProps } from "@/templates/types";
import type { CardBlock } from "@/types/customSection";

/* The editor's preview frame, where a caller names no height of its own. */
const FRAME_HEIGHT = 620;

/**
 * Dak Ghar's card: every section in the post office's own dress, in the
 * host's order (`config.blocks`).
 *
 * THE PRESENTATION IS ITS OWN, THE LOGIC IS THE CARD'S. Each section reads
 * the event through the same functions the shared card does, and a block
 * that is switched off, or has nothing to say, is left out by the same tests.
 */
export default function DakGharCard(props: TemplateCardProps): ReactElement {
  const { draft, theme, config, sizing, invite, ground = "card", frameHeight = FRAME_HEIGHT } = props;

  const language = cardLanguage(config.language);
  const cardTheme = effectiveTheme(theme, config.style);
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
    if (block.kind === "custom" || !block.enabled) {
      return null;
    }

    switch (block.id) {
      case "cover":
        return <DakGharNames draft={draft} config={config} language={language} minHeight={screen} />;
      default:
        return null;
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

        {musicUrl !== null ? (
          <div className="pointer-events-none sticky top-3 z-20 mx-auto h-0 w-full max-w-[28rem]">
            <MusicToggle musicUrl={musicUrl} accent={cardTheme.accent} surface={cardTheme.surface} language={language} />
          </div>
        ) : null}

        <div className="lifafa-card-content relative z-10">
          {config.blocks.map((block) => {
            const drawn = section(block);
            return drawn === null ? null : (
              <div key={block.kind === "custom" ? block.section.id : block.id}>{drawn}</div>
            );
          })}
        </div>
      </div>
    </ScratchRevealProvider>
  );
}
