import type { ReactElement, ReactNode } from "react";
import { ART } from "@/templates/gulab-mahal/art";
import styles from "@/templates/gulab-mahal/gulab.module.css";
import { Corners } from "@/templates/gulab-mahal/Decor";
import GulabPage from "@/templates/gulab-mahal/Page";

/**
 * Page 8: the reply, on ivory paper.
 *
 * ONLY THE PAPER, and the page it is a stop of. What is on it is the card's
 * own reply form, or its confirmation and the guest's pass, handed in as they
 * are, in the letter theme (`letterTheme` in shared.ts). A placeholder for
 * the rose letter and envelope it will be; already a page of the stack, which
 * grows to whatever the form comes to, errors and all, and scrolls within the
 * flow when that is taller than the screen.
 */
export default function GulabRsvpFrame({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    <GulabPage
      label="RSVP"
      images={[ART.letterPaper, ART.envelope]}
      variant={6}
      className={`${styles.palette} py-10`}
    >
      <div className={`${styles.sheet} ${styles.rise} !gap-0 !px-0 !py-4`}>
        <Corners size={0.26} />
        <div className="w-full">{children}</div>
      </div>
    </GulabPage>
  );
}
