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
}

/** Every scene's shape: width over height. */
export const SCENE_ASPECT = 2 / 3;

/** A scene's two paintings: by day for a light card, by night for a dark one. */
const ART: Record<Exclude<Scene, "off">, { light: SceneArt; dark: SceneArt }> = {
  lakePalace: { light: art("lake-palace-light"), dark: art("lake-palace-dark") },
  palaceGarden: { light: art("palace-garden-light"), dark: art("palace-garden-dark") },
  valleyTree: { light: art("valley-tree-light"), dark: art("valley-tree-dark") },
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
