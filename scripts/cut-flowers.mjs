/**
 * Cuts supplied artwork out of the background it arrived on and publishes it
 * as WebP: the flowers to public/decor/flowers/, the ornaments to
 * public/decor/ornaments/, the curtain cover's cloth to public/decor/curtain/,
 * the envelope cover's paper, liner and seal to public/decor/envelope/, the
 * petal dust cover's pictures to public/decor/petal-cover/, the fold cover's
 * arch and ribbon to public/decor/gatefold/, the scratch panel's frames and
 * foil to public/decor/scratch/, the floral dividers to public/decor/dividers/.
 *
 *   node scripts/cut-flowers.mjs              every set
 *   node scripts/cut-flowers.mjs flowers      just the flowers
 *   node scripts/cut-flowers.mjs ornaments    just the ornaments
 *   node scripts/cut-flowers.mjs ornaments toran kalash   just those two
 *   node scripts/cut-flowers.mjs calligraphy  just the calligraphy
 *   node scripts/cut-flowers.mjs curtain      just the curtain cover's cloth
 *   node scripts/cut-flowers.mjs envelope     just the envelope cover's paper and seal
 *   node scripts/cut-flowers.mjs petal-cover  just the petal dust cover's two pictures
 *   node scripts/cut-flowers.mjs gatefold     just the fold cover's arch and ribbon
 *   node scripts/cut-flowers.mjs scratch      just the scratch panel's frames and foil
 *   node scripts/cut-flowers.mjs dividers     just the floral dividers
 *
 * Run by hand when a picture is added or replaced — the output is committed,
 * so nothing here runs at build time. Uses the sharp that ships inside Next.js
 * rather than a dependency of our own.
 *
 * TWO BACKGROUNDS ARRIVE, AND EACH HAS ITS OWN CUT.
 *
 * On black — the flowers, the rose petals and the leaf before them (see
 * lib/petals.ts), and the diya. Coverage is read from brightness: a pixel's
 * brightest channel below LOW is background, above HIGH is artwork, and the
 * ramp between is the soft edge — which is also what lets the diya's glow fade
 * out rather than stop. The brightest channel rather than luminance because a
 * marigold's deep orange is dim in luminance and bright in red. An edge pixel
 * is artwork mixed with black in proportion to its coverage, so its colour is
 * divided by that coverage; otherwise it leaves a dark rim on a cream card.
 *
 * On a painted checkerboard — the garland, the toran, the om, the kalash and
 * Ganesh. They were exported with the grey-and-white "transparent" squares
 * drawn into the JPEG. The squares are two greys with no colour in them, but
 * they are not a clean grid: the period drifts from 16 to 21px between files
 * and the cells are smeared into each other, so matching a pixel to the colour
 * its cell ought to be would leave most of the background behind. What holds
 * instead is that every square, smeared or not, is grey with no colour in it,
 * and that the background is one piece reaching the edge of the picture. So:
 * a flood fill from the edges through pixels that are colourless and within
 * the measured range of the two greys. Nothing it cannot reach is removed —
 * a pocket of squares closed in by the ornament stays, and shows up in the
 * check afterwards rather than being guessed at. Then the rim: an edge pixel
 * is the ornament mixed with the grey behind it, so its coverage is read from
 * where it sits between that grey and the ornament's own colour a few pixels
 * in, and its colour is unmixed the same way the black cut divides it.
 *
 * Then cropped to what is left, and sized.
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const SOURCE = "photo border";
/** The envelope cover's artwork was supplied in a folder of its own. */
const ENVELOPE_SOURCE = "envelop open animation";
const LOW = 14;
const HIGH = 56;

const PIECE = 160;
const FLOWER = 240;

/** Source file for each published flower. The bud is not supplied yet. */
const FLOWERS = [
  { name: "lotus-petal", file: "WhatsApp Image 2026-09-26 at 11.43.31 PM.jpeg", fit: { long: PIECE } },
  { name: "lotus-flower", file: "WhatsApp Image 2026-09-26 at 11.43.31 PM (1).jpeg", fit: { long: FLOWER } },
  { name: "mogra-flower", file: "WhatsApp Image 2026-09-26 at 11.43.31 PM (2).jpeg", fit: { long: FLOWER } },
  { name: "marigold-petal", file: "WhatsApp Image 2026-09-26 at 11.43.32 PM.jpeg", fit: { long: PIECE } },
  { name: "marigold-flower", file: "WhatsApp Image 2026-09-26 at 11.43.32 PM (1).jpeg", fit: { long: FLOWER } },
].map((entry) => ({ ...entry, background: "black", out: join("public", "decor", "flowers") }));

/** The Hindu pack's ornaments. */
const ORNAMENTS = [
  {
    name: "diya",
    file: "WhatsApp Image 2026-09-27 at 2.45.33 PM.jpeg",
    background: "black",
    fit: { height: 320 },
    /*
      The bowl's engraving is cut deep enough to go nearly black, which the
      ramp reads as see-through: on cream the bowl came out speckled. Dark
      that the background cannot reach without crossing gold is the bowl's
      own shadow, and stays solid.
    */
    solidInside: true,
    /*
      The flame and its glow are light, not a surface. Treated as a surface
      the dim outer glow is a dark orange at nearly full cover, which is a
      brown ring on a cream card. As light, coverage follows brightness and
      the colour is lifted back to full: identical over black, and a glow
      that fades into cream. The box is the flame's, in the source's pixels,
      and blends into the bowl's cut over `feather` rows at its foot.
    */
    light: { x0: 960, y0: 100, x1: 1225, y1: 500, feather: 40 },
  },
  /*
    The kalash, Ganesh and the toran first came on a painted checkerboard and
    failed their cut — squares caught in pockets the ornament closes off. These
    are their replacements on black, with the swastik, which had none. Each
    keeps its own dark shading solid, as the diya's bowl does.
  */
  { name: "kalash", file: "ChatGPT Image Sep 27, 2026, 10_27_44 PM.png", background: "black", fit: { height: 320 }, solidInside: true },
  {
    name: "ganesh",
    file: "ChatGPT Image Sep 27, 2026, 10_27_49 PM.png",
    background: "black",
    fit: { height: 260 },
    solidInside: true,
    /*
      The gap between the trunk's curl and the right earring is closed off;
      see the toran. Ganesh's own dark hair at the temples is true black too,
      in patches up to about 60px, so only an area far bigger than those is
      taken for background — the gap is over 13,000.
    */
    pocketMin: 500,
  },
  { name: "swastik", file: "ChatGPT Image Sep 27, 2026, 10_27_55 PM.png", background: "black", fit: { height: 260 }, solidInside: true },
  { name: "om", file: "WhatsApp Image 2026-09-27 at 2.45.32 PM (1).jpeg", background: "checker", fit: { height: 260 } },
  {
    name: "toran",
    file: "ChatGPT Image Sep 27, 2026, 10_27_37 PM.png",
    background: "black",
    fit: { width: 1200 },
    solidInside: true,
    /*
      Two things the diya's rule gets wrong here. The cord closes off pockets
      of background under its swags, which "solid inside" fills with black;
      and the leaves' shaded edges are dark enough that a flood from the edges
      through anything below HIGH runs deep into them and washes them out.
      So the flood from the edges stops at a darker level, and an enclosed
      area of true black counts as background when it is big enough to be a
      pocket — the leaves' own black specks are far smaller, and stay solid.
    */
    floodBelow: 30,
    pocketMin: 40,
  },
  { name: "marigold-garland", file: "WhatsApp Image 2026-09-27 at 2.45.32 PM.jpeg", background: "checker", fit: { width: 1200 } },
].map((entry) => ({ ...entry, out: join("public", "decor", "ornaments") }));

/**
 * The Hindu calligraphy: white lettering on black, published as a white shape
 * whose alpha is the lettering's brightness. The card uses it as a CSS mask and
 * fills it with the card's accent, so only the alpha matters — see "mask" below.
 */
const CALLIGRAPHY = [
  {
    name: "shubh-vivah",
    file: "ChatGPT Image Sep 28, 2026, 01_43_47 AM.png",
    /*
      The supplied art has a small white smudge on the left of the ु under
      शु. It touches the stroke, so it is not a separate speck the cut could
      drop: it is erased in the published file, left of the stroke's own edge
      as the clean rows above and below it place that edge, and nothing the
      stroke is solid in is touched. In published pixels.
    */
    touchUp: { rows: [479, 490], edgeFrom: [478, 238.5], edgeTo: [491, 248.5], left: 234 },
  },
  { name: "sadar-nimantran", file: "ChatGPT Image Sep 28, 2026, 01_43_52 AM.png" },
  { name: "radhe-krishna", file: "ChatGPT Image Sep 28, 2026, 01_43_57 AM.png" },
  /* The second supply, which spells गणेशाय; the first was lettered गणराय. */
  { name: "shri-ganeshaya-namah", file: "ChatGPT Image Sep 28, 2026, 02_07_37 AM.png" },
  { name: "vivahotsav", file: "ChatGPT Image Sep 28, 2026, 01_44_07 AM.png" },
].map((entry) => ({
  ...entry,
  background: "mask",
  fit: { width: 900 },
  out: join("public", "decor", "calligraphy"),
}));

/**
 * The curtain cover's cloth: one panel and one valance, in maroon velvet and
 * in cream. See components/invite/covers/CurtainRevealCover.tsx, which hangs
 * the panel on the left and mirrors the same file for the right.
 *
 * THE CLOTH RUNS OFF THE PICTURE, AND ITS FOLDS ARE AS BLACK AS THE SHEET. A
 * tenth of the maroon velvet is true black, and those folds reach the top and
 * left edges of the panel and the top and sides of the valance. A flood from
 * every edge would start inside them and eat the cloth, so each is flooded
 * only from the edges that are background (`seeds`), and only through true
 * black: the sheet measures 0 to 2, so the flood stops at LOW rather than
 * HIGH and cannot follow a shadow in through the gold. Everything it does not
 * reach is solid. That leaves the anti-aliased edge of a tassel as a dark
 * solid pixel, a black rim on a cream card, so within two pixels of the
 * flood the edge is unmixed the way a flower's is (`softRim`).
 *
 * The panel's tassels hang skirt to skirt, and each pair closes off a pocket
 * of the sheet under the hem that no flood can reach. Those are taken as
 * background the way the toran's are, by size, but only where the whole
 * pocket lies below `pocketBelow` of the picture's height: under the hem's
 * trim, where there is no velvet for it to mistake a fold for. The dark
 * between the beads down the leading edge is left alone: most of it is the
 * beads' own shadow on the cloth, and clearing the few specks of it that are
 * sheet put pinholes down the seam.
 *
 * THE SEAM. The panel's leading edge is a row of beads hung off the border,
 * and it leans: seven pixels further right at the hem than at the rod. Two
 * panels meeting on a leaning, scalloped edge either gap or overlap. So each
 * row is slid across until the edge stands straight, and the panel is cut
 * down the middle of the beads — `inset` in from their outer edge, in the
 * source's pixels — so the mirrored half completes each bead, and the hem's
 * last tassel, on the centre line. `until` is how far down the picture the
 * edge is read: the hem and the tassels below it are not the edge.
 */
const CURTAIN = [
  {
    name: "curtain-left",
    file: "ChatGPT Image Oct 2, 2026, 09_25_22 AM.png",
    fit: { height: 1400 },
    seeds: ["right", "bottom"],
    pocketMin: 40,
    pocketBelow: 0.92,
    seam: { inset: 6, until: 0.88 },
    quality: 74,
  },
  {
    name: "curtain-valance",
    file: "ChatGPT Image Oct 2, 2026, 09_26_42 AM.png",
    fit: { width: 1200 },
    seeds: ["bottom"],
    quality: 66,
  },
  {
    name: "curtain-left-cream",
    file: "ChatGPT Image Oct 2, 2026, 09_27_48 AM.png",
    fit: { height: 1400 },
    seeds: ["right", "bottom"],
    pocketMin: 40,
    pocketBelow: 0.92,
    seam: { inset: 6, until: 0.88 },
    quality: 74,
  },
  {
    name: "curtain-valance-cream",
    file: "ChatGPT Image Oct 2, 2026, 09_29_40 AM.png",
    fit: { width: 1200 },
    seeds: ["bottom"],
    quality: 66,
  },
].map((entry) => ({
  ...entry,
  background: "black",
  solidInside: true,
  floodBelow: LOW,
  softRim: true,
  out: join("public", "decor", "curtain"),
}));

/**
 * The envelope cover's paper, the lining of its flap, and its wax seal. See
 * components/invite/covers/EnvelopeSealCover.tsx, which draws the envelope's
 * shape in code and fills it with these.
 *
 * THE THREE TEXTURES WERE SUPPLIED AS TILES AND NONE OF THEM TILES. Each is a
 * 1254px square holding a printed repeat that is not 1254px long, so laid
 * edge to edge the print jumps at every join.
 *
 * The liner repeats every 627px both ways, measured by autocorrelation (0.95
 * and 0.96 at 627, under 0.8 a pixel either side). One repeat is cut out and
 * that is the tile.
 *
 * The papers repeat every 731px across and not at all down: the paisleys run
 * off the top and the bottom edge and do not meet themselves. So one repeat
 * is cut across, and down the tile the motifs that reach the top or bottom
 * edge are taken off the paper — each covered with bare paper lifted from
 * beside it, feathered — leaving plain paper to join to plain paper.
 *
 * And every join is closed the same way, because hand-made paper's creases
 * do not repeat even where its print does: the first `blend` pixels of the
 * tile are faded in from the pixels that follow its far edge in the source,
 * so the tile's first row or column is the one that really came next.
 *
 * `period` and `blend` are in the source's pixels; a null period is "no
 * repeat this way: use the whole length, less the blend".
 */
const ENVELOPE = [
  {
    name: "envelope-paper-maroon",
    file: "ChatGPT Image Oct 2, 2026, 09_42_27 AM.png",
    background: "tile",
    period: [731, null],
    blend: 28,
    clearEdgeMotifs: true,
    fit: { width: 512 },
    quality: 62,
  },
  {
    name: "envelope-paper-cream",
    file: "ChatGPT Image Oct 2, 2026, 09_45_27 AM.png",
    background: "tile",
    period: [731, null],
    blend: 28,
    clearEdgeMotifs: true,
    fit: { width: 512 },
    quality: 62,
  },
  {
    name: "envelope-liner",
    file: "ChatGPT Image Oct 2, 2026, 09_46_36 AM.png",
    background: "tile",
    period: [627, 627],
    blend: 16,
    fit: { width: 512 },
    quality: 62,
  },
  /*
    The seal's wax is a red deep enough to go black in its own shadows, and
    stays solid the way the curtain's velvet does: flooded from the edges,
    through true black only, with the soft rim unmixed.
  */
  {
    name: "wax-seal",
    file: "ChatGPT Image Oct 2, 2026, 09_47_42 AM.png",
    background: "black",
    solidInside: true,
    floodBelow: LOW,
    softRim: true,
    fit: { width: 400 },
    quality: 66,
  },
].map((entry) => ({
  ...entry,
  source: ENVELOPE_SOURCE,
  out: join("public", "decor", "envelope"),
}));

/**
 * The petal dust cover: a carpet of petals round an empty oval, for a dark
 * card and for a light one. See components/invite/covers/PetalDustCover.tsx.
 *
 * Photographs that fill the screen, so there is nothing to cut out: each is
 * only sized and compressed. They arrived in the envelope's folder, not one
 * of their own. Each quality is the highest that keeps its file under 150 KB:
 * the dark one is busier in its shadows and takes a lower one to get there.
 */
const PETAL_COVER = [
  {
    name: "petal-cover-dark",
    file: "ChatGPT Image Oct 2, 2026, 10_07_01 AM.png",
    quality: 68,
  },
  {
    name: "petal-cover-light",
    file: "ChatGPT Image Oct 2, 2026, 10_08_29 AM.png",
    quality: 76,
  },
].map((entry) => ({
  ...entry,
  background: "photo",
  fit: { height: 1200 },
  source: ENVELOPE_SOURCE,
  out: join("public", "decor", "petal-cover"),
}));

/**
 * The fold cover's gold: an arch of filigree that frames its two doors, and
 * the ribbon tied across them. See components/invite/covers/FoldUnfoldCover.tsx.
 * They too arrived in the envelope's folder.
 *
 * THE ARCH IS A FRAME, AND MOST OF ITS BLACK IS INSIDE IT. The opening it
 * frames and every hole in its lattice are closed off from the picture's
 * edges, so a flood from the edges takes only the thin margin outside. The
 * rest is taken as the toran's pockets are: enclosed true black, of any size
 * a lattice hole can be. The gold's own shading is brown, not black, and is
 * not touched; `pocketMin` keeps the few specks of true black in it solid.
 *
 * ONLY ITS LEFT HALF IS PUBLISHED. The arch was drawn to be symmetrical and
 * is not quite: mirrored about its centre line, a pixel differs from its
 * twin by 9 levels in 255 on average. The two doors meet on that line, and
 * two halves that are nearly a pair would not meet. So the right door shows
 * the left half in a mirror, as the right curtain shows the left one, and
 * the two are a pair by construction — at half the download.
 *
 * SIZED TO A BUDGET. Filigree and lattice are the worst case for an alpha
 * channel: at 1200px tall with a lossless one, the half arch alone is 215 KB.
 * The two files together are held under 150 KB, so the arch is 1100px tall
 * and the ribbon 1000px wide, each with its alpha compressed as well — still
 * more pixels than a phone draws either of them at.
 */
const GATEFOLD = [
  {
    name: "gatefold-arch",
    file: "ChatGPT Image Oct 2, 2026, 10_37_53 AM.png",
    pocketMin: 12,
    half: "left",
    fit: { height: 1100 },
    quality: 44,
    alphaQuality: 62,
  },
  {
    name: "gatefold-ribbon",
    file: "ChatGPT Image Oct 2, 2026, 10_37_19 AM.png",
    fit: { width: 1000 },
    quality: 58,
    alphaQuality: 80,
  },
].map((entry) => ({
  ...entry,
  background: "black",
  solidInside: true,
  floodBelow: LOW,
  softRim: true,
  source: ENVELOPE_SOURCE,
  out: join("public", "decor", "gatefold"),
}));

/**
 * The scratch panel's two frames of roses and the foil a guest scratches off,
 * and the three garlands drawn between the card's sections. See
 * components/card/FramedScratch.tsx and components/card/FloralDivider.tsx.
 * These also arrived in the envelope's folder.
 *
 * The frames are the second pair supplied, a slim vine of roses: the first
 * pair were garlands thick enough to leave little room for what they framed.
 *
 * A FRAME'S OPENING IS BLACK THE FLOOD CANNOT REACH: it is closed in by the
 * frame on every side. So is every gap between a scroll of gold and the rose
 * beside it. All of it is sheet, and is taken as the toran's pockets are:
 * enclosed true black, once it is bigger than `pocketMin`. A rose's own
 * shadows are deep red rather than black, and the few specks of true black
 * in them are far smaller than that, so they stay solid.
 *
 * The foil was supplied as a tile and, like the envelope's papers, is closed
 * at both joins by fading its first pixels in from the ones past its far edge.
 */
const SCRATCH = [
  {
    name: "scratch-frame-oval",
    file: "ChatGPT Image Oct 2, 2026, 03_22_26 PM.png",
    fit: { height: 900 },
  },
  {
    name: "scratch-frame-rect",
    file: "ChatGPT Image Oct 2, 2026, 03_23_17 PM.png",
    fit: { width: 900 },
  },
].map((entry) => ({
  ...entry,
  background: "black",
  solidInside: true,
  floodBelow: LOW,
  softRim: true,
  pocketMin: 60,
  quality: 66,
  alphaQuality: 72,
  source: ENVELOPE_SOURCE,
  out: join("public", "decor", "scratch"),
})).concat([
  {
    name: "scratch-foil",
    file: "ChatGPT Image Oct 2, 2026, 11_59_35 AM.png",
    background: "tile",
    period: [null, null],
    blend: 48,
    fit: { width: 512 },
    quality: 58,
    source: ENVELOPE_SOURCE,
    out: join("public", "decor", "scratch"),
  },
]);

const DIVIDERS = [
  { name: "divider-rose", file: "ChatGPT Image Oct 2, 2026, 11_59_26 AM.png" },
  { name: "divider-marigold", file: "ChatGPT Image Oct 2, 2026, 11_59_19 AM.png" },
  { name: "divider-mogra", file: "ChatGPT Image Oct 2, 2026, 11_59_11 AM.png" },
].map((entry) => ({
  ...entry,
  background: "black",
  solidInside: true,
  floodBelow: LOW,
  softRim: true,
  pocketMin: 40,
  fit: { width: 1000 },
  quality: 66,
  alphaQuality: 78,
  source: ENVELOPE_SOURCE,
  out: join("public", "decor", "dividers"),
}));

/* --- On black ---------------------------------------------------------- */

/**
 * Coverage per pixel, and the colour it is un-darkened to.
 *
 * A fixed ramp is right for a dark flower and wrong for a white one: the
 * mogra's edge is grey in the photograph because it is half white and half
 * black, and a ramp that ends at HIGH calls that grey fully covered — a grey
 * rim on a cream card. So within EDGE_REACH of the background, coverage is
 * also read against the brightest pixel around it: grey beside white is half
 * covered, and comes out white, fading. Creases inside a flower are nowhere
 * near the background and keep the plain ramp.
 */
function cutOnBlack(data, width, height, options = {}) {
  const count = width * height;
  const bright = new Uint8Array(count);
  for (let pixel = 0; pixel < count; pixel += 1) {
    bright[pixel] = Math.max(data[pixel * 3], data[pixel * 3 + 1], data[pixel * 3 + 2]);
  }

  const EDGE_REACH = 3;
  const rgba = Buffer.alloc(count * 4);

  /* Background reached from the edges through dark pixels; anything else dark is the artwork's own. */
  let outside = null;
  if (options.solidInside) {
    outside = new Uint8Array(count);
    const stack = [];
    const floodBelow = options.floodBelow ?? HIGH;
    const seed = (pixel) => {
      if (!outside[pixel] && bright[pixel] < floodBelow) {
        outside[pixel] = 1;
        stack.push(pixel);
      }
    };
    /* Every edge, unless the artwork itself runs off some of them; see CURTAIN. */
    const seeds = options.seeds ?? ["top", "bottom", "left", "right"];
    for (let x = 0; x < width; x += 1) {
      if (seeds.includes("top")) seed(x);
      if (seeds.includes("bottom")) seed((height - 1) * width + x);
    }
    for (let y = 0; y < height; y += 1) {
      if (seeds.includes("left")) seed(y * width);
      if (seeds.includes("right")) seed(y * width + width - 1);
    }
    while (stack.length > 0) {
      const pixel = stack.pop();
      const x = pixel % width;
      const y = (pixel - x) / width;
      if (x > 0) seed(pixel - 1);
      if (x < width - 1) seed(pixel + 1);
      if (y > 0) seed(pixel - width);
      if (y < height - 1) seed(pixel + width);
    }

    /* Enclosed true black big enough to be a pocket of background, not a shadow. */
    if (options.pocketMin) {
      const seen = new Uint8Array(count);
      for (let start = 0; start < count; start += 1) {
        if (seen[start] || outside[start] || bright[start] >= LOW) continue;
        const region = [start];
        let regionTop = height;
        seen[start] = 1;
        for (let i = 0; i < region.length; i += 1) {
          const pixel = region[i];
          const x = pixel % width;
          const y = (pixel - x) / width;
          regionTop = Math.min(regionTop, y);
          for (const near of [x > 0 ? pixel - 1 : -1, x < width - 1 ? pixel + 1 : -1, y > 0 ? pixel - width : -1, y < height - 1 ? pixel + width : -1]) {
            if (near >= 0 && !seen[near] && !outside[near] && bright[near] < LOW) {
              seen[near] = 1;
              region.push(near);
            }
          }
        }
        /* Anywhere, unless the entry says how low a pocket must lie; see CURTAIN. */
        if (region.length >= options.pocketMin && regionTop >= height * (options.pocketBelow ?? 0)) {
          for (const pixel of region) stack.push(pixel), (outside[pixel] = 1);
          /* And the pocket's soft rim with it, as far as the flood would go. */
          while (stack.length > 0) {
            const pixel = stack.pop();
            const x = pixel % width;
            const y = (pixel - x) / width;
            if (x > 0) seed(pixel - 1);
            if (x < width - 1) seed(pixel + 1);
            if (y > 0) seed(pixel - width);
            if (y < height - 1) seed(pixel + width);
          }
        }
      }
    }
  }

  /* Within SOFT_RIM pixels of the flood: the artwork's anti-aliased edge, which keeps its ramp. */
  const SOFT_RIM = 2;
  const onRim = (x, y) => {
    for (let dy = -SOFT_RIM; dy <= SOFT_RIM; dy += 1) {
      for (let dx = -SOFT_RIM; dx <= SOFT_RIM; dx += 1) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < width && ny < height && outside[ny * width + nx]) return true;
      }
    }
    return false;
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      let coverage = Math.min(1, Math.max(0, (bright[pixel] - LOW) / (HIGH - LOW)));

      if (coverage > 0) {
        let nearBackground = false;
        let localMax = bright[pixel];

        for (let dy = -EDGE_REACH; dy <= EDGE_REACH; dy += 1) {
          for (let dx = -EDGE_REACH; dx <= EDGE_REACH; dx += 1) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
              nearBackground = true;
              continue;
            }
            const near = bright[ny * width + nx];
            if (near < LOW) nearBackground = true;
            if (near > localMax) localMax = near;
          }
        }

        if (nearBackground && localMax > HIGH) {
          coverage = Math.min(coverage, (bright[pixel] - LOW) / (localMax - LOW));
        }

      }

      if (outside !== null && !outside[pixel] && !(options.softRim && onRim(x, y))) {
        coverage = 1;
      }

      const light = options.light;
      if (light && x >= light.x0 && x <= light.x1 && y >= light.y0 && y <= light.y1 + light.feather) {
        const asLight = Math.max(0, (bright[pixel] - LOW) / (255 - LOW));
        /* Glow the background reaches stays light all the way down; the wick and spout blend in. */
        const toBowl =
          outside !== null && outside[pixel]
            ? 0
            : Math.min(1, Math.max(0, (y - light.y1) / light.feather));
        coverage = asLight + (coverage - asLight) * toBowl;
      }

      if (coverage > 0) {
        rgba[pixel * 4] = Math.min(255, Math.round(data[pixel * 3] / coverage));
        rgba[pixel * 4 + 1] = Math.min(255, Math.round(data[pixel * 3 + 1] / coverage));
        rgba[pixel * 4 + 2] = Math.min(255, Math.round(data[pixel * 3 + 2] / coverage));
        rgba[pixel * 4 + 3] = Math.round(coverage * 255);
      }
    }
  }

  return { rgba, report: "" };
}

/* --- On a painted checkerboard ----------------------------------------- */

/** How far from grey a checker pixel may be: the corners' own worst, plus JPEG slack. */
const CHECKER_SAT_SLACK = 10;
/** How far outside the two measured greys a smeared square may fall. */
const CHECKER_LUM_SLACK = 26;
/** Pixels in from the cut that count as the rim and are unmixed. */
const RIM = 3;

function saturation(data, pixel) {
  const r = data[pixel * 3];
  const g = data[pixel * 3 + 1];
  const b = data[pixel * 3 + 2];
  return Math.max(r, g, b) - Math.min(r, g, b);
}

function luminance(data, pixel) {
  return (data[pixel * 3] + data[pixel * 3 + 1] + data[pixel * 3 + 2]) / 3;
}

/**
 * The two greys and how colourless they are, read from the four corners, where
 * none of these pictures has any ornament. A two-way split of the corners'
 * luminance finds the light square and the dark one.
 */
function measureChecker(data, width, height) {
  const size = Math.round(Math.min(width, height) * 0.09);
  const samples = [];
  let maxSat = 0;

  for (const [x0, y0] of [
    [0, height - size],
    [width - size, height - size],
    [0, 0],
    [width - size, 0],
  ]) {
    for (let y = y0; y < y0 + size; y += 1) {
      for (let x = x0; x < x0 + size; x += 1) {
        const pixel = y * width + x;
        const sat = saturation(data, pixel);
        /* A corner the ornament reaches into is skipped pixel by pixel. */
        if (sat > 20) continue;
        maxSat = Math.max(maxSat, sat);
        samples.push(luminance(data, pixel));
      }
    }
  }

  let dark = 130;
  let light = 205;
  for (let round = 0; round < 12; round += 1) {
    let darkSum = 0, darkN = 0, lightSum = 0, lightN = 0;
    for (const value of samples) {
      if (Math.abs(value - dark) < Math.abs(value - light)) {
        darkSum += value; darkN += 1;
      } else {
        lightSum += value; lightN += 1;
      }
    }
    dark = darkSum / Math.max(1, darkN);
    light = lightSum / Math.max(1, lightN);
  }

  /* The cell, for the record: the strongest repeat along a bottom row. */
  const row = [];
  for (let x = 0; x < Math.min(400, width); x += 1) row.push(luminance(data, (height - 30) * width + x));
  const mean = row.reduce((a, b) => a + b, 0) / row.length;
  let period = 0, best = -Infinity;
  for (let p = 6; p < 80; p += 1) {
    let score = 0;
    for (let x = 0; x + p < row.length; x += 1) score += (row[x] - mean) * (row[x + p] - mean);
    if (score > best) { best = score; period = p; }
  }

  return {
    dark,
    light,
    maxSat: maxSat + CHECKER_SAT_SLACK,
    low: dark - CHECKER_LUM_SLACK,
    high: light + CHECKER_LUM_SLACK,
    period,
  };
}

function cutFromChecker(data, width, height) {
  const count = width * height;
  const checker = measureChecker(data, width, height);
  const isCheckerish = (pixel) => {
    if (saturation(data, pixel) > checker.maxSat) return false;
    const lum = luminance(data, pixel);
    return lum >= checker.low && lum <= checker.high;
  };

  /* Flood from every edge pixel through checker-like pixels, 4-connected. */
  const removed = new Uint8Array(count);
  const stack = [];
  const seed = (pixel) => {
    if (!removed[pixel] && isCheckerish(pixel)) {
      removed[pixel] = 1;
      stack.push(pixel);
    }
  };
  for (let x = 0; x < width; x += 1) { seed(x); seed((height - 1) * width + x); }
  for (let y = 0; y < height; y += 1) { seed(y * width); seed(y * width + width - 1); }
  while (stack.length > 0) {
    const pixel = stack.pop();
    const x = pixel % width;
    const y = (pixel - x) / width;
    if (x > 0) seed(pixel - 1);
    if (x < width - 1) seed(pixel + 1);
    if (y > 0) seed(pixel - width);
    if (y < height - 1) seed(pixel + width);
  }

  /* Distance from the cut, in pixels, out to RIM + 2. */
  const REACH = RIM + 2;
  const distance = new Uint8Array(count).fill(255);
  let frontier = [];
  for (let pixel = 0; pixel < count; pixel += 1) {
    if (removed[pixel]) { distance[pixel] = 0; frontier.push(pixel); }
  }
  for (let step = 1; step <= REACH; step += 1) {
    const next = [];
    for (const pixel of frontier) {
      const x = pixel % width;
      const y = (pixel - x) / width;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const near = ny * width + nx;
        if (distance[near] === 255) { distance[near] = step; next.push(near); }
      }
    }
    frontier = next;
  }

  const rgba = Buffer.alloc(count * 4);
  let unmixed = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      if (removed[pixel]) continue;

      let r = data[pixel * 3], g = data[pixel * 3 + 1], b = data[pixel * 3 + 2];
      let coverage = 1;

      if (distance[pixel] <= RIM) {
        /* What is behind it: the removed grey around it. What it is: the ornament further in. */
        let bgR = 0, bgG = 0, bgB = 0, bgN = 0, fgR = 0, fgG = 0, fgB = 0, fgN = 0;
        for (let dy = -REACH; dy <= REACH; dy += 1) {
          for (let dx = -REACH; dx <= REACH; dx += 1) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const near = ny * width + nx;
            if (removed[near]) {
              bgR += data[near * 3]; bgG += data[near * 3 + 1]; bgB += data[near * 3 + 2]; bgN += 1;
            } else if (distance[near] > RIM) {
              fgR += data[near * 3]; fgG += data[near * 3 + 1]; fgB += data[near * 3 + 2]; fgN += 1;
            }
          }
        }

        if (bgN > 0 && fgN > 0) {
          bgR /= bgN; bgG /= bgN; bgB /= bgN;
          fgR /= fgN; fgG /= fgN; fgB /= fgN;
          const spanR = fgR - bgR, spanG = fgG - bgG, spanB = fgB - bgB;
          const span = spanR * spanR + spanG * spanG + spanB * spanB;

          /* Only where the ornament is distinguishable from the grey at all. */
          if (span > 900) {
            coverage = ((r - bgR) * spanR + (g - bgG) * spanG + (b - bgB) * spanB) / span;
            coverage = Math.min(1, Math.max(0, coverage));
            if (coverage > 0.02) {
              r = (r - (1 - coverage) * bgR) / coverage;
              g = (g - (1 - coverage) * bgG) / coverage;
              b = (b - (1 - coverage) * bgB) / coverage;
            }
            unmixed += 1;
          }
        } else if (bgN > 0) {
          /* A sliver with no ornament behind it to measure against: let it go. */
          coverage = 0;
        }
      }

      if (coverage > 0.02) {
        rgba[pixel * 4] = Math.min(255, Math.max(0, Math.round(r)));
        rgba[pixel * 4 + 1] = Math.min(255, Math.max(0, Math.round(g)));
        rgba[pixel * 4 + 2] = Math.min(255, Math.max(0, Math.round(b)));
        rgba[pixel * 4 + 3] = Math.round(coverage * 255);
      }
    }
  }

  /* What the flood could not reach: checker-like pixels still standing, for the check. */
  let leftover = 0;
  for (let pixel = 0; pixel < count; pixel += 1) {
    if (!removed[pixel] && rgba[pixel * 4 + 3] > 0 && isCheckerish(pixel)) {
      const s = saturation(data, pixel);
      if (s <= checker.maxSat - CHECKER_SAT_SLACK + 2) leftover += 1;
    }
  }

  const report =
    `greys ${checker.dark.toFixed(0)}/${checker.light.toFixed(0)}, ` +
    `sat<=${checker.maxSat}, repeat ${checker.period}px, ` +
    `removed ${((removed.reduce((a, v) => a + v, 0) / count) * 100).toFixed(1)}%, ` +
    `rim unmixed ${unmixed}, grey pixels left inside ${leftover}`;

  return { rgba, report };
}

/* --- White lettering on black, as a mask -------------------------------- */

/** Below this the black is the sheet, not the lettering's soft edge. */
const MASK_FLOOR = 12;
/** At and above this the lettering is solid. */
const MASK_SOLID = 232;

/**
 * Brightness as coverage, everything else white. Black is fully transparent,
 * white fully solid, and the anti-aliased edge in between keeps its ramp — so
 * a thin stroke stays as thin and as soft as it was drawn. The floor is what
 * takes the sheet's near-black noise out, so nothing speckles once the mask is
 * filled with a colour.
 */
function cutMask(data, width, height) {
  const count = width * height;
  const rgba = Buffer.alloc(count * 4);

  for (let pixel = 0; pixel < count; pixel += 1) {
    const lum =
      0.2126 * data[pixel * 3] + 0.7152 * data[pixel * 3 + 1] + 0.0722 * data[pixel * 3 + 2];
    const coverage = Math.min(1, Math.max(0, (lum - MASK_FLOOR) / (MASK_SOLID - MASK_FLOOR)));

    rgba[pixel * 4] = 255;
    rgba[pixel * 4 + 1] = 255;
    rgba[pixel * 4 + 2] = 255;
    rgba[pixel * 4 + 3] = Math.round(coverage * 255);
  }

  return { rgba, report: "" };
}

/* --- The curtain's seam ------------------------------------------------- */

/**
 * Stands the panel's leading edge up straight and cuts it down the middle of
 * its beads, in place. See the note on CURTAIN.
 *
 * The edge is read per row as the last solid pixel, taken as the furthest
 * reach over a bead or two either side — the beads' outer line, not the dips
 * between them — and smoothed, so a row is slid by the lean of the cloth and
 * not by the shape of its own bead. Rows below `until` take the last row's
 * slide. Slid in premultiplied colour, so a soft edge is not darkened.
 */
function straightenSeam(rgba, width, height, seam) {
  const rows = Math.round(height * seam.until);
  const reach = new Float64Array(rows);
  for (let y = 0; y < rows; y += 1) {
    let x = width - 1;
    while (x >= 0 && rgba[(y * width + x) * 4 + 3] < 128) x -= 1;
    reach[y] = x;
  }

  const BEADS = 24;
  const SMOOTH = 80;
  const outer = new Float64Array(rows);
  for (let y = 0; y < rows; y += 1) {
    let most = 0;
    for (let near = Math.max(0, y - BEADS); near <= Math.min(rows - 1, y + BEADS); near += 1) {
      most = Math.max(most, reach[near]);
    }
    outer[y] = most;
  }
  const edge = new Float64Array(height);
  let furthest = 0;
  for (let y = 0; y < height; y += 1) {
    const at = Math.min(y, rows - 1);
    let sum = 0, n = 0;
    for (let near = Math.max(0, at - SMOOTH); near <= Math.min(rows - 1, at + SMOOTH); near += 1) {
      sum += outer[near]; n += 1;
    }
    edge[y] = sum / n;
    furthest = Math.max(furthest, edge[y]);
  }

  const cut = Math.round(furthest) - seam.inset;
  const row = new Float64Array(width * 4);
  let lean = 0;

  for (let y = 0; y < height; y += 1) {
    const slide = furthest - edge[y];
    lean = Math.max(lean, slide);
    for (let x = 0; x < width; x += 1) {
      const from = x - slide;
      const x0 = Math.floor(from);
      const part = from - x0;
      let r = 0, g = 0, b = 0, a = 0;
      for (const [sx, weight] of [[x0, 1 - part], [x0 + 1, part]]) {
        if (sx >= width || weight === 0) continue;
        /* Off the left is more of the same cloth; off the right is nothing. */
        const at = (y * width + Math.max(0, sx)) * 4;
        const alpha = (rgba[at + 3] / 255) * weight;
        r += rgba[at] * alpha; g += rgba[at + 1] * alpha; b += rgba[at + 2] * alpha; a += alpha;
      }
      row[x * 4] = a > 0 ? r / a : 0;
      row[x * 4 + 1] = a > 0 ? g / a : 0;
      row[x * 4 + 2] = a > 0 ? b / a : 0;
      row[x * 4 + 3] = x > cut ? 0 : a * 255;
    }
    for (let i = 0; i < width * 4; i += 1) rgba[y * width * 4 + i] = Math.round(row[i]);
  }

  return `seam at x=${cut}, edge leaned ${lean.toFixed(1)}px`;
}

/* --- A tile that tiles -------------------------------------------------- */

/** How far a pixel's green must sit from the paper's to be print rather than paper. */
const PRINT_DISTANCE = 45;
/** How far past the print its cover of bare paper reaches, and over how much of that it fades. */
const PATCH_REACH = 9;
const PATCH_SOLID = 4;

/**
 * Takes the printed motifs that reach the top or the bottom `band` rows off
 * the paper, in place: each is covered with bare paper copied from the
 * nearest place beside it that has no print, feathered at its edge. The
 * picture wraps left to right by now, so a motif across that edge is one
 * motif. See the note on ENVELOPE.
 */
function clearEdgeMotifs(rgb, width, height, band) {
  const count = width * height;
  const histogram = new Uint32Array(256);
  for (let pixel = 0; pixel < count; pixel += 1) histogram[rgb[pixel * 3 + 1]] += 1;
  let paper = 0;
  for (let level = 0, seen = 0; level < 256; level += 1) {
    seen += histogram[level];
    if (seen >= count / 2) { paper = level; break; }
  }

  const print = new Uint8Array(count);
  for (let pixel = 0; pixel < count; pixel += 1) {
    if (Math.abs(rgb[pixel * 3 + 1] - paper) > PRINT_DISTANCE) print[pixel] = 1;
  }

  /* Distance from the print, in pixels, out to PATCH_REACH; 255 beyond. */
  const distance = new Uint8Array(count).fill(255);
  let frontier = [];
  for (let pixel = 0; pixel < count; pixel += 1) {
    if (print[pixel]) { distance[pixel] = 0; frontier.push(pixel); }
  }
  for (let step = 1; step <= PATCH_REACH; step += 1) {
    const next = [];
    for (const pixel of frontier) {
      const x = pixel % width;
      const y = (pixel - x) / width;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const ny = y + dy;
          if (ny < 0 || ny >= height) continue;
          const near = ny * width + ((x + dx + width) % width);
          if (distance[near] === 255) { distance[near] = step; next.push(near); }
        }
      }
    }
    frontier = next;
  }

  /* Each motif with its surround, as one region; those reaching an edge band are the ones to go. */
  const seen = new Uint8Array(count);
  let cleared = 0;
  for (let start = 0; start < count; start += 1) {
    if (seen[start] || distance[start] === 255) continue;
    const region = [start];
    seen[start] = 1;
    let top = height, bottom = -1;
    for (let i = 0; i < region.length; i += 1) {
      const pixel = region[i];
      const x = pixel % width;
      const y = (pixel - x) / width;
      if (print[pixel]) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const ny = y + dy;
          if (ny < 0 || ny >= height) continue;
          const near = ny * width + ((x + dx + width) % width);
          if (!seen[near] && distance[near] !== 255) { seen[near] = 1; region.push(near); }
        }
      }
    }
    if (top > band + 2 && bottom < height - band - 2) continue;

    /* The nearest shift that lands the whole region on bare paper. */
    let shift = null;
    search: for (let reach = 24; reach <= 420; reach += 6) {
      for (const [dx, dy] of [[reach, 0], [-reach, 0], [0, reach], [0, -reach], [reach, reach], [-reach, reach], [reach, -reach], [-reach, -reach]]) {
        let clear = true;
        for (let i = 0; i < region.length; i += 3) {
          const pixel = region[i];
          const x = pixel % width;
          const y = (pixel - x) / width + dy;
          if (y < 0 || y >= height || distance[y * width + ((x + dx + width * 2) % width)] !== 255) { clear = false; break; }
        }
        if (clear) { shift = [dx, dy]; break search; }
      }
    }
    if (shift === null) continue;

    for (const pixel of region) {
      const x = pixel % width;
      const y = (pixel - x) / width;
      const from = (y + shift[1]) * width + ((x + shift[0] + width * 2) % width);
      const cover = Math.min(1, (PATCH_REACH - distance[pixel]) / (PATCH_REACH - PATCH_SOLID));
      for (let channel = 0; channel < 3; channel += 1) {
        rgb[pixel * 3 + channel] = Math.round(
          rgb[pixel * 3 + channel] * (1 - cover) + rgb[from * 3 + channel] * cover,
        );
      }
    }
    cleared += 1;
  }

  return cleared;
}

/**
 * One axis of a tile: `length` pixels from the start, with the first `blend`
 * of them faded in from the pixels that follow the tile's far edge.
 */
function closeJoin(rgb, width, height, axis, length, blend) {
  const outWidth = axis === "x" ? length : width;
  const outHeight = axis === "y" ? length : height;
  const out = Buffer.alloc(outWidth * outHeight * 3);
  for (let y = 0; y < outHeight; y += 1) {
    for (let x = 0; x < outWidth; x += 1) {
      const along = axis === "x" ? x : y;
      const here = (y * width + x) * 3;
      const beyond = axis === "x" ? (y * width + x + length) * 3 : ((y + length) * width + x) * 3;
      const far = along < blend ? 1 - along / blend : 0;
      for (let channel = 0; channel < 3; channel += 1) {
        out[(y * outWidth + x) * 3 + channel] =
          far > 0 ? Math.round(rgb[beyond + channel] * far + rgb[here + channel] * (1 - far)) : rgb[here + channel];
      }
    }
  }
  return { rgb: out, width: outWidth, height: outHeight };
}

/** How unlike two neighbouring rows or columns are, on average, per channel. */
function stepAcross(rgb, width, height, axis, a, b) {
  let sum = 0;
  const span = axis === "x" ? height : width;
  for (let i = 0; i < span; i += 1) {
    const p = axis === "x" ? (i * width + a) * 3 : (a * width + i) * 3;
    const q = axis === "x" ? (i * width + b) * 3 : (b * width + i) * 3;
    sum += Math.abs(rgb[p] - rgb[q]) + Math.abs(rgb[p + 1] - rgb[q + 1]) + Math.abs(rgb[p + 2] - rgb[q + 2]);
  }
  return sum / span / 3;
}

async function publishTile(entry) {
  const { data, info } = await sharp(join(entry.source ?? SOURCE, entry.file))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const across = entry.period[0] ?? info.width - entry.blend;
  let tile = closeJoin(data, info.width, info.height, "x", across, entry.blend);
  const cleared = entry.clearEdgeMotifs
    ? clearEdgeMotifs(tile.rgb, tile.width, tile.height, entry.blend)
    : 0;
  const down = entry.period[1] ?? tile.height - entry.blend;
  tile = closeJoin(tile.rgb, tile.width, tile.height, "y", down, entry.blend);

  /* The check: the step over each join, beside the step between two rows or columns inside. */
  const { rgb, width, height } = tile;
  const report =
    `${width}x${height} cut, ${cleared} edge motifs cleared, ` +
    `join across ${stepAcross(rgb, width, height, "x", width - 1, 0).toFixed(1)} (inside ${stepAcross(rgb, width, height, "x", width >> 1, (width >> 1) + 1).toFixed(1)}), ` +
    `join down ${stepAcross(rgb, width, height, "y", height - 1, 0).toFixed(1)} (inside ${stepAcross(rgb, width, height, "y", height >> 1, (height >> 1) + 1).toFixed(1)})`;

  mkdirSync(entry.out, { recursive: true });
  const target = join(entry.out, `${entry.name}.webp`);
  const result = await sharp(rgb, { raw: { width, height, channels: 3 } })
    .resize(entry.fit)
    .webp({ quality: entry.quality ?? 86, effort: 6 })
    .toFile(target);

  console.log(`${target}  ${result.width}x${result.height}  ${result.size} bytes  (${report})`);
}

/* --- Crop, size, publish ------------------------------------------------ */

/** A photograph used whole: sized and compressed, nothing removed. */
async function publishPhoto(entry) {
  mkdirSync(entry.out, { recursive: true });
  const target = join(entry.out, `${entry.name}.webp`);
  const result = await sharp(join(entry.source ?? SOURCE, entry.file))
    .removeAlpha()
    .resize(entry.fit)
    .webp({ quality: entry.quality ?? 86, effort: 6 })
    .toFile(target);

  console.log(`${target}  ${result.width}x${result.height}  ${result.size} bytes`);
}

async function publish(entry) {
  if (entry.background === "tile") {
    await publishTile(entry);
    return;
  }

  if (entry.background === "photo") {
    await publishPhoto(entry);
    return;
  }

  const { data, info } = await sharp(join(entry.source ?? SOURCE, entry.file))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  const { rgba, report: cutReport } =
    entry.background === "black"
      ? cutOnBlack(data, width, height, entry)
      : entry.background === "mask"
        ? cutMask(data, width, height)
        : cutFromChecker(data, width, height);
  const report = entry.seam ? straightenSeam(rgba, width, height, entry.seam) : cutReport;

  /* Only the left half kept: everything from the centre line on is cleared, and the crop ends there. */
  if (entry.half === "left") {
    for (let y = 0; y < height; y += 1) {
      for (let x = width >> 1; x < width; x += 1) rgba[(y * width + x) * 4 + 3] = 0;
    }
  }

  /* Cropped to what is left — a stray pixel below 10% coverage does not stretch the box. */
  let top = height, bottom = -1, left = width, right = -1;
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    if (rgba[pixel * 4 + 3] > (entry.background === "black" ? 0 : entry.background === "mask" ? 8 : 25)) {
      const x = pixel % width;
      const y = (pixel - x) / width;
      top = Math.min(top, y); bottom = Math.max(bottom, y);
      left = Math.min(left, x); right = Math.max(right, x);
    }
  }

  const resize =
    "long" in entry.fit
      ? { width: entry.fit.long, height: entry.fit.long, fit: "inside" }
      : entry.fit;

  mkdirSync(entry.out, { recursive: true });
  const target = join(entry.out, `${entry.name}.webp`);
  let sized = sharp(rgba, { raw: { width, height, channels: 4 } })
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .resize(resize);

  /*
    A hand touch-up in published pixels: in each row of `rows`, whatever lies
    left of the stroke's edge — a straight line through the clean rows either
    side — and right of `left` is cleared, the pixel astride the edge keeps a
    soft half, and anything the stroke is solid in is left alone.
  */
  if (entry.touchUp) {
    const { data: px, info: size } = await sized.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { rows, edgeFrom, edgeTo, left: from } = entry.touchUp;
    const slope = (edgeTo[1] - edgeFrom[1]) / (edgeTo[0] - edgeFrom[0]);
    for (let y = rows[0]; y <= rows[1]; y += 1) {
      const edge = edgeFrom[1] + slope * (y - edgeFrom[0]);
      for (let x = from; x < Math.ceil(edge); x += 1) {
        const at = (y * size.width + x) * 4 + 3;
        if (px[at] >= 240) continue;
        const keep = Math.max(0, Math.min(1, x + 1 - edge + 0.5));
        px[at] = Math.min(px[at], Math.round(keep * 255));
      }
    }
    sized = sharp(px, { raw: { width: size.width, height: size.height, channels: 4 } });
  }

  const result = await sized
    .webp({ quality: entry.quality ?? 86, alphaQuality: entry.alphaQuality ?? 100, effort: 6 })
    .toFile(target);

  console.log(`${target}  ${result.width}x${result.height}  ${result.size} bytes${report ? `  (${report})` : ""}`);
}

const which = process.argv[2] ?? "all";
/* Named ones only, when named — so re-cutting one never re-encodes the rest. */
const only = process.argv.slice(3);
const sets = [
  ...(which === "all" || which === "flowers" ? FLOWERS : []),
  ...(which === "all" || which === "ornaments" ? ORNAMENTS : []),
  ...(which === "all" || which === "calligraphy" ? CALLIGRAPHY : []),
  ...(which === "all" || which === "curtain" ? CURTAIN : []),
  ...(which === "all" || which === "envelope" ? ENVELOPE : []),
  ...(which === "all" || which === "petal-cover" ? PETAL_COVER : []),
  ...(which === "all" || which === "gatefold" ? GATEFOLD : []),
  ...(which === "all" || which === "scratch" ? SCRATCH : []),
  ...(which === "all" || which === "dividers" ? DIVIDERS : []),
].filter((entry) => only.length === 0 || only.includes(entry.name));

for (const entry of sets) {
  if (entry.hold === true) {
    console.log(`held: ${entry.name} (see the note on ORNAMENTS)`);
    continue;
  }
  await publish(entry);
}
