import { BODHI_IVORY } from "@/templates/bodhi-ivory/config";
import {
  CLASSIC_TEMPLATE,
  CLASSIC_TEMPLATE_ID,
} from "@/templates/classic/config";
import { DAK_GHAR } from "@/templates/dak-ghar/config";
import { EMERALD_SHAHI } from "@/templates/emerald-shahi/config";
import { GULAB_MAHAL } from "@/templates/gulab-mahal/config";
import { GURDWARA_IVORY } from "@/templates/gurdwara-ivory/config";
import { IVORY_CHAPEL } from "@/templates/ivory-chapel/config";
import { KESRI_ANAND_KARAJ } from "@/templates/kesri-anand-karaj/config";
import { LOTUS_BLUSH } from "@/templates/lotus-blush/config";
import { MAROON_ROYAL } from "@/templates/maroon-royal/config";
import { MIDNIGHT_LANTERN } from "@/templates/midnight-lantern/config";
import { NIKAH_BLUSH } from "@/templates/nikah-blush/config";
import { PREMIUM_LISTINGS } from "@/templates/premium";
import { SHEESH_MAHAL } from "@/templates/sheesh-mahal/config";
import { SHUBH_VIVAH_IVORY } from "@/templates/shubh-vivah-ivory/config";
import type { TemplateConfig } from "@/templates/types";
import type { TraditionId } from "@/types/occasion";

export { CLASSIC_TEMPLATE_ID };

/**
 * Every template, in the order the gallery lays them out within its two
 * collections (`collection` on each says which).
 *
 * Adding one is a folder under templates/ and a line here. An id is written
 * into every card saved with it, so one that has shipped is never renamed or
 * removed.
 */
export const TEMPLATES: readonly TemplateConfig[] = [
  SHEESH_MAHAL,
  EMERALD_SHAHI,
  GULAB_MAHAL,
  DAK_GHAR,
  SHUBH_VIVAH_IVORY,
  MAROON_ROYAL,
  NIKAH_BLUSH,
  MIDNIGHT_LANTERN,
  KESRI_ANAND_KARAJ,
  GURDWARA_IVORY,
  LOTUS_BLUSH,
  BODHI_IVORY,
  IVORY_CHAPEL,
  CLASSIC_TEMPLATE,
];

/*
  A premium template is listed from templates/premium.ts, which the landing
  page reads without the cards. One listed anywhere else would be in the
  gallery and missing from the landing page, so the build stops here instead.
*/
for (const template of TEMPLATES) {
  const listing = PREMIUM_LISTINGS.find((entry) => entry.id === template.id);

  if (
    template.collection === "premium" &&
    (listing === undefined ||
      listing.listed !== template.listed ||
      listing.price !== template.price ||
      listing.preview !== template.preview)
  ) {
    throw new Error(
      `${template.id} is in the Premium Collection, so its listing belongs in templates/premium.ts.`,
    );
  }
}

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

/**
 * What an invitation on this template costs, in paise.
 *
 * THE ONE PLACE A PRICE IS DECIDED, and only ever called on the server with
 * the template id read out of the saved invitation: when an order is made,
 * when a coupon is quoted, when a captured payment is checked, and when a paid
 * card asks to move to another template. `unknown`, like getTemplate: a card
 * with no id, or one this build does not know, is Classic and costs what
 * Classic costs. Nothing a browser sends is ever passed here.
 */
export function templatePricePaise(templateId: unknown): number {
  return getTemplate(templateId).price;
}

/** Every category a template is shown under: its own, then any others. */
export function categoriesOf(template: TemplateConfig): readonly TraditionId[] {
  return [template.category, ...(template.alsoIn ?? [])];
}

/** The order of the Traditions Collection's chips. */
export const CATEGORY_ORDER: readonly TraditionId[] = [
  "hindu",
  "muslim",
  "sikh",
  "jain",
  "buddhist",
  "christian",
  "none",
];

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
