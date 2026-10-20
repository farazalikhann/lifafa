"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactElement } from "react";
import type { LandingDesign } from "@/lib/landingDesigns";

/** How long each design stays on the phone before the next fades in. */
const HOLD_MS = 4000;
/** How long after the page has loaded the other designs are fetched. */
const LATER_MS = 1200;

/**
 * The hero's phone: a frame drawn in CSS around one design at a time, each
 * fading into the next.
 *
 * THE FIRST DESIGN IS THE ONLY ONE THE FIRST SCREEN WAITS FOR. It is in the
 * server's HTML with priority, so it is fetched alongside the page. The other
 * three are not in the page at all until it has finished loading and a moment
 * more has passed: on a slow connection they would otherwise share the line
 * with the first screen. Each takes its turn only once it has arrived, so the
 * phone never fades to a picture that is still on its way.
 *
 * Nothing turns while the phone is off screen or the tab is hidden, and
 * nothing turns at all under reduced motion: the first design simply stays.
 */
export default function HeroPhone({
  designs,
}: {
  designs: readonly LandingDesign[];
}): ReactElement {
  const frameRef = useRef<HTMLDivElement>(null);
  const [laterMounted, setLaterMounted] = useState(false);
  const [active, setActive] = useState(0);
  const arrived = useRef<Set<number>>(new Set([0]));

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let timer: number | undefined;
    const mountLater = (): void => {
      timer = window.setTimeout(() => setLaterMounted(true), LATER_MS);
    };

    if (document.readyState === "complete") {
      mountLater();
    } else {
      window.addEventListener("load", mountLater, { once: true });
    }

    return () => {
      window.removeEventListener("load", mountLater);
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!laterMounted || frameRef.current === null) {
      return;
    }

    let onScreen = true;
    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
    });
    observer.observe(frameRef.current);

    const interval = window.setInterval(() => {
      if (!onScreen || document.hidden) {
        return;
      }

      setActive((current) => {
        const next = (current + 1) % designs.length;
        return arrived.current.has(next) ? next : current;
      });
    }, HOLD_MS);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, [laterMounted, designs.length]);

  return (
    <div
      ref={frameRef}
      className="relative aspect-[9/16] w-[min(64vw,15.5rem)] rounded-[2.4rem] border-[7px] border-[#2e2722] bg-[var(--lifafa-ink-raised)] shadow-[0_30px_70px_-28px_rgba(0,0,0,0.85),0_0_0_1px_rgba(232,163,61,0.18)] lg:w-[17.5rem]"
    >
      <div className="absolute inset-0 overflow-hidden rounded-[1.95rem]">
        {designs.map((design, index) =>
          index === 0 || laterMounted ? (
            <Image
              key={design.id}
              src={design.preview}
              alt={index === active ? `The ${design.name} design` : ""}
              aria-hidden={index === active ? undefined : true}
              fill
              priority={index === 0}
              loading={index === 0 ? undefined : "eager"}
              quality={65}
              sizes="(min-width: 1024px) 17.5rem, 64vw"
              onLoad={() => arrived.current.add(index)}
              className={`object-cover object-top transition-opacity duration-[1200ms] ease-in-out motion-reduce:transition-none ${
                index === active ? "opacity-100" : "opacity-0"
              }`}
            />
          ) : null,
        )}
      </div>
      {/* The speaker slot, over the picture. */}
      <span
        aria-hidden="true"
        className="absolute top-2.5 left-1/2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-black/55"
      />
    </div>
  );
}
