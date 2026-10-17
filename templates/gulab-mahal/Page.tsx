import type { ReactElement, ReactNode } from "react";
import styles from "@/templates/gulab-mahal/gulab.module.css";

/**
 * One of the card's full-screen pages: a stop the guest's swipe lands on.
 *
 * Marked `data-gm-page` for the pager, which finds every page by it (the
 * card's own and the two the guest's page draws after it), plays its entrance
 * and pauses its loops; see Pager.tsx. `images` are the pictures on it, which
 * are fetched and decoded while the guest is on the page before.
 */
export default function GulabPage({
  label,
  images,
  className = "",
  children,
}: {
  /** What the page is, for a screen reader moving page by page. */
  label: string;
  images?: readonly string[];
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
      {children}
    </section>
  );
}
