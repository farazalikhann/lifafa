import type { StaticImageData } from "next/image";
import { PREMIUM_PRICE_PAISE, TRADITIONS_PRICE_PAISE } from "@/lib/pricing";
import bodhiIvory from "@/templates/bodhi-ivory/preview.webp";
import classic from "@/templates/classic/preview.webp";
import emeraldShahi from "@/templates/emerald-shahi/preview.webp";
import gulabMahal from "@/templates/gulab-mahal/preview.webp";
import gurdwaraIvory from "@/templates/gurdwara-ivory/preview.webp";
import ivoryChapel from "@/templates/ivory-chapel/preview.webp";
import kesriAnandKaraj from "@/templates/kesri-anand-karaj/preview.webp";
import lotusBlush from "@/templates/lotus-blush/preview.webp";
import maroonRoyal from "@/templates/maroon-royal/preview.webp";
import midnightLantern from "@/templates/midnight-lantern/preview.webp";
import nikahBlush from "@/templates/nikah-blush/preview.webp";
import shubhVivahIvory from "@/templates/shubh-vivah-ivory/preview.webp";

/**
 * The designs the landing page shows, and nothing else of them.
 *
 * NOT THE TEMPLATE REGISTRY. templates/registry.ts brings every template's
 * card with it, and a page that only needs a name, a price and a picture
 * would ship all of that to a visitor on a slow phone. So the few facts the
 * page shows are written out here, in the gallery's order (see TEMPLATES),
 * with the same ids, names and prices. A template added to the gallery is
 * added here too if the landing page should show it.
 */
export interface LandingDesign {
  id: string;
  name: string;
  /** What the gallery calls its tradition (CATEGORY_LABELS, or the template's own label). */
  label: string;
  price: number;
  preview: StaticImageData;
  demoHref: string;
}

function design(
  id: string,
  name: string,
  label: string,
  price: number,
  preview: StaticImageData,
): LandingDesign {
  /* templateDemoPath's own form, written here because lib/templateSamples.ts imports the registry. */
  return { id, name, label, price, preview, demoHref: `/demo/${id}` };
}

export const PREMIUM_DESIGNS: readonly LandingDesign[] = [
  design("emerald-shahi", "Emerald Shahi", "For every wedding", PREMIUM_PRICE_PAISE, emeraldShahi),
  design("gulab-mahal", "Gulab Mahal", "For every wedding", PREMIUM_PRICE_PAISE, gulabMahal),
];

export const TRADITIONS_DESIGNS: readonly LandingDesign[] = [
  design("shubh-vivah-ivory", "Shubh Vivah", "Hindu", TRADITIONS_PRICE_PAISE, shubhVivahIvory),
  design("maroon-royal", "Maroon Royal", "Hindu", TRADITIONS_PRICE_PAISE, maroonRoyal),
  design("nikah-blush", "Nikah Blush", "Muslim", TRADITIONS_PRICE_PAISE, nikahBlush),
  design("midnight-lantern", "Midnight Lantern", "Muslim", TRADITIONS_PRICE_PAISE, midnightLantern),
  design("kesri-anand-karaj", "Kesri Anand Karaj", "Sikh", TRADITIONS_PRICE_PAISE, kesriAnandKaraj),
  design("gurdwara-ivory", "Gurdwara Ivory", "Sikh", TRADITIONS_PRICE_PAISE, gurdwaraIvory),
  design("lotus-blush", "Lotus Blush", "Jain", TRADITIONS_PRICE_PAISE, lotusBlush),
  design("bodhi-ivory", "Bodhi Ivory", "Buddhist", TRADITIONS_PRICE_PAISE, bodhiIvory),
  design("ivory-chapel", "Ivory Chapel", "Christian", TRADITIONS_PRICE_PAISE, ivoryChapel),
  design("classic", "Classic", "Any occasion", TRADITIONS_PRICE_PAISE, classic),
];

/** The four the hero's phone turns through: two premium, two traditions. */
export const HERO_DESIGNS: readonly LandingDesign[] = [
  PREMIUM_DESIGNS[0],
  PREMIUM_DESIGNS[1],
  TRADITIONS_DESIGNS[1],
  TRADITIONS_DESIGNS[2],
];
