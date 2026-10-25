/**
 * Makes each template's gallery preview: templates/<id>/preview.webp.
 *
 * A preview is the first screen of the template's sample invitation
 * (/demo/<id>, built in lib/templateSamples.ts) on a 360x640 phone, with the
 * cover opened and the sample banner taken away, saved at twice that size so
 * it is sharp on a phone's screen. Run it again whenever a template's look or
 * the sample changes; the previews are committed, so nothing here runs at
 * build time.
 *
 *   1. npm run dev            (or `next start` on a build)
 *   2. node scripts/shoot-templates.mjs [http://localhost:3000] [--closed] [id ...]
 *
 * `--closed` leaves the cover shut, for a template whose preview is its own
 * cover waiting for the tap (Sheesh Mahal's doors and their "Tap to open"):
 * the loader is waited out instead, and nothing is tapped.
 *
 * Drives a headless Chrome over its DevTools protocol with nothing but Node:
 * no browser library is a dependency of this project. Set CHROME to the
 * browser's path if it is not in the usual place. Uses the sharp that ships
 * inside Next.js, as the other scripts here do.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATES = join(ROOT, "templates");

const args = process.argv.slice(2);
const base = args.find((arg) => arg.startsWith("http")) ?? "http://localhost:3000";
const closed = args.includes("--closed");
const only = args.filter((arg) => !arg.startsWith("http") && !arg.startsWith("--"));

/* A template is a folder with a config.ts; `shared` and the files beside them are not. */
const ids = readdirSync(TEMPLATES, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(TEMPLATES, entry.name, "config.ts")))
  .map((entry) => entry.name)
  .filter((id) => only.length === 0 || only.includes(id));

const WIDTH = 360;
const HEIGHT = 640;
const PORT = 9335;

const chromePath =
  process.env.CHROME ??
  [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].find((candidate) => existsSync(candidate));

if (chromePath === undefined) {
  throw new Error("Chrome was not found. Set CHROME to its path.");
}

const profile = mkdtempSync(join(tmpdir(), "lifafa-shoot-"));
const chrome = spawn(
  chromePath,
  ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "--no-first-run", "--hide-scrollbars", "about:blank"],
  { stdio: "ignore" },
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let target;
for (let attempt = 0; attempt < 60 && target === undefined; attempt += 1) {
  try {
    const pages = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
    target = pages.find((page) => page.type === "page");
  } catch {
    /* Not listening yet. */
  }
  if (target === undefined) await sleep(250);
}

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => (socket.onopen = resolve));

let sequence = 0;
const waiting = new Map();
socket.onmessage = (message) => {
  const data = JSON.parse(message.data);
  waiting.get(data.id)?.(data);
  waiting.delete(data.id);
};
const send = (method, params = {}) =>
  new Promise((resolve) => {
    sequence += 1;
    waiting.set(sequence, resolve);
    socket.send(JSON.stringify({ id: sequence, method, params }));
  });
const evaluate = async (expression) =>
  (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;

await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: 2, mobile: true });
await send("Emulation.setTouchEmulationEnabled", { enabled: true });
/* Still: nothing is caught mid-flight, and two runs give the same picture. */
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });

for (const id of ids) {
  await send("Page.navigate", { url: `${base}/demo/${id}` });

  for (let attempt = 0; attempt < 240; attempt += 1) {
    await sleep(500);
    if ((await evaluate(`document.readyState === "complete" && document.fonts.status === "loaded"`)) === true) break;
  }
  await sleep(2500);

  if (closed) {
    /* The cover as a guest first sees it: the loader gone, nothing tapped. */
    for (let attempt = 0; attempt < 60; attempt += 1) {
      if ((await evaluate(`!!document.querySelector('[data-cover-loading][aria-hidden="true"]')`)) === true) break;
      await sleep(500);
    }
    await sleep(1500);
    /* Nor the cover's Skip: a guest's way past it, not part of how it looks. */
    await evaluate(`[...document.querySelectorAll("button")].filter((node) => /^(Skip|छोड़ें)$/.test(node.textContent.trim())).forEach((node) => node.remove())`);
  } else {
    /* The cover opens to a tap, like a guest's. */
    for (const type of ["mousePressed", "mouseReleased"]) {
      await send("Input.dispatchMouseEvent", { type, x: WIDTH / 2, y: HEIGHT * 0.6, button: "left", clickCount: 1 });
    }
    await sleep(9000);
  }

  /* The sample banner is the demo page's, not the card's; nor is `next dev`'s own badge. */
  await evaluate(`(() => {
    document.querySelectorAll("nextjs-portal").forEach((node) => node.remove());
    /* Nor the language switch a two-language sample carries: it is the page's, over the card. */
    document.querySelectorAll('[role="group"][aria-label^="Language"]').forEach((node) => node.remove());
    for (const node of document.querySelectorAll("body *")) {
      if (getComputedStyle(node).position === "fixed" && /sample invitation/i.test(node.textContent ?? "") && node.getBoundingClientRect().height < 140) node.remove();
    }
    window.scrollTo(0, 0);
  })()`);
  await sleep(1200);

  const shot = await send("Page.captureScreenshot", { format: "png" });
  const out = join(TEMPLATES, id, "preview.webp");

  await sharp(Buffer.from(shot.result.data, "base64")).webp({ quality: 80, effort: 6 }).toFile(out);

  const { width, height, size } = await sharp(out).metadata().then(async (meta) => ({
    ...meta,
    size: (await sharp(out).toBuffer()).length,
  }));
  console.log(`${id}: ${width}x${height}, ${Math.round(size / 1024)} KB`);
}

socket.close();
chrome.kill();
await sleep(500);
rmSync(profile, { recursive: true, force: true });
process.exit(0);
