import dynamic from "next/dynamic";
import { getTemplate } from "@/templates/registry";
import type { TemplateParts } from "@/templates/types";

/**
 * What draws each template: the card, and the premium templates' own cover,
 * reply frame and closing note.
 *
 * APART FROM THE REGISTRY ON PURPOSE. Every one of these is loaded with
 * next/dynamic, and Next lists a dynamic component that renders on the server
 * among the page's own scripts wherever the module that names it is part of
 * the page. When they were fields of the configs, every page that read the
 * registry for a name or a price (the gallery first of all) downloaded all
 * four premium cards and the Classic one on a phone, before the host had
 * chosen anything. Only what draws a card imports this file: TemplateCard,
 * the guest's page and the full-screen preview. The editor reaches it only
 * through previews it loads when it draws them.
 *
 * Every template not named below is drawn by the Classic card: Classic itself
 * and every template made from a preset.
 */

const ClassicCard = dynamic(() => import("@/templates/classic/Card"));

const PARTS: Readonly<Record<string, TemplateParts>> = {
  "emerald-shahi": {
    Card: dynamic(() => import("@/templates/emerald-shahi/Card")),
    CoverVisual: dynamic(() => import("@/templates/emerald-shahi/Cover")),
    RsvpFrame: dynamic(() => import("@/templates/emerald-shahi/RsvpFrame")),
    Closing: dynamic(() => import("@/templates/emerald-shahi/Closing")),
  },
  "gulab-mahal": {
    Card: dynamic(() => import("@/templates/gulab-mahal/Card")),
    CoverVisual: dynamic(() => import("@/templates/gulab-mahal/Cover")),
    RsvpFrame: dynamic(() => import("@/templates/gulab-mahal/RsvpFrame")),
    Closing: dynamic(() => import("@/templates/gulab-mahal/Closing")),
  },
  "dak-ghar": {
    Card: dynamic(() => import("@/templates/dak-ghar/Card")),
    CoverVisual: dynamic(() => import("@/templates/dak-ghar/Cover")),
    RsvpFrame: dynamic(() => import("@/templates/dak-ghar/RsvpFrame")),
    Closing: dynamic(() => import("@/templates/dak-ghar/Closing")),
  },
  "sheesh-mahal": {
    Card: dynamic(() => import("@/templates/sheesh-mahal/Card")),
    CoverVisual: dynamic(() => import("@/templates/sheesh-mahal/Cover")),
    RsvpFrame: dynamic(() => import("@/templates/sheesh-mahal/RsvpFrame")),
    Closing: dynamic(() => import("@/templates/sheesh-mahal/Closing")),
  },
};

const CLASSIC_PARTS: TemplateParts = { Card: ClassicCard };

/**
 * What draws the template a card is saved with. `unknown`, like getTemplate,
 * and resolved through it, so a card with no id or one this build does not
 * know is drawn as Classic, exactly as its config says.
 */
export function templateParts(templateId: unknown): TemplateParts {
  return PARTS[getTemplate(templateId).id] ?? CLASSIC_PARTS;
}

/*
  The same files, fetched ahead of time. Written out again rather than shared
  with PARTS above, because next/dynamic only finds a part's module (to list
  it for the server's render) when its import() is written inside the
  dynamic() call itself.
*/
const PRELOADS: Readonly<Record<string, () => Promise<unknown>[]>> = {
  "emerald-shahi": () => [
    import("@/templates/emerald-shahi/Card"),
    import("@/templates/emerald-shahi/Cover"),
    import("@/templates/emerald-shahi/RsvpFrame"),
    import("@/templates/emerald-shahi/Closing"),
  ],
  "gulab-mahal": () => [
    import("@/templates/gulab-mahal/Card"),
    import("@/templates/gulab-mahal/Cover"),
    import("@/templates/gulab-mahal/RsvpFrame"),
    import("@/templates/gulab-mahal/Closing"),
  ],
  "dak-ghar": () => [
    import("@/templates/dak-ghar/Card"),
    import("@/templates/dak-ghar/Cover"),
    import("@/templates/dak-ghar/RsvpFrame"),
    import("@/templates/dak-ghar/Closing"),
  ],
  "sheesh-mahal": () => [
    import("@/templates/sheesh-mahal/Card"),
    import("@/templates/sheesh-mahal/Cover"),
    import("@/templates/sheesh-mahal/RsvpFrame"),
    import("@/templates/sheesh-mahal/Closing"),
  ],
};

/**
 * Fetches what draws a template before it is drawn, so the full-screen
 * preview on /create opens on that template with the connection gone too.
 * A fetch that fails is left to be tried again when the part is drawn.
 */
export function preloadTemplateParts(templateId: unknown): void {
  const load = PRELOADS[getTemplate(templateId).id] ?? (() => [import("@/templates/classic/Card")]);

  for (const part of load()) {
    part.catch(() => undefined);
  }
}
