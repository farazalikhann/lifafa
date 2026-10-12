import type { ReactElement, ReactNode } from "react";
import styles from "@/templates/emerald-shahi/emerald.module.css";

/**
 * The paper the reply form is on: ivory, under a thin emerald rule, with the
 * parchment's gold ornament in each corner.
 *
 * ONLY THE PAPER. What is on it is the card's own reply form, or its
 * confirmation and the guest's pass, handed in as they are: every field, every
 * check and every message is the shared one. They are given the ivory theme
 * (`paperTheme` in shared.ts) by the page, which is what sets them in emerald
 * ink.
 *
 * The panel is CSS and takes whatever height the form comes to; see `.paper`
 * in the stylesheet for how the four corners are cut from the one picture and
 * never stretched. The form is kept below the top pair and above the bottom
 * pair by the padding here, which is as deep as an ornament is tall where it
 * comes in from the side.
 */
export default function EmeraldShahiRsvpFrame({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    <div className="mx-auto w-full max-w-[30rem] px-4 py-[2.5rem]">
      <div className={styles.paper}>
        <span aria-hidden="true" className={styles.paperRule} />
        <span aria-hidden="true" className={`${styles.paperCorner} ${styles.paperCornerTL}`} />
        <span aria-hidden="true" className={`${styles.paperCorner} ${styles.paperCornerTR}`} />
        <span aria-hidden="true" className={`${styles.paperCorner} ${styles.paperCornerBL}`} />
        <span aria-hidden="true" className={`${styles.paperCorner} ${styles.paperCornerBR}`} />
        <div className="relative px-[4cqw] py-[24cqw]">{children}</div>
      </div>
    </div>
  );
}
