"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import styles from "./DemoPhone.module.css";

/**
 * How much of the phone has to be on screen before its demo starts.
 *
 * Half, so the visitor sees the story from its first beat rather than arriving
 * in the middle of it. Stopping is a different line — see the observer below.
 */
const START_RATIO = 0.5;

/**
 * The small phone a landing demo plays in.
 *
 * A demo is plain DOM animated by CSS: its own module declares the keyframes,
 * this component supplies the frame and decides when they run. Nothing here
 * sets a style per frame, and nothing re-renders while a demo plays.
 *
 * ONLY WHILE IT IS ON SCREEN. Every animation inside reads its play state from
 * `--demo-play`, which is `paused` unless the phone is marked as playing. The
 * observer starts it once half the phone is showing and stops it only when the
 * last of it has left, so a demo never freezes in front of the visitor as they
 * scroll past. Four loops idling off screen is main-thread and compositor work
 * nobody sees, and on a mid-range phone it lands as stutter in the scroll.
 *
 * FROM THE TOP, EVERY TIME. Leaving the screen remounts the loop under a new
 * key, which puts every animation back at its first frame, paused. The visitor
 * who scrolls back up sees the story start again rather than pick up halfway.
 * The remount happens off screen, on a few dozen nodes.
 *
 * Before the observer has answered — on the server, during hydration, in a
 * browser without JavaScript — the demo sits paused on its first frame, which
 * each demo draws as the start of its story rather than an empty screen.
 *
 * Reduced motion is handled in CSS alone: no animation is declared for it, and
 * every piece's plain style is its final frame. The observer still runs, and
 * toggling a play state that no animation reads costs nothing.
 *
 * Decorative, so the whole thing is hidden from assistive technology; the
 * caption beside it carries the meaning. Nothing inside is focusable.
 */
export default function DemoPhone({
  className,
  beside,
  children,
}: {
  /** The demo's own stage class: its loop length, and its width if it has something beside the phone. */
  className: string;
  /** Anything drawn outside the screen, over the frame, that plays on the same loop. */
  beside?: ReactNode;
  /** What the screen shows. */
  children: ReactNode;
}): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState<boolean>(false);
  const [run, setRun] = useState<number>(0);

  useEffect(() => {
    const element = ref.current;

    if (element === null) {
      return;
    }

    /* No observer to ask: play, rather than sit on the first frame for good. */
    if (typeof IntersectionObserver === "undefined") {
      setPlaying(true);
      return;
    }

    /*
      Tracked here as well as in state, so the callback never reads a stale
      value and never remounts a loop that was not running.
    */
    let isPlaying = false;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            if (isPlaying) {
              isPlaying = false;
              setPlaying(false);
              setRun((count) => count + 1);
            }
          } else if (!isPlaying && entry.intersectionRatio >= START_RATIO) {
            isPlaying = true;
            setPlaying(true);
          }
        }
      },
      { threshold: [0, START_RATIO] },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={ref} aria-hidden="true" className={`${styles.stage} ${className}`}>
      <div
        key={run}
        className={styles.run}
        data-playing={playing ? "" : undefined}
      >
        <div className={styles.bezel}>
          <div className={styles.screen}>
            <div className={styles.scene}>{children}</div>
          </div>
        </div>

        {beside !== undefined ? (
          <div className={styles.scene}>{beside}</div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * A fingertip on the glass: where the visitor should look next.
 *
 * Only the look is shared. When it appears, presses and lifts is the demo's
 * own keyframe, passed in as `className`, and where it sits is wherever the
 * demo places it — inside the thing being tapped, so it follows that thing at
 * every size.
 */
export function Tap({ className }: { className: string }): ReactElement {
  return <span className={`${styles.tap} ${className}`} />;
}
