import { PREMIUM_PRICE_PAISE, SHEESH_MAHAL_PRICE_PAISE } from "@/lib/pricing";
import emeraldShahiPreview from "@/templates/emerald-shahi/preview.webp";
import gulabMahalPreview from "@/templates/gulab-mahal/preview.webp";
import sheeshMahalPreview from "@/templates/sheesh-mahal/preview.webp";
import type { TemplateConfig } from "@/templates/types";

/**
 * How each template in the Premium Collection is listed: its id, its name,
 * whether the gallery offers it, its price and its preview. Each premium
 * config spreads its own entry, so these are the registry's values and not a
 * copy of them.
 *
 * KEPT APART FROM THE CONFIGS for a page that only lists the collection, the
 * landing page above all: a config brings its whole card with it, which a
 * visitor on a slow phone would download for a name, a price and a picture.
 * Nothing here imports more than an image.
 *
 * A new premium template adds its entry here and spreads it into its config;
 * registry.ts checks that every premium template has one.
 */
export type TemplateListing = Pick<
  TemplateConfig,
  "id" | "name" | "listed" | "collection" | "price" | "preview"
>;

export const EMERALD_SHAHI_LISTING = {
  id: "emerald-shahi",
  name: "Emerald Shahi",
  listed: true,
  collection: "premium",
  price: PREMIUM_PRICE_PAISE,
  preview: emeraldShahiPreview,
} as const satisfies TemplateListing;

export const GULAB_MAHAL_LISTING = {
  id: "gulab-mahal",
  name: "Gulab Mahal",
  listed: true,
  collection: "premium",
  price: PREMIUM_PRICE_PAISE,
  preview: gulabMahalPreview,
} as const satisfies TemplateListing;

/* At the premium price for now: its own is SHEESH_MAHAL_PRICE_PAISE in lib/pricing.ts. */
export const SHEESH_MAHAL_LISTING = {
  id: "sheesh-mahal",
  name: "Sheesh Mahal",
  listed: true,
  collection: "premium",
  price: SHEESH_MAHAL_PRICE_PAISE,
  preview: sheeshMahalPreview,
} as const satisfies TemplateListing;

/** The Premium Collection, in the gallery's order. */
export const PREMIUM_LISTINGS: readonly TemplateListing[] = [
  SHEESH_MAHAL_LISTING,
  EMERALD_SHAHI_LISTING,
  GULAB_MAHAL_LISTING,
];

/** The premium templates the gallery offers, with a preview to show: what the landing page lists. */
export function listedPremium(): readonly (TemplateListing & {
  preview: NonNullable<TemplateListing["preview"]>;
})[] {
  return PREMIUM_LISTINGS.filter(
    (
      listing,
    ): listing is TemplateListing & {
      preview: NonNullable<TemplateListing["preview"]>;
    } => listing.listed && listing.preview !== null,
  );
}
