import type { CardConfig, CardTopImage } from "@/types/card";

/**
 * The card's own picture at the top of its opening (CardConfig.topImage), or
 * null. Only a file this site serves from /card-art/ is drawn: the field is
 * set by Lifafa per card, and a stored value that points anywhere else is
 * ignored rather than loaded into a guest's page.
 */

const TOP_IMAGE_PREFIX = "/card-art/";
const DEFAULT_WIDTH = 110;
const MAX_WIDTH = 200;

export function cardTopImage(
  config: Pick<CardConfig, "topImage">,
): Required<CardTopImage> | null {
  const image = config.topImage;

  if (
    image === undefined ||
    image === null ||
    typeof image.src !== "string" ||
    !image.src.startsWith(TOP_IMAGE_PREFIX) ||
    image.src.includes("..")
  ) {
    return null;
  }

  const width =
    typeof image.width === "number" && Number.isFinite(image.width)
      ? Math.min(Math.max(image.width, 40), MAX_WIDTH)
      : DEFAULT_WIDTH;

  return {
    src: image.src,
    alt: typeof image.alt === "string" ? image.alt : "",
    width,
  };
}

/** What the host's dashboard calls a card: its hostTitle where set, else its title. */
export function hostCardTitle(
  config: Pick<CardConfig, "hostTitle">,
  eventTitle: string,
): string {
  const own = typeof config.hostTitle === "string" ? config.hostTitle.trim() : "";

  return own.length > 0 ? own : eventTitle.trim();
}
