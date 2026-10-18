import type { ReactElement } from "react";
import styles from "@/templates/sheesh-mahal/sheesh.module.css";

/**
 * Words in antique gold foil: a still gradient from champagne to deep gold,
 * and a soft band of light that crosses them once when their page arrives and
 * every eight seconds after (Emerald Shahi's light, see the stylesheet).
 *
 * The light is the words set again in pale ivory, seen through a narrow
 * slanted window: the window slides across by a transform while the copy
 * inside slides back by the same, so the copy stays on the words and only the
 * band shows. Under them, the words once more, unseen, casting a soft dark
 * shadow on the night. Both copies are hidden from screen readers.
 */
export default function Foil({ text }: { text: string }): ReactElement {
  return (
    <span className={styles.foil}>
      <span aria-hidden="true" className={styles.foilShade}>
        {text}
      </span>
      <span className={styles.foilFill}>{text}</span>
      <span aria-hidden="true" className={styles.shimmerClip}>
        <span className={styles.shimmer}>
          <span className={styles.shimmerCopy}>{text}</span>
        </span>
      </span>
    </span>
  );
}
