/**
 * Waiting for an invitation to be ready to be seen, before its cover opens.
 *
 * The cover is the first thing a guest meets and the card is what it opens
 * onto. Opened before the card has arrived, the envelope lifts on a page still
 * loading: names in a fallback face that swap a moment later, a garland that
 * pops in after the reveal. So the cover waits, behind a small loader, until
 * the fonts are in and every picture the card uses is loaded and decoded.
 *
 * What counts as "every picture" is read from the page rather than listed
 * here, so it follows whatever the card has chosen without this file knowing
 * the card: each `<img>` under the card, and each image the card asked the
 * browser to fetch early through a preload hint in the head — the calligraphy
 * mask, the ornaments, the petals. Neither list carries anything the card does
 * not use.
 *
 * NEVER A WAIT WITHOUT AN END. A picture that fails, a font that never comes,
 * a browser without `decode` — each is let through rather than waited on, and
 * the whole wait gives up at `timeoutMs` and opens anyway. A guest held on a
 * loader by one broken image would be worse off than one who saw it missing.
 */

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

/** Every picture under `root`, and every image the page hinted to preload. */
function pictures(root: ParentNode | null): Promise<void>[] {
  const waits: Promise<void>[] = [];

  for (const image of root?.querySelectorAll("img") ?? []) {
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

  for (const link of document.head.querySelectorAll<HTMLLinkElement>(
    'link[rel="preload"][as="image"]',
  )) {
    if (link.href === "" && link.imageSrcset === "") {
      continue;
    }

    waits.push(
      decoded(
        copyOf({
          src: link.href,
          srcset: link.imageSrcset,
          sizes: link.imageSizes,
          crossOrigin: link.crossOrigin,
        }),
      ),
    );
  }

  return waits;
}

/**
 * Resolves once the fonts are in and every picture the card uses is loaded and
 * decoded — or once `timeoutMs` has passed, whichever is first. Never rejects.
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
