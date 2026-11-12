import type { ReactElement } from "react";
import { templateParts } from "@/templates/parts";
import { PlaceholderScope, useShowPlaceholders } from "@/components/card/placeholders";
import type { TemplateCardProps } from "@/templates/types";

/**
 * The card, drawn by whichever template it was saved with.
 *
 * What the guest's page, the previews, the printed copy and the home page's
 * demos place, where they used to place CardCanvas. It adds no element of its
 * own, and a card with no templateId (every one saved before there were
 * templates) goes to Classic, which is CardCanvas.
 */
export default function TemplateCard(props: TemplateCardProps): ReactElement {
  /* A caller can turn them off for a host's card too (StillCard on /login). */
  const outer = useShowPlaceholders();
  const { Card } = templateParts(props.config.templateId);

  /* A guest's card, and the saved card's own look at it, leave empty details out (components/card/placeholders.tsx). */
  return (
    <PlaceholderScope show={props.audience !== "guest" && outer}>
      <Card {...props} />
    </PlaceholderScope>
  );
}
