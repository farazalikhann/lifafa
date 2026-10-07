/**
 * The envelope cover's film: a cream envelope that fills the screen, its wax
 * seal breaking, the flap lifting off, and a golden light pouring out of it
 * until the whole frame is plain warm ivory, which the card then comes out of.
 *
 * One of the films that end in light; see lib/lightFilm.ts for what they
 * share, and LightFilmCover for how one is played.
 *
 * HOW IT WAS CUT. The source is 1080x1920 at 24fps, six seconds. Frames
 * 22-113: a fifth of a second of stillness, the seal cracks at 0.2s, the flap
 * lifts from 0.9s and is off the top by 2.0s, the light fills the frame from
 * about 2.7s and it is all light by 3.4s. The source's last frames are ivory
 * with a faint unevenness, so the film is blended to one flat colour over
 * frames 78-88 of the cut and its last four frames are exactly that colour,
 * which is `light` below as a browser decodes it. The generator's mark sits
 * on plain paper clear of the border, where ffmpeg's delogo leaves no smudge.
 *
 *   -filter_complex "[0:v]trim=start_frame=22:end_frame=114,setpts=N/24/TB,
 *       delogo=x=858:y=1698:w=84:h=84,
 *       scale=720:1280:flags=lanczos:in_color_matrix=bt601:in_range=tv,format=gbrp[v];
 *     color=c=0xEEE6D8:s=720x1280:r=24,format=gbrap,
 *       fade=t=in:st=3.25:d=0.4167:alpha=1[c];
 *     [v][c]overlay=shortest=1:format=gbrp,
 *       scale=out_color_matrix=bt709:out_range=tv,format=yuv420p" -an
 *     -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv
 *   mp4:  -c:v libx264 -profile:v high -preset slow -crf 18 -movflags +faststart
 *   webm: -c:v libvpx-vp9 -b:v 0 -crf 11 two-pass
 *   poster: the published MP4's first frame, WebP at quality 85
 *
 * Paper compresses to very little, so the quality is set high to spend the
 * budget the other films have: the seal's cracks and the paper's grain are
 * what a guest is looking at.
 */

import {
  LIGHT_FADE_MS,
  LIGHT_FADE_TO_DARK_MS,
  lightFilmArt,
  lightFilmTiming,
  type LightFilm,
} from "@/lib/lightFilm";

const FOLDER = "/decor/envelope-light-video";

export const ENVELOPE_LIGHT_FILM: LightFilm = {
  mp4: `${FOLDER}/envelope-light.mp4`,
  webm: `${FOLDER}/envelope-light.webm`,
  poster: `${FOLDER}/envelope-light-poster.webp`,
  lengthMs: 3830,
  lightAtMs: 3667,
  /* The light fills the frame from here; the shell's Skip goes with it. */
  glowAtMs: 2700,
  glowMs: 800,
  light: "#EEE6D8",
  /* The paper at the film's edges. */
  surround: "#E8DDD0",
  fadeMs: LIGHT_FADE_MS,
  fadeToDarkMs: LIGHT_FADE_TO_DARK_MS,
  /* The sound opens on its wax crackle, which waits for the seal to break. */
  soundDelayMs: 200,
  /*
    The seal's plain face, inside its innermost ring: 210px across in the
    1080x1920 source, centred at 527, 1058.
  */
  mark: { x: 527 / 1080, y: 1058 / 1920, width: 210 / 1080 },
  /*
    Gold cut into dark red wax: a shade along the top of each stroke, where
    the cut's own wall keeps the light off it, and a thin lit lip under it.
  */
  ink: {
    hi: "#F6E2A6",
    body: "#DDB660",
    lo: "#8F6420",
    shadow:
      "0 -0.035em 0.02em rgba(40, 4, 6, 0.85), 0 0.03em 0.01em rgba(255, 224, 160, 0.4), 0 0 0.12em rgba(40, 4, 6, 0.35)",
  },
};

/*
  The envelope is pale paper from edge to edge on every card, so the words
  over it are dark and warm and the plaque is ivory, whatever the card is.
*/
export const envelopeLightArt = lightFilmArt(ENVELOPE_LIGHT_FILM, {
  tone: "light",
  ink: "#4A3410",
  inkMuted: "rgba(74, 52, 16, 0.9)",
  plaque: "rgba(255, 251, 240, 0.9)",
  plaqueEdge: "#C2913A",
  plaqueInk: "#80560F",
});

export const envelopeLightTiming = lightFilmTiming(ENVELOPE_LIGHT_FILM);
