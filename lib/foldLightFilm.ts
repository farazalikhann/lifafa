/**
 * The gatefold cover's film: an ivory gatefold card that fills the screen,
 * tied with a maroon ribbon under a gold medallion. The ribbon slips off, the
 * two panels swing outwards, and a golden light behind them grows until the
 * whole frame is plain warm ivory, which the card then comes out of.
 *
 * One of the films that end in light; see lib/lightFilm.ts for what they
 * share, and LightFilmCover for how one is played.
 *
 * HOW IT WAS CUT. The source is 1080x1920 at 24fps, six seconds. Frames
 * 18-119: a fifth of a second of stillness, the ribbon loosens at 0.2s and is
 * gone by 1.1s, the panels swing from 1.15s, the light fills the frame from
 * about 2.9s and it is all light by 3.9s. The source's last frames are ivory
 * with the card's lower edge still showing as a thin darker line, so the film
 * is blended to one flat colour over frames 88-98 of the cut and its last
 * four frames are exactly that colour, which is `light` below as a browser
 * decodes it.
 *
 * THE GENERATOR'S MARK lies across the gold paisley in the lower right
 * corner, where blurring over it (ffmpeg's delogo, which did for the curtain
 * and the envelope) smears the ornament. So it is taken out in place, as
 * lib/coverVideos.ts describes: the mark is one colour laid over the picture
 * at an opacity that differs from pixel to pixel, seen = bg (1 - a) + W a.
 * Both were measured from the same mark over a dark ground and a light one,
 * and what was under it is worked back out, (seen - W a) / (1 - a), on a
 * 160px square at 820, 1660 before the film is scaled. W is 244, 241, 241.
 * A faint trace of the mark's outline is left while the panel it is on
 * swings; on the closed card, which is the still, there is none.
 *
 *   [0:v]trim=start_frame=18:end_frame=120,setpts=N/24/TB,
 *       scale=in_color_matrix=bt601:in_range=tv,format=gbrp,split[a][b];
 *     [b]crop=160:160:820:1660[c]; [1:v]format=gbrp[al];      (1: the opacity map)
 *     [c][al]blend=c0_expr='clip((A-240.95*B/255)/(1-B/255),0,255)':c1_expr=...
 *     [a][u]overlay=820:1660:format=gbrp,scale=720:1280:flags=lanczos,format=gbrp[v];
 *     color=c=0xF6F0DD:s=720x1280:r=24,format=gbrap,
 *       fade=t=in:st=3.6667:d=0.4167:alpha=1[k];
 *     [v][k]overlay=shortest=1:format=gbrp,
 *       scale=out_color_matrix=bt709:out_range=tv,format=yuv420p   -an
 *     -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv
 *   mp4:  -c:v libx264 -profile:v high -preset slow -crf 21 -movflags +faststart
 *   webm: -c:v libvpx-vp9 -b:v 0 -crf 24 two-pass
 *   poster: the published MP4's first frame, WebP at quality 85
 *   small:  the published MP4 itself, which has the mark already out of it,
 *     at scale=480:854:flags=lanczos, two-pass,
 *     -c:v libx264 -profile:v high -preset veryslow -b:v 735k
 */

import {
  LIGHT_FADE_MS,
  LIGHT_FADE_TO_DARK_MS,
  lightFilmArt,
  lightFilmTiming,
  type LightFilm,
} from "@/lib/lightFilm";

const FOLDER = "/decor/fold-light-video";

export const FOLD_LIGHT_FILM: LightFilm = {
  mp4: `${FOLDER}/fold-light.mp4`,
  webm: `${FOLDER}/fold-light.webm`,
  mp4Small: `${FOLDER}/fold-light-480.mp4`,
  poster: `${FOLDER}/fold-light-poster.webp`,
  lengthMs: 4250,
  lightAtMs: 4083,
  /* The light fills the frame from here; the shell's Skip goes with it. */
  glowAtMs: 2900,
  glowMs: 900,
  light: "#F5F0DD",
  /* The card at the film's edges. */
  surround: "#DDC7BA",
  fadeMs: LIGHT_FADE_MS,
  fadeToDarkMs: LIGHT_FADE_TO_DARK_MS,
  /*
    The sound has its two doors at 0.4s and 0.6s, and the film's panels start
    to swing at 1.15s, so it is held until its doors meet them.
  */
  soundDelayMs: 700,
  /*
    The medallion's plain face, inside its rim: 240px across in the 1080x1920
    source, centred at 541, 947. The lettering is laid out on a little less,
    so it keeps clear of the rim.
  */
  mark: { x: 541 / 1080, y: 947 / 1920, width: 236 / 1080 },
  /*
    Deep maroon cut into gold: a lit lip under each stroke, where the cut's
    lower wall catches the light, and a thin shade along its top.
  */
  ink: {
    hi: "#7A1626",
    body: "#5A0E1B",
    lo: "#3A0810",
    shadow: "0 0.04em 0 rgba(255, 238, 178, 0.8), 0 -0.025em 0.03em rgba(58, 20, 0, 0.5)",
  },
};

/*
  The card is pale paper from edge to edge on every invitation, so the words
  over it are dark and warm and the plaque is ivory, whatever the card inside.
*/
export const foldLightArt = lightFilmArt(FOLD_LIGHT_FILM, {
  tone: "light",
  ink: "#4A3410",
  inkMuted: "rgba(74, 52, 16, 0.9)",
  plaque: "rgba(255, 251, 240, 0.9)",
  plaqueEdge: "#C2913A",
  plaqueInk: "#80560F",
});

export const foldLightTiming = lightFilmTiming(FOLD_LIGHT_FILM);
