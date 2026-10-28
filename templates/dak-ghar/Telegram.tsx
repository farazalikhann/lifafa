"use client";

import type { AnimationEvent, ReactElement } from "react";
import { playEffectSound } from "@/lib/effectSound";
import { ART } from "@/templates/dak-ghar/art";
import { PageHeading } from "@/templates/dak-ghar/Paper";
import styles from "@/templates/dak-ghar/dak.module.css";
import { DAK_FONTS, dakCopy, leading } from "@/templates/dak-ghar/shared";
import { SOUND } from "@/templates/dak-ghar/sounds";
import { useReveal } from "@/templates/dak-ghar/useReveal";
import type { CardLanguage } from "@/types/card";

/**
 * The host's note, typed on a telegram slip. The slip is its picture
 * stretched to the words: a short note sits in its own shape, a long one
 * makes it taller, and the words stay inside its ruled panel.
 *
 * The heading fades up as the page comes on screen; the slip waits until it
 * is well up the screen, then is thrown onto the table in one piece as the
 * letter is (`.thrown`), and its words fade in after it has landed.
 *
 * Its whoosh is started by the animation itself (animationstart), whose
 * first 60ms are still, so the sound leads the movement by that much however
 * long the frame that starts it takes: this page comes into view among many
 * pictures, and a sound started from React's commit ran a quarter second
 * ahead.
 */
export default function DakGharTelegram({ message, language }: { message: string; language: CardLanguage }): ReactElement {
  const { ref, shown } = useReveal<HTMLElement>();
  const slip = useReveal<HTMLDivElement>("-30%");

  const onThrown = (event: AnimationEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget && event.animationName.includes("throw-slip")) {
      playEffectSound(SOUND.whoosh);
    }
  };

  return (
    <section ref={ref} className={styles.page}>
      <div className="flex w-full flex-col items-center gap-6">
        <div className={`${styles.reveal} ${shown ? styles.shown : ""}`}>
          <PageHeading>{dakCopy(language).telegram}</PageHeading>
        </div>
        {/* Observed unmoved, so the slip's own starting place below does not delay it. */}
        <div ref={slip.ref} className="flex w-full justify-center">
          <div
            className={`${styles.telegram} ${styles.thrown} ${slip.shown ? styles.shown : ""}`}
            style={{ backgroundImage: `url(${ART.telegram})` }}
            onAnimationStart={onThrown}
          >
            <p
              className={`${styles.thrownWords} max-w-full text-base whitespace-pre-line wrap-anywhere text-pretty`}
              style={{ ...DAK_FONTS.sans, fontWeight: 500, color: "var(--dg-ink)", lineHeight: leading(language, 1.65) }}
            >
              {message}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
