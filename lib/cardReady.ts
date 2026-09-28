/**
 * Waiting for an invitation's first screen to be ready, before its cover opens.
 *
 * The cover is the first thing a guest meets and the card is what it opens
 * onto. Opened before the card has arrived, the envelope lifts on a page still
 * loading: names in a fallback face that swap a moment later, a garland that
 * pops in after the reveal. So the cover waits, behind a small loader, until
 * the fonts are in and the pictures on the screen it opens onto are loaded
 * and decoded.
 *
 * ONLY THAT SCREEN. On a slow network every picture on the card is seconds of
 * loader, and most of them are nowhere near the first screen: petals and
 * butterflies that only fly once it is open, pictures in sections further
 * down. Those carry on loading behind the envelope while the guest taps it —
 * the card has them at the front of the queue already, through its preload
 * hints — and are in by the time the reveal ends wherever the network allows.
 *
 * What is on the first screen is the card's to say, not this file's: every
 * `<img>` inside its `data-first-screen` element (the opening's calligraphy,
 * the ornaments over the names on a card without one), and the pictures drawn
 * there as CSS rather than as images, which the card lists on its root under
 * FIRST_SCREEN_IMAGES and FIRST_SCREEN_MASKS — the top border, a flower
 * frame, a calligraphy mask.
 *
 * NEVER A WAIT WITHOUT AN END. A picture that fails, a font that never comes,
 * a browser without `decode` — each is let through rather than waited on, and
 * the whole wait gives up at `timeoutMs` and opens anyway. A guest held on a
 * loader by one broken image would be worse off than one who saw it missing.
 */

import { FIRST_SCREEN_ATTRIBUTE } from "@/components/invite/InvitedCue";

/**
 * Where the card lists the first screen's pictures that are not `<img>`
 * elements, space separated. Masks are listed apart because a CSS mask is
 * fetched in CORS mode, and the copy that waits for it must ask the same way
 * or it would wait on a second download rather than on the one the mask uses.
 */
export const FIRST_SCREEN_IMAGES = "data-first-screen-images";
export const FIRST_SCREEN_MASKS = "data-first-screen-masks";

/** The browser's own decode, or a wait for the load where there is none. */
function decoded(image: HTMLImageElement): Promise<void> {
  if (typeof image.decode === "function") {
    return image.decode().catch(() => undefined);
  }

  if (image.complete) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    image.addEventListener("load", () => resolve(), { once: true });
    image.addEventListener("error", () => resolve(), { once: true });
  });
}

/**
 * The same picture as an element in the page, fetched and decoded by a copy.
 *
 * A copy because a lazy image below the fold is not fetched until it nears
 * the screen, and a decode asked of it waits for exactly that. The copy asks
 * for the same file with the same srcset, sizes and CORS mode, so it is the
 * same cache entry the element then paints from.
 */
function copyOf(source: {
  src: string;
  srcset?: string;
  sizes?: string;
  crossOrigin?: string | null;
}): HTMLImageElement {
  const copy = new Image();

  if (source.crossOrigin !== null && source.crossOrigin !== undefined) {
    copy.crossOrigin = source.crossOrigin;
  }

  if (source.sizes) {
    copy.sizes = source.sizes;
  }

  if (source.srcset) {
    copy.srcset = source.srcset;
  }

  copy.src = source.src;
  return copy;
}

/** The first screen's pictures under `root`: its images, and the ones the card listed. */
function pictures(root: ParentNode | null): Promise<void>[] {
  const waits: Promise<void>[] = [];

  if (root === null) {
    return waits;
  }

  for (const image of root.querySelectorAll<HTMLImageElement>(
    `[${FIRST_SCREEN_ATTRIBUTE}] img`,
  )) {
    if (image.getAttribute("src") === null && image.srcset === "") {
      continue;
    }

    waits.push(
      image.loading === "lazy"
        ? decoded(
            copyOf({
              src: image.src,
              srcset: image.srcset,
              sizes: image.sizes,
              crossOrigin: image.crossOrigin,
            }),
          )
        : decoded(image),
    );
  }

  const listed = (attribute: string): string[] =>
    [...root.querySelectorAll(`[${attribute}]`)].flatMap((element) =>
      (element.getAttribute(attribute) ?? "").split(" ").filter((src) => src !== ""),
    );

  for (const src of new Set(listed(FIRST_SCREEN_IMAGES))) {
    waits.push(decoded(copyOf({ src })));
  }

  for (const src of new Set(listed(FIRST_SCREEN_MASKS))) {
    waits.push(decoded(copyOf({ src, crossOrigin: "anonymous" })));
  }

  return waits;
}

/**
 * Resolves once the fonts are in and the first screen's pictures are loaded
 * and decoded — or once `timeoutMs` has passed, whichever is first. Never
 * rejects.
 *
 * `root` is the card's own subtree. Read on the next task rather than at once,
 * so pictures a first effect has only just put on the page are counted too.
 */
export function whenCardReady(
  root: ParentNode | null,
  timeoutMs: number,
): Promise<void> {
  const giveUp = new Promise<void>((resolve) => {
    window.setTimeout(resolve, timeoutMs);
  });

  const everything = new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0);
  }).then(() => {
    const fonts =
      typeof document.fonts === "object"
        ? document.fonts.ready.then(() => undefined, () => undefined)
        : Promise.resolve();

    return Promise.all([fonts, ...pictures(root)]).then(() => undefined);
  });

  return Promise.race([everything, giveUp]);
}

/**
 * Resolves when the page is on screen: at once if it is, or at the moment the
 * guest switches to its tab. A cover that arrives in a tab nobody is looking
 * at has arrived for nobody.
 */
export function whenVisible(): Promise<void> {
  if (document.visibilityState !== "hidden") {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const onChange = (): void => {
      if (document.visibilityState !== "hidden") {
        document.removeEventListener("visibilitychange", onChange);
        resolve();
      }
    };

    document.addEventListener("visibilitychange", onChange);
  });
}
