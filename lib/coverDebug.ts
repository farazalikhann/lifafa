/**
 * A cover's film, said out loud: with `?coverdebug=1` on the link, a small
 * log on the screen of what the film's <video> reported and which way the
 * cover opened, the film or what stands in for it, and why. For testing on a
 * real phone, where there is no console to read.
 *
 * Hidden, and nothing at all without the parameter: no element, no listener,
 * and every call here returns at once.
 *
 * Plain DOM on the body, not a component. The cover it reports on unmounts
 * when it has opened, and the log has to be there to read afterwards. It
 * takes no taps, so the cover under it is opened as it always is.
 */

const PARAM = "coverdebug";

/** How many lines are kept: the tail is what is being read. */
const KEEP = 60;

/** How many of them are on screen at once: the latest, so the way it opened is always in view. */
const SHOWN = 20;

/** Everything a film's <video> can say that bears on whether it played. */
const FILM_EVENTS = [
  "loadstart",
  "loadedmetadata",
  "loadeddata",
  "canplay",
  "canplaythrough",
  "play",
  "playing",
  "waiting",
  "stalled",
  "suspend",
  "timeupdate",
  "pause",
  "ended",
  "error",
] as const;

let on: boolean | null = null;
let panel: HTMLPreElement | null = null;
const lines: string[] = [];
/* The last line is one that may be rewritten: a film's running clock. */
let lastIsRunning = false;

export function coverDebugOn(): boolean {
  if (on === null) {
    try {
      on =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get(PARAM) === "1";
    } catch {
      on = false;
    }
  }

  return on;
}

/**
 * In fullscreen only the fullscreen element and what is inside it are drawn.
 * On the guest's page that is the whole document, the log included; in the
 * editor's preview it is the preview alone, so the log is moved inside it.
 */
function rehome(): void {
  if (panel === null) {
    return;
  }

  const home = document.fullscreenElement;
  const parent = home !== null && home !== document.documentElement ? home : document.body;

  if (panel.parentNode !== parent) {
    parent.appendChild(panel);
  }
}

function draw(): void {
  if (panel === null) {
    panel = document.createElement("pre");
    panel.setAttribute("data-cover-debug", "");
    panel.setAttribute("aria-hidden", "true");
    panel.style.cssText = [
      "position:fixed",
      "left:6px",
      "top:6px",
      "z-index:2147483647",
      "width:min(78vw,340px)",
      "margin:0",
      "padding:6px 8px",
      "overflow:hidden",
      "border-radius:6px",
      "background:rgba(0,0,0,0.74)",
      "color:#E8F5E0",
      "font:10px/1.35 ui-monospace,Menlo,Consolas,monospace",
      "white-space:pre-wrap",
      "word-break:break-word",
      "pointer-events:none",
    ].join(";");
    document.body.appendChild(panel);
    /* Now, and whenever the page goes into or out of fullscreen. */
    document.addEventListener("fullscreenchange", rehome);
    rehome();
  }

  panel.textContent = lines.slice(-SHOWN).join("\n");
}

/**
 * One line on the log, stamped with the page's own clock. A `running` line is
 * rewritten by the next running line, if nothing has come between them.
 */
export function coverDebug(line: string, running = false): void {
  if (!coverDebugOn()) {
    return;
  }

  const stamped = `${(performance.now() / 1000).toFixed(2).padStart(7)} ${line}`;

  if (running && lastIsRunning && lines.length > 0) {
    lines[lines.length - 1] = stamped;
  } else {
    lines.push(stamped);
  }

  lastIsRunning = running;

  if (lines.length > KEEP) {
    lines.splice(0, lines.length - KEEP);
  }

  /* Readable from a desktop's console too, and by a test. */
  (window as Window & { __coverDebug?: string[] }).__coverDebug = lines;
  draw();
}

/** Every event of a film's <video> onto the log. Returns how to stop. */
export function watchFilmEvents(video: HTMLVideoElement): () => void {
  if (!coverDebugOn()) {
    return () => undefined;
  }

  let ticks = 0;

  const report = (event: Event): void => {
    const at = `t=${video.currentTime.toFixed(2)} rs=${video.readyState}`;

    /* A film reports its clock several times a second: one line, kept current. */
    if (event.type === "timeupdate") {
      ticks += 1;
      coverDebug(`timeupdate x${ticks} ${at}`, true);
      return;
    }

    ticks = 0;
    coverDebug(
      event.type === "error"
        ? `error ${video.error?.code ?? "?"} ${video.error?.message ?? ""} ${at}`
        : `${event.type} ${at}`,
    );
  };

  for (const name of FILM_EVENTS) {
    video.addEventListener(name, report);
  }

  return () => {
    for (const name of FILM_EVENTS) {
      video.removeEventListener(name, report);
    }
  };
}
