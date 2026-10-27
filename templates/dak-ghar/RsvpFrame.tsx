"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import { preload } from "react-dom";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { ART } from "@/templates/dak-ghar/art";
import styles from "@/templates/dak-ghar/dak.module.css";
import type { CardLanguage } from "@/types/card";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

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
 * (`stage`), which only a reply that landed does, a pigeon carrying a sealed
 * letter takes off from the card's corner and flies away, once, by a single
 * transform and opacity animation, and is then taken out. A guest who comes
 * back already replied, or who asked for less motion, sees no flight.
 */
export default function DakGharRsvpFrame({
  children,
  stage = "form",
}: {
  children: ReactNode;
  stage?: "form" | "confirmed";
  language?: CardLanguage;
}): ReactElement {
  /* Ready before anything is sent, so the flight never waits on it. */
  preload(ART.pigeonReply, { as: "image" });

  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const [seen, setSeen] = useState(stage);
  const [flying, setFlying] = useState(false);

  /* The form has just become the confirmation: the reply is on its way. */
  if (stage !== seen) {
    setSeen(stage);
    setFlying(stage === "confirmed" && !reducedMotion);
  }

  return (
    <div className="relative mx-auto w-full max-w-[30rem] px-4 py-10">
      <div className={styles.replyCard}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ART.garland} alt="" aria-hidden="true" draggable={false} className={styles.replyGarland} />
        <div className="relative px-5 pt-14 pb-8">{children}</div>
      </div>

      {flying ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={ART.pigeonReply}
          alt=""
          aria-hidden="true"
          draggable={false}
          className={styles.replyPigeon}
          onAnimationEnd={() => setFlying(false)}
        />
      ) : null}
    </div>
  );
}
