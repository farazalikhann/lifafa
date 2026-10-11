"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import { useCardStill } from "@/hooks/useCardStill";
import { SCENE_ASPECT, type SceneArt } from "@/lib/scene";

/**
 * The painted scene between a card's first screen and its second: a screen
 * of its own, as wide as the card's column, so inside a flower frame where
 * the card has one.
 *
 * ITS TOP AND BOTTOM FADE INTO THE CARD, by a mask on the box and not in the
 * picture: what shows through is the card's own ground, whatever its colour
 * and with its royal texture where it has one. The mask is on the box that
 * holds still; the picture moves inside it.
 *
 * IT MOVES WITH THE SCROLL, AND ONLY ON THE COMPOSITOR. As the guest scrolls
 * through it the picture grows from its own size to 1.08 of it and drifts up
 * a little: one keyframe animation of transform alone, on a view timeline
 * (`lifafa-scene-art` in globals.css), so no script runs as the page scrolls
 * and nothing is measured. Still under reduced motion, on a card drawn still,
 * and in a browser without view timelines.
 *
 * IT NEVER COMPETES WITH THE COVER OR THE FIRST SCREEN. The picture is on the
 * second screen of a card that is mounted under its cover from the first
 * paint, which is near enough the top for a lazy image to be fetched at once.
 * So it has no address in the page as served: it is given one only when the
 * page has finished loading and the browser is idle, or the guest has
 * scrolled to within a screen of it, whichever is first. The 720px copy on a
 * slow connection or for a guest who asked to save data, the 1080px one
 * otherwise. Its box is the picture's shape from the start, so nothing on
 * the card moves when it arrives; it fades in.
 */

/** Which copy this guest's connection gets. */
function copyFor(art: SceneArt): string {
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string; downlink?: number };
    }
  ).connection;

  if (connection === undefined) {
    return art.src;
  }

  const slow =
    connection.saveData === true ||
    (connection.effectiveType !== undefined && connection.effectiveType !== "4g") ||
    (connection.downlink !== undefined && connection.downlink > 0 && connection.downlink < 1.5);

  return slow ? art.small : art.src;
}

export default function SceneScreen({ art }: { art: SceneArt }): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const still = useCardStill();
  const [src, setSrc] = useState<string | null>(null);
  const [shown, setShown] = useState<boolean>(false);

  /* Keyed on the picture, so a host who picks another in the editor gets it. */
  useEffect(() => {
    let live = true;
    let idle = 0;
    let timer = 0;
    setShown(false);

    const fetchIt = (): void => {
      if (live) {
        setSrc(copyFor(art));
      }
    };

    /* A card drawn still (a sheet of paper, a frame on the home page) is wanted whole, now. */
    if (still) {
      fetchIt();
      return;
    }

    const whenIdle = (): void => {
      if (typeof window.requestIdleCallback === "function") {
        idle = window.requestIdleCallback(fetchIt, { timeout: 2000 });
      } else {
        timer = window.setTimeout(fetchIt, 200);
      }
    };

    if (document.readyState === "complete") {
      whenIdle();
    } else {
      window.addEventListener("load", whenIdle, { once: true });
    }

    /* Or the guest is nearly at it, on a page that is still loading something else. */
    const element = ref.current;
    const observer =
      element !== null && typeof IntersectionObserver === "function"
        ? new IntersectionObserver(
            (entries) => {
              if (entries.some((entry) => entry.isIntersecting)) {
                fetchIt();
              }
            },
            { rootMargin: "100% 0px" },
          )
        : null;

    if (observer !== null && element !== null) {
      observer.observe(element);
    }

    return () => {
      live = false;
      window.removeEventListener("load", whenIdle);
      observer?.disconnect();
      window.clearTimeout(timer);

      if (idle !== 0 && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idle);
      }
    };
  }, [art, still]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="lifafa-scene pointer-events-none relative w-full overflow-hidden"
      style={{ aspectRatio: String(SCENE_ASPECT) }}
    >
      {src !== null ? (
        <img
          key={src}
          src={src}
          alt=""
          decoding="async"
          draggable={false}
          onLoad={() => setShown(true)}
          className={`absolute inset-0 h-full w-full object-cover select-none transition-opacity duration-700 ease-out motion-reduce:transition-none ${
            still ? "" : "lifafa-scene-art"
          }`}
          style={{ opacity: shown || still ? 1 : 0 }}
        />
      ) : null}
    </div>
  );
}
