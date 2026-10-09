/**
 * The rose bloom cover's film: a red rose among dark leaves that opens, a
 * golden light that comes out of its heart and grows until the whole frame is
 * plain warm ivory, which the card then comes out of.
 *
 * One of the films that end in light; see lib/lightFilm.ts for what they
 * share, and LightFilmCover for how one is played.
 *
 * NOTHING DRAWN TO FALL BACK TO. The curtain, the envelope and the gatefold
 * were each drawn in code before they were filmed, and that drawing opens
 * when the film cannot play. There was never a drawn rose. So this one's
 * still gives way to the card in a soft crossfade, `plainFadeMs`, and that is
 * the whole of its fallback.
 *
 * THE WORDS SIT AT THE FOOT. The rose is the middle of the frame, where every
 * other cover keeps the head clear, so "You are invited" and the names are
 * set in the lower third, over a band of the leaves' own dark that thins
 * upwards: the mist the breeze cover lays under its words, turned over.
 *
 * HOW IT WAS CUT. The source is 1080x1920 at 24fps, six seconds. Frames
 * 8-125: the rose opens from the first frame, slowly, and has filled the
 * width by 2.5s; the light shows in its heart from 2.9s, fills the frame from
 * about 3.8s and it is all light by 4.5s. The source's last frames are ivory
 * with a faint unevenness, so the film is blended to one flat colour over
 * frames 104-114 of the cut and its last four frames are exactly that
 * colour, which is `light` below as a browser decodes it. The generator's
 * mark lies on leaves that are out of focus, where ffmpeg's delogo leaves no
 * smudge.
 *
 *   -filter_complex "[0:v]trim=start_frame=8:end_frame=126,setpts=N/24/TB,
 *       delogo=x=858:y=1698:w=84:h=84,
 *       scale=720:1280:flags=lanczos:in_color_matrix=bt601:in_range=tv,format=gbrp[v];
 *     color=c=0xF3E8D9:s=720x1280:r=24,format=gbrap,
 *       fade=t=in:st=4.3333:d=0.4167:alpha=1[k];
 *     [v][k]overlay=shortest=1:format=gbrp,
 *       scale=out_color_matrix=bt709:out_range=tv,format=yuv420p" -an
 *     -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv
 *   mp4:  -c:v libx264 -profile:v high -preset slow -crf 19 -movflags +faststart
 *   webm: -c:v libvpx-vp9 -b:v 0 -crf 15 two-pass
 *   poster: the published MP4's first frame, WebP at quality 85
 *   small:  the same cut from the same source at scale=480:854 and s=480x854,
 *     two-pass, -c:v libx264 -profile:v high -preset veryslow -b:v 635k
 *   thumb:  the same frame's rose, 560px square from 80, 260, scaled to 144
 */

import {
  LIGHT_FADE_MS,
  LIGHT_FADE_TO_DARK_MS,
  lightFilmArt,
  lightFilmTiming,
  type LightFilm,
} from "@/lib/lightFilm";

const FOLDER = "/decor/rose-bloom-video";

/** The rose alone, small: what the designer's picker shows beside the cover's name. */
export const ROSE_BLOOM_THUMB = `${FOLDER}/rose-bloom-thumb.webp`;

/** How long the still takes to give way to the card when the film cannot play. */
export const ROSE_BLOOM_PLAIN_FADE_MS = 600;

export const ROSE_BLOOM_FILM: LightFilm = {
  mp4: `${FOLDER}/rose-bloom.mp4`,
  webm: `${FOLDER}/rose-bloom.webm`,
  mp4Small: `${FOLDER}/rose-bloom-480.mp4`,
  poster: `${FOLDER}/rose-bloom-poster.webp`,
  lengthMs: 4915,
  lightAtMs: 4750,
  /* The light fills the frame from here; the shell's Skip goes with it. */
  glowAtMs: 3800,
  glowMs: 700,
  light: "#F2E8D8",
  /* The leaves at the film's edges. */
  surround: "#484229",
  fadeMs: LIGHT_FADE_MS,
  fadeToDarkMs: LIGHT_FADE_TO_DARK_MS,
  /* The rose is opening from the first frame; nothing is held for. */
  soundDelayMs: 0,
  plainFadeMs: ROSE_BLOOM_PLAIN_FADE_MS,
  /* The shade between the leaves at the foot of the frame. */
  band: "#12140B",
};

/*
  Dark leaves from edge to edge on every card, so the words over them are
  pale and the plaque is dark, whatever the card is. And at the foot: the
  rose has the middle.
*/
export const roseBloomArt = lightFilmArt(ROSE_BLOOM_FILM, {
  tone: "dark",
  wordsAt: "foot",
  ink: "#FBF4E6",
  inkMuted: "rgba(251, 244, 230, 0.9)",
  plaque: "rgba(24, 14, 10, 0.86)",
  plaqueEdge: "#D9B25F",
  plaqueInk: "#F1D38A",
});

export const roseBloomTiming = lightFilmTiming(ROSE_BLOOM_FILM);
