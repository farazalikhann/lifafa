"use client";

import type { ReactElement, ReactNode } from "react";
import { useCoverReady } from "@/hooks/useCoverOpen";
import styles from "@/templates/shahi-darwaza/darwaza.module.css";

/**
 * The paper the reply form is on: ivory, inside a thin gold rule, with a
 * rose in its top corner.
 *
 * ONLY THE PAPER. What is on it is the card's own reply form, or its
 * confirmation and the guest's pass, handed in as they are: every field,
 * every check and every message is the shared one. They are given the ivory
 * theme (`paperTheme` in shared.ts) by the page, which sets them in maroon
 * ink. The panel takes whatever height the form comes to.
 */
export default function ShahiDarwazaRsvpFrame({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  /* The paper and the rose wait for the cover to be drawn: `.artLater`. */
  const coverReady = useCoverReady();

  return (
    <div className={`mx-auto w-full max-w-[30rem] px-4 py-10 ${coverReady ? "" : styles.artLater}`}>
      <div className={styles.paper}>
        <span aria-hidden="true" className={styles.paperRose} />
        <div className="relative px-3 pt-10 pb-8">{children}</div>
      </div>
    </div>
  );
}
