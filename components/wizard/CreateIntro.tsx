"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";

/** The template the intro shows opening, and whose live demo it leads to. */
export const INTRO_TEMPLATE_ID = "emerald-shahi";

export const INTRO_HEADLINE = "Your wedding card, as a website";
export const INTRO_LINE = "Guests open it like a real envelope. You see who is coming.";

/**
 * Said under the gallery's heading, above the prices. True to the flow: a
 * card is designed, previewed and saved for nothing (saving asks for an
 * account), and it is paid for once, per invitation, when the host publishes
 * it, which is what opens the link to guests (components/dashboard/PaymentBanner.tsx).
 */
export const TRUST_LINE = "Design for free. Pay once when you are ready to share.";

/*
  Made from the landing page's recording of Emerald Shahi opening
  (public/landing/previews/emerald-shahi/opening.mp4): the middle 480x720 of
  it, from 150px down, at 240x360, H.264, no sound. 58 KB against the
  original's 248 KB, for a picture 104px wide. The poster is its first frame.
*/
const POSTER_SRC = "/create/intro/emerald-shahi-poster.webp";
const CLIP_SRC = "/create/intro/emerald-shahi-opening.mp4";
/** The card's ground, the poster's average colour: the tile before anything is fetched. */
const GROUND = "#142c1c";

/** True once the page has loaded (the load event), when `on`; never otherwise. */
function usePageLoaded(on: boolean): boolean {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!on) {
      return;
    }

    if (document.readyState === "complete") {
      setLoaded(true);
      return;
    }

    const done = (): void => setLoaded(true);
    window.addEventListener("load", done, { once: true });

    return () => window.removeEventListener("load", done);
  }, [on]);

  return loaded;
}

/**
 * The few lines at the top of /create's gallery, for a visitor who has come
 * from an ad and does not know yet what Lifafa is: what it makes, what a
 * guest sees, and a small card opening, which is a link to its live demo.
 *
 * NOTHING HERE DELAYS THE GALLERY. The first row of pictures is the page's
 * largest paint, asked for ahead of everything (app/create/loading.tsx). So
 * the tile asks for nothing until the page has loaded: until then it is the
 * card's own green, its size fixed, so nothing moves when the poster comes.
 * Then the poster (10 KB), and the clip only while the tile is on screen,
 * never under reduced motion or a data saver, muted and without a sound
 * track. If it cannot play the poster stays.
 *
 * TWO PLACES DRAW IT, THE SAME. GalleryFirstScreen draws it on the server,
 * without `live`: the words and the green tile, the link already working.
 * The wizard draws it once the page has run, `live`, which is when anything
 * is fetched. Same boxes, same words, so nothing shifts when one replaces
 * the other.
 */
export default function CreateIntro({
  demoHref,
  onOpen,
  live = false,
}: {
  /** The live demo's address, with the ad's tags once the page has run. */
  demoHref: string;
  /** The demo opened from here, for the ads' ViewContent. */
  onOpen?: () => void;
  /** Whether to fetch the poster and play the clip: the wizard's, not the server's. */
  live?: boolean;
}): ReactElement {
  const tileRef = useRef<HTMLAnchorElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const loaded = usePageLoaded(live);
  const [motion, setMotion] = useState(false);
  const [inView, setInView] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData =
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
        ?.saveData === true;

    setMotion(!reduced && !saveData);
  }, [loaded]);

  useEffect(() => {
    const tile = tileRef.current;

    if (!loaded || tile === null || typeof IntersectionObserver !== "function") {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting === true),
      { threshold: 0.25 },
    );
    observer.observe(tile);

    return () => observer.disconnect();
  }, [loaded]);

  const showClip = loaded && motion && !failed;

  useEffect(() => {
    const video = videoRef.current;

    if (video === null || !showClip) {
      return;
    }

    if (inView) {
      video.play().catch(() => {
        /* Autoplay refused (low power mode, a webview's rules): the poster stays. */
        setPlaying(false);
      });
    } else {
      video.pause();
    }
  }, [inView, showClip]);

  return (
    <section aria-label="About Lifafa" className="flex min-w-0 items-center gap-4">
      <a
        ref={tileRef}
        href={demoHref}
        onClick={onOpen}
        className="relative block aspect-[2/3] w-[6.5rem] shrink-0 overflow-hidden rounded-xl border border-[var(--lifafa-hairline)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
        style={{ backgroundColor: GROUND }}
      >
        {loaded ? (
          <img
            src={POSTER_SRC}
            alt=""
            width={240}
            height={360}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        {showClip ? (
          <video
            ref={videoRef}
            muted
            playsInline
            loop
            disablePictureInPicture
            preload="none"
            aria-hidden="true"
            tabIndex={-1}
            onPlaying={() => setPlaying(true)}
            onError={() => setFailed(true)}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 motion-reduce:transition-none ${
              playing ? "opacity-100" : "opacity-0"
            }`}
          >
            <source src={CLIP_SRC} type="video/mp4" onError={() => setFailed(true)} />
          </video>
        ) : null}
        <span
          aria-hidden="true"
          className="absolute inset-x-1.5 bottom-1.5 rounded-full bg-black/60 py-1 text-center text-[0.6875rem] font-semibold text-white"
        >
          Live demo
        </span>
        <span className="sr-only">See a live demo of the Emerald Shahi invitation</span>
      </a>

      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="font-[family-name:var(--font-display)] text-[1.375rem] leading-tight font-semibold text-balance text-[var(--lifafa-cream)]">
          {INTRO_HEADLINE}
        </p>
        <p className="text-sm leading-snug text-[var(--lifafa-muted)]">{INTRO_LINE}</p>
      </div>
    </section>
  );
}
