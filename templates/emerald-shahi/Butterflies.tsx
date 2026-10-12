"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from "react";
import { useCardStill } from "@/hooks/useCardStill";
import { useCoverOpen } from "@/hooks/useCoverOpen";
import { ART } from "@/templates/emerald-shahi/art";
import styles from "@/templates/emerald-shahi/emerald.module.css";

/**
 * Four gold butterflies (three on a narrow phone) roaming the edges of the
 * screen, once the card has arrived.
 *
 * NOT AT THE TAP, AND NOT DURING THE HERO'S ENTRANCE. They are mounted a
 * second and a half after the cover has gone altogether, which is when the
 * last line of the hero has faded up. Until then there is nothing of them on
 * the page: no layer, no pictures decoding, no animations starting in the
 * same frames the envelope and the frame are using.
 *
 * TWO MOVEMENTS, BOTH THE COMPOSITOR'S. The wings are a CSS animation on the
 * picture, its scaleX going between about a third and whole, each butterfly a
 * little out of step with the others. Where a butterfly is, and which way it
 * leans, is one Web Animations API animation of `transform` at a time on the
 * element that holds the picture: a leg of a few seconds from where it is to
 * a point chosen for it, planned when the last leg ends and then left to run.
 * No frame is ever written from script.
 *
 * WHERE THEY GO. Each leg ends in one of the screen's outer bands, the left
 * and right eighths and a strip under the top, and seven legs in ten end on
 * the edge the butterfly is already at. So it spends its time over the
 * margins and the artwork. It leans a little towards the way it is going.
 *
 * NEVER OVER THE HERO'S WORDS. While the hero is on screen, the box its words
 * are set in (`data-es-hero-box`, in Hero.tsx) is kept clear: a leg is only
 * taken if the straight line of it misses that box by a butterfly's own
 * width, a leg already under way is given up for another the moment a scroll
 * brings the box into its path, and a butterfly shooed towards the words goes
 * to the nearer edge instead. Where the box is, is read when the layer or
 * the hero changes size and worked out from the scroll offset after that;
 * nothing is measured while anything moves.
 *
 * SHOOED AWAY. A touch or a pointer coming near a butterfly sends it off, away
 * from that point, and it takes up roaming again from where it lands. The
 * listeners are passive and on the window, the layer itself takes no pointer
 * events at all, so nothing here can ever be in the way of a tap. Where a
 * butterfly is at that moment is worked out from its own animation's progress
 * and the two ends of its leg: nothing is measured.
 *
 * PAUSED while the tab is hidden or the layer is off screen, and not there at
 * all for a guest who asked for less motion or on a printed sheet. With the leaves and petals of Floating.tsx this is at most
 * fourteen floating pieces, ten on a narrow phone.
 */

interface Spec {
  /** Width in px: 28 to 40. */
  size: number;
  /** Where it starts, as shares of the layer. */
  x: number;
  y: number;
  /** Seconds a wing beat takes, and how far into one it starts. */
  beat: number;
  phase: number;
}

const SPECS: readonly Spec[] = [
  { size: 38, x: 0.07, y: 0.24, beat: 0.62, phase: 0 },
  { size: 30, x: 0.9, y: 0.58, beat: 0.7, phase: -0.23 },
  { size: 34, x: 0.86, y: 0.14, beat: 0.66, phase: -0.41 },
  /* The one a narrow phone goes without. */
  { size: 28, x: 0.1, y: 0.76, beat: 0.74, phase: -0.12 },
];

/* How long after the cover has gone before they arrive: the hero's own entrance is over by then. */
const ARRIVE_AFTER_MS = 1500;
const NARROW_PX = 400;
const NARROW_COUNT = 3;
/* How near a touch has to come, and how far a butterfly goes from it. */
const SHOO_RADIUS = 78;
const SHOO_DISTANCE = 150;
const SHOO_MS = 650;
/* The most a butterfly leans into its flight, in degrees. */
const MAX_TILT = 24;

interface Flight {
  node: HTMLElement;
  size: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  tilt: number;
  animation: Animation | null;
}

/** A small repeatable stream of numbers in [0, 1): the roaming is unplanned, not unrepeatable. */
function stream(seed: number): () => number {
  let state = seed;

  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

export default function EmeraldShahiButterflies({
  pagewide,
  band,
}: {
  /** Fixed over the guest's whole page, or pinned in a preview's own scroll box. */
  pagewide: boolean;
  /** The height of that scroll box, where it is pinned. */
  band: string;
}): ReactElement | null {
  const layerRef = useRef<HTMLDivElement>(null);
  const still = useCardStill();
  /* True once the cover has unmounted (and from the start where there is none). */
  const coverGone = useCoverOpen();
  const [arrived, setArrived] = useState(false);

  useEffect(() => {
    if (still || !coverGone) {
      return;
    }

    const timer = window.setTimeout(() => setArrived(true), ARRIVE_AFTER_MS);

    return () => window.clearTimeout(timer);
  }, [still, coverGone]);

  const show = !still && arrived;

  useEffect(() => {
    const layer = layerRef.current;

    if (
      !show ||
      layer === null ||
      typeof layer.animate !== "function" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    /* The layer's size, read here and when it changes, never while anything moves. */
    let width = layer.clientWidth;
    let height = layer.clientHeight;
    let paused = false;
    let live = true;
    const random = stream(20261212);

    const flights: Flight[] = [...layer.children]
      .filter((node): node is HTMLElement => node instanceof HTMLElement)
      .slice(0, width < NARROW_PX ? NARROW_COUNT : SPECS.length)
      .map((node, index) => {
        const spec = SPECS[index];
        const at = { x: spec.x * width, y: spec.y * height };

        node.style.display = "block";

        return { node, size: spec.size, from: at, to: at, tilt: 0, animation: null };
      });

    /*
      THE HERO'S WORDS, AS A BOX TO FLY ROUND. Found once, by its mark, in the
      card this layer belongs to. On the guest's page the layer is the screen,
      so the box is kept in the page's own coordinates (read when it or the
      layer changes size) and brought to the screen's by the scroll offset. In
      a preview the layer is pinned in a box of its own that scrolls, and the
      box is read against the layer when a leg is planned, which is once every
      few seconds.
    */
    const heroBox =
      layer.parentElement?.querySelector<HTMLElement>("[data-es-hero-box]") ?? null;
    let heroOnPage: { left: number; top: number; right: number; bottom: number } | null =
      null;

    const measureHero = (): void => {
      if (heroBox === null) {
        heroOnPage = null;
        return;
      }

      const rect = heroBox.getBoundingClientRect();

      heroOnPage = {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY,
        right: rect.right + window.scrollX,
        bottom: rect.bottom + window.scrollY,
      };
    };

    measureHero();

    /* The box in the layer's own coordinates, a butterfly's width larger all round; null when it is off screen. */
    const keepOut = (
      size: number,
    ): { left: number; top: number; right: number; bottom: number } | null => {
      let box: { left: number; top: number; right: number; bottom: number } | null;

      if (pagewide) {
        box =
          heroOnPage === null
            ? null
            : {
                left: heroOnPage.left - window.scrollX,
                top: heroOnPage.top - window.scrollY,
                right: heroOnPage.right - window.scrollX,
                bottom: heroOnPage.bottom - window.scrollY,
              };
      } else if (heroBox === null) {
        box = null;
      } else {
        const rect = heroBox.getBoundingClientRect();
        const origin = layer.getBoundingClientRect();

        box = {
          left: rect.left - origin.left,
          top: rect.top - origin.top,
          right: rect.right - origin.left,
          bottom: rect.bottom - origin.top,
        };
      }

      if (box === null || box.bottom < 0 || box.top > height) {
        return null;
      }

      /* A butterfly is placed by its top left corner, so the box grows by its width up and to the left, and a margin all round. */
      return {
        left: box.left - size - 6,
        top: box.top - size - 6,
        right: box.right + 6,
        bottom: box.bottom + 6,
      };
    };

    /* Whether the straight line from `a` to `b` passes through `box` (Liang and Barsky's clipping test). */
    const crosses = (
      a: { x: number; y: number },
      b: { x: number; y: number },
      box: { left: number; top: number; right: number; bottom: number } | null,
    ): boolean => {
      if (box === null) {
        return false;
      }

      let enter = 0;
      let leave = 1;
      const dx = b.x - a.x;
      const dy = b.y - a.y;

      for (const [p, q] of [
        [-dx, a.x - box.left],
        [dx, box.right - a.x],
        [-dy, a.y - box.top],
        [dy, box.bottom - a.y],
      ]) {
        if (p === 0) {
          if (q < 0) {
            return false;
          }
        } else if (p < 0) {
          enter = Math.max(enter, q / p);
        } else {
          leave = Math.min(leave, q / p);
        }
      }

      return enter <= leave;
    };

    const place = (point: { x: number; y: number }, tilt: number): string =>
      `translate3d(${point.x.toFixed(1)}px, ${point.y.toFixed(1)}px, 0) rotate(${tilt.toFixed(1)}deg)`;

    /* Where a butterfly is now: between the ends of its leg, by its animation's own eased progress. */
    const whereIs = (flight: Flight): { x: number; y: number } => {
      const progress = flight.animation?.effect?.getComputedTiming().progress ?? 1;
      const done = typeof progress === "number" ? progress : 1;

      return {
        x: flight.from.x + (flight.to.x - flight.from.x) * done,
        y: flight.from.y + (flight.to.y - flight.from.y) * done,
      };
    };

    /*
      A point in one of the outer bands. Usually further along the edge it is
      already on, so it drifts up and down a margin; now and then the strip
      under the top, or the other edge, which is the only time it crosses the
      middle of the screen.
    */
    const somewhere = (flight: Flight): { x: number; y: number } => {
      const pick = random();
      const edge = Math.max(8, width * 0.14 - flight.size);
      const onLeft = flight.to.x + flight.size / 2 < width / 2;
      const left = { x: random() * edge, y: (0.06 + random() * 0.84) * height };
      const right = {
        x: width - flight.size - random() * edge,
        y: (0.06 + random() * 0.84) * height,
      };

      if (pick < 0.7) {
        return onLeft ? left : right;
      }

      if (pick < 0.85) {
        return {
          x: random() * (width - flight.size),
          y: (0.03 + random() * 0.1) * height,
        };
      }

      return onLeft ? right : left;
    };

    const fly = (
      flight: Flight,
      to: { x: number; y: number },
      duration: number,
      easing: string,
    ): void => {
      const from = whereIs(flight);
      const fromTilt = flight.tilt;
      /* It leans the way it is going, more for a sideways leg than an upward one. */
      const tilt = Math.max(
        -MAX_TILT,
        Math.min(MAX_TILT, ((to.x - from.x) / Math.max(60, width)) * 70),
      );

      flight.animation?.cancel();
      flight.from = from;
      flight.to = to;
      flight.tilt = tilt;
      flight.animation = flight.node.animate(
        [{ transform: place(from, fromTilt) }, { transform: place(to, tilt) }],
        { duration, easing, fill: "forwards" },
      );

      if (paused) {
        flight.animation.pause();
      }

      flight.animation.onfinish = () => {
        if (live) {
          roam(flight);
        }
      };
    };

    /*
      The next leg: somewhere along an edge, at an unhurried pace, a few
      seconds away, and never through the hero's words. A few places are
      tried; if the box is in the way of all of them the butterfly keeps to
      the edge it is on, straight up or down it, which cannot cross the box:
      the edge bands are outside it on either side.
    */
    const roam = (flight: Flight): void => {
      const from = whereIs(flight);
      const box = keepOut(flight.size);
      let to = somewhere(flight);

      for (let tries = 0; tries < 6 && crosses(from, to, box); tries += 1) {
        to = somewhere(flight);
      }

      if (crosses(from, to, box)) {
        to = { x: from.x, y: (0.06 + random() * 0.84) * height };
      }

      /* Over or under the box and not beside it (in the strip under the top): along to the nearer edge first. */
      if (crosses(from, to, box)) {
        to = {
          x: from.x + flight.size / 2 < width / 2 ? 4 : width - flight.size - 4,
          y: from.y,
        };
      }

      const distance = Math.hypot(to.x - from.x, to.y - from.y);

      fly(flight, to, Math.max(3200, Math.min(9000, distance * 26)), "ease-in-out");
    };

    for (const flight of flights) {
      flight.node.style.transform = place(flight.from, 0);
      roam(flight);
    }

    /*
      A touch or the pointer near one: away from it, quickly, then roaming
      again. Looked at no more than ten times a second, however fast the
      pointer moves.
    */
    let lastLook = 0;
    const shoo = (clientX: number, clientY: number): void => {
      const now = performance.now();

      if (paused || now - lastLook < 100) {
        return;
      }

      lastLook = now;
      /* The layer is the screen on the guest's page; in a preview it is found by its own box. */
      const origin = pagewide ? { left: 0, top: 0 } : layer.getBoundingClientRect();
      const x = clientX - origin.left;
      const y = clientY - origin.top;

      for (const flight of flights) {
        const at = whereIs(flight);
        const dx = at.x + flight.size / 2 - x;
        const dy = at.y + flight.size / 2 - y;
        const near = Math.hypot(dx, dy);

        if (near > SHOO_RADIUS) {
          continue;
        }

        const reach = SHOO_DISTANCE / Math.max(near, 1);
        let away = {
          x: Math.max(0, Math.min(width - flight.size, at.x + dx * reach)),
          y: Math.max(0, Math.min(height - flight.size, at.y + dy * reach)),
        };

        /* Shooed towards the hero's words: to the nearer edge of the screen instead, level with where it is. */
        if (crosses(at, away, keepOut(flight.size))) {
          away = {
            x: at.x + flight.size / 2 < width / 2 ? 4 : width - flight.size - 4,
            y: at.y,
          };
        }

        fly(flight, away, SHOO_MS, "cubic-bezier(0.2, 0.7, 0.2, 1)");
      }
    };

    const onPointer = (event: PointerEvent): void => shoo(event.clientX, event.clientY);
    const onTouch = (event: TouchEvent): void => {
      const touch = event.touches[0];

      if (touch !== undefined) {
        shoo(touch.clientX, touch.clientY);
      }
    };

    /*
      A scroll moves the hero's box under legs that were planned when it was
      somewhere else. Looked at no more than five times a second while the
      guest scrolls: any butterfly whose way ahead now runs through the box
      takes another leg from where it is.
    */
    let lastScrollLook = 0;
    const onScroll = (): void => {
      const now = performance.now();

      if (paused || !pagewide || now - lastScrollLook < 200) {
        return;
      }

      lastScrollLook = now;

      for (const flight of flights) {
        if (crosses(whereIs(flight), flight.to, keepOut(flight.size))) {
          roam(flight);
        }
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onPointer, { passive: true });
    window.addEventListener("touchstart", onTouch, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });

    /* Paused while the tab is hidden or the layer is off screen: the flights and, by the attribute, the wings. */
    let onScreen = true;
    const sync = (): void => {
      paused = !onScreen || document.visibilityState !== "visible";
      layer.toggleAttribute("data-floating-paused", paused);

      for (const flight of flights) {
        if (paused) {
          flight.animation?.pause();
        } else if (flight.animation?.playState === "paused") {
          flight.animation.play();
        }
      }
    };

    const seen =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver((entries) => {
            onScreen = entries.some((entry) => entry.isIntersecting);
            sync();
          })
        : null;
    seen?.observe(layer);
    document.addEventListener("visibilitychange", sync);

    const resized =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => {
            width = layer.clientWidth;
            height = layer.clientHeight;
            measureHero();
          })
        : null;
    resized?.observe(layer);

    if (heroBox !== null) {
      resized?.observe(heroBox);
    }

    return () => {
      live = false;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("touchmove", onTouch);
      document.removeEventListener("visibilitychange", sync);
      seen?.disconnect();
      resized?.disconnect();

      for (const flight of flights) {
        flight.animation?.cancel();
      }
    };
  }, [show, pagewide]);

  if (!show) {
    return null;
  }

  return (
    <div
      ref={layerRef}
      aria-hidden="true"
      className={`${styles.butterflies} ${
        pagewide ? styles.butterfliesFixed : styles.butterfliesPinned
      }`}
      style={pagewide ? undefined : ({ "--es-band": band } as CSSProperties)}
    >
      {SPECS.map((spec, index) => (
        <span
          key={index}
          className={styles.butterfly}
          style={{ width: spec.size, height: spec.size }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ART.butterfly}
            alt=""
            draggable={false}
            className={styles.wings}
            style={{
              animationDuration: `${spec.beat}s`,
              animationDelay: `${spec.phase}s`,
            }}
          />
        </span>
      ))}
    </div>
  );
}
