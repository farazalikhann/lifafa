/**
 * The curtain cover's film: velvet curtains opening on a golden light that
 * grows until the whole frame is plain warm ivory, which the card then comes
 * out of.
 *
 * ONE FILM, FOR EVERY CARD. It does not end on the card, or on a backdrop to
 * fade through, but on a flat colour, so the same footage hands over to a
 * cream card and to an ink one. Only the hand-over's length differs.
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
 */

import { curtainArt } from "@/lib/curtainArt";
import type { CoverArt, CoverFilmTiming } from "@/types/coverAnimation";

const FOLDER = "/decor/curtain-light-video";

export const CURTAIN_LIGHT_FILM = {
  mp4: `${FOLDER}/curtain-light.mp4`,
  webm: `${FOLDER}/curtain-light.webm`,
  /** The first frame: the curtains closed. What is shown until it is tapped. */
  poster: `${FOLDER}/curtain-light-poster.webp`,
  /** The film's own length, in milliseconds. */
  lengthMs: 4540,
  /** From when every frame is the flat light and nothing else. */
  lightAtMs: 4375,
  /** When the light starts to flood the frame, and how long it takes to. */
  glowAtMs: 2900,
  glowMs: 1300,
  /** The flat colour of the film's last frames, as decoded. */
  light: "#F6EDDB",
  /** The velvet at the film's edges: what stands beside it on a wide screen until the light comes. */
  surround: "#420D11",
  /** How long the light takes to give way to a light card, and to a dark one. */
  fadeMs: 800,
  fadeToDarkMs: 1100,
  /** The film holds still for a moment before the cloth moves. */
  soundDelayMs: 200,
} as const;

/** How long the film is waited for after the tap, before the drawn curtains open instead. */
export const CURTAIN_LIGHT_WAIT_MS = 1500;

/** How long past its own length a film that started is given to reach the light. */
export const CURTAIN_LIGHT_STALL_MS = 1500;

/**
 * What the shell needs before the cover is shown: the film's first frame and
 * nothing else. The inks are the cloth's, as they were for the drawn curtains;
 * it is the same dark velvet under the words.
 */
export function curtainLightArt(): CoverArt {
  return ART;
}

const { tone, ink, inkMuted, plaque, plaqueEdge, plaqueInk } = curtainArt();
const ART: CoverArt = {
  images: [CURTAIN_LIGHT_FILM.poster],
  tone,
  ink,
  inkMuted,
  plaque,
  plaqueEdge,
  plaqueInk,
};

/**
 * The shell's timers for this cover are a net, not the clock. The visual
 * follows the film itself and retimes the shell when the film reaches the
 * light, or when the drawn curtains open in its place; see CurtainLightCover.
 * This is the longest any of that can take: the wait, the film, its grace and
 * the slower of the two fades.
 */
export function curtainLightTiming(): CoverFilmTiming {
  return TIMING;
}

const NET_MS =
  CURTAIN_LIGHT_WAIT_MS +
  CURTAIN_LIGHT_FILM.lengthMs +
  CURTAIN_LIGHT_STALL_MS +
  CURTAIN_LIGHT_FILM.fadeToDarkMs;

const TIMING: CoverFilmTiming = {
  durationMs: NET_MS,
  revealAt: 1 - CURTAIN_LIGHT_FILM.fadeToDarkMs / NET_MS,
  soundDelayMs: CURTAIN_LIGHT_FILM.soundDelayMs,
};
