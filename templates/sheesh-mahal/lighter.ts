import { ART } from "@/templates/sheesh-mahal/art";

/**
 * Which of Sheesh Mahal's pictures a guest is shown, and when.
 *
 * TWO SETS. The pictures as made, and a lighter set beside them (`-sm.webp`,
 * 55% of the width at WebP quality 70; scripts/sheesh-small.mjs), about a
 * third of the bytes, for a guest on a slow connection: the browser says it
 * is 3G or slower, or that the guest asked it to save data. Or the loader has
 * waited 2.5 seconds for the cover (CoverShell, `slowLoad`): every room
 * picture not yet asked for is then the lighter one.
 *
 * THE COVER'S FOUR FIRST (the wall, both doors, the hall), and nothing else
 * until the cover has opened. Their set is decided once, in the page's head
 * as the HTML arrives (COVER_PRELOAD, the cover's `earlyScript`), which asks for them at
 * high priority straight away and leaves its answer on window; the server
 * cannot know the guest's connection, so it names none of them itself. Every
 * other room's pictures are left unasked for until the cover has gone, and
 * then come in page order, as before (the pager fetches the next room's as
 * the guest arrives in each). The doors, the hall and the wall come back on
 * pages 4, 5 and 7, in the cover's set, so they are never fetched twice.
 */

const SLOW = /^(slow-2g|2g|3g)$/;
/* Where the head script leaves its answer: on window, which hydration never compares. */
const FLAG = "__smLighter";

/** As connection says it to the page's head script: 3G or slower, or saving data. */
function connectionIsSlow(): boolean {
  const connection = (navigator as Navigator & {
    connection?: { effectiveType?: string; saveData?: boolean };
  }).connection;

  return connection !== undefined && (connection.saveData === true || SLOW.test(connection.effectiveType ?? ""));
}

/**
 * The script in the page's head, before anything is fetched: decides the
 * cover's set, says so on <html>, and asks for its four pictures at high
 * priority. Kept in step with connectionIsSlow above.
 */
export const COVER_PRELOAD = `(function(){try{var c=navigator.connection,l=!!c&&(c.saveData===true||/^(slow-2g|2g|3g)$/.test(c.effectiveType||"")),w=window;if(w.${FLAG}!==undefined)return;w.${FLAG}=l;["wall","door-left","door-right","hall"].forEach(function(n){var k=document.createElement("link");k.rel="preload";k.as="image";k.setAttribute("fetchpriority","high");k.href="/templates/sheesh-mahal/"+n+(l?"-sm":"")+".webp";document.head.appendChild(k);});}catch(e){}})();`;

const small = (src: string): string => src.replace(/\.webp$/, "-sm.webp");

let coverLight: boolean | null = null;

/** The cover's set, decided once: by the head script where it ran, by the connection otherwise. */
export function coverIsLight(): boolean {
  if (coverLight === null) {
    const said = (window as unknown as Record<string, unknown>)[FLAG];
    coverLight = typeof said === "boolean" ? said : connectionIsSlow();
  }

  return coverLight;
}

let roomsLight = false;
const listeners = new Set<() => void>();

/** The loader has waited long: every room picture not yet asked for is the lighter one. */
export function goLighter(): void {
  if (!roomsLight) {
    roomsLight = true;
    for (const listener of listeners) {
      listener();
    }
  }
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export type Art = { [K in keyof typeof ART]: string };

function setOf(cover: boolean, rooms: boolean): Art {
  const pick = (src: string, light: boolean): string => (light ? small(src) : src);

  return {
    wall: pick(ART.wall, cover),
    doorLeft: pick(ART.doorLeft, cover),
    doorRight: pick(ART.doorRight, cover),
    hall: pick(ART.hall, cover),
    jharokhaMoon: pick(ART.jharokhaMoon, rooms),
    jharokhaFrame: pick(ART.jharokhaFrame, rooms),
    functionCard: pick(ART.functionCard, rooms),
    venueNight: pick(ART.venueNight, rooms),
    farmaan: pick(ART.farmaan, rooms),
    kandeel: pick(ART.kandeel, rooms),
  };
}

/* One object per answer, so a component re-renders only when the answer changes. */
export const SETS = {
  full: setOf(false, false),
  coverFull: setOf(false, true),
  light: setOf(true, true),
};

export function answer(): keyof typeof SETS {
  const cover = coverIsLight();
  return cover ? "light" : roomsLight ? "coverFull" : "full";
}

/** The cover's four pictures for the cover itself: null on the server, which cannot know the set. */
export const COVER_FULL: readonly string[] = [ART.wall, ART.doorLeft, ART.doorRight, ART.hall];
export const COVER_LIGHT: readonly string[] = COVER_FULL.map(small);
const NONE: readonly string[] = [];

export function coverImages(): readonly string[] {
  return typeof window === "undefined" ? NONE : coverIsLight() ? COVER_LIGHT : COVER_FULL;
}
