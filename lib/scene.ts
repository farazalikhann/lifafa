import { hueAndSaturation, relativeLuminance } from "@/lib/contrast";
import type { Scene } from "@/types/card";

/**
 * The painted scene on a card's first screen: a lake palace, a palace garden
 * or a tree in a valley, or none. Under the opening's last line and running
 * on into the names' screen, as wide as the card, on every tradition's card;
 * drawn by components/card/SceneScreen.tsx and chosen in
 * components/create/ScenePanel.tsx.
 *
 * Each is painted twice, by day and by night, 2:3, and published whole by
 * scripts/cut-scenes.mjs: a light card draws the day and a dark card the
 * night (sceneArtFor). The card fades its top and bottom into its own colour.
 */

export const DEFAULT_SCENE: Scene = "palaceGarden";

export const SCENES: readonly { id: Scene; label: string }[] = [
  { id: "lakePalace", label: "Lake palace" },
  { id: "palaceGarden", label: "Palace garden" },
  { id: "valleyTree", label: "Valley tree" },
  { id: "off", label: "Off" },
];

/**
 * The three scenes there were first, on cards saved with one of them: each is
 * now the scene nearest it, so no saved card needs changing.
 */
const FORMER_SCENES: Record<string, Scene> = {
  floralArch: "valleyTree",
  gardenPavilion: "palaceGarden",
  lakesideGazebo: "lakePalace",
};

export interface SceneArt {
  /** 1080px tall: what a phone draws. */
  src: string;
  /** 720px tall: for a slow connection, or a guest who asked to save data. */
  small: string;
  /** 240px tall, for the editor's chip. */
  thumb: string;
  /**
   * A night painting's sky: its hue in degrees, measured over the top of the
   * published file, and how far down the painting it runs before the line of
   * the hills, as a share of the height. `lights` is the band of the painting
   * its lit things are in (windows, lanterns, their reflections), from and to
   * as shares of the height, where a tint is lifted so gold stays gold; none
   * for a painting whose lights have the night's blue right beside them. See
   * sceneGrounding.
   */
  sky?: { hue: number; clearBy: number; lights?: readonly [number, number] };
}

/** Every scene's shape: width over height. */
export const SCENE_ASPECT = 2 / 3;

/** A scene's two paintings: by day for a light card, by night for a dark one. */
const ART: Record<Exclude<Scene, "off">, { light: SceneArt; dark: SceneArt }> = {
  lakePalace: {
    light: art("lake-palace-light"),
    /* The palace's windows and the nearer half of their reflections; the water past that is navy and little else. */
    dark: { ...art("lake-palace-dark"), sky: { hue: 213, clearBy: 0.4, lights: [0.42, 0.6] } },
  },
  palaceGarden: {
    light: art("palace-garden-light"),
    /*
      A violet dusk over the garden, running to maroon behind the trees: gone
      only once the trees have closed over it, so their tops fade a little.
    */
    dark: {
      ...art("palace-garden-dark"),
      /* Lit from the pavilion down to its foot, and no blue in it anywhere. */
      sky: { hue: 275, clearBy: 0.42, lights: [0.45, 1] },
    },
  },
  valleyTree: {
    light: art("valley-tree-light"),
    /*
      No band of its own: the lanterns hang in a tree with navy hills either
      side of it at the same height, and a band clear of the tint is those
      hills blue again.
    */
    dark: { ...art("valley-tree-dark"), sky: { hue: 215, clearBy: 0.4 } },
  },
};

/** A ground this dark or darker is a dark card: it gets the night painting, and a dusk at its ends. */
const DARK_GROUND = 0.4;

function art(name: string): SceneArt {
  return {
    src: `/decor/scenes/${name}.webp`,
    small: `/decor/scenes/small/${name}.webp`,
    thumb: `/decor/scenes/thumbs/${name}.webp`,
  };
}

/**
 * Absent from every card saved before there were scenes, and from every card
 * whose host has not chosen: a missing or unknown value is the palace
 * garden, so every card has one until its host turns it off. A card saved
 * with one of the first three scenes has the one that took its place.
 */
export function sceneOf(value: unknown): Scene {
  if (typeof value === "string" && Object.hasOwn(FORMER_SCENES, value)) {
    return FORMER_SCENES[value];
  }

  return SCENES.find((option) => option.id === value)?.id ?? DEFAULT_SCENE;
}

/**
 * How a scene meets a dark card, or null on a light one.
 *
 * Each painting ends in pale wash at its top and its foot. Faded straight
 * into a dark ground, pale paint at half strength over maroon is a band of
 * pinkish brown, and over navy or black a band of grey: mud, whatever the
 * length of the fade. So on a dark card the ends pass through a colour on the
 * way: the card's ground, then a deep, clear shade of the card's own hue (its
 * accent's hue where the ground has none of its own, as on Ink), thinning out
 * over the painting like the last light of a dusk. See SceneScreen.
 *
 * A dark card draws the night painting now, whose own ends are dark, so the
 * glow is only a little above the ground: at the strength it had under a pale
 * painting it stood out over the night sky as a band of light.
 */
export interface SceneDusk {
  /** The card's ground. */
  ground: string;
  /** The glow between the ground and the painting, as hue, saturation and lightness. */
  glow: string;
}

export function sceneDusk(background: string, accent: string): SceneDusk | null {
  if (relativeLuminance(background) > DARK_GROUND) {
    return null;
  }

  const own = hueAndSaturation(background);

  /* Quieter where the hue is borrowed from the accent: a near-black card has no colour to glow in. */
  return own.saturation >= 0.25
    ? { ground: background, glow: `${own.hue.toFixed(0)} 46% 21%` }
    : { ground: background, glow: `${hueAndSaturation(accent).hue.toFixed(0)} 32% 17%` };
}

/**
 * How a night painting gives its sky up to a dark card, or null on a light
 * one, which has the day painting.
 *
 * ON EVERY DARK CARD the card's own ground is the sky: the painting comes in
 * only by the line of its hills (`top`). A painted sky is a band of its own
 * colour over the card, navy on two of the nights and violet running to
 * maroon on the third, and no dark card's ground is that colour exactly.
 *
 * ON A DARK CARD OF ANOTHER COLOUR there is the water too, and the cast of
 * the whole painting: on Maroon a navy night is a blue band between maroon
 * and maroon. So there the painting also goes out sooner at its foot
 * (`bottom`), and is leaned toward the card's colour by `tint`, the card's
 * ground laid over it as colour alone. Another colour is more than SKY_FAR
 * degrees of hue, from the painting's own sky and from the navy of a night as
 * well; the second half is what leaves a navy card untinted under the one
 * painting whose sky is violet. On Midnight a night's water and its cast are
 * the card's own already.
 *
 * A near-black ground (Ink, Forest) has little colour to give, so there the
 * tint mostly quiets the navy: the lights stay warm and the band goes.
 */
export interface SceneGrounding {
  /** Where the painting is all there, from the top, as a share of its height. */
  top: number;
  /** Where it starts to go, toward the foot; null where it goes as on any dark card. */
  bottom: number | null;
  /** How strongly the card's ground is laid over it as colour, 0 to 1. */
  tint: number;
  /**
   * The band the tint is lifted from, from and to as shares of the height,
   * or null for a tint laid evenly: where the painting's lights are, which
   * are gold and under the card's colour were brown.
   */
  lights: readonly [number, number] | null;
}

/** How many degrees of hue apart a card and a sky are before the card takes the sky over. */
const SKY_FAR = 40;
/** The navy of a night sky, in degrees: the lake's and the valley's. */
const NIGHT_BLUE = 214;
const GROUNDED_BOTTOM = 0.65;
/** The least that takes the blue out of a navy night on Maroon: at 0.3 and 0.4 a strip of indigo is left over the hills. */
const GROUNDED_TINT = 0.5;

function hueApart(a: number, b: number): number {
  const apart = Math.abs(a - b) % 360;

  return apart > 180 ? 360 - apart : apart;
}

export function sceneGrounding(art: SceneArt, background: string): SceneGrounding | null {
  if (art.sky === undefined || relativeLuminance(background) > DARK_GROUND) {
    return null;
  }

  const ground = hueAndSaturation(background);

  const another =
    hueApart(ground.hue, art.sky.hue) > SKY_FAR && hueApart(ground.hue, NIGHT_BLUE) > SKY_FAR;

  return {
    top: art.sky.clearBy,
    bottom: another ? GROUNDED_BOTTOM : null,
    tint: another ? GROUNDED_TINT : 0,
    lights: art.sky.lights ?? null,
  };
}

/**
 * The picture for a choice on a card of this ground, or null for "off": the
 * night painting on a dark card, by the test sceneDusk makes, and the day
 * painting on a light one.
 */
export function sceneArtFor(scene: Scene, background: string): SceneArt | null {
  if (scene === "off") {
    return null;
  }

  return relativeLuminance(background) > DARK_GROUND ? ART[scene].light : ART[scene].dark;
}

/** The editor's chip for a choice, or null for "off": the day painting, whatever the card. */
export function sceneThumb(scene: Scene): string | null {
  return scene === "off" ? null : ART[scene].light.thumb;
}
