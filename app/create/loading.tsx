import type { ReactElement } from "react";
import { headers } from "next/headers";
import EditorSkeleton from "@/components/create/EditorSkeleton";
import GalleryFirstScreen from "@/components/wizard/GalleryFirstScreen";
import { CREATE_QUERY_HEADER, opensOnGallery } from "@/lib/opensOnGallery";
import { AFTER_SIGN_IN_PARAM, WIZARD_STEPS, WIZARD_STEP_PARAM, wizardStepId } from "@/lib/wizardSteps";

/**
 * What a visitor sees first on /create: the first bytes of the page when it
 * is opened from an ad or a link, and what shows between tapping "Create your
 * card" and the page arriving when it is reached from another page here.
 * Without it Next held the landing page on screen until the wizard was ready,
 * and on a slow connection the tap seemed to do nothing.
 *
 * THE GALLERY ITSELF, NOT A DRAWING OF IT, for an address that opens on the
 * gallery (lib/opensOnGallery.ts): GalleryFirstScreen, the real cards, whose
 * first row's pictures are the page's largest paint, preloaded here. The page
 * that replaces it draws the same screen, and the wizard after it the same
 * again, so nothing moves. Any other address (a step named, a template
 * chosen, a saved card, a card being handed over) shows the editor's
 * skeleton, as the page will, and fetches none of the gallery's pictures.
 *
 * This is sent before the page has read its query, so it reads the query
 * middleware.ts passes on with the request. Without it (an address under
 * /create that only redirects), the skeleton.
 */
export default async function CreateLoading(): Promise<ReactElement> {
  const search = (await headers()).get(CREATE_QUERY_HEADER);

  if (search === null) {
    return <EditorSkeleton />;
  }

  const query = new URLSearchParams(search);

  if (opensOnGallery(query)) {
    return <GalleryFirstScreen welcome={query.has(AFTER_SIGN_IN_PARAM)} />;
  }

  const step =
    wizardStepId(query.get(WIZARD_STEP_PARAM)) ??
    /* A template chosen opens on the details (app/create/page.tsx). */
    (query.get("template") !== null ? "details" : WIZARD_STEPS[0].id);

  return <EditorSkeleton step={step} />;
}
