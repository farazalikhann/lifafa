import type { ReactElement, ReactNode, Ref } from "react";
import styles from "@/templates/sheesh-mahal/sheesh.module.css";

/**
 * The farmaan, pages 7 and 8: a royal scroll that unrolls, and rolls up.
 *
 * A THREE-SLICE IN THREE PARTS (NOTES.md, FARMAAN in art.ts). The top rod is
 * the picture's top 19%, at its own size, and never moves. Under it is a
 * window that clips, and in the window the paper: the picture's plain middle
 * stretched to the words, then its foot (the bottom rod) at its own size.
 * Never stretched sideways; the words keep to 20% to 80% across.
 *
 * ROLLED UP, the paper is moved up into the window's top by its own height
 * less its foot, so only the two rods show, touching; unrolled, it is where
 * it lies. The words inside it are moved down by exactly as much, so they
 * never move on the screen and the paper, which clips them, uncovers them
 * from the top as it comes down (Gulab Mahal's scroll). One transform on
 * each, and the paper's height is its words' own, so the same percentages
 * hold whatever is written: the stylesheet's `.fmShut` and `.fmOpen`, or a
 * send's own animation (RsvpFrame) of the same two transforms.
 *
 * Rolled or not, it takes the same room on the page: nothing moves around it.
 */
export default function Farmaan({
  open,
  className = "",
  bodyRef,
  wordsRef,
  children,
}: {
  /** Unrolled; or rolled up, or unrolling (the stylesheet's transition) when this becomes true. */
  open: boolean;
  className?: string;
  bodyRef?: Ref<HTMLDivElement>;
  wordsRef?: Ref<HTMLDivElement>;
  children: ReactNode;
}): ReactElement {
  return (
    <div className={`${styles.fm} ${open ? styles.fmOpen : styles.fmShut} ${className}`}>
      <div aria-hidden="true" className={styles.fmRod} />
      <div className={styles.fmWindow}>
        <div ref={bodyRef} className={styles.fmBody}>
          <div aria-hidden="true" className={styles.fmPaper} />
          <div ref={wordsRef} className={styles.fmWords}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
