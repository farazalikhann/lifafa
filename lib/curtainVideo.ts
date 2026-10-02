/**
 * The curtain cover's film: real velvet curtains parting, cut from supplied
 * footage with ffmpeg and published to public/decor/curtain-video/.
 *
 * HOW IT WAS CUT, since nothing in the repo runs at build time and the next
 * person to replace it needs the numbers. The source is 1280x720 at 24fps and
 * ten seconds long: the curtains open, close and open again. The piece used
 * is frames 10 to 70 of the first opening (0.42s to 2.96s). The crop is the
 * 405x720 column centred on the seam, which stands at x=638 — columns 435 to
 * 839 — scaled to 720x1280. The generator's mark sits at x 1136-1184, far
 * outside it. No audio.
 *
 *   -vf "trim=start_frame=10:end_frame=71,setpts=PTS-STARTPTS,
 *        crop=405:720:435:0,scale=720:1280:flags=lanczos" -an
 *   mp4:  -c:v libx264 -preset veryslow -crf 27 -pix_fmt yuv420p -movflags +faststart
 *   webm: -c:v libvpx-vp9 -b:v 0 -crf 38 -pix_fmt yuv420p
 *
 * ONE FILM, MAROON, ON EVERY CARD. The painted curtains it replaces came in
 * maroon and in cream, chosen by the card's ground. There is only this
 * footage, so a light card opens from behind maroon velvet too.
 */

import type { CoverArt } from "@/types/coverAnimation";

/** The film, in the two encodings, and its first and last frames as stills. */
export const CURTAIN_VIDEO = {
  mp4: "/decor/curtain-video/curtain-open.mp4",
  webm: "/decor/curtain-video/curtain-open.webm",
  /** The first frame: the curtains closed. What the cover shows until it is tapped. */
  poster: "/decor/curtain-video/curtain-closed.webp",
} as const;

/** The film's length, which is the cover's. */
export const CURTAIN_VIDEO_MS = 2540;

/**
 * Where the film's own events fall, as shares of its length: the curtains
 * start to part at 0.30s and have left the picture by 1.92s. What is left
 * after that is the valance over black, which is what the film is faded out
 * across so the card is never shown a black frame.
 */
export const CURTAIN_VIDEO_FADE = { start: 0.3, share: 0.44 } as const;

/** The flat colour round the film on a screen wider than it: the velvet's own shade. */
export const CURTAIN_VELVET = "#3A1114";

/**
 * What the shell needs of this cover: the one picture that must be in before
 * it is shown, and the inks that read over maroon velvet. The same whatever
 * the card's ground is.
 */
const ART: CoverArt = {
  images: [CURTAIN_VIDEO.poster],
  ink: "#FBF4E6",
  inkMuted: "rgba(251, 244, 230, 0.86)",
  plaque: "rgba(46, 8, 16, 0.84)",
  plaqueEdge: "#D9B25F",
  plaqueInk: "#F1D38A",
};

export function curtainVideoArt(): CoverArt {
  return ART;
}
