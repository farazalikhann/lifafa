"use client";

import type { ReactElement } from "react";
import styles from "@/templates/sheesh-mahal/sheesh.module.css";
import { sheeshCopy } from "@/templates/sheesh-mahal/shared";
import type { CardLanguage } from "@/types/card";

/**
 * "Swipe up": a small dark indigo pill with a thin gold edge, at the foot of
 * the page above the browser's bar, its up chevron bobbing and the pill
 * gently pulsing, so a guest cannot miss that the card goes on.
 *
 * On page 2 it comes in as the names' entrance finishes and stays until the
 * guest's first move to another page (the pager marks the card
 * `data-sm-moved`), then fades. It is also a way on for a guest who would
 * rather tap: it takes them to the next room. One who does reaches page 3
 * without having swiped, so page 3 shows a smaller one (`small`) once, until
 * they next move (`data-sm-by-tap`, `data-sm-moved2`).
 *
 * In the room, never over the words; a transform and an opacity, held off
 * the screen with the room's loops.
 */
export default function SwipeHint({
  language,
  small = false,
}: {
  language: CardLanguage;
  small?: boolean;
}): ReactElement {
  const label = sheeshCopy(language).swipeUp;

  return (
    <button
      type="button"
      className={`${styles.hint} ${small ? styles.hintSmall : ""}`}
      onClick={(event) => {
        const pages = [...document.querySelectorAll("[data-sm-page]")];
        const here = event.currentTarget.closest("[data-sm-page]");
        const next = here === null ? undefined : pages[pages.indexOf(here) + 1];

        event.currentTarget.closest("[data-sm-root]")?.setAttribute("data-sm-by-tap", "");
        next?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
    >
      <svg viewBox="0 0 20 12" aria-hidden="true" focusable="false" className={styles.hintChevron}>
        <path d="M2 10 L10 3 L18 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={styles.hintWord}>{label}</span>
    </button>
  );
}
