"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from "react";
import { useCardStill } from "@/hooks/useCardStill";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useRevealGate } from "@/hooks/useRevealGate";
import { ART } from "@/templates/gulab-mahal/art";
import styles from "@/templates/gulab-mahal/gulab.module.css";

/**
 * Rose petals drifting down behind the pages: ten, seven on a phone under
 * 400px, no more.
 *
 * Mounted once page 2 has arrived (a little after the cover lets the card
 * go), so nothing falls through the opening. Each petal is one element falling
 * along a path planned here a whole fall at a time, a few seconds of
 * waypoints with a sway and a turn, handed to the Web Animations API, which
 * runs it on the compositor; when it lands, the next fall is planned from a
 * new place across the top. Inside it the picture tumbles: a scaleX that
 * swings through zero and back, which reads as a petal turning over in the
 * air. Transform and opacity only, and nothing is read from the page while
 * they fall: the layer's size is read once and again only when it changes.
 *
 * Behind every page, so never over a word, and takes no taps. Held still
 * while the tab is hidden, and in a preview while its box is off the screen.
 * Not drawn at all under reduced motion, or on a card laid out as a picture.
 */

const COUNT = 10;
const NARROW_COUNT = 7;
const NARROW_QUERY = "(max-width: 399.98px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
/* After the cover lets the card go: page 2's frame has settled and its names are coming up. */
const START_AFTER_MS = 1800;

/** A small seeded random, so two visits drift alike and the server never decides anything. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Flake {
  src: string;
  /** Its width in px. */
  size: number;
}

/* Small, of all four kinds, the dusty pink most often. */
const FLAKES: readonly Flake[] = [
  { src: ART.petals[0], size: 15 },
  { src: ART.petals[1], size: 19 },
  { src: ART.petals[3], size: 17 },
  { src: ART.petals[0], size: 13 },
  { src: ART.petals[2], size: 21 },
  { src: ART.petals[1], size: 16 },
  { src: ART.petals[0], size: 18 },
  /* The three a narrow phone goes without. */
  { src: ART.petals[3], size: 14 },
  { src: ART.petals[2], size: 17 },
  { src: ART.petals[1], size: 13 },
];

export default function GulabPetals({
  pagewide,
  band,
}: {
  pagewide: boolean;
  band: string;
}): ReactElement | null {
  const still = useCardStill();
  const gateOpen = useRevealGate();
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (still || !gateOpen || reducedMotion) {
      setOn(false);
      return;
    }

    const timer = window.setTimeout(() => setOn(true), START_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [still, gateOpen, reducedMotion]);

  return on ? <Falling pagewide={pagewide} band={band} /> : null;
}

function Falling({ pagewide, band }: { pagewide: boolean; band: string }): ReactElement {
  const layerRef = useRef<HTMLDivElement>(null);
  const [count] = useState(() =>
    typeof window !== "undefined" && window.matchMedia(NARROW_QUERY).matches
      ? NARROW_COUNT
      : COUNT,
  );

  useEffect(() => {
    const layer = layerRef.current;

    if (layer === null) {
      return;
    }

    const falls = [...layer.children] as HTMLElement[];
    const running = new Set<Animation>();
    let size = { width: layer.clientWidth, height: layer.clientHeight };
    let hidden = document.visibilityState === "hidden";
    let offScreen = false;
    let live = true;

    const held = (): boolean => hidden || offScreen;

    const track = (animation: Animation): void => {
      running.add(animation);
      animation.addEventListener("finish", () => running.delete(animation));
      animation.addEventListener("cancel", () => running.delete(animation));

      if (held()) {
        animation.pause();
      }
    };

    falls.forEach((fall, index) => {
      const random = seeded(index * 7919 + 17);
      const flake = FLAKES[index];
      const petal = fall.firstElementChild as HTMLElement | null;

      /* The tumble: turning over and back, out of step with every other petal. */
      if (petal !== null) {
        track(
          petal.animate(
            [
              { transform: "scaleX(1) rotate(0deg)" },
              { transform: "scaleX(-1) rotate(14deg)" },
            ],
            {
              duration: 1400 + random() * 1600,
              direction: "alternate",
              iterations: Infinity,
              easing: "ease-in-out",
              delay: -random() * 3000,
            },
          ),
        );
      }

      /* One fall from above the layer to below it; the next is planned as it lands. */
      const plan = (first: boolean): void => {
        if (!live) {
          return;
        }

        const { width, height } = size;
        const x = random() * width;
        const from = -flake.size * 2;
        const to = height + flake.size * 2;
        const duration = 13000 + random() * 9000;
        const sway = (18 + random() * 34) * (random() < 0.5 ? -1 : 1);
        const turn = (random() < 0.5 ? -1 : 1) * (120 + random() * 220);
        const start = random() * 360;
        const steps = 4;
        const keyframes: Keyframe[] = Array.from({ length: steps + 1 }, (_, step) => {
          const share = step / steps;
          /* A sway that swings side to side as it falls, and drifts a little one way overall. */
          const across = x + Math.sin(share * Math.PI * 2 + index) * sway + share * sway * 0.6;

          return {
            offset: share,
            transform: `translate3d(${across.toFixed(1)}px, ${(from + (to - from) * share).toFixed(1)}px, 0) rotate(${(
              start +
              turn * share
            ).toFixed(1)}deg)`,
          };
        });

        const animation = fall.animate(keyframes, {
          duration,
          easing: "linear",
          /* The first falls are spread out over the first few seconds, so they arrive one at a time. */
          delay: first ? index * 900 + random() * 1200 : 0,
          fill: "backwards",
        });
        track(animation);
        animation.addEventListener("finish", () => plan(false));
      };

      plan(true);
    });

    const sync = (): void => {
      for (const animation of running) {
        if (held()) {
          animation.pause();
        } else {
          animation.play();
        }
      }
    };

    const onVisibility = (): void => {
      hidden = document.visibilityState === "hidden";
      sync();
    };

    document.addEventListener("visibilitychange", onVisibility);

    /* Read again only when it changes size; never while anything falls. */
    const resize =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => {
            size = { width: layer.clientWidth, height: layer.clientHeight };
          })
        : null;
    resize?.observe(layer);

    /* In a preview the layer can scroll out of sight; on the guest's page it is fixed and never does. */
    const seen =
      !pagewide && typeof IntersectionObserver === "function"
        ? new IntersectionObserver((entries) => {
            offScreen = !entries.some((entry) => entry.isIntersecting);
            sync();
          })
        : null;
    seen?.observe(layer);

    return () => {
      live = false;
      document.removeEventListener("visibilitychange", onVisibility);
      resize?.disconnect();
      seen?.disconnect();

      for (const animation of [...running]) {
        animation.cancel();
      }
    };
  }, [pagewide, count]);

  return (
    <div
      ref={layerRef}
      aria-hidden="true"
      className={`${styles.drift} ${pagewide ? styles.driftFixed : styles.driftPinned}`}
      style={pagewide ? undefined : ({ "--gm-band": band } as CSSProperties)}
    >
      {FLAKES.slice(0, count).map((flake, index) => (
        <span key={index} className={styles.fall}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={flake.src}
            alt=""
            draggable={false}
            className={styles.fallPetal}
            style={{ "--size": `${flake.size}px` } as CSSProperties}
          />
        </span>
      ))}
    </div>
  );
}
