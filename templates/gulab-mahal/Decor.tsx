import type { CSSProperties, ReactElement } from "react";
import { ART, shadowBox } from "@/templates/gulab-mahal/art";
import styles from "@/templates/gulab-mahal/gulab.module.css";

/**
 * A name in rose-gold foil: a still gradient from deep rose gold to light
 * champagne, and a soft band of light that crosses it once when its page
 * arrives and every eight seconds after.
 *
 * The light is the name set again in pale champagne, seen through a narrow
 * slanted window: the window slides across by a transform while the copy
 * inside slides back by the same, so the copy stays on the name and only the
 * band in the window shows (as Emerald Shahi's names do). Held while its page
 * is off the screen, and not played under reduced motion. The copy is hidden
 * from screen readers, which read the name once.
 */
export function Foil({ text }: { text: string }): ReactElement {
  return (
    <span className={styles.foil}>
      <span className={styles.foilFill}>{text}</span>
      <span aria-hidden="true" className={styles.shimmerClip}>
        <span className={styles.shimmer}>
          <span className={styles.shimmerCopy}>{text}</span>
        </span>
      </span>
    </span>
  );
}

/**
 * Two rose corners on an object's edges, the top right and, turned round, the
 * bottom left, each tucked a little over the object's corner: `size` is their
 * width as a share of the object's, and they keep to its corners, clear of
 * anything written on it. The parent is the object's own box.
 */
export function Corners({
  size = 0.3,
  which = "both",
  className = "",
}: {
  size?: number;
  /** Both, or one of them, for an object whose two corners are on parts that move apart (the scroll's rolls). */
  which?: "both" | "top" | "foot";
  className?: string;
}): ReactElement {
  const width = `${(size * 100).toFixed(1)}%`;
  const corner = (place: string): ReactElement => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ART.corner}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      draggable={false}
      className={`${styles.objCorner} ${place} ${className}`}
      style={{ width } as CSSProperties}
    />
  );

  return (
    <>
      {which !== "foot" ? corner(styles.objCornerTop) : null}
      {which !== "top" ? corner(styles.objCornerFoot) : null}
    </>
  );
}

/** An object's soft shadow, under it in its own box and moving with it. See shadowBox. */
export function Shadow({
  src,
  aspect,
  drop,
  className = "",
  style,
}: {
  src: string;
  /** The object's width over its height. */
  aspect: number;
  drop?: number;
  className?: string;
  style?: CSSProperties;
}): ReactElement {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      draggable={false}
      className={`${styles.objShadow} ${className}`}
      style={{ ...shadowBox(aspect, drop), ...style }}
    />
  );
}
