"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type RefObject,
} from "react";
import { useCardStill } from "@/hooks/useCardStill";
import { useFloatingPause } from "@/hooks/useFloatingPause";
import { scrollerOf } from "@/lib/openingKeepOut";
import { type SceneArt, type SceneDusk, type SceneGrounding } from "@/lib/scene";

/**
 * The painted scene on a card's opening screen: in the flow of that screen,
 * straight after the sacred line (or the calligraphy, where there is no
 * line), and running on into the names' screen under it. Not a screen of its
 * own, and never at a fixed place: it starts where the words end, whether
 * they are a short Bismillah or a shlok of four lines, so there is no gap
 * over it.
 *
 * TWO PIECES, BECAUSE OF WHAT GOES BETWEEN THE PAINTING AND THE WORDS. The
 * card is drawn back to front as its ground, the scene, what flies, the
 * opening's words, then the border and what hangs: a butterfly passes over
 * the painting and behind the words. The words are in the reading column,
 * which is one layer, and what flies is a layer of its own, so the painting
 * cannot be in the column with the words. So:
 *
 *   the slot    is in the column, in the flow of the opening screen, and is
 *               nothing but the painting's room: its width, its height and
 *               how far it is pulled up under the words (globals.css,
 *               `lifafa-scene-slot`). CardCanvas draws it, since this file
 *               is fetched after the card and the room has to be there first.
 *   SceneScreen is a layer of the card under the layer that flies, and draws
 *               the painting exactly over that room. It reads the slot's
 *               place from the layout (offsets, so a scaled card is right
 *               too), before the first paint and again whenever the card or
 *               the opening changes size. Nothing is read as the page
 *               scrolls: both pieces scroll together.
 *
 * FULL BLEED. The slot is as wide as the card, edge to edge, not the reading
 * column: wider than the box it is laid out in by the insets it is told of
 * (`inset`). The card's border and its corners are layers above, and are
 * drawn over the painting.
 *
 * ITS SIZE is the painting's: the card's width by one and a half of it. The
 * first screen shows it whole from its hill line down, a set distance under
 * the last line of the words, and as much of the plain sky over that as the
 * slot reaches up into, behind the words; see `lifafa-opening-scene` in
 * globals.css.
 *
 * IT MEETS THE WORDS AND THE NEXT SCREEN WITHOUT AN EDGE. Its plain sky is
 * behind the words, never its hills, and its top 22% and bottom quarter fade
 * into the card by a mask on the box
 * and not in the picture: what shows through is the card's own ground, with
 * its royal texture where it has one. The mask is on the box that holds
 * still; the picture moves inside it. On a dark card the ends pass through a
 * glow of the card's own hue on the way (sceneDusk in lib/scene.ts), and on
 * every dark card the painting gives its sky up to the card altogether
 * (sceneGrounding, and `groundedMask` below).
 *
 * IT IS A LITTLE FURTHER AWAY THAN THE CARD. As the guest scrolls the first
 * screen the painting goes up the screen at 85% of the speed the card does:
 * a translate on the painting inside its box, and nothing else. The box
 * holds still on the card, with its edge fades and its dusk, so the fades are
 * always at the box's edges. The painting is its own size, the card's width
 * by one and a half of it, and stands on the foot of the box, so at the top
 * of the card its ground is all there; the box cuts off the top of its sky,
 * and that is the room it travels in, so its own edges never come into the
 * box. Once it has travelled that far it goes on with the card. What belongs to the painting moves with it:
 * the mask that takes its sky away at the line of its hills, and the tint
 * with its band over the lights. Fixed to the box, the sky would come back
 * under the hills as they moved, and the band would leave the lights.
 *
 * One write of transform per frame, in a requestAnimationFrame, and only
 * while a scroll is under way: the scroll offset comes with the scroll event,
 * and where the painting is on the card was read when it was placed. Not at
 * all while the scene is off the screen or the tab is hidden
 * (useFloatingPause), under reduced motion, on a card drawn still, or on a
 * phone that says it has 4GB of memory or less.
 *
 * IT IS ASKED FOR AS SOON AS THE CARD IS IN THE PAGE, which on a guest's link
 * is while the cover is still over it: the film plays, and the painting is
 * there when it lifts. Which copy is the guest's own business (the 720px one
 * on a slow connection or for a guest who asked to save data, the 1080px one
 * otherwise), so the address is set in the browser and not in the page as
 * served. The slot is its full size from the first paint and the picture
 * carries its own width and height, so nothing on the card moves when it
 * arrives; it fades in.
 */

/** The painting's own size in px, at its larger copy. Both copies are this shape. */
const ART_WIDTH = 720;
const ART_HEIGHT = 1080;

/** How fast the painting goes up the screen, as a share of the card's own speed. */
const PARALLAX_SPEED = 0.85;
/**
 * How far the painting may travel down its box, as a share of its own
 * height. The room is sky: the painting stands on the foot of its box, whole
 * from its hill line down, and what the box cuts off is the top of its sky.
 * It travels down into the box by no more than that, so its top edge never
 * comes in, and by no more than this, so little of its ground goes out under
 * the fade at the foot. The slot leaves this much sky over itself; see
 * `--scene-room` in globals.css, which is the same number.
 */
const PARALLAX_ROOM = 0.06;

/** Whether this guest gets the parallax: not one who asked for less motion, nor a phone short of memory. */
function parallaxWanted(): boolean {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;

  return (
    !(
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) && !(typeof memory === "number" && memory <= 4)
  );
}

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

/**
 * One end of a scene on a dark card, as gradient stops from the edge inward:
 * the card's ground, deepening into its glow by an eighth of the way down,
 * and the glow thinning to nothing by three tenths, a little less at each
 * step than the last.
 */
function duskStops(dusk: SceneDusk): string {
  const thinning = [
    [13, 0.86],
    [16, 0.7],
    [19, 0.5],
    [22, 0.32],
    [25, 0.17],
    [28, 0.07],
    [31, 0],
  ];

  return [
    `${dusk.ground} 0%`,
    `${dusk.ground} 4%`,
    ...thinning.map(([at, alpha]) => `hsl(${dusk.glow} / ${alpha}) ${at}%`),
  ].join(", ");
}

const percent = (share: number): string =>
  `${(Math.max(0, Math.min(1, share)) * 100).toFixed(1)}%`;

function gradient(stops: readonly (readonly number[])[]): string {
  return `linear-gradient(to bottom, ${stops
    .map(([at, alpha]) => `rgb(0 0 0 / ${alpha}) ${percent(at)}`)
    .join(", ")})`;
}

/**
 * The box's own mask on a dark card, which holds still: the first tenth at
 * the top, the dusk laid in over it, and the foot. The foot is a dark card's
 * last tenth, or from `bottom` on a card of another colour than the night,
 * eased on the curve the ordinary mask has.
 */
function edgeMask({ bottom }: SceneGrounding): string {
  return gradient([
    [0, 0],
    [0.03, 0.35],
    [0.06, 0.8],
    [0.09, 1],
    ...(bottom === null
      ? [
          [0.91, 1],
          [0.94, 0.8],
          [0.97, 0.35],
          [1, 0],
        ]
      : [
          [0, 1],
          [0.23, 0.85],
          [0.5, 0.45],
          [0.77, 0.1],
          [1, 0],
        ].map(([at, alpha]) => [bottom + (1 - bottom) * at, alpha])),
  ]);
}

/**
 * The painting's own mask on a dark card, which goes with the painting: its
 * sky given up to the card. Nothing at the top and all of it by `top`, the
 * line of its hills, as a share of the painting's height. Late and steep:
 * next to nothing for the first three fifths of the way, so the sky is gone
 * and not thinned, and then all of it over the last of the way, where the
 * hills and the treetops are.
 */
function skyMask({ top }: SceneGrounding): string {
  return gradient([
    [0, 0],
    [top * 0.6, 0.04],
    [top * 0.8, 0.3],
    [top * 0.92, 0.75],
    [top, 1],
    [1, 1],
  ]);
}

/**
 * How strongly the tint is laid down the painting: all of it over the sky
 * and the hills, and again over the water at the foot, and none across the
 * band between, where the windows, the lanterns and their reflections are.
 * Those are gold, and under the card's colour they were brown. Eased in and
 * out over TINT_EDGE of the height, outside the band, so the band itself is
 * clear from end to end. In shares of the painting's height, and laid on the
 * painting: it goes where the painting goes.
 */
const TINT_EDGE = 0.08;

function tintMask([from, to]: readonly [number, number]): string {
  const fall = [
    [0, 1],
    [0.4, 0.6],
    [0.75, 0.15],
    [1, 0],
  ];
  return `linear-gradient(to bottom, ${[
    "rgb(0 0 0 / 1) 0%",
    ...fall.map(([at, alpha]) => `rgb(0 0 0 / ${alpha}) ${percent(from - TINT_EDGE * (1 - at))}`),
    ...(to >= 1
      ? []
      : [...fall]
          .reverse()
          .map(([at, alpha]) => `rgb(0 0 0 / ${alpha}) ${percent(to + TINT_EDGE * (1 - at))}`)),
    ...(to >= 1 ? [] : ["rgb(0 0 0 / 1) 100%"]),
  ].join(", ")})`;
}

export default function SceneScreen({
  art,
  dusk = null,
  grounding = null,
  slot,
}: {
  art: SceneArt;
  /** How its ends meet a dark card; null on a light one. See sceneDusk. */
  dusk?: SceneDusk | null;
  /** How it gives its sky up to a dark card; null on a light one. See sceneGrounding. */
  grounding?: SceneGrounding | null;
  /** The room it is drawn over: the slot CardCanvas put in the opening screen. */
  slot: RefObject<HTMLDivElement | null>;
}): ReactElement {
  const layer = useRef<HTMLDivElement>(null);
  const mover = useRef<HTMLDivElement>(null);
  const still = useCardStill();
  const [src, setSrc] = useState<string | null>(null);
  const [shown, setShown] = useState<boolean>(false);
  /* False on the server and for the first render, and set before the first paint. */
  const [parallax, setParallax] = useState<boolean>(false);
  /* What the parallax needs of the layout, written when the painting is placed and read on a scroll. */
  const travel = useRef({ room: 0, cardStart: 0, scroller: null as HTMLElement | null });

  /* Marks the layer while the scene is off the screen or the tab is hidden; the parallax reads the mark. */
  const pause = useFloatingPause();
  const setLayer = useCallback(
    (node: HTMLDivElement | null) => {
      layer.current = node;

      return pause(node);
    },
    [pause],
  );

  /* At once, and again when the host picks another painting or a ground that takes the other one. */
  useEffect(() => {
    setShown(false);
    setSrc(copyFor(art));
  }, [art]);

  useLayoutEffect(() => {
    setParallax(!still && parallaxWanted());
  }, [still]);

  /*
    The painting, PARALLAX_SPEED as fast up the screen as the card: it is let
    down its box by the rest of the scroll, until it has used the room it has.
    The scroll offset is taken as its event arrives and the transform written
    in the next frame, one write however many events the frame brought.
  */
  useEffect(() => {
    const box = layer.current;
    const painting = mover.current;

    if (!parallax || box === null || painting === null) {
      return;
    }

    let frame = 0;
    let scrolled = 0;

    const write = (): void => {
      frame = 0;
      const { room, cardStart } = travel.current;
      const down = Math.min(Math.max((scrolled - cardStart) * (1 - PARALLAX_SPEED), 0), room);

      painting.style.transform = `translate3d(0, ${down.toFixed(1)}px, 0)`;
    };

    const onScroll = (): void => {
      const scroller = travel.current.scroller;
      scrolled = scroller === null ? window.scrollY : scroller.scrollTop;

      if (frame === 0 && !box.hasAttribute("data-floating-paused")) {
        frame = window.requestAnimationFrame(write);
      }
    };

    const passiveCapture: AddEventListenerOptions = { passive: true, capture: true };
    /* Capture, so a scroll inside the editor's preview frame is heard too. */
    window.addEventListener("scroll", onScroll, passiveCapture);
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll, passiveCapture);
      window.cancelAnimationFrame(frame);
      painting.style.transform = "";
    };
  }, [parallax]);

  /*
    Over its slot. From offsets up to the card, which are the layout's own
    numbers: a card drawn scaled in a frame reports them unscaled, as the
    layer's own top and left are. Before the first paint, and whenever the
    card (which grows with anything in it), the opening or the slot changes
    size; the faces arriving change the opening's.
  */
  useLayoutEffect(() => {
    const box = layer.current;
    const room = slot.current;
    const card = box?.offsetParent;

    if (box === null || room === null || !(card instanceof HTMLElement)) {
      return;
    }

    let live = true;

    const place = (): void => {
      if (!live) {
        return;
      }

      let top = 0;
      let left = 0;
      let node: HTMLElement | null = room;

      while (node !== null && node !== card) {
        top += node.offsetTop;
        left += node.offsetLeft;
        node = node.offsetParent instanceof HTMLElement ? node.offsetParent : null;
      }

      box.style.top = `${top}px`;
      box.style.left = `${left}px`;
      box.style.width = `${room.offsetWidth}px`;
      box.style.height = `${room.offsetHeight}px`;
      box.style.visibility = "visible";

      /*
        For the parallax, while the layout is being read anyway: how far the
        painting may travel, what scrolls the card, and how far down that the
        card starts.
      */
      const scroller = scrollerOf(card);
      const cardBox = card.getBoundingClientRect();
      const scale = card.offsetWidth > 0 ? cardBox.width / card.offsetWidth || 1 : 1;

      /* The painting is the box's width by one and a half of it; what the box is short of that is sky. */
      const full = room.offsetWidth * 1.5;

      travel.current = {
        room: Math.max(0, Math.min(full * PARALLAX_ROOM, full - room.offsetHeight)),
        scroller,
        cardStart:
          scroller === null
            ? cardBox.top + window.scrollY
            : (cardBox.top - scroller.getBoundingClientRect().top) / scale + scroller.scrollTop,
      };
    };

    place();

    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(place) : null;
    observer?.observe(card);
    observer?.observe(room);

    if (room.parentElement !== null) {
      observer?.observe(room.parentElement);
    }

    window.addEventListener("resize", place);
    void document.fonts?.ready.then(place);

    return () => {
      live = false;
      observer?.disconnect();
      window.removeEventListener("resize", place);
    };
  }, [slot]);

  const mask = grounding !== null ? edgeMask(grounding) : null;
  const sky = grounding !== null ? skyMask(grounding) : null;

  return (
    <div
      ref={setLayer}
      aria-hidden="true"
      className={`lifafa-scene pointer-events-none absolute z-[5] overflow-hidden ${
        dusk !== null ? "lifafa-scene-dusk" : ""
      }`}
      style={{
        /* Nowhere until it has been put over its slot. */
        visibility: "hidden",
        ...(mask !== null ? { maskImage: mask, WebkitMaskImage: mask } : null),
      }}
    >
      {/*
        The painting and what belongs to it, at the painting's own size: the
        box's width by one and a half of it, on the foot of the box. A box
        shorter than that cuts off the top of its sky and nothing else.
      */}
      <div
        ref={mover}
        className="absolute inset-x-0 bottom-0"
        style={{
          aspectRatio: "2 / 3",
          willChange: parallax ? "transform" : undefined,
          ...(sky !== null ? { maskImage: sky, WebkitMaskImage: sky } : null),
        }}
      >
      {src !== null ? (
        <img
          key={src}
          src={src}
          alt=""
          width={ART_WIDTH}
          height={ART_HEIGHT}
          loading="eager"
          decoding="async"
          draggable={false}
          onLoad={() => setShown(true)}
          className="absolute inset-0 h-full w-full object-cover select-none transition-opacity duration-700 ease-out motion-reduce:transition-none"
          style={{ opacity: shown || still ? 1 : 0 }}
        />
      ) : null}

      {/*
        The card's own colour laid over the painting as colour alone: the
        painting keeps its lights and darks and leans to the card's hue, so a
        night of navy is not a blue band across a maroon card. One flat fill,
        never animated, and still on the painting; the painting's box is its
        own group (it is masked), so it tints the painting and nothing under
        it.
      */}
      {grounding !== null && grounding.tint > 0 && dusk !== null ? (
        <div
          className="lifafa-scene-tint absolute inset-0"
          style={{
            backgroundColor: dusk.ground,
            mixBlendMode: "color",
            opacity: grounding.tint,
            ...(grounding.lights !== null
              ? {
                  maskImage: tintMask(grounding.lights),
                  WebkitMaskImage: tintMask(grounding.lights),
                }
              : null),
          }}
        />
      ) : null}
      </div>

      {/*
        On a dark card: a quarter of the height at the foot, eased, from the
        card's ground through its glow to nothing. Over the picture and still;
        the box's own mask is then only the first and last tenth. At the top
        too only where the painting keeps its sky, which no night painting
        does: there the top of the box is the card's ground already, and a
        glow laid on it is a band of light under the words.
      */}
      {dusk !== null ? (
        <div
          className="absolute inset-0"
          style={{
            background: (grounding !== null ? ["to top"] : ["to bottom", "to top"])
              .map((side) => `linear-gradient(${side}, ${duskStops(dusk)})`)
              .join(", "),
          }}
        />
      ) : null}
    </div>
  );
}
