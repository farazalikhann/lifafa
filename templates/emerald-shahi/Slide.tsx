import type { CSSProperties, ReactElement, ReactNode } from "react";
import styles from "@/templates/emerald-shahi/emerald.module.css";

/**
 * One thing that slides in from a side as it fades in: a heading, a line of
 * text, a card. See `.enter` in the stylesheet for the movement, and useEnter
 * for what says when.
 *
 * `order` staggers the lines of one block by about a tenth of a second each,
 * so they arrive one after another and not as a slab.
 */
export default function Slide({
  entered,
  from,
  order = 0,
  as: Tag = "div",
  className = "",
  style,
  children,
}: {
  entered: boolean;
  from: "left" | "right";
  order?: number;
  as?: "div" | "p" | "span" | "h2" | "article";
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}): ReactElement {
  return (
    <Tag
      className={`${styles.enter} ${entered ? styles.entered : ""} ${className}`}
      style={
        {
          "--es-from": from === "left" ? "-40px" : "40px",
          "--es-delay": `${order * 110}ms`,
          ...style,
        } as CSSProperties
      }
    >
      {children}
    </Tag>
  );
}
