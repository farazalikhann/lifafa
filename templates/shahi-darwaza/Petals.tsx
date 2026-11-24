"use client";

import { useEffect, useState, type CSSProperties, type ReactElement } from "react";
import { useCoverOpen } from "@/hooks/useCoverOpen";
import styles from "@/templates/shahi-darwaza/darwaza.module.css";

/*
  Twelve petals, eight under 400px (the stylesheet hides the rest). Fixed
  numbers, not random ones, so the server and the browser draw the same: where
  each falls across the screen, how long it takes, how far into its fall it
  starts, how big it is, and how fast it sways.
*/
const PETALS: readonly { x: number; fall: number; start: number; size: number; sway: number; tint: number }[] = [
  { x: 6, fall: 19, start: 2, size: 15, sway: 3.6, tint: 0 },
  { x: 22, fall: 23, start: 11, size: 12, sway: 4.4, tint: 1 },
  { x: 38, fall: 17, start: 6, size: 16, sway: 3.2, tint: 2 },
  { x: 54, fall: 21, start: 15, size: 13, sway: 4.8, tint: 0 },
  { x: 71, fall: 18, start: 3, size: 14, sway: 3.9, tint: 1 },
  { x: 88, fall: 24, start: 9, size: 12, sway: 4.2, tint: 2 },
  { x: 14, fall: 22, start: 17, size: 13, sway: 3.4, tint: 2 },
  { x: 63, fall: 20, start: 13, size: 15, sway: 4.6, tint: 0 },
  { x: 30, fall: 25, start: 20, size: 11, sway: 3.8, tint: 1 },
  { x: 80, fall: 19, start: 7, size: 14, sway: 4.1, tint: 0 },
  { x: 46, fall: 23, start: 1, size: 12, sway: 3.5, tint: 2 },
  { x: 95, fall: 21, start: 18, size: 13, sway: 4.9, tint: 1 },
];

/**
 * Rose petals drifting down behind the card, at most twelve.
 *
 * Behind everything that is read: the layer sits under the card's sections
 * (z-index below them) and takes no taps (pointer-events: none), so a petal
 * never lies over a name, a button or the form. Each petal is three boxes:
 * one falls (translate), one sways and turns (translate and rotate), one is
 * the petal, drawn in CSS. Compositor animations only, paused while the tab
 * is hidden, never started until the cover has gone, and none at all under
 * reduced motion.
 */
export default function ShahiDarwazaPetals({
  pagewide,
  band,
}: {
  pagewide: boolean;
  band: string;
}): ReactElement | null {
  const open = useCoverOpen();
  const [hidden, setHidden] = useState<boolean>(false);

  useEffect(() => {
    const onVisibility = (): void => setHidden(document.visibilityState === "hidden");

    document.addEventListener("visibilitychange", onVisibility);

    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  if (!open) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className={`${styles.petals} ${pagewide ? styles.petalsFixed : styles.petalsPinned} ${hidden ? styles.petalsPaused : ""}`}
      style={pagewide ? undefined : ({ "--sd-band": band } as CSSProperties)}
    >
      {PETALS.map((petal, index) => (
        <span
          key={index}
          className={styles.petalFall}
          style={
            {
              left: `${petal.x}%`,
              animationDuration: `${petal.fall}s`,
              animationDelay: `-${petal.start}s`,
            } as CSSProperties
          }
        >
          <span className={styles.petalSway} style={{ animationDuration: `${petal.sway}s` }}>
            <span
              className={`${styles.petal} ${styles[`petalTint${petal.tint}`]}`}
              style={{ width: `${petal.size}px`, height: `${Math.round(petal.size * 1.25)}px` }}
            />
          </span>
        </span>
      ))}
    </div>
  );
}
