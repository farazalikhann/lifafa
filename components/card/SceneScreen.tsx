"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type RefObject,
} from "react";
import { useCardStill } from "@/hooks/useCardStill";
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
 * ITS SIZE is the card's width by one and a half of it, the painting's own
 * shape, and never more than 78% of the screen's height. Where that cuts it
 * short the picture covers the box from 60% of the way down, so the horizon
 * stays in it.
 *
 * IT MEETS THE WORDS AND THE NEXT SCREEN WITHOUT AN EDGE. It is pulled up by
 * 12% of its height, so its plain sky is behind the foot of the sacred line,
 * and its top 22% and bottom quarter fade into the card by a mask on the box
 * and not in the picture: what shows through is the card's own ground, with
 * its royal texture where it has one. The mask is on the box that holds
 * still; the picture moves inside it. On a dark card the ends pass through a
 * glow of the card's own hue on the way (sceneDusk in lib/scene.ts), and on
 * every dark card the painting gives its sky up to the card altogether
 * (sceneGrounding, and `groundedMask` below).
 *
 * IT MOVES WITH THE SCROLL, AND ONLY ON THE COMPOSITOR. As the guest scrolls
 * through it the picture grows from its own size to 1.08 of it and drifts up
 * a little: one keyframe animation of transform alone, on a view timeline
 * (`lifafa-scene-art` in globals.css), so no script runs as the page scrolls
 * and nothing is measured. Still under reduced motion, on a card drawn still,
 * and in a browser without view timelines.
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

/**
 * The mask of a painting that gives its sky up to the card: nothing at the
 * top, all of it by `top` (the line of its hills), all of it down to
 * `bottom`, and nothing at the foot. Eased both ways, on the curve the
 * ordinary mask has. With no `bottom` of its own the foot is a dark card's
 * as it was: the last tenth, the dusk laid in over it.
 */
function groundedMask({ top, bottom }: SceneGrounding): string {
  if (bottom === null) {
    return groundedMaskOver(top, [
      [0.91, 1],
      [0.94, 0.8],
      [0.97, 0.35],
      [1, 0],
    ]);
  }

  return groundedMaskOver(
    top,
    [
      [0, 1],
      [0.23, 0.85],
      [0.5, 0.45],
      [0.77, 0.1],
      [1, 0],
    ].map(([at, alpha]) => [bottom + (1 - bottom) * at, alpha]),
  );
}

/**
 * How strongly the tint is laid down the painting: all of it over the sky
 * and the hills, and again over the water at the foot, and none across the
 * band between, where the windows, the lanterns and their reflections are.
 * Those are gold, and under the card's colour they were brown. Eased in and
 * out over TINT_EDGE of the height, outside the band, so the band itself is
 * clear from end to end. Fixed to the box, like the box's own mask.
 */
const TINT_EDGE = 0.08;

function tintMask([from, to]: readonly [number, number]): string {
  const fall = [
    [0, 1],
    [0.4, 0.6],
    [0.75, 0.15],
    [1, 0],
  ];
  const percent = (share: number): string => `${(Math.max(0, Math.min(1, share)) * 100).toFixed(1)}%`;

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

function groundedMaskOver(top: number, foot: readonly (readonly number[])[]): string {
  /*
    Late and steep: next to nothing for the first three fifths of the way, so
    the sky is gone and not thinned, and then all of it over the last of the
    way, where the hills and the treetops are.
  */
  const rise = [
    [0, 0],
    [0.6, 0.04],
    [0.8, 0.3],
    [0.92, 0.75],
    [1, 1],
  ];
  const percent = (share: number): string => `${(share * 100).toFixed(1)}%`;

  return `linear-gradient(to bottom, ${[
    ...rise.map(([at, alpha]) => `rgb(0 0 0 / ${alpha}) ${percent(top * at)}`),
    ...foot.map(([at, alpha]) => `rgb(0 0 0 / ${alpha}) ${percent(at)}`),
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
  const still = useCardStill();
  const [src, setSrc] = useState<string | null>(null);
  const [shown, setShown] = useState<boolean>(false);

  /* At once, and again when the host picks another painting or a ground that takes the other one. */
  useEffect(() => {
    setShown(false);
    setSrc(copyFor(art));
  }, [art]);

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

  const mask = grounding !== null ? groundedMask(grounding) : null;

  return (
    <div
      ref={layer}
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
          className={`absolute inset-0 h-full w-full object-cover object-[center_60%] select-none transition-opacity duration-700 ease-out motion-reduce:transition-none ${
            still ? "" : "lifafa-scene-art"
          }`}
          style={{ opacity: shown || still ? 1 : 0 }}
        />
      ) : null}

      {/*
        The card's own colour laid over the painting as colour alone: the
        painting keeps its lights and darks and leans to the card's hue, so a
        night of navy is not a blue band across a maroon card. Still, and one
        flat fill; the box is its own group (it is masked), so it tints the
        painting and nothing under it.
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

      {/*
        On a dark card: a quarter of the height at each end, eased, from the
        card's ground through its glow to nothing. Over the picture and still;
        the box's own mask is then only the first and last tenth.
      */}
      {dusk !== null ? (
        <div
          className="absolute inset-0"
          style={{
            background: ["to bottom", "to top"]
              .map((side) => `linear-gradient(${side}, ${duskStops(dusk)})`)
              .join(", "),
          }}
        />
      ) : null}
    </div>
  );
}
