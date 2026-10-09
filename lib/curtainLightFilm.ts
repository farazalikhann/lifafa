/**
 * The curtain cover's film: velvet curtains opening on a golden light that
 * grows until the whole frame is plain warm ivory, which the card then comes
 * out of.
 *
 * One of the films that end in light; see lib/lightFilm.ts for what they
 * share, and LightFilmCover for how one is played.
 *
 * HOW IT WAS CUT, as lib/coverVideos.ts records for the others. The source is
 * 1080x1920 at 24fps, six seconds. Frames 15-123: a quarter of a second of
 * stillness, the curtains start at 0.25s, the light floods from about 2.9s
 * and the frame is all light by 4.2s. The source's last frames are ivory with
 * a faint vignette, so the film is blended to one flat colour over frames
 * 95-105 of the cut and its last four frames are exactly that colour, which
 * is `light` below as a browser decodes it: rgb 246, 237, 219, from either
 * file. The generator's mark sits on plain velvet clear of the fringe, where
 * ffmpeg's delogo leaves no smudge.
 *
 *   -filter_complex "[0:v]trim=start_frame=15:end_frame=124,setpts=N/24/TB,
 *       delogo=x=858:y=1698:w=84:h=84,
 *       scale=720:1280:flags=lanczos:in_color_matrix=bt601:in_range=tv,format=gbrp[v];
 *     color=c=0xF7EDDA:s=720x1280:r=24,format=gbrap,
 *       fade=t=in:st=3.9583:d=0.4167:alpha=1[c];
 *     [v][c]overlay=shortest=1:format=gbrp,
 *       scale=out_color_matrix=bt709:out_range=tv,format=yuv420p" -an
 *     -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv
 *   mp4:  -c:v libx264 -profile:v high -preset slow -crf 23 -movflags +faststart
 *   webm: -c:v libvpx-vp9 -b:v 0 -crf 31 two-pass
 *   poster: the published MP4's first frame, WebP at quality 85
 *   small:  the same cut from the same source at scale=480:854 and s=480x854,
 *     two-pass, -c:v libx264 -profile:v high -preset veryslow -b:v 690k
 */

import { curtainArt } from "@/lib/curtainArt";
import {
  LIGHT_FADE_MS,
  LIGHT_FADE_TO_DARK_MS,
  lightFilmArt,
  lightFilmTiming,
  type LightFilm,
} from "@/lib/lightFilm";

const FOLDER = "/decor/curtain-light-video";

export const CURTAIN_LIGHT_FILM: LightFilm = {
  mp4: `${FOLDER}/curtain-light.mp4`,
  webm: `${FOLDER}/curtain-light.webm`,
  mp4Small: `${FOLDER}/curtain-light-480.mp4`,
  poster: `${FOLDER}/curtain-light-poster.webp`,
  lengthMs: 4540,
  lightAtMs: 4375,
  /* The light floods from here; the shell's Skip goes with it. */
  glowAtMs: 2900,
  glowMs: 1300,
  light: "#F6EDDB",
  /* The velvet at the film's edges. */
  surround: "#420D11",
  fadeMs: LIGHT_FADE_MS,
  fadeToDarkMs: LIGHT_FADE_TO_DARK_MS,
  /* The film holds still for a moment before the cloth moves. */
  soundDelayMs: 200,
};

/*
  The inks are the cloth's, as they were for the drawn curtains; it is the
  same dark velvet under the words.
*/
const { tone, ink, inkMuted, plaque, plaqueEdge, plaqueInk } = curtainArt();

export const curtainLightArt = lightFilmArt(CURTAIN_LIGHT_FILM, {
  tone,
  ink,
  inkMuted,
  plaque,
  plaqueEdge,
  plaqueInk,
});

export const curtainLightTiming = lightFilmTiming(CURTAIN_LIGHT_FILM);
