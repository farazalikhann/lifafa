"use client";

import Link from "next/link";
import { useEffect, useState, type ReactElement } from "react";

/** A phone or tablet of Apple's, whose print sheet has no "Save as PDF" in it. */
function onIos(): boolean {
  const { userAgent, platform, maxTouchPoints } = navigator;

  return (
    /iPad|iPhone|iPod/.test(userAgent) ||
    /* An iPad that says it is a Mac. */
    (platform === "MacIntel" && maxTouchPoints > 1)
  );
}

/**
 * The bar over the printable copy, for a visitor who is looking at it as a
 * page: the way back to the card, the button that opens the print sheet, and
 * a line saying what to choose once it is open.
 *
 * That line matters most on an iPhone. There the card cannot print the copy
 * from a frame, so its button brings the guest here (see KeepsakeSection),
 * and the iPhone's sheet has no "Save as PDF" in it at all: the file is made
 * through Share. So this is where the iPhone's own words are said.
 *
 * On the screen only. It is not on the paper (globals.css), and nobody sees
 * it when the card opened the copy in a frame of its own to print it.
 */
export default function PrintBar({
  backHref,
  backLabel,
  printLabel,
  hint,
  hintIos,
}: {
  backHref: string;
  backLabel: string;
  printLabel: string;
  /** What to choose in the browser's print sheet. */
  hint: string;
  /** The same, on an iPhone. */
  hintIos: string;
}): ReactElement {
  /* Known only in the browser, and after the first paint, so the two renders agree. */
  const [ios, setIos] = useState<boolean>(false);

  useEffect(() => {
    setIos(onIos());
  }, []);

  return (
    <div className="lifafa-print-bar">
      <div className="lifafa-print-bar-row">
        <Link href={backHref} className="lifafa-print-bar-link">
          {backLabel}
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="lifafa-print-bar-button"
        >
          {printLabel}
        </button>
      </div>
      <p className="lifafa-print-bar-hint">{ios ? hintIos : hint}</p>
    </div>
  );
}
