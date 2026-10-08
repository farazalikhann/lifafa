import type { ReactElement } from "react";
import { functionIconSrc, type FunctionIconId } from "@/lib/ceremonies";

/**
 * The painting of a function: objects of the ceremony, never people, hands or
 * animals. One picture for a light card and a dark one, cut out on a clear
 * ground, 200px on its longer side, so it is sharp at 3x in a medallion and
 * in a chip alike. Decoration only: the function's name is always beside it.
 */
export default function FunctionIcon({
  icon,
  size,
}: {
  icon: FunctionIconId;
  /** A CSS length for the box it is fitted inside; the caller sizes it off the card's own scale. */
  size: string;
}): ReactElement {
  return (
    <img
      src={functionIconSrc(icon)}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      className="pointer-events-none shrink-0 object-contain select-none"
      style={{ width: size, height: size }}
    />
  );
}
