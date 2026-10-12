import {
  CLASSIC_TEMPLATE,
  CLASSIC_TEMPLATE_ID,
} from "@/templates/classic/config";
import type { TemplateConfig } from "@/templates/types";

export { CLASSIC_TEMPLATE_ID };

/**
 * Every template, in the order the gallery lays them out.
 *
 * Adding one is a folder under templates/ and a line here. An id is written
 * into every card saved with it, so one that has shipped is never renamed or
 * removed.
 */
export const TEMPLATES: readonly TemplateConfig[] = [CLASSIC_TEMPLATE];

/**
 * The template a card is drawn with.
 *
 * `unknown`, because this is read out of stored JSON: every card saved before
 * there were templates has no id, and a row written by a newer build can name
 * one this build has never heard of. Both are Classic, which draws a card from
 * its CardConfig alone and so can draw any of them.
 */
export function getTemplate(id: unknown): TemplateConfig {
  return TEMPLATES.find((template) => template.id === id) ?? CLASSIC_TEMPLATE;
}

/** The templates a host can pick from. */
export function listedTemplates(): readonly TemplateConfig[] {
  return TEMPLATES.filter((template) => template.listed);
}
