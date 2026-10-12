import { BODHI_IVORY } from "@/templates/bodhi-ivory/config";
import {
  CLASSIC_TEMPLATE,
  CLASSIC_TEMPLATE_ID,
} from "@/templates/classic/config";
import { GURDWARA_IVORY } from "@/templates/gurdwara-ivory/config";
import { KESRI_ANAND_KARAJ } from "@/templates/kesri-anand-karaj/config";
import { LOTUS_BLUSH } from "@/templates/lotus-blush/config";
import { MAROON_ROYAL } from "@/templates/maroon-royal/config";
import { MIDNIGHT_LANTERN } from "@/templates/midnight-lantern/config";
import { NIKAH_BLUSH } from "@/templates/nikah-blush/config";
import { SHUBH_VIVAH_IVORY } from "@/templates/shubh-vivah-ivory/config";
import type { TemplateConfig } from "@/templates/types";
import type { TraditionId } from "@/types/occasion";

export { CLASSIC_TEMPLATE_ID };

/**
 * Every template, in the order the gallery lays them out.
 *
 * Adding one is a folder under templates/ and a line here. An id is written
 * into every card saved with it, so one that has shipped is never renamed or
 * removed.
 */
export const TEMPLATES: readonly TemplateConfig[] = [
  SHUBH_VIVAH_IVORY,
  MAROON_ROYAL,
  NIKAH_BLUSH,
  MIDNIGHT_LANTERN,
  KESRI_ANAND_KARAJ,
  GURDWARA_IVORY,
  LOTUS_BLUSH,
  BODHI_IVORY,
  CLASSIC_TEMPLATE,
];

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

/** The template with exactly this id, or null: for an id out of a URL. */
export function findTemplate(id: string): TemplateConfig | null {
  return TEMPLATES.find((template) => template.id === id) ?? null;
}

/** The templates a host can pick from. */
export function listedTemplates(): readonly TemplateConfig[] {
  return TEMPLATES.filter((template) => template.listed);
}

/** What the gallery calls each category, on its filter chips. */
export const CATEGORY_LABELS: Readonly<Record<TraditionId, string>> = {
  hindu: "Hindu",
  muslim: "Muslim",
  sikh: "Sikh",
  jain: "Jain",
  buddhist: "Buddhist",
  christian: "Christian",
  none: "Any occasion",
};
