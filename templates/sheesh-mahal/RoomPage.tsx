import type { CSSProperties, ReactElement, ReactNode } from "react";
import Foil from "@/templates/sheesh-mahal/Foil";
import SheeshPage from "@/templates/sheesh-mahal/Page";
import styles from "@/templates/sheesh-mahal/sheesh.module.css";
import { scriptLeading, type SheeshFonts } from "@/templates/sheesh-mahal/shared";
import type { CardLanguage } from "@/types/card";

/**
 * One of the rooms still to be furnished (pages 3 to 7): its picture, laid
 * as it will be, and its heading in gold, so the walk from room to room can
 * be seen whole. What each says is built in the parts to come.
 *
 * `cover` lays the picture over the whole room, at `framing` (a still zoom
 * and the point it is about, for a picture used by two rooms); `object` sets
 * it whole on the night.
 */
export default function SheeshRoomPage({
  heading,
  src,
  lay,
  framing,
  language,
  fonts,
  children,
}: {
  heading: string;
  src: string;
  lay: "cover" | "object";
  framing?: { scale: number; origin: string };
  language: CardLanguage;
  fonts: SheeshFonts;
  children?: ReactNode;
}): ReactElement {
  const still: CSSProperties | undefined =
    framing === undefined
      ? undefined
      : { transform: `scale(${framing.scale})`, transformOrigin: framing.origin };

  return (
    <SheeshPage
      label={heading}
      images={[src]}
      ground={
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className={lay === "cover" ? styles.roomArt : styles.roomObject}
          style={still}
        />
      }
    >
      <h2
        className={`${styles.roomHeading} ${styles.lineUp}`}
        style={{ ...fonts.names, lineHeight: scriptLeading(language), "--sm-delay": "150ms" } as CSSProperties}
      >
        <Foil text={heading} />
      </h2>
      {children}
    </SheeshPage>
  );
}
