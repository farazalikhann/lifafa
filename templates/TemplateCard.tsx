import type { ReactElement } from "react";
import { getTemplate } from "@/templates/registry";
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
  const { Card } = getTemplate(props.config.templateId);

  return <Card {...props} />;
}
