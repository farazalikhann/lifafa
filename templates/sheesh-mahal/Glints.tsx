"use client";

import { useEffect, useRef, type CSSProperties, type ReactElement } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { Glint } from "@/templates/sheesh-mahal/art";
import { useLite } from "@/templates/sheesh-mahal/lite";
import styles from "@/templates/sheesh-mahal/sheesh.module.css";
import { watchTilt } from "@/templates/sheesh-mahal/tilt";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/* Which way each group faces, for the tilt that brightens it: left, right, above, below. */
const FACING: readonly (readonly [number, number])[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
/* Each group's brightness at rest. */
const REST = 0.85;

const pc = (share: number): string => `${(share * 100).toFixed(2)}%`;

/**
 * Glints on the mirror-work: small stars of light that answer the phone's
 * tilt, the signature of the card. On the cover's wall and on page 2's hall.
 *
 * EACH ONE TWINKLES BY ITSELF, slowly, a stylesheet animation of transform
 * and opacity at its own pace (held off screen by the pager, and not at all
 * under reduced motion). With a tilt to follow (see tilt.ts), the glints
 * facing the way the phone leans brighten while the others dim: one opacity
 * on each of four groups, eased by the stylesheet, at most ten times a
 * second. THE TILT NEVER MOVES ANYTHING: a hand swiping moves the phone, and
 * a layer that followed it would shake. No glint is ever styled one by one.
 *
 * A modest phone (useLite) shows every other glint.
 *
 * Never inside a box that scales: on page 2 the layer is held over the room,
 * not in it (see SheeshPage's `overlay`), so a zoom never redraws it.
 *
 * `flashes` gives each glint a second, warmer star at 1%, for the cover's
 * ripple of light to play (Cover.tsx finds them by `data-flash`).
 *
 * The layer takes no taps.
 */
export default function Glints({
  glints,
  listen,
  followPage = false,
  flashes = false,
  className = "",
}: {
  glints: readonly Glint[];
  /** Whether to follow the tilt now. */
  listen: boolean;
  /** Follow the tilt only while the page this is on is the one being read. */
  followPage?: boolean;
  flashes?: boolean;
  className?: string;
}): ReactElement {
  const layerRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef<(HTMLDivElement | null)[]>([]);
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const lite = useLite();

  useEffect(() => {
    const layer = layerRef.current;

    if (layer === null || !listen || reducedMotion) {
      return;
    }

    const groups = groupRefs.current;
    const shown: number[] = FACING.map(() => REST);
    const apply = (x: number, y: number): void => {
      FACING.forEach(([fx, fy], index) => {
        const group = groups[index];
        const opacity = Math.max(0.2, Math.min(1, REST + (x * fx + y * fy) * 0.6));

        /* Only a change that can be seen is written. */
        if (group !== null && group !== undefined && Math.abs(opacity - shown[index]) >= 0.01) {
          shown[index] = opacity;
          group.style.opacity = opacity.toFixed(2);
        }
      });
    };

    let stop: (() => void) | null = null;
    const start = (): void => {
      stop ??= watchTilt(apply);
    };
    const end = (): void => {
      if (stop === null) {
        return;
      }

      stop();
      stop = null;
      /* Back to rest, eased, for the next time it is looked at. */
      apply(0, 0);
    };

    if (!followPage) {
      start();
      return end;
    }

    /* On a page: only while the pager calls it the page being read. */
    const page = layer.closest<HTMLElement>("[data-sm-page]");

    if (page === null) {
      return;
    }

    const check = (): void => {
      if (page.hasAttribute("data-sm-current")) {
        start();
      } else {
        end();
      }
    };

    check();
    const observer = new MutationObserver(check);
    observer.observe(page, { attributes: true, attributeFilter: ["data-sm-current"] });

    return () => {
      observer.disconnect();
      end();
    };
  }, [listen, followPage, reducedMotion]);

  return (
    <div ref={layerRef} data-glints="" aria-hidden="true" className={`${styles.glints} ${className}`}>
      {FACING.map((_, group) => (
        <div
          key={group}
          ref={(element) => {
            groupRefs.current[group] = element;
          }}
          className={styles.glintGroup}
        >
          {glints.map((glint, index) =>
            glint.group === group && !(lite && index % 2 === 1) ? (
              <span
                key={index}
                data-glint={index}
                className={`${styles.glintPlace} ${glint.core ? "" : styles.glintExtra}`}
                style={
                  {
                    left: pc(glint.x),
                    top: pc(glint.y),
                    width: pc(glint.size),
                  } as CSSProperties
                }
              >
                <span
                  className={styles.glint}
                  style={
                    {
                      "--tw": `${glint.period.toFixed(2)}s`,
                      "--tw-at": `${(-glint.phase * glint.period).toFixed(2)}s`,
                    } as CSSProperties
                  }
                />
                {flashes ? <span data-flash={index} className={styles.glintFlash} /> : null}
              </span>
            ) : null,
          )}
        </div>
      ))}
    </div>
  );
}
