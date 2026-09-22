"use client";

import Image from "next/image";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { useInView } from "@/hooks/useInView";
import { useMediaQuery } from "@/hooks/useMediaQuery";

/**
 * Real cards, made in the editor, straight after the hero.
 *
 * Two behaviours, and the difference is deliberate.
 *
 * FROM `lg` UP the section is a tall scroll track: a sticky screen holds a row
 * of cards, and scrolling down the page slides the row sideways. With a mouse
 * or a trackpad, scrolling is the one gesture every visitor is already making,
 * so a gallery that answers it needs no instructions.
 *
 * BELOW `lg` it is an ordinary row the visitor swipes themselves, and the page
 * scroll is left alone. On a phone a page that moves sideways when someone is
 * trying to scroll down reads as broken, and it is the fastest way to lose
 * them.
 *
 * Under reduced motion it is the swipeable row at every width: a row that
 * travels with the scroll is exactly the movement that setting asks to be
 * spared.
 */

interface ShowcaseCard {
  /** File name inside /public/showcase. */
  file: string;
  /** Under the frame: the occasion and the style, in a few words. */
  caption: string;
  /** What the card shows, for someone who cannot see it. */
  alt: string;
}

/**
 * One row per card, in the order they are shown. Adding a sixth is one more
 * line here and one more file in /public/showcase.
 *
 * Screenshots of real cards from the editor, with the phone's status bar cut
 * off the top. Each caption and description is written from the image under
 * its file name, so a new screenshot means new words here too.
 *
 * The two blessing pages lead, the dua first: they are the most finished-
 * looking screens a card has, and they show the traditions at once. The three
 * after them show what a guest can do on the card — scratch to find the venue,
 * save the date — rather than more of how it looks.
 */
const SHOWCASE: readonly ShowcaseCard[] = [
  {
    file: "card-1.jpg",
    caption: "Muslim wedding, Bismillah and dua",
    alt: "A Muslim wedding invitation opening with Bismillah in black calligraphy under hanging lanterns, crescent moons and string lights, in a frame of pink and ivory flowers, followed by Assalamu Alaikum and a dua for the couple in Arabic, transliteration and English.",
  },
  {
    file: "card-2.jpg",
    caption: "Hindu wedding, Shubh Vivah",
    alt: "A Hindu wedding invitation in a frame of red roses and gold scrollwork, with Ganesh above Shubh Vivah in gold Devanagari lettering, then Shri Ganeshaya Namah and the Vakratunda shlok with its meaning in English.",
  },
  {
    file: "card-3.jpg",
    caption: "Venue hidden under a scratch panel",
    alt: "The venue on a Muslim wedding invitation half uncovered from a patterned scratch panel, with a Reveal without scratching link beneath it, under hanging lanterns in a frame of pink flowers.",
  },
  {
    file: "card-4.jpg",
    caption: "Save the date to any calendar",
    alt: "Add to Google Calendar and Download for Apple or Outlook links on a Muslim wedding invitation, under hanging lanterns in a frame of pink and ivory flowers.",
  },
  {
    file: "card-5.jpg",
    caption: "Red rose frame, scratch to reveal",
    alt: "A Hindu wedding invitation in a frame of red roses and gold scrollwork, with a patterned scratch panel waiting to be scratched and a Reveal without scratching link below it.",
  },
];

/**
 * When the row is driven by the page scroll: a wide screen and no request for
 * reduced motion. One query, so the two conditions can never be read apart.
 */
const SCROLL_DRIVEN_QUERY =
  "(min-width: 64rem) and (prefers-reduced-motion: no-preference)";

/** The frame's width, in px. The image fills it less the bezel and border. */
const FRAME_WIDTH = 260;

/**
 * The frame's width while the row is pinned: 260px, unless the screen is too
 * short to hold a whole frame and its caption.
 *
 * A frame is 2.17 times as tall as its screen is wide, plus 18px of bezel and
 * about 36px of caption, and the pinned screen gives up 56px to the header and
 * some air above and below. Solving that for the width is this expression; at
 * 800px tall it comes to more than 260, so a laptop gets the full size.
 */
const FRAME_WIDTH_PINNED = `min(${FRAME_WIDTH}px, calc((100svh - 142px) * 0.46 + 18px))`;

/**
 * 260px frame, less 8px of bezel and 1px of border on each side. The largest
 * the image is ever drawn; a pinned frame on a short screen is only narrower.
 */
const SCREEN_SIZES = "242px";

/**
 * The screenshots' own size: 738 × 1600 from the phone, less the 67px status
 * bar cut off the top.
 *
 * Only the ratio reaches the layout — the frame fixes the width and the image
 * covers its screen. With the status bar gone these are a little wider than
 * the frame's 9:19.5, so a few pixels come off each side rather than the card
 * being letterboxed.
 */
const IMAGE_WIDTH = 738;
const IMAGE_HEIGHT = 1533;

/** Runs before paint in the browser; an effect on the server, where it never runs. */
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

type ImageStatus = "loading" | "loaded" | "missing";

/**
 * What a frame shows when its screenshot is not there.
 *
 * A panel in the page's own colours with the file it is waiting for, so a
 * missing image looks like a slot rather than a fault. It is always drawn under
 * the image as well: the image is transparent until it has loaded, so there is
 * never a frame with nothing in it, and never a broken image icon either.
 */
function Placeholder({ file }: { file: string }): ReactElement {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[var(--lifafa-ink-raised)] px-6 text-center"
    >
      <div className="absolute inset-3 rounded-[1.25rem] border border-dashed border-[var(--lifafa-hairline)]" />

      {/* An envelope, which is what "lifafa" means. */}
      <svg
        viewBox="0 0 40 30"
        role="presentation"
        focusable="false"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-8 w-10 text-[var(--lifafa-marigold)] opacity-60"
      >
        <path d="M3 5 Q3 3 5 3 L35 3 Q37 3 37 5 L37 25 Q37 27 35 27 L5 27 Q3 27 3 25 Z" />
        <path d="M4 5 L20 17 L36 5" />
      </svg>

      <p className="font-mono text-[0.75rem] tracking-wide text-[var(--lifafa-muted)]">
        {file}
      </p>
    </div>
  );
}

function ShowcaseFrame({
  card,
  priority,
  width,
}: {
  card: ShowcaseCard;
  priority: boolean;
  /** A CSS width: 260px, or narrower on a short screen while pinned. */
  width: string;
}): ReactElement {
  const [status, setStatus] = useState<ImageStatus>("loading");

  return (
    <figure
      className="flex shrink-0 snap-center flex-col items-center gap-4"
      style={{ width }}
    >
      {/*
        The bezel. A rounded border and a soft shadow, warmed with the rose so
        it reads as a phone lying on the page rather than a black cut-out.
      */}
      <div className="w-full rounded-[2.25rem] border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] p-2 shadow-[0_28px_60px_-28px_rgba(0,0,0,0.85),0_18px_50px_-30px_rgba(196,86,107,0.35)]">
        <div className="relative aspect-[9/19.5] overflow-hidden rounded-[1.75rem]">
          <Placeholder file={card.file} />

          {/*
            Removed rather than hidden once it has failed, so nothing is left
            that a browser could draw its broken image icon for. next/image
            re-fires an error that happened before hydration, so a file that
            was already missing on first load still reaches this.
          */}
          {status !== "missing" ? (
            <Image
              src={`/showcase/${card.file}`}
              alt={card.alt}
              width={IMAGE_WIDTH}
              height={IMAGE_HEIGHT}
              sizes={SCREEN_SIZES}
              priority={priority}
              onLoad={() => setStatus("loaded")}
              onError={() => setStatus("missing")}
              className={`absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-500 ease-out motion-reduce:transition-none ${
                status === "loaded" ? "opacity-100" : "opacity-0"
              }`}
            />
          ) : null}
        </div>
      </div>

      <figcaption className="max-w-full text-center text-sm leading-snug text-[var(--lifafa-muted)]">
        {card.caption}
      </figcaption>
    </figure>
  );
}

function Heading(): ReactElement {
  const { ref, isInView } = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={[
        "px-6 text-center",
        "transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none",
        isInView ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
      ].join(" ")}
    >
      {/* Two small dots, one of each accent, the way the hero pairs them. */}
      <div aria-hidden="true" className="mb-5 flex justify-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--lifafa-marigold)]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--lifafa-rose)]" />
      </div>

      <h2
        id="showcase-heading"
        className="font-[family-name:var(--font-display)] text-[2.25rem] leading-[1.15] font-semibold tracking-[-0.02em] text-balance text-[var(--lifafa-cream)] sm:text-5xl"
      >
        Cards people have made.
      </h2>
      <p className="mx-auto mt-4 max-w-[34ch] text-base leading-relaxed text-balance text-[var(--lifafa-muted)] sm:text-lg">
        Every one of these was built in the editor, in minutes.
      </p>
    </div>
  );
}

export default function Showcase(): ReactElement {
  /*
    The only place the two behaviours are chosen. False on the server and on
    the first client render, so the markup React hydrates is always the
    swipeable row, and a wide screen swaps to the track just after.
  */
  const isScrollDriven = useMediaQuery(SCROLL_DRIVEN_QUERY);

  const runwayRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  /*
    The scroll drive.

    The listener does nothing but ask for a frame; the page position is read
    and the row moved inside that frame, at most once per frame however many
    scroll events arrive. The only thing written is `transform`, so moving the
    row never costs a layout, and nothing here sets React state, so a scroll
    never re-renders the section.

    A layout effect so the row is already in its starting place on the first
    frame the track is painted, rather than drawn at the left edge and jumping.
  */
  useIsomorphicLayoutEffect(() => {
    const runway = runwayRef.current;
    const screen = screenRef.current;
    const track = trackRef.current;

    if (!isScrollDriven || runway === null || screen === null || track === null) {
      return;
    }

    /* Where the row starts and ends, and how far the page scrolls between. */
    let start = 0;
    let end = 0;
    let distance = 0;
    let frame = 0;

    /*
      The row travels from the first card centred on the screen to the last
      one centred, so it always has somewhere to go: on a very wide monitor
      where all five would fit side by side, a row pinned to the edges would
      never move at all.

      Read on mount and on resize only, never per frame. offsetLeft ignores
      the transform, so the reading is the same wherever the row has got to.
    */
    const measure = (): void => {
      const first = track.firstElementChild as HTMLElement | null;
      const last = track.lastElementChild as HTMLElement | null;

      if (first === null || last === null) {
        return;
      }

      const middle = screen.clientWidth / 2;
      start = middle - (first.offsetLeft + first.offsetWidth / 2);
      end = middle - (last.offsetLeft + last.offsetWidth / 2);
      distance = runway.offsetHeight - window.innerHeight;
    };

    const update = (): void => {
      frame = 0;

      /* How far the pinned screen has been held, from 0 to `distance`. */
      const scrolled = -runway.getBoundingClientRect().top;
      const progress =
        distance > 0 ? Math.min(1, Math.max(0, scrolled / distance)) : 0;
      const x = start + (end - start) * progress;

      track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
    };

    const requestUpdate = (): void => {
      if (frame === 0) {
        frame = window.requestAnimationFrame(update);
      }
    };

    const handleResize = (): void => {
      measure();
      requestUpdate();
    };

    measure();
    update();

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", handleResize);

      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }

      track.style.transform = "";
    };
  }, [isScrollDriven]);

  const frames = (width: string) =>
    SHOWCASE.map((card, index) => (
      <ShowcaseFrame
        key={card.file}
        card={card}
        priority={index === 0}
        width={width}
      />
    ));

  if (isScrollDriven) {
    return (
      /*
        `relative` so the section paints over the rose bloom the hero lets hang
        into it.
      */
      <section aria-labelledby="showcase-heading" className="relative pt-24">
        {/*
          The heading scrolls away before the row pins, rather than being
          pinned with it. A phone-shaped frame is taller than it is wide, and a
          laptop screen is not tall enough for the heading, a whole frame and its
          caption at once: pinned together, the captions were cut off the
          bottom of an 800px screen for the entire length of the scroll.
        */}
        <Heading />

        {/*
          The runway: three screens of scroll, the first spent arriving and the
          other two moving the row. Only the screen inside it is pinned.
        */}
        <div ref={runwayRef} className="relative h-[300vh]">
          <div
            ref={screenRef}
            className="sticky top-0 flex h-[100svh] items-center overflow-hidden pt-14"
          >
            <div
              ref={trackRef}
              className="relative flex w-max gap-12 will-change-transform"
            >
              {frames(FRAME_WIDTH_PINNED)}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="showcase-heading"
      className="relative py-20 sm:py-24"
    >
      <Heading />

      {/*
        The swipeable row. Padded by half the screen less half a card on each
        side, so snapping to the centre can bring the first and last cards to
        the middle of the screen as well as the ones between them.

        Focusable, so a keyboard can scroll it with the arrow keys; named, so
        what that focus has landed on is announced.
      */}
      <div
        tabIndex={0}
        role="region"
        aria-label="Cards people have made, scrolls sideways"
        className="lifafa-no-scrollbar mt-12 flex snap-x snap-mandatory gap-6 overflow-x-auto overscroll-x-contain px-[calc(50%-130px)] pt-2 pb-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
      >
        {frames(`${FRAME_WIDTH}px`)}
      </div>

      <p className="mt-2 text-center text-sm text-[var(--lifafa-muted)] lg:hidden">
        Swipe to see more.
      </p>
    </section>
  );
}
