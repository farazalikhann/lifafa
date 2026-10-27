/**
 * Records each listed premium template's opening animation for the landing
 * page's carousel.
 *
 *   npm run previews:record                      (server at http://localhost:3000)
 *   npm run previews:record -- --base http://localhost:3100 --only sheesh-mahal
 *
 * Needs a running server, ideally a production one (`npm run build`, then
 * `npm start`): the dev server is too slow for a smooth recording. The npm
 * script installs Playwright into .arch-tmp/tools (git-ignored) rather than
 * the project, and uses the installed Chrome when there is one. FFmpeg must
 * be on the PATH.
 *
 * For each template it opens /demo/<id> at 390x844 (the sample invitation,
 * with its made-up couple: no real guest's data is ever shown), hides the
 * "sample invitation" strip, captures the closed cover for a moment, taps it
 * and keeps capturing to about 7 seconds. Then, into
 * public/landing/previews/<id>/:
 *
 *   opening.mp4   H.264, veryfast, no audio, faststart
 *   opening.webm  VP9, no audio
 *   poster.webp   the first frame: the closed cover, exactly where the video starts
 *
 * each kept under about 800 KB by raising the quality factor until it fits,
 * and writes components/landing/previews.ts, the list the carousel reads.
 *
 * Re-run it whenever a premium template's cover or opening changes.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "landing", "previews");
const MANIFEST = join(ROOT, "components", "landing", "previews.ts");

const VIEWPORT = { width: 390, height: 844 };
/** Encoded width: sharp on a 2x screen at the carousel's largest phone (18rem). */
const OUT_WIDTH = 480;
const HOLD_CLOSED_MS = 900;
const TOTAL_MS = 7200;
const MAX_BYTES = 800 * 1024;

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args[index + 1];
};
const base = option("base", "http://localhost:3000");
const only = option("only", null);

/* Playwright from the project if it is ever added there, else from the tools folder. */
function loadPlaywright() {
  for (const from of [join(ROOT, "package.json"), join(ROOT, ".arch-tmp", "tools", "package.json")]) {
    try {
      return createRequire(from)("playwright");
    } catch {
      /* Try the next place. */
    }
  }
  throw new Error("Playwright is not installed. Run: npm i --prefix .arch-tmp/tools playwright");
}

/**
 * The premium templates the gallery lists, read from templates/premium.ts as
 * text (it imports images, which Node cannot). An entry whose `listed` is not
 * `true` is skipped, exactly as listedPremium() does.
 */
function listedPremiumIds() {
  const source = readFileSync(join(ROOT, "templates", "premium.ts"), "utf8");
  const order = source.match(/PREMIUM_LISTINGS[^=]*=\s*\[([^\]]*)\]/);
  const blocks = [...source.matchAll(/export const (\w+_LISTING) = \{([\s\S]*?)\}/g)];
  const byName = new Map(
    blocks.map(([, name, body]) => [
      name,
      { id: body.match(/id:\s*"([^"]+)"/)?.[1], listed: /listed:\s*true/.test(body) },
    ]),
  );
  const names = order === null ? [...byName.keys()] : order[1].split(",").map((s) => s.trim()).filter(Boolean);

  return names
    .map((name) => byName.get(name))
    .filter((entry) => entry !== undefined && entry.listed && entry.id !== undefined)
    .map((entry) => entry.id);
}

function ffmpeg(argv) {
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...argv], { stdio: "inherit" });
}

/** Encodes, raising the quality factor until the file is small enough. */
function encodeUnder(make, out, startCrf, maxCrf) {
  for (let crf = startCrf; crf <= maxCrf; crf += 2) {
    make(crf);
    const size = statSync(out).size;

    if (size <= MAX_BYTES || crf + 2 > maxCrf) {
      return { crf, size };
    }
  }
  throw new Error("unreachable");
}

async function record(browser, id) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  await page.goto(`${base}/demo/${id}`, { waitUntil: "load", timeout: 120000 });
  await page.waitForSelector("[data-cover-loading][aria-hidden=true]", { timeout: 30000 });

  /* The strip says "sample invitation" over the card: not part of the opening. */
  await page.evaluate(() => {
    const strip = document.querySelector('[role="region"][aria-label="Sample invitation"]');
    if (strip instanceof HTMLElement) {
      strip.style.display = "none";
    }
    document.documentElement.style.setProperty("--lifafa-preview-h", "0px");
  });
  await page.waitForTimeout(600);

  const cdp = await context.newCDPSession(page);
  const frames = [];
  cdp.on("Page.screencastFrame", async (frame) => {
    frames.push({ data: frame.data, t: frame.metadata.timestamp });
    await cdp.send("Page.screencastFrameAck", { sessionId: frame.sessionId }).catch(() => {});
  });

  await cdp.send("Page.startScreencast", {
    format: "jpeg",
    quality: 92,
    maxWidth: VIEWPORT.width * 2,
    maxHeight: VIEWPORT.height * 2,
    everyNthFrame: 1,
  });
  const started = Date.now();
  await page.waitForTimeout(HOLD_CLOSED_MS);
  await page.getByRole("button", { name: /^Tap/ }).first().tap();
  await page.waitForTimeout(TOTAL_MS - (Date.now() - started));
  const endT = frames.length > 0 ? frames[0].t + TOTAL_MS / 1000 : 0;
  await cdp.send("Page.stopScreencast");
  await context.close();

  if (frames.length < 10) {
    throw new Error(`${id}: only ${frames.length} frames captured`);
  }

  const work = join(tmpdir(), "lifafa-previews", id);
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });

  /* Frames arrive only when the screen changes: each one lasts until the next. */
  let list = "";
  frames.forEach((frame, index) => {
    const file = join(work, `f${String(index).padStart(4, "0")}.jpg`);
    writeFileSync(file, Buffer.from(frame.data, "base64"));
    const next = index + 1 < frames.length ? frames[index + 1].t : endT;
    list += `file '${file.replace(/\\/g, "/")}'\nduration ${Math.max(next - frame.t, 0.001).toFixed(4)}\n`;
  });
  /* The concat demuxer needs the last file named once more for its duration to count. */
  list += `file '${join(work, `f${String(frames.length - 1).padStart(4, "0")}.jpg`).replace(/\\/g, "/")}'\n`;
  const listFile = join(work, "frames.txt");
  writeFileSync(listFile, list);

  const dir = join(OUT_DIR, id);
  mkdirSync(dir, { recursive: true });
  const mp4 = join(dir, "opening.mp4");
  const webm = join(dir, "opening.webm");
  const poster = join(dir, "poster.webp");
  const filter = `fps=30,scale=${OUT_WIDTH}:-2:flags=lanczos,format=yuv420p`;
  const input = ["-f", "concat", "-safe", "0", "-i", listFile];

  const h264 = encodeUnder(
    (crf) =>
      ffmpeg([...input, "-vf", filter, "-c:v", "libx264", "-preset", "veryfast", "-crf", String(crf),
        "-profile:v", "main", "-movflags", "+faststart", "-an", mp4]),
    mp4, 26, 40,
  );
  const vp9 = encodeUnder(
    (crf) =>
      ffmpeg([...input, "-vf", filter, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", String(crf),
        "-deadline", "good", "-cpu-used", "4", "-row-mt", "1", "-an", webm]),
    webm, 36, 52,
  );
  /* The poster is the video's own first frame, so the swap from one to the other is invisible. */
  ffmpeg(["-i", join(work, "f0000.jpg"), "-vf", `scale=${OUT_WIDTH}:-2:flags=lanczos`,
    "-c:v", "libwebp", "-quality", "80", "-frames:v", "1", poster]);

  rmSync(work, { recursive: true, force: true });
  const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;
  console.log(
    `${id}: ${frames.length} frames; mp4 ${kb(h264.size)} (crf ${h264.crf}), webm ${kb(vp9.size)} (crf ${vp9.crf}), poster ${kb(statSync(poster).size)}`,
  );
}

function writeManifest(ids) {
  const entries = ids
    .map(
      (id) => `  "${id}": {
    poster: "/landing/previews/${id}/poster.webp",
    mp4: "/landing/previews/${id}/opening.mp4",
    webm: "/landing/previews/${id}/opening.webm",
  },`,
    )
    .join("\n");

  writeFileSync(
    MANIFEST,
    `/**
 * The recorded opening of each premium template, for the landing page's
 * carousel. GENERATED by scripts/record-previews.mjs: re-run it rather than
 * editing this file. A template missing here shows its gallery preview and
 * no video.
 */
export interface OpeningPreview {
  poster: string;
  mp4: string;
  webm: string;
}

export const OPENING_PREVIEWS: Readonly<Record<string, OpeningPreview>> = {
${entries}
};
`,
  );
}

const ids = listedPremiumIds().filter((id) => only === null || id === only);

if (ids.length === 0) {
  throw new Error(only === null ? "No listed premium templates found." : `${only} is not a listed premium template.`);
}

const { chromium } = loadPlaywright();
const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());

try {
  for (const id of ids) {
    await record(browser, id);
  }
} finally {
  await browser.close();
}

/* Every listed template with a recording on disk, whether recorded now or before. */
writeManifest(
  listedPremiumIds().filter((id) => existsSync(join(OUT_DIR, id, "opening.mp4")) && existsSync(join(OUT_DIR, id, "poster.webp"))),
);
console.log(`Wrote ${MANIFEST.replace(ROOT, ".")}.`);
