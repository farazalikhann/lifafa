/**
 * The Ribbon & Seal cover's film: an ivory gatefold card painted with roses
 * and jasmine, tied with a satin and lace bow over a rose gold wax seal. The
 * bow comes undone and the ribbon slips away, the two panels swing outwards,
 * and a golden light behind them grows until the whole frame is plain warm
 * ivory, which the card then comes out of.
 *
 * One of the films that end in light; see lib/lightFilm.ts for what they
 * share, and LightFilmCover for how one is played.
 *
 * NOTHING DRAWN TO FALL BACK TO, like the rose (lib/roseBloomFilm.ts). The
 * gatefold drawn in code is another card, maroon ribbon and gold medallion,
 * and opening that in this one's place would be a different cover. So when
 * the film cannot play, its still gives way to the card in a soft crossfade,
 * `plainFadeMs`, and that is the whole of its fallback.
 *
 * THE WORDS SIT AT THE HEAD, on the paper. The top third of the card, between
 * its two scalloped edges, is plain embossed paper: wide at the top and
 * narrowing to the bow. "You are invited" and the names are set there, in a
 * column no wider than the paper, and the line that follows them on the other
 * covers is left off, because by its third row the paper is narrower than a
 * word. See `wordsWidth` and `wordsLine` on CoverArt.
 *
 * HOW IT WAS CUT. The source is 1080x1920 at 24fps, six seconds, 144 frames.
 * Frames 0-129: the bow starts to give at 0.17s and is undone by 1.3s, the
 * ribbon is gone by 2s, the panels part from about 3s, the light shows
 * between them from 3.2s and fills the frame from about 4.3s, and it is all
 * light by 5.25s. The source's last frames are ivory with a faint unevenness
 * and the trace of a panel's edge, so the film is blended to one flat colour
 * over frames 116-126 of the cut and its last four frames are exactly that
 * colour, which is `light` below as a browser decodes it.
 *
 * THE GENERATOR'S MARK, a pale four-pointed star at x 844-935, y 1701-1784,
 * is in every frame, and on the closed card, which is the still, it lies
 * across a rose. Blurring over it (ffmpeg's delogo) smears the rose. So it is
 * taken out in place first, as lib/foldLightFilm.ts describes: the mark is one
 * colour, W = 244, 241, 241, laid over the picture at an opacity that differs
 * from pixel to pixel, seen = bg (1 - a) + W a. The opacity was measured on
 * this film's own last fourteen frames, where the mark lies on flat ivory (a
 * plane fitted to the rim of a 160px square at 820, 1660 is the ground, and
 * a is what is left over, at most 0.44), and what was under it is worked back
 * out on every frame, (seen - W a) / (1 - a). On the closed card nothing of
 * it is left. Over the moving panel and the light a faint outline is, and
 * there delogo does what it is good at: from frame 96, when the panel under
 * the mark has swung into blur, it runs over what remains.
 *
 *   clean.mkv: the 144 frames as RGB (scale=in_color_matrix=bt601:in_range=tv,
 *     format=rgb24), un-blended as above, written lossless (ffv1, gbrp)
 *   -i clean.mkv -filter_complex "[0:v]trim=end_frame=130,setpts=N/24/TB,
 *       delogo=x=838:y=1695:w=104:h=96:enable='gte(n,96)',
 *       scale=720:1280:flags=lanczos,format=gbrp[v];
 *     color=c=0xF2E4D6:s=720x1280:r=24,format=gbrap,
 *       fade=t=in:st=4.8333:d=0.4167:alpha=1[k];
 *     [v][k]overlay=shortest=1:format=gbrp,
 *       scale=out_color_matrix=bt709:out_range=tv,format=yuv420p" -an
 *     -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv
 *   mp4:  -c:v libx264 -profile:v high -preset slow -crf 24 -movflags +faststart
 *   webm: -c:v libvpx-vp9 -b:v 0 -crf 33 two-pass
 *     (the embossed paper is dear: at the rose's crf 19 and 15 these came to
 *     3.2 MB and 4.0 MB, so each was raised a step at a time to about 1.5 MB)
 *   poster: the published MP4's first frame, WebP at quality 66
 *   small:  the same cut from the same clean frames at scale=480:854 and
 *     s=480x854, two-pass, -c:v libx264 -profile:v high -preset veryslow
 *     -b:v 560k
 *   thumb:  the same frame's bow and seal, 400px square from 160, 450,
 *     scaled to 144
 */

import {
  LIGHT_FADE_MS,
  LIGHT_FADE_TO_DARK_MS,
  lightFilmArt,
  lightFilmTiming,
  type LightFilm,
} from "@/lib/lightFilm";

const FOLDER = "/decor/ribbon-seal-video";

/** The bow and the seal, small: what the designer's picker shows beside the cover's name. */
export const RIBBON_SEAL_THUMB = `${FOLDER}/ribbon-seal-thumb.webp`;

/** How long the still takes to give way to the card when the film cannot play. */
export const RIBBON_SEAL_PLAIN_FADE_MS = 600;

export const RIBBON_SEAL_FILM: LightFilm = {
  mp4: `${FOLDER}/ribbon-seal.mp4`,
  webm: `${FOLDER}/ribbon-seal.webm`,
  mp4Small: `${FOLDER}/ribbon-seal-480.mp4`,
  poster: `${FOLDER}/ribbon-seal-poster.webp`,
  lengthMs: 5417,
  lightAtMs: 5250,
  /* The light fills the frame from here; the shell's Skip goes with it. */
  glowAtMs: 4300,
  glowMs: 700,
  light: "#F0E3D5",
  /* The card's own edge and the table it lies on, at the film's sides. */
  surround: "#A28C74",
  fadeMs: LIGHT_FADE_MS,
  fadeToDarkMs: LIGHT_FADE_TO_DARK_MS,
  /*
    The gatefold's own recording, which opens on its ribbon. The bow starts to
    give a sixth of a second into the film, as the recording's ribbon does, so
    nothing is held for: the ribbon is heard as it is seen, and the chime
    rings out over the panels opening.
  */
  soundDelayMs: 0,
  plainFadeMs: RIBBON_SEAL_PLAIN_FADE_MS,
};

/*
  Pale paper from edge to edge on every invitation, so the words over it are
  dark and warm and the plaque is ivory, whatever the card inside. The same
  inks as the gatefold's, which is the same paper.
*/
export const ribbonSealArt = lightFilmArt(RIBBON_SEAL_FILM, {
  tone: "light",
  ink: "#4A3410",
  inkMuted: "rgba(74, 52, 16, 0.9)",
  plaque: "rgba(255, 251, 240, 0.9)",
  plaqueEdge: "#C2913A",
  plaqueInk: "#80560F",
  /* The plain paper between the scallops, at the height the names end. */
  wordsWidth: "13.5rem",
  wordsLine: false,
});

export const ribbonSealTiming = lightFilmTiming(RIBBON_SEAL_FILM);
