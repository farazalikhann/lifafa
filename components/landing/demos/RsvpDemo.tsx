import type { ReactElement } from "react";
import DemoPhone, { Tap } from "@/components/landing/demos/DemoPhone";
import styles from "./RsvpDemo.module.css";

/**
 * A guest says yes, and the host's headcount moves.
 *
 * The guest's phone shows the top of an invitation and the reply form under
 * it, in the marigold theme and in the form's own words — see `rsvp` in
 * lib/cardLanguage.ts. They tap "Yes, I'll be there", then "Send my reply",
 * and the tile beside the phone, the host's expected headcount from the
 * dashboard, rolls from 41 to 42.
 *
 * Shortened, not invented: the real form also asks for a name and a number
 * before Send will light up, and a party size for a yes. The demo keeps the two
 * taps that decide the reply.
 */
export default function RsvpDemo(): ReactElement {
  return (
    <DemoPhone
      className={styles.stage}
      beside={
        <div className={styles.host}>
          <p className={styles.hostLabel}>Expected headcount</p>
          <p className={styles.hostCount}>
            <span className={styles.window}>
              <span className={styles.digits}>
                <span>41</span>
                <span>42</span>
              </span>
            </span>
            <span className={styles.plus}>+1</span>
          </p>
        </div>
      }
    >
      <div className={styles.content}>
        <div className={styles.divider}>
          <span className={styles.rule} />
          <span className={styles.diamond} />
          <span className={styles.rule} />
        </div>
        <p className={styles.names}>Aarav &amp; Meera</p>
        <p className={styles.when}>12 December · Jaipur</p>

        <div className={styles.reply}>
          <p className={styles.question}>Will you join us?</p>

          <div className={styles.choices}>
            <div className={styles.choice}>
              <span className={styles.label}>Yes, I&apos;ll be there</span>
              <span className={`${styles.label} ${styles.chosen}`}>
                Yes, I&apos;ll be there
              </span>
              <Tap className={styles.tapYes} />
            </div>
            <div className={styles.choice}>
              <span className={styles.label}>Maybe</span>
            </div>
            <div className={styles.choice}>
              <span className={styles.label}>Sorry, can&apos;t make it</span>
            </div>
          </div>

          <div className={styles.send}>
            <span className={styles.label}>Send my reply</span>
            <span className={`${styles.label} ${styles.ready}`}>
              Send my reply
            </span>
            <Tap className={styles.tapSend} />
          </div>
        </div>
      </div>
    </DemoPhone>
  );
}
