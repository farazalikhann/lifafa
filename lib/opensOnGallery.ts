import { HANDOFF_PARAM } from "@/lib/handoff/link";
import { WIZARD_STEP_PARAM } from "@/lib/wizardSteps";

/**
 * Whether an address opens /create on the gallery, whatever this browser
 * holds: no saved card to show (`event`), no template chosen, no card being
 * handed over, and no step but the first. The server draws the gallery itself
 * for these (components/wizard/GalleryFirstScreen.tsx).
 *
 * Read by app/create/page.tsx, and by app/create/loading.tsx, which is sent
 * before the page has read its query and so reads it from CREATE_QUERY_HEADER.
 */
/**
 * The query of a request for /create, as middleware.ts passes it on: what
 * app/create/loading.tsx, the first bytes of the page, decides its screen by.
 * Set (and overwritten) for /create alone.
 */
export const CREATE_QUERY_HEADER = "x-lifafa-create-query";

export function opensOnGallery(query: { get: (key: string) => string | null }): boolean {
  const step = query.get(WIZARD_STEP_PARAM);

  return (
    query.get("event") === null &&
    query.get("template") === null &&
    query.get(HANDOFF_PARAM) === null &&
    (step === null || step === "template")
  );
}
