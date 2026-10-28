"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import { ART } from "@/templates/dak-ghar/art";
import styles from "@/templates/dak-ghar/dak.module.css";
import { useTabHidden } from "@/templates/dak-ghar/useTabHidden";

/* Four, the last two left off under 400px (see `.drift` in the stylesheet). */
const ENVELOPES = [0, 1, 2, 3];

/**
 * Airmail envelopes drifting slowly across the paper behind the whole card,
 * inside its ground (Card.tsx), so they are seen between every section all
 * the way down: four at different sizes, speeds and small turns, two under
 * 400px, faint, and never in the way of a tap.
 *
 * CSS animations only (transform and opacity, `.drift` in the stylesheet),
 * each planned from the start with a negative delay so they are already
 * spread across the page. They fade in once `active` (the cover has let the
 * card go), and hold still while they are off screen (the editor's preview
 * scrolled away) or the tab is hidden. Hidden altogether under reduced motion.
 */
export default function Drift({ active }: { active: boolean }): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const hidden = useTabHidden();
  const [onScreen, setOnScreen] = useState(true);

  useEffect(() => {
    const element = ref.current;

    if (element === null || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      setOnScreen(entries.some((entry) => entry.isIntersecting));
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const paused = hidden || !onScreen || !active;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`${styles.driftLayer} ${active ? styles.driftOn : ""} ${paused ? styles.driftPaused : ""}`}
    >
      {ENVELOPES.map((index) => (
        <span key={index} className={styles.drift} data-drift={index}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ART.airmail} alt="" width={240} height={186} draggable={false} className={styles.driftArt} />
        </span>
      ))}
    </div>
  );
}
