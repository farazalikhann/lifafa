"use client";

import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import BorderInset from "@/components/invite/BorderInset";
import { cardCopy } from "@/lib/cardLanguage";
import { DISPLAY_FACE } from "@/lib/fontPairs";
import {
  PRINT_AUTO_PARAM,
  PRINT_MESSAGE_DONE,
  PRINT_MESSAGE_READY,
} from "@/lib/pdfDownload";
import type { Theme } from "@/lib/themes";
import type { CardBorderStyle, CardLanguage } from "@/types/card";

/** The picture over the words: a folded card tied with a ribbon. 354 by 360 as cut. */
const ART = "/decor/keepsake/keepsake-card.webp";
const ART_HEIGHT = 120;
const ART_WIDTH = Math.round((ART_HEIGHT * 354) / 360);

/**
 * How long the copy is given to say it is ready before the card stops
 * waiting and opens it as a page instead. Longer than the copy's own waits
 * for its faces and pictures on a slow connection would usually run to.
 */
const FRAME_WAIT_MS = 14000;

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
 * The way to keep the card: the last thing on the guest's page, under the
 * hosts' note and inside the card's own border.
 *
 * A picture, a line and one button, in the card's own display face and
 * accent, so it reads as the end of the card and not as something the
 * website added under it.
 *
 * WHAT THE BUTTON DOES. The printable copy is a page of its own
 * (app/i/[inviteCode]/print). The button loads it in a frame nobody sees and
 * the copy opens the browser's print sheet itself once its faces and pictures
 * are in, so the guest goes from the card straight to "Save as PDF" and comes
 * back to the card where they left it. The frame is as large as a sheet and
 * only made invisible: one with no size would be laid out with no size.
 *
 * WHERE A FRAME WILL NOT DO, THE COPY IS OPENED AS A PAGE. An iPhone prints
 * the page it is on and not a frame inside it, so there the button simply
 * goes to the copy, which has its own way back. The same happens anywhere the
 * frame has not answered in time.
 *
 * The saved file is named after the page that is printed, so while the sheet
 * is open this page takes the copy's title too: some browsers name the file
 * after the frame's page and some after the page that holds it.
 *
 * After the first tap a line under the button says what to choose next,
 * because the print sheet is the browser's and says nothing about PDFs
 * unless the guest knows where to look.
 */
export default function KeepsakeSection({
  theme,
  language,
  borderStyle,
  printHref,
  fileTitle,
}: {
  /** The card's composed theme, as the note above is handed it. */
  theme: Theme;
  language: CardLanguage;
  borderStyle: CardBorderStyle;
  /** The printable copy, in the language on screen. See printPath. */
  printHref: string;
  /** What the saved file is called, less its extension. */
  fileTitle: string;
}): ReactElement {
  const copy = cardCopy(language).keepsake;
  const [preparing, setPreparing] = useState<boolean>(false);
  /* Which line of help to show, once the button has been used. */
  const [hint, setHint] = useState<"none" | "sheet" | "ios">("none");
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const waitRef = useRef<number>(0);
  const titleRef = useRef<string | null>(null);

  /* The frame taken away, and this page given its own name back. */
  const settle = useCallback((): void => {
    window.clearTimeout(waitRef.current);
    frameRef.current?.remove();
    frameRef.current = null;

    if (titleRef.current !== null) {
      document.title = titleRef.current;
      titleRef.current = null;
    }

    setPreparing(false);
  }, []);

  useEffect(() => {
    const hear = (event: MessageEvent): void => {
      if (event.origin !== window.location.origin || frameRef.current === null) {
        return;
      }

      if (event.data === PRINT_MESSAGE_READY) {
        /* It answered: the sheet is about to open, under this page's borrowed name. */
        window.clearTimeout(waitRef.current);
        setPreparing(false);
      } else if (event.data === PRINT_MESSAGE_DONE) {
        settle();
      }
    };

    window.addEventListener("message", hear);

    return () => {
      window.removeEventListener("message", hear);
      settle();
    };
  }, [settle]);

  const save = (): void => {
    if (preparing) {
      return;
    }

    const auto = `${printHref}&${PRINT_AUTO_PARAM}=1`;

    if (onIos()) {
      setHint("ios");
      window.location.assign(auto);
      return;
    }

    setHint("sheet");
    setPreparing(true);
    settle();
    setPreparing(true);

    titleRef.current = document.title;
    document.title = fileTitle;

    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    frame.title = fileTitle;
    /* A sheet's size, out of sight: see the note above on why it has a size at all. */
    frame.style.cssText =
      "position:fixed;right:0;bottom:0;width:148mm;height:210mm;border:0;opacity:0;pointer-events:none;z-index:-1";
    frame.src = auto;
    document.body.appendChild(frame);
    frameRef.current = frame;

    /* No answer: open the copy as a page, where its own button is. */
    waitRef.current = window.setTimeout(() => {
      settle();
      window.location.assign(printHref);
    }, FRAME_WAIT_MS);
  };

  return (
    <BorderInset borderStyle={borderStyle} last>
      <section
        data-keepsake=""
        className="mx-auto flex w-full max-w-[480px] flex-col items-center gap-4 px-5 pt-6 pb-12 text-center sm:px-6"
      >
        <img
          src={ART}
          alt=""
          width={ART_WIDTH}
          height={ART_HEIGHT}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="select-none"
          style={{ height: ART_HEIGHT, width: "auto" }}
        />

        <p
          className={`text-[1.25rem] text-balance ${
            cardCopy(language).script === "devanagari" ? "leading-[1.7]" : "leading-snug"
          }`}
          style={{
            color: theme.textPrimary,
            fontFamily: theme.displayFontFamily ?? DISPLAY_FACE,
            fontWeight: theme.displayFontWeight,
          }}
        >
          {copy.heading}
        </p>

        <button
          type="button"
          onClick={save}
          aria-busy={preparing}
          className="min-h-[52px] w-full max-w-[17rem] rounded-xl px-6 text-base font-semibold transition-transform duration-150 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          style={{
            backgroundColor: theme.accent,
            color: theme.background,
            outlineColor: theme.accent,
          }}
        >
          {preparing ? copy.preparing : copy.button}
        </button>

        {/* Always in the layout, so the page does not jump when the line appears. */}
        <p
          aria-live="polite"
          className="min-h-[1.25rem] text-[0.8125rem] leading-snug"
          style={{ color: theme.textMuted }}
        >
          {hint === "ios" ? copy.hintIos : hint === "sheet" ? copy.hint : ""}
        </p>
      </section>
    </BorderInset>
  );
}
