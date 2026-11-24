"use client";

import { useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { ART } from "@/templates/shahi-darwaza/art";
import styles from "@/templates/shahi-darwaza/darwaza.module.css";
import { darwazaCopy, scriptLeading } from "@/templates/shahi-darwaza/shared";
import { useEnter } from "@/templates/shahi-darwaza/useEnter";
import { useNear } from "@/templates/shahi-darwaza/useNear";
import type { CardLanguage } from "@/types/card";

/* How long the quill takes to cross, and the signature with it. */
const SIGN_MS = 1300;

/**
 * The Swagat Patra: a scroll on two gold rods that unrolls from its middle
 * as it comes on screen, with the card's own reply form on it.
 *
 * ONLY THE SCROLL. What is on it is the card's own reply form, or its
 * confirmation and the guest's pass, handed in as they are: Accept, Decline,
 * Maybe, how many are coming, every check and the request itself are the
 * shared form's (`paperTheme` in shared.ts sets them in maroon ink).
 *
 * THE UNROLL: the paper grows from its middle (scaleY) while the two rods
 * part from the middle to its ends, then the words fade in. The paper is
 * rsvp-scroll.webp cut into three by border-image, so the rods keep their
 * shape however long the form is; it is given only a screen ahead (useNear).
 *
 * SIGNED, as the reply lands: when the page moves from the form to the
 * confirmation, a quill crosses the scroll once and the guest's name is
 * written behind it in script, uncovered from left to right by a window
 * that grows with the quill (two transforms, the window and the words
 * counter-moving). The confirmation fades in under the signature after.
 * Under reduced motion the name and the confirmation simply appear.
 */
export default function ShahiDarwazaRsvpFrame({
  children,
  stage = "form",
  language = "en",
  guestName,
}: {
  children: ReactNode;
  stage?: "form" | "confirmed";
  language?: CardLanguage;
  guestName?: string;
}): ReactElement {
  const { ref, entered } = useEnter<HTMLDivElement>();
  const near = useNear<HTMLDivElement>();
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const copy = darwazaCopy(language);

  /* Signing: from the moment the form gives way to the confirmation, once each time it does. */
  const previous = useRef(stage);
  const [signing, setSigning] = useState<boolean>(false);
  const [signed, setSigned] = useState<boolean>(stage === "confirmed");

  useEffect(() => {
    const was = previous.current;
    previous.current = stage;

    if (stage !== "confirmed") {
      setSigning(false);
      setSigned(false);
      return;
    }

    if (was === "confirmed") {
      return;
    }

    if (reducedMotion) {
      setSigned(true);
      return;
    }

    setSigned(false);
    setSigning(true);
    const timer = window.setTimeout(() => setSigned(true), SIGN_MS);

    return () => window.clearTimeout(timer);
  }, [stage, reducedMotion]);

  const name = guestName?.trim() ?? "";
  const showSignature = stage === "confirmed" && name.length > 0;

  return (
    <div
      ref={(element) => {
        ref.current = element;
        near.ref.current = element;
      }}
      className={`${styles.scrollStage} ${entered ? styles.scrollOpen : ""}`}
    >
      <span aria-hidden="true" className={`${styles.rose} ${styles.roseScroll}`} />
      <div className={styles.scroll}>
        <span aria-hidden="true" className={`${styles.scrollPaper} ${near.near ? styles.scrollPaperArt : ""}`} />
        <span aria-hidden="true" className={styles.scrollRodTrack}>
          <span className={`${styles.scrollRod} ${near.near ? styles.scrollRodTop : ""}`} />
        </span>
        <span aria-hidden="true" className={`${styles.scrollRodTrack} ${styles.scrollRodTrackFoot}`}>
          <span className={`${styles.scrollRod} ${near.near ? styles.scrollRodFoot : ""}`} />
        </span>

        <div className={styles.scrollWords}>
          <p className={styles.scrollTitle} style={{ lineHeight: scriptLeading(language) }}>
            {copy.swagatPatra}
          </p>

          {showSignature ? (
            <p className={`${styles.signature} ${signing ? styles.signing : ""}`}>
              <span className="sr-only">{copy.signedBy}: </span>
              {/*
                The window the name is seen through, and the quill's track, move
                together from one name's width to the left to where the name is;
                the name moves the other way inside the window, so it stays put
                and is uncovered from its left, with the nib at the edge.
              */}
              <span className={styles.signatureBox}>
                <span className={styles.signatureWindow}>
                  <span className={styles.signatureName} style={{ lineHeight: scriptLeading(language) }}>
                    {name}
                  </span>
                </span>
                {signing ? (
                  <span aria-hidden="true" className={styles.quillTrack}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ART.quill} alt="" draggable={false} className={styles.quill} />
                  </span>
                ) : null}
              </span>
            </p>
          ) : null}

          <div
            className="relative"
            style={{
              opacity: stage === "confirmed" && !signed ? 0 : 1,
              transition: "opacity 500ms ease-out",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
