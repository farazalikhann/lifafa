"use client";

import type { ReactElement, ReactNode } from "react";
import { ART } from "@/templates/sheesh-mahal/art";
import SheeshPage from "@/templates/sheesh-mahal/Page";
import styles from "@/templates/sheesh-mahal/sheesh.module.css";
import { sheeshCopy } from "@/templates/sheesh-mahal/shared";
import type { CardLanguage } from "@/types/card";

/**
 * Page 8: the reply, on a farmaan on the night.
 *
 * THE PAPER ONLY, and its page. What is on it is the card's own reply form,
 * or its confirmation and the guest's pass, handed in as they are, in the
 * farmaan's theme (`farmaanTheme` in shared.ts). Nothing about what a reply
 * does is here.
 *
 * A page in the flow, not a held room: the form can be longer than a screen
 * (its errors, the pass), so it scrolls like any page and arrives over the
 * room before it. The farmaan is a three-slice (see `.farmaan`): its rod and
 * its foot at their own size, only its plain paper stretched to the form.
 */
export default function SheeshRsvpFrame({
  children,
  language = "en",
}: {
  children: ReactNode;
  stage?: "form" | "confirmed";
  language?: CardLanguage;
}): ReactElement {
  return (
    <SheeshPage
      label={sheeshCopy(language).pages.rsvp}
      images={[ART.farmaan]}
      flow
      className={styles.palette}
    >
      <div className={styles.farmaan}>{children}</div>
    </SheeshPage>
  );
}
