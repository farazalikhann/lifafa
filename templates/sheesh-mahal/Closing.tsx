"use client";

import type { CSSProperties, ReactElement } from "react";
import { coverNameLine, resolveCoverNames } from "@/lib/cardFormat";
import { cardCopy, cardLanguage } from "@/lib/cardLanguage";
import { ART } from "@/templates/sheesh-mahal/art";
import Foil from "@/templates/sheesh-mahal/Foil";
import SheeshPage from "@/templates/sheesh-mahal/Page";
import styles from "@/templates/sheesh-mahal/sheesh.module.css";
import { scriptLeading, sheeshCopy, sheeshFonts } from "@/templates/sheesh-mahal/shared";
import type { CardConfig } from "@/types/card";
import type { EventDraft } from "@/types/event";

/**
 * Page 9: thank you, under a kandeel on the night.
 *
 * The lantern floats gently over "Thank you" in gold foil, the card's own
 * thank-you line and the couple. (Its flight is for a part to come.)
 */
export default function SheeshClosing({
  draft,
  config,
}: {
  draft: EventDraft;
  config: CardConfig;
}): ReactElement {
  const language = cardLanguage(config.language);
  const fonts = sheeshFonts(config.style.fontPairId);
  const names = resolveCoverNames(draft, config.occasionId, language);
  const thanks = sheeshCopy(language).pages.thanks;

  return (
    <SheeshPage label={thanks} images={[ART.kandeel]} className={styles.palette}>
      <div className={styles.kandeel}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ART.kandeel} alt="" loading="lazy" decoding="async" draggable={false} />
      </div>

      <div className={styles.thanksWords}>
        <h2
          className={`${styles.thanksHeading} ${styles.lineUp}`}
          style={{ ...fonts.names, lineHeight: scriptLeading(language), "--sm-delay": "150ms" } as CSSProperties}
        >
          <Foil text={thanks} />
        </h2>
        <p
          className={`${styles.thanksLine} ${styles.onNight} ${styles.lineUp} text-balance`}
          style={{ ...fonts.body, "--sm-delay": "320ms" } as CSSProperties}
        >
          {cardCopy(language).thankYou}
        </p>
        {names.kind === "line" && names.isPlaceholder ? null : (
          <p
            className={`${styles.thanksNames} ${styles.lineUp} text-balance`}
            style={{ ...fonts.heading, "--sm-delay": "460ms" } as CSSProperties}
          >
            {coverNameLine(names)}
          </p>
        )}
      </div>
    </SheeshPage>
  );
}
