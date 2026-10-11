import { hueAndSaturation, relativeLuminance } from "@/lib/contrast";
import type { Scene } from "@/types/card";

/**
 * The painted scene between a card's first screen and its second: a floral
 * arch, a garden pavilion or a lakeside gazebo, or none. A screen of its own
 * on every tradition's card, drawn by components/card/SceneScreen.tsx and
 * chosen in components/create/ScenePanel.tsx.
 *
 * Each is a 9:16 watercolour published whole by scripts/cut-scenes.mjs. The
 * card fades its top and bottom into its own colour, so one file serves
 * every palette.
 */

export const DEFAULT_SCENE: Scene = "floralArch";

export const SCENES: readonly { id: Scene; label: string }[] = [
  { id: "floralArch", label: "Floral arch" },
  { id: "gardenPavilion", label: "Garden pavilion" },
  { id: "lakesideGazebo", label: "Lakeside gazebo" },
  { id: "off", label: "Off" },
];

export interface SceneArt {
  /** 1080px tall: what a phone draws. */
  src: string;
  /** 720px tall: for a slow connection, or a guest who asked to save data. */
  small: string;
  /** 240px tall, for the editor's chip. */
  thumb: string;
}

/** Every scene's shape: width over height. */
export const SCENE_ASPECT = 9 / 16;

const ART: Record<Exclude<Scene, "off">, SceneArt> = {
  floralArch: art("floral-arch"),
  gardenPavilion: art("garden-pavilion"),
  lakesideGazebo: art("lakeside-gazebo"),
};

function art(name: string): SceneArt {
  return {
    src: `/decor/scenes/${name}.webp`,
    small: `/decor/scenes/small/${name}.webp`,
    thumb: `/decor/scenes/thumbs/${name}.webp`,
  };
}

/**
 * Absent from every card saved before there were scenes, and from every card
 * whose host has not chosen: a missing or unknown value is the floral arch,
 * so every card has one until its host turns it off.
 */
export function sceneOf(value: unknown): Scene {
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
 */
export interface SceneDusk {
  /** The card's ground. */
  ground: string;
  /** The glow between the ground and the painting, as hue, saturation and lightness. */
  glow: string;
}

export function sceneDusk(background: string, accent: string): SceneDusk | null {
  if (relativeLuminance(background) > 0.4) {
    return null;
  }

  const own = hueAndSaturation(background);

  /* Quieter where the hue is borrowed from the accent: a near-black card has no colour to glow in. */
  return own.saturation >= 0.25
    ? { ground: background, glow: `${own.hue.toFixed(0)} 50% 33%` }
    : { ground: background, glow: `${hueAndSaturation(accent).hue.toFixed(0)} 36% 28%` };
}

/** The picture for a choice, or null for "off". */
export function sceneArt(scene: Scene): SceneArt | null {
  return scene === "off" ? null : ART[scene];
}
