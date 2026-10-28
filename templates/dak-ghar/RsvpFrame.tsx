"use client";

import { useLayoutEffect, useState, type ReactElement, type ReactNode } from "react";
import { preload } from "react-dom";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { playEffectSound } from "@/lib/effectSound";
import { ART } from "@/templates/dak-ghar/art";
import styles from "@/templates/dak-ghar/dak.module.css";
import { DAK_FONTS, dakCopy, leading } from "@/templates/dak-ghar/shared";
import { SOUND, SOUND_LEAD_MS } from "@/templates/dak-ghar/sounds";
import type { CardLanguage } from "@/types/card";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/*
  The reply's flight, in ms from the confirmation (`.replyPlane` and
  `.replyNote` in the stylesheet):

    0 to 2600     the paper plane comes in from the left on a gentle arc,
                  passes the middle at 1150 and climbs off the top right
    1150 to 2150  the thank-you note falls from it with a slight sway and
                  lands; the thank-you is written on it
    2150 to 3900  it rests there
    3900 to 4500  it lifts a little and fades, and the layer is taken out
*/
const LAND_AT = 2150;

/**
 * The reply card: cream paper inside an airmail border of red and blue
 * stripes, a garland on its top corner.
 *
 * ONLY THE PAPER. What is on it is the card's own reply form, or its
 * confirmation and the guest's pass, handed in as they are, in the reply
 * card's theme (`replyCardTheme` in shared.ts). Nothing about what a reply
 * does is here.
 *
 * SENT: when the page tells it the form has become the confirmation
 * (`stage`), which only a reply that landed does, an airmail paper plane (28)
 * flies in from the left on a gentle arc to dg-plane, and as it passes the
 * middle drops a thank-you note (29) that falls with a slight sway and lands
 * to dg-note-drop, the thank-you written on it in code; the plane climbs off
 * the top right, and the note rests and then fades. Once, by CSS transforms
 * and opacity on a layer fixed to the screen (the confirmation replaces the
 * form, and the card's top is then often above it), which takes no taps and
 * is taken out at the end. A guest who comes back already replied, or who
 * asked for less motion, sees no flight.
 */
export default function DakGharRsvpFrame({
  children,
  stage = "form",
  language = "en",
}: {
  children: ReactNode;
  stage?: "form" | "confirmed";
  language?: CardLanguage;
}): ReactElement {
  /* Ready before anything is sent, so the flight never waits on them. */
  preload(ART.plane, { as: "image", fetchPriority: "low" });
  preload(ART.note, { as: "image", fetchPriority: "low" });

  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const [seen, setSeen] = useState(stage);
  const [flying, setFlying] = useState(false);
  const copy = dakCopy(language);

  /* The form has just become the confirmation: the reply is on its way. */
  if (stage !== seen) {
    setSeen(stage);
    setFlying(stage === "confirmed" && !reducedMotion);
  }

  /* Its two sounds on the audio clock, from the frame the flight starts. */
  useLayoutEffect(() => {
    if (!flying) {
      return;
    }

    const cancels = [playEffectSound(SOUND.plane), playEffectSound(SOUND.noteDrop, LAND_AT - SOUND_LEAD_MS)];

    return () => {
      for (const cancel of cancels) {
        cancel();
      }
    };
  }, [flying]);

  return (
    <div className="relative mx-auto w-full max-w-[30rem] px-4 py-10">
      <div className={styles.replyCard}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ART.garland} alt="" aria-hidden="true" draggable={false} className={styles.replyGarland} />
        <div className="relative px-5 pt-14 pb-8">{children}</div>
      </div>

      {flying ? (
        <div aria-hidden="true" lang={language} className={styles.replyFlight}>
          <div className={styles.replyNoteFall}>
            <div
              className={styles.replyNote}
              onAnimationEnd={(event) => {
                /* Its last animation, the fade (the sway before it ends too). */
                if (event.target === event.currentTarget && event.animationName.includes("note-away")) {
                  setFlying(false);
                }
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ART.note} alt="" width={560} height={448} draggable={false} className="block h-auto w-full select-none" />
              <div className={styles.noteWords}>
                <span className={styles.noteThanks} style={{ ...DAK_FONTS.serif, lineHeight: leading(language, 1.05) }}>
                  {copy.thankYou}
                </span>
                <span className={styles.noteLine} style={{ ...DAK_FONTS.sans, fontWeight: 600, lineHeight: leading(language, 1.3) }}>
                  {copy.replySent}
                </span>
              </div>
            </div>
          </div>
          <div className={styles.replyPlaneX}>
            <div className={styles.replyPlaneY}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ART.plane} alt="" width={280} height={201} draggable={false} className={styles.replyPlane} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
