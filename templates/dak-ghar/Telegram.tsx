"use client";

import type { ReactElement } from "react";
import { ART } from "@/templates/dak-ghar/art";
import { PageHeading } from "@/templates/dak-ghar/Paper";
import styles from "@/templates/dak-ghar/dak.module.css";
import { DAK_FONTS, dakCopy, leading } from "@/templates/dak-ghar/shared";
import { useReveal } from "@/templates/dak-ghar/useReveal";
import type { CardLanguage } from "@/types/card";

/**
 * The host's note, typed on a telegram slip. The slip is its picture
 * stretched to the words: a short note sits in its own shape, a long one
 * makes it taller, and the words stay inside its ruled panel.
 */
export default function DakGharTelegram({ message, language }: { message: string; language: CardLanguage }): ReactElement {
  const { ref, shown } = useReveal<HTMLElement>();

  return (
    <section ref={ref} className={styles.page}>
      <div className={`${styles.reveal} ${shown ? styles.shown : ""} flex w-full flex-col items-center gap-6`}>
        <PageHeading>{dakCopy(language).telegram}</PageHeading>
        <div className={styles.telegram} style={{ backgroundImage: `url(${ART.telegram})` }}>
          <p
            className="max-w-full text-base whitespace-pre-line wrap-anywhere text-pretty"
            style={{ ...DAK_FONTS.sans, fontWeight: 500, color: "var(--dg-ink)", lineHeight: leading(language, 1.65) }}
          >
            {message}
          </p>
        </div>
      </div>
    </section>
  );
}
