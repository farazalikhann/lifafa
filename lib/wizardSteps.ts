/**
 * The four steps of the wizard, in order.
 *
 * The id is what the URL carries (`?step=details`) and what the sign-in stash
 * keeps, so a host who signs in at the last step comes back to it. An id is
 * therefore never renamed.
 */
export type WizardStepId = "template" | "details" | "customize" | "preview";

export interface WizardStep {
  id: WizardStepId;
  /** One or two words, for the progress bar. */
  label: string;
  /** The step's heading, as a sentence. */
  title: string;
}

export const WIZARD_STEPS: readonly WizardStep[] = [
  { id: "template", label: "Template", title: "Choose a template" },
  { id: "details", label: "Details", title: "Enter your details" },
  { id: "customize", label: "Customize", title: "Make it yours" },
  { id: "preview", label: "Preview", title: "Preview and publish" },
];

export const WIZARD_PATH = "/create";
export const WIZARD_STEP_PARAM = "step";

/**
 * Where every "Create" on the site leads: the wizard on its first step, the
 * template gallery. A card waiting from before a sign-in opens on the step it
 * was stashed on instead, which the sign-in's own way back names.
 */
export const NEW_CARD_HREF = "/create?step=template";

/** The step a value names, or null: it comes out of a URL or out of storage. */
export function wizardStepId(value: unknown): WizardStepId | null {
  return WIZARD_STEPS.find((step) => step.id === value)?.id ?? null;
}

export function wizardStepIndex(id: WizardStepId): number {
  return WIZARD_STEPS.findIndex((step) => step.id === id);
}

/**
 * The wizard's address on one step: /create for a new card, or the edit page
 * of a saved one, which is the same wizard over that card.
 */
export function wizardStepPath(
  id: WizardStepId,
  path: string = WIZARD_PATH,
): string {
  return `${path}?${WIZARD_STEP_PARAM}=${id}`;
}
