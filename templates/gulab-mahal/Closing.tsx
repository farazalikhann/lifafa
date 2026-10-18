"use client";

import type { CSSProperties, ReactElement } from "react";
import { coverNameLine, resolveCoverNames } from "@/lib/cardFormat";
import { cardCopy, cardLanguage } from "@/lib/cardLanguage";
import { ART, BOX_ASPECT, GIFT, PETAL_ASPECT } from "@/templates/gulab-mahal/art";
import { Foil, Shadow } from "@/templates/gulab-mahal/Decor";
import styles from "@/templates/gulab-mahal/gulab.module.css";
import GulabPage from "@/templates/gulab-mahal/Page";
import { gulabCopy, gulabFonts, scriptLeading } from "@/templates/gulab-mahal/shared";
import type { CardConfig } from "@/types/card";
import type { EventDraft } from "@/types/event";

const pc = (share: number): string => `${(share * 100).toFixed(2)}%`;

/*
  The petals that rise from the box as it opens and fall away: a written
  table, twelve, the last four left out under 400px by the stylesheet. Where
  across the opening each starts, how far it rises and drifts, its turn, its
  size (a share of the box's width) and when it goes.
*/
const RAIN: readonly { petal: number; x: number; rise: number; drift: number; turn: number; size: number; delay: number }[] = [
  { petal: 0, x: 0.42, rise: 0.42, drift: -0.3, turn: 220, size: 0.07, delay: 0 },
  { petal: 2, x: 0.56, rise: 0.5, drift: 0.26, turn: -260, size: 0.085, delay: 140 },
  { petal: 1, x: 0.34, rise: 0.36, drift: -0.42, turn: 300, size: 0.075, delay: 300 },
  { petal: 3, x: 0.64, rise: 0.46, drift: 0.38, turn: -200, size: 0.08, delay: 420 },
  { petal: 0, x: 0.5, rise: 0.58, drift: 0.06, turn: 240, size: 0.065, delay: 560 },
  { petal: 1, x: 0.3, rise: 0.4, drift: -0.2, turn: -320, size: 0.075, delay: 720 },
  { petal: 2, x: 0.7, rise: 0.34, drift: 0.46, turn: 280, size: 0.085, delay: 860 },
  { petal: 3, x: 0.46, rise: 0.52, drift: -0.12, turn: -240, size: 0.08, delay: 1000 },
  /* The four a narrow phone goes without. */
  { petal: 0, x: 0.6, rise: 0.44, drift: 0.18, turn: 200, size: 0.065, delay: 1140 },
  { petal: 1, x: 0.38, rise: 0.48, drift: -0.34, turn: -280, size: 0.07, delay: 1280 },
  { petal: 2, x: 0.54, rise: 0.38, drift: 0.32, turn: 260, size: 0.08, delay: 1400 },
  { petal: 3, x: 0.44, rise: 0.5, drift: -0.26, turn: -220, size: 0.075, delay: 1520 },
];

/**
 * Page 9: thank you, with a gift.
 *
 * A closed box on the velvet, on its own soft shadow: the open box, its lid
 * and its bow, three pictures laid together (GIFT in art.ts). Above it,
 * "Thank you" in rose-gold foil with the light across it, the card's own
 * thank-you line and the couple, in ivory.
 *
 * WHEN THE PAGE ARRIVES, ONCE A VISIT: the bow loosens and is gone, the lid
 * lifts and tips off to one side, and petals rise out of the opening and fall
 * away for about three seconds, then stop. All of it stylesheet animations of
 * transform and opacity, started by the page's own entrance (the pager marks
 * it once). Under reduced motion the box is open from the start and nothing
 * falls.
 *
 * The other gift box picture, with a card standing in it, is not used.
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
  const own = gulabCopy(language);
  const thanks = own.pages.thanks;

  return (
    <GulabPage
      label={thanks}
      className={`${styles.palette} ${styles.thanksPage}`}
      variant={7}
      images={[ART.box, ART.lid, ART.bow, ART.shadow.box]}
    >
      <div className={styles.thanksWords}>
        <h2
          className={`${styles.script} ${styles.lineUp} ${styles.thanksHeading}`}
          style={{ ...fonts.names, lineHeight: scriptLeading(language), "--gm-delay": "200ms" } as CSSProperties}
        >
          <Foil text={thanks} light />
        </h2>
        <p
          className={`${styles.onVelvet} ${styles.lineUp} ${styles.thanksLine} text-balance`}
          style={{ ...fonts.italic(language), "--gm-delay": "380ms" } as CSSProperties}
        >
          {cardCopy(language).thankYou}
        </p>
        {names.kind === "line" && names.isPlaceholder ? null : (
          <p
            className={`${styles.onVelvet} ${styles.lineUp} ${styles.thanksNames} text-balance`}
            style={{ ...fonts.heading, "--gm-delay": "520ms" } as CSSProperties}
          >
            {coverNameLine(names)}
          </p>
        )}
      </div>

      <div className={`${styles.gift} ${styles.rise}`} style={{ "--box-aspect": String(BOX_ASPECT) } as CSSProperties}>
        <div className={styles.giftBox}>
          <Shadow src={ART.shadow.box} aspect={BOX_ASPECT} drop={0.03} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ART.box} alt="" loading="lazy" decoding="async" draggable={false} className={styles.giftArt} />

          {/* The petals, waiting in the opening. */}
          <div aria-hidden="true" className={styles.giftRain}>
            {RAIN.map((drop, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={index}
                src={ART.petals[drop.petal]}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
                className={`${styles.giftPetal} ${index >= 8 ? styles.giftPetalExtra : ""}`}
                style={
                  {
                    left: pc(drop.x),
                    top: pc(GIFT.openingY * BOX_ASPECT),
                    width: pc(drop.size),
                    aspectRatio: String(PETAL_ASPECT[drop.petal]),
                    /* In box widths: up out of the opening, out to a side, and down past the box's foot. */
                    "--rise": `${(-drop.rise * 100).toFixed(1)}cqw`,
                    "--drift": `${(drop.drift * 100).toFixed(1)}cqw`,
                    "--fall": "70cqw",
                    "--turn": `${drop.turn}deg`,
                    "--gm-delay": `${1000 + drop.delay}ms`,
                  } as CSSProperties
                }
              />
            ))}
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ART.lid}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className={styles.giftLid}
            style={{ top: pc(GIFT.lidTop * BOX_ASPECT), height: pc(GIFT.lidHeight * BOX_ASPECT) }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ART.bow}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className={styles.giftBow}
            style={{ top: pc(GIFT.bowTop * BOX_ASPECT), width: pc(GIFT.bowWidth), left: pc((1 - GIFT.bowWidth) / 2) }}
          />
        </div>
      </div>
    </GulabPage>
  );
}
