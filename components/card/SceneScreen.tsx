"use client";

import { useEffect, useState, type CSSProperties, type ReactElement } from "react";
import { useCardStill } from "@/hooks/useCardStill";
import { type SceneArt, type SceneDusk } from "@/lib/scene";

/**
 * The painted scene on a card's opening screen: in the flow of that screen,
 * straight after the sacred line (or the calligraphy, where there is no
 * line), and running on into the names' screen under it. Not a screen of its
 * own, and never at a fixed place: it starts where the words end, whether
 * they are a short Bismillah or a shlok of four lines, so there is no gap
 * over it.
 *
 * FULL BLEED. As wide as the card, edge to edge, not the reading column: its
 * box is wider than the column it is laid out in by the insets it is told of
 * (`inset`), and the card's border, its corners, what hangs and what flies
 * are all layers above the column, so they are drawn over the painting.
 * Behind the column's own words, which it is pulled up under.
 *
 * ITS SIZE is the card's width by one and a half of it, the painting's own
 * shape, and never more than 78% of the screen's height. Where that cuts it
 * short the picture covers the box from 60% of the way down, so the horizon
 * stays in it. All of it in globals.css (`lifafa-scene`), from the two
 * lengths set here.
 *
 * IT MEETS THE WORDS AND THE NEXT SCREEN WITHOUT AN EDGE. It is pulled up by
 * 12% of its height, so its plain sky is behind the foot of the sacred line,
 * and its top 22% and bottom quarter fade into the card by a mask on the box
 * and not in the picture: what shows through is the card's own ground, with
 * its royal texture where it has one. The mask is on the box that holds
 * still; the picture moves inside it. On a dark card the ends pass through a
 * glow of the card's own hue on the way (sceneDusk in lib/scene.ts).
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
 * served. The box is its full size from the first paint and the picture
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

export default function SceneScreen({
  art,
  dusk = null,
  inset,
  maxHeight,
}: {
  art: SceneArt;
  /** How its ends meet a dark card; null on a light one. See sceneDusk. */
  dusk?: SceneDusk | null;
  /**
   * How far the box it is laid out in stands in from the card's edge on each
   * side, as a CSS length: what the scene steps back out by to reach the edge.
   */
  inset: string;
  /** The most it may be tall, as a CSS length: 78% of the screen. */
  maxHeight: string;
}): ReactElement {
  const still = useCardStill();
  const [src, setSrc] = useState<string | null>(null);
  const [shown, setShown] = useState<boolean>(false);

  /* At once, and again when the host picks another painting or a ground that takes the other one. */
  useEffect(() => {
    setShown(false);
    setSrc(copyFor(art));
  }, [art]);

  return (
    <div
      aria-hidden="true"
      className={`lifafa-scene pointer-events-none relative overflow-hidden ${
        dusk !== null ? "lifafa-scene-dusk" : ""
      }`}
      style={{ "--scene-inset": inset, "--scene-cap": maxHeight } as CSSProperties}
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
