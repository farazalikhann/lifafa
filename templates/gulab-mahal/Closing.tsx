"use client";

import type { CSSProperties, ReactElement } from "react";
import { coverNameLine, resolveCoverNames } from "@/lib/cardFormat";
import { cardLanguage } from "@/lib/cardLanguage";
import styles from "@/templates/gulab-mahal/gulab.module.css";
import { Corners } from "@/templates/gulab-mahal/Decor";
import GulabPage from "@/templates/gulab-mahal/Page";
import { gulabCopy, gulabFonts } from "@/templates/gulab-mahal/shared";
import type { CardConfig } from "@/types/card";
import type { EventDraft } from "@/types/event";

/**
 * Page 9: the thanks, the last page of the stack. A placeholder for its own
 * drawing: "Thank you" in the script and the couple under it.
 */
export default function GulabClosing({
  draft,
  config,
}: {
  draft: EventDraft;
  config: CardConfig;
}): ReactElement {
  const language = cardLanguage(config.language);
  const fonts = gulabFonts(config.style.fontPairId);
  const names = resolveCoverNames(draft, config.occasionId, language);
  const thanks = gulabCopy(language).pages.thanks;

  return (
    <GulabPage label={thanks} className={styles.palette} variant={7}>
      <div className={`${styles.sheet} ${styles.rise}`}>
        <Corners size={0.26} />
        <h2
          className={styles.script}
          style={{ ...fonts.names, fontSize: "2.75rem", lineHeight: 1.3 }}
        >
          {thanks}
        </h2>
        <span aria-hidden="true" className={styles.divider} style={{ fontSize: "1rem" }}>
          <span className={styles.dividerMark} />
        </span>
        {names.kind === "line" && names.isPlaceholder ? null : (
          <p
            className={`${styles.lineUp} text-balance`}
            style={{ ...fonts.heading, "--gm-delay": "300ms" } as CSSProperties}
          >
            {coverNameLine(names)}
          </p>
        )}
      </div>
    </GulabPage>
  );
}
