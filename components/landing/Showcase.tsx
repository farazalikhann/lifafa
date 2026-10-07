"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { useInView } from "@/hooks/useInView";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  DEMO_NIKAH_PATH,
  DEMO_NIKAH_SLIDES,
  DEMO_STAGE_HEIGHT,
  DEMO_STAGE_WIDTH,
  type DemoSlide,
} from "@/lib/demoSlides";

/*
  The card itself, for the frames that draw a section of it. A chunk of its
  own, fetched when the first such frame comes near the screen: the card is
  most of the product's code, and the home page paints without it. Never on
  the server, where eight cards would be eight cards of HTML nobody has
  scrolled to.
*/
const DemoSlideCard = dynamic(
  () => import("@/components/landing/DemoSlideCard"),
  { ssr: false, loading: () => null },
);

/**
 * One sample invitation, screen by screen, straight after the hero.
 *
 * NOT SCREENSHOTS. Each frame is a screen of the sample card in lib/demoCards
 * drawn by the card's own components, so the row shows the product as it is
 * today and has nothing to be retaken when the card changes. The first frame,
 * the closed cover, is the one exception and says why: see DemoCoverSlide.
 *
 * Two behaviours, and the difference is deliberate.
 *
 * FROM `lg` UP the section is a tall scroll track: a sticky screen holds a row
 * of frames, and scrolling down the page slides the row sideways. With a mouse
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
 *
 * ONLY THE FRAMES ON SCREEN HOLD A CARD. A frame draws its screen while it is
 * on the screen or about to be, and lets it go when it has been swiped away,
 * so a phone never holds more than the frame in the middle and the one either
 * side of it.
 *
 * WHAT THE HOME PAGE'S OWN SCRIPT CARRIES IS THE ROW AND NOTHING OF THE CARD.
 * The closed cover is drawn on the server and handed in already drawn, with
 * the card's ground colour beside it (see app/page.tsx), and the frames'
 * captions come from lib/demoSlides.ts, which imports nothing. The card's
 * own code arrives in the one chunk above, when a frame asks for it.
 *
 * NOTHING IN A FRAME CAN BE USED. The card inside is inert and takes no
 * pointer: a frame is a picture of a screen, and the whole of it is one link
 * to the card itself, which is where the buttons work.
 */

/**
 * When the row is driven by the page scroll: a wide screen and no request for
 * reduced motion. One query, so the two conditions can never be read apart.
 */
const SCROLL_DRIVEN_QUERY =
  "(min-width: 64rem) and (prefers-reduced-motion: no-preference)";

/** The frame's width, in px. The screen fills it less the bezel and border. */
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

/** 260px frame, less 8px of bezel and 1px of border on each side. */
const SCREEN_WIDTH = FRAME_WIDTH - 18;

/**
 * How far past the screen's edges a frame starts to draw its card, in px.
 *
 * Less than a frame and its gap, so on a phone it is the frame in the middle
 * and the one peeking in at either side, and never the one beyond that.
 */
const NEAR_MARGIN = 140;

/** Runs before paint in the browser; an effect on the server, where it never runs. */
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Whether an element is on the screen or within NEAR_MARGIN of it, either
 * way, and kept up to date: true as it arrives and false again once it has
 * gone. False until the browser has said otherwise.
 */
function useNear<T extends HTMLElement>(): {
  ref: React.RefObject<T | null>;
  near: boolean;
} {
  const ref = useRef<T | null>(null);
  const [near, setNear] = useState<boolean>(false);

  useEffect(() => {
    const element = ref.current;

    if (element === null) {
      return;
    }

    /* A browser without the observer draws every frame, as a page without this would. */
    if (typeof IntersectionObserver !== "function") {
      setNear(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setNear(entry.isIntersecting);
        }
      },
      { rootMargin: `${NEAR_MARGIN}px` },
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return { ref, near };
}

function ShowcaseFrame({
  slide,
  width,
  cover,
  ground,
}: {
  slide: DemoSlide;
  /** A CSS width: 260px, or narrower on a short screen while pinned. */
  width: string;
  /** The closed cover, already drawn; see Showcase. */
  cover: ReactNode;
  /** The card's ground colour: what a frame shows until its card is in it. */
  ground: string;
}): ReactElement {
  const { ref, near } = useNear<HTMLElement>();
  const screenRef = useRef<HTMLDivElement>(null);
  /*
    How much the card is brought down to fit the frame. The card is drawn at a
    phone's size and scaled, so its type and its ornaments keep the
    proportions they have on a phone. Right for a 260px frame from the first
    paint; measured for one made narrower by a short screen.
  */
  const [scale, setScale] = useState<number>(SCREEN_WIDTH / DEMO_STAGE_WIDTH);

  useIsomorphicLayoutEffect(() => {
    const screen = screenRef.current;

    if (screen === null || typeof ResizeObserver !== "function") {
      return;
    }

    const measure = (): void => {
      const measured = screen.clientWidth;

      if (measured > 0) {
        setScale(measured / DEMO_STAGE_WIDTH);
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(screen);

    return () => observer.disconnect();
  }, []);

  return (
    <figure
      ref={ref}
      className="flex shrink-0 snap-center flex-col items-center gap-4"
      style={{ width }}
    >
      {/*
        The bezel. A rounded border and a soft shadow, warmed with the rose so
        it reads as a phone lying on the page rather than a black cut-out.
      */}
      <div className="relative w-full rounded-[2.25rem] border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] p-2 shadow-[0_28px_60px_-28px_rgba(0,0,0,0.85),0_18px_50px_-30px_rgba(196,86,107,0.35)]">
        <div
          ref={screenRef}
          className="relative aspect-[9/19.5] overflow-hidden rounded-[1.75rem]"
          style={{ backgroundColor: ground }}
        >
          {/*
            The card, at a phone's size, scaled to the frame. Inert and
            untouchable: see the note at the top of this file.
          */}
          <div
            aria-hidden="true"
            inert
            className="lifafa-demo-still pointer-events-none absolute top-0 left-0 origin-top-left overflow-hidden select-none"
            style={{
              width: DEMO_STAGE_WIDTH,
              height: DEMO_STAGE_HEIGHT,
              transform: `scale(${scale})`,
            }}
          >
            {slide.screen === "closed" ? (
              cover
            ) : near ? (
              <DemoSlideCard section={slide.screen} />
            ) : null}
          </div>
        </div>

        {/*
          The whole frame, as one link to the card itself. Laid over the card
          and not wrapped round it: the card has links of its own, which a
          link may not contain.
        */}
        <Link
          href={DEMO_NIKAH_PATH}
          draggable={false}
          aria-label={`${slide.caption}. ${slide.label} Opens the full sample card.`}
          className="absolute inset-0 rounded-[2.25rem] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
        />
      </div>

      <figcaption className="max-w-full text-center text-sm leading-snug text-[var(--lifafa-muted)]">
        {slide.caption}
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
        One card, screen by screen.
      </h2>
      <p className="mx-auto mt-4 max-w-[34ch] text-base leading-relaxed text-balance text-[var(--lifafa-muted)] sm:text-lg">
        A sample Nikah invitation, exactly as a guest sees it.
      </p>
    </div>
  );
}

/** The way into the card itself, under the row. */
function OpenFullCard(): ReactElement {
  return (
    <div className="flex justify-center px-6">
      <Link
        href={DEMO_NIKAH_PATH}
        className={[
          "inline-flex min-h-12 items-center justify-center rounded-full",
          "bg-[var(--lifafa-marigold)] px-8 text-base font-semibold text-[var(--lifafa-ink)]",
          "shadow-[0_10px_30px_-12px_rgba(232,163,61,0.55)]",
          "transition-[transform,box-shadow] duration-200 ease-out",
          "hover:-translate-y-0.5 hover:shadow-[0_20px_44px_-14px_rgba(232,163,61,0.75)]",
          "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]",
          "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        ].join(" ")}
      >
        Open the full card
      </Link>
    </div>
  );
}

export default function Showcase({
  cover,
  ground,
}: {
  /**
   * The sample's closed cover, drawn on the server (DemoCoverSlide) and
   * handed in as it stands, so none of what it is drawn from is in this
   * component's script.
   */
  cover: ReactNode;
  /** The sample card's ground colour, read from its palette on the server. */
  ground: string;
}): ReactElement {
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
      The row travels from the first frame centred on the screen to the last
      one centred, so it always has somewhere to go: on a very wide monitor
      where all of them would fit side by side, a row pinned to the edges
      would never move at all.

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
    DEMO_NIKAH_SLIDES.map((slide) => (
      <ShowcaseFrame
        key={slide.id}
        slide={slide}
        width={width}
        cover={cover}
        ground={ground}
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
          The runway: four screens of scroll, the first spent arriving and the
          rest moving the row. Only the screen inside it is pinned. A screen
          longer than it was for five frames, so eight do not go by any faster.
        */}
        <div ref={runwayRef} className="relative h-[400vh]">
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

        {/* Under the row, which here is once the row has been let go. */}
        <div className="pt-10">
          <OpenFullCard />
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
        The swipeable row. Padded by half the screen less half a frame on each
        side, so snapping to the centre can bring the first and last frames to
        the middle of the screen as well as the ones between them.

        Focusable, so a keyboard can scroll it with the arrow keys; named, so
        what that focus has landed on is announced.
      */}
      <div
        tabIndex={0}
        role="region"
        aria-label="A sample invitation, screen by screen, scrolls sideways"
        className="lifafa-no-scrollbar mt-12 flex snap-x snap-mandatory gap-6 overflow-x-auto overscroll-x-contain px-[calc(50%-130px)] pt-2 pb-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
      >
        {frames(`${FRAME_WIDTH}px`)}
      </div>

      <p className="mt-2 text-center text-sm text-[var(--lifafa-muted)] lg:hidden">
        Swipe to see more.
      </p>

      <div className="mt-8">
        <OpenFullCard />
      </div>
    </section>
  );
}
