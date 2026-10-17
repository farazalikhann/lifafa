import type { CSSProperties, ReactElement, ReactNode } from "react";
import styles from "@/templates/gulab-mahal/gulab.module.css";

/*
  How each page shows the velvet: how far into the picture (its zoom, as a
  share of the page's height), where (the picture's point at the page's
  middle) and whether it is turned over, alternately. The same file every
  time, so it is fetched and decoded once; no two pages are alike.
*/
const VELVET: readonly { zoom: number; x: string; y: string; flip: boolean }[] = [
  { zoom: 1, x: "50%", y: "45%", flip: false },
  { zoom: 1.45, x: "18%", y: "30%", flip: true },
  { zoom: 1.7, x: "82%", y: "72%", flip: false },
  { zoom: 1.3, x: "50%", y: "0%", flip: true },
  { zoom: 1.6, x: "0%", y: "100%", flip: false },
  { zoom: 1.4, x: "100%", y: "38%", flip: true },
  { zoom: 1.2, x: "30%", y: "88%", flip: false },
  { zoom: 1.8, x: "68%", y: "18%", flip: true },
];

/** The velvet as page `variant` shows it, for anything else that must match it (the cover matches page 2). */
export function velvetStyle(variant: number): CSSProperties {
  const look = VELVET[variant % VELVET.length];

  return {
    "--bg-zoom": String(look.zoom),
    "--bg-x": look.x,
    "--bg-y": look.y,
    "--bg-flip": look.flip ? "-1" : "1",
  } as CSSProperties;
}

/**
 * One of the card's full-screen pages: a stop the guest's swipe lands on.
 *
 * Marked `data-gm-page` for the pager, which finds every page by it (the
 * card's own and the two the guest's page draws after it), plays its entrance
 * and pauses its loops; see Pager.tsx. `images` are the pictures on it, which
 * are fetched and decoded while the guest is on the page before.
 *
 * Each page lies on its own piece of the velvet (`variant`), under all of it.
 */
export default function GulabPage({
  label,
  images,
  variant = 0,
  className = "",
  children,
}: {
  /** What the page is, for a screen reader moving page by page. */
  label: string;
  images?: readonly string[];
  /** Which way it shows the velvet; see VELVET. */
  variant?: number;
  className?: string;
  children: ReactNode;
}): ReactElement {
  return (
    <section
      data-gm-page=""
      data-gm-images={images !== undefined && images.length > 0 ? images.join(" ") : undefined}
      aria-label={label}
      className={`${styles.page} ${className}`}
    >
      <span aria-hidden="true" className={styles.pageClip} style={velvetStyle(variant)}>
        <span className={styles.pageVelvet} />
      </span>
      <div className={styles.pageInner}>{children}</div>
    </section>
  );
}
