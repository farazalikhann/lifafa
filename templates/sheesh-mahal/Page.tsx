import type { ReactElement, ReactNode } from "react";
import styles from "@/templates/sheesh-mahal/sheesh.module.css";

/**
 * One of the card's rooms: a page, a stop the guest's swipe lands on.
 *
 * Marked `data-sm-page` for the pager, which finds every page by it (the
 * card's own and the two the guest's page draws after it), marks the one
 * being read, plays its entrance and pauses the loops in its room; see
 * Pager.tsx. `images` are the pictures in it, fetched and decoded while the
 * guest is in the room before.
 *
 * THE PAGE IS ONLY A STOP; THE ROOM STANDS STILL. The page is an empty box a
 * screen tall in the document, which the swipe scrolls and snaps to. Its
 * room is in `.frame`, fixed over the screen, so the scroll never moves it
 * and nothing has to hold it still. `.zoom` inside it is the camera, driven
 * by the page's own view timeline: scale and opacity, nothing else (see the
 * stylesheet). Every room's frame is in the same place, in page order.
 *
 * A `flow` page, one that may be taller than a screen (the reply form), is
 * the exception: its room is in the page itself and scrolls with it, over the
 * room before.
 *
 * `ground` is what the room is painted on, under everything else in it.
 *
 * `overlay` is laid over the room but not in it: a frame of its own, never
 * scaled with the room (so a zoom never redraws it), and seen only while the
 * room is at rest, fading as soon as a swipe begins (`.overlay`). The glints
 * go here. Nothing in it may take a tap or cover a word.
 */
export default function SheeshPage({
  label,
  images,
  ground,
  overlay,
  flow = false,
  className = "",
  children,
}: {
  /** What the page is, for a screen reader moving page by page. */
  label: string;
  images?: readonly string[];
  ground?: ReactNode;
  overlay?: ReactNode;
  flow?: boolean;
  className?: string;
  children: ReactNode;
}): ReactElement {
  const room = (
    <div data-sm-room="" className={`${styles.room} ${flow ? styles.flowRoom : ""}`}>
      {ground}
      {flow ? overlay : null}
      {children}
    </div>
  );

  return (
    <section
      data-sm-page=""
      data-sm-images={images !== undefined && images.length > 0 ? images.join(" ") : undefined}
      aria-label={label}
      className={`${styles.page} ${flow ? styles.pageFlow : ""} ${className}`}
    >
      {flow ? (
        room
      ) : (
        <>
          <div className={styles.frame}>
            <div className={styles.zoom}>{room}</div>
          </div>
          {overlay !== undefined ? (
            <div className={`${styles.frame} ${styles.overlay}`}>{overlay}</div>
          ) : null}
        </>
      )}
    </section>
  );
}
