"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from "react";
import CardCanvas from "@/components/card/CardCanvas";
import { borderClearance } from "@/components/card/decor/BorderFrame";
import { CardStillContext } from "@/hooks/useCardStill";
import { PREVIEW_INVITE } from "@/lib/calendar";
import { getMotifs } from "@/lib/motifs";
import { PRINT_MESSAGE_DONE, PRINT_MESSAGE_READY } from "@/lib/pdfDownload";
import { PRINT_PAGE_HEIGHT, type PrintSheet } from "@/lib/printCard";
import { getTheme } from "@/lib/themes";
import type { EventDraft } from "@/types/event";

/** The longest the fit waits for the card's faces, and for its pictures. */
const FONTS_WAIT_MS = 6000;
const PICTURES_WAIT_MS = 9000;

/** How far the words on a sheet may be brought down to fit it, and how far up to fill it. */
const MIN_FIT = 0.5;
const MAX_FIT = 1.18;

/** How much of a sheet's clear height the words are let fill, so nothing sits on the border. */
const FILL = 0.94;

/**
 * The least a sheet's words are brought down before the sheet is given up as
 * too full and each of its sections is put on a sheet of its own. Below this
 * the card's small print is under seven points on paper.
 */
const CROWDED_FIT = 0.72;

/** The room the strip with the QR code takes at the foot of the last sheet, in px. */
const STRIP_HEIGHT = 92;

/** Marks the card's reading column on a sheet, which is what is fitted. */
const COLUMN = ".lifafa-card-content.z-10";

function after(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** Every picture on the page has arrived or failed, and none has been added since the last look. */
async function picturesSettled(): Promise<void> {
  const until = performance.now() + PICTURES_WAIT_MS;
  let steady = 0;
  let seen = -1;

  while (performance.now() < until && steady < 3) {
    const pictures = [...document.images];

    /* Nothing on paper is scrolled to, so nothing may wait to be. */
    for (const picture of pictures) {
      if (picture.loading === "lazy") {
        picture.loading = "eager";
      }
    }

    const done = pictures.every((picture) => picture.complete);
    steady = done && pictures.length === seen ? steady + 1 : 0;
    seen = pictures.length;

    await after(120);
  }
}

/**
 * Each sheet's words, sized to its sheet.
 *
 * The card is written for a phone, which is taller for its width than a sheet
 * of A5, and a sheet may carry two of its sections. So the reading column of
 * each is measured as it stands and then zoomed: down until everything on the
 * sheet fits inside its border, or up a little where a sheet would otherwise
 * be half empty, and set in the middle of what room is left. A sheet whose
 * words would have to come down too far to be read is reported instead, and
 * is printed as a sheet to each of its sections. `zoom` and not a
 * transform, so the column takes up the room it is drawn in and nothing has
 * to be moved to make up for it. The border, the texture and what hangs from
 * the top of the card are not in the column, and stay the sheet's own size.
 */
function fitSheets(): readonly string[] {
  const crowded: string[] = [];

  for (const sheet of document.querySelectorAll<HTMLElement>("[data-print-sheet]")) {
    const column = sheet.querySelector<HTMLElement>(COLUMN);

    if (column === null) {
      continue;
    }

    const top = Number(sheet.dataset.clearTop ?? 0);
    const bottom = Number(sheet.dataset.clearBottom ?? 0);
    const clear = PRINT_PAGE_HEIGHT - top - bottom;

    column.style.zoom = "1";
    column.style.paddingTop = "0px";

    const natural = column.getBoundingClientRect().height;

    if (natural <= 0) {
      continue;
    }

    const wanted = (clear * FILL) / natural;

    if (wanted < CROWDED_FIT && Number(sheet.dataset.sections ?? 1) > 1) {
      crowded.push(sheet.dataset.printSheet ?? "");
    }

    const fit = Math.min(MAX_FIT, Math.max(MIN_FIT, wanted));
    column.style.zoom = String(Math.round(fit * 1000) / 1000);

    const drawn = column.getBoundingClientRect().height;
    /* In the column's own, zoomed, px: padding inside a zoomed box is zoomed with it. */
    const lead = Math.max(0, top + (clear - drawn) / 2) / fit;
    column.style.paddingTop = `${Math.round(lead)}px`;
  }

  return crowded;
}

/** A sheet with more than one section on it, as one sheet to each. */
function apart(sheet: PrintSheet): readonly PrintSheet[] {
  return sheet.config.blocks.map((block, index) => ({
    id: `${sheet.id}-${index}`,
    first: sheet.first && index === 0,
    config: {
      ...sheet.config,
      blocks: [block],
      /* What hangs from the top of the card hangs over its first sheet only. */
      ornamentConfig:
        sheet.first && index === 0
          ? sheet.config.ornamentConfig
          : { ...sheet.config.ornamentConfig, enabledOrnaments: [] },
    },
  }));
}

/**
 * The invitation as sheets of A5: the printable copy.
 *
 * Each sheet is the card itself (CardCanvas) with that sheet's sections on it
 * (lib/printCard.ts), drawn still: nothing waits to be scrolled to or tapped.
 * The sheet is the frame the card is sized against, so the card's ground, its
 * texture and its border are the sheet's, edge to edge.
 *
 * WHEN IT IS READY. Paper cannot wait for a late face or a late picture, so
 * once the card's fonts are in and every picture has arrived, the sheets are
 * fitted (see fitSheets), the page says so (`data-print-ready` on <html>, and
 * a message to the card when the card opened it in a frame), and only then,
 * if it was asked to, opens the print sheet.
 */
export default function PrintDocument({
  draft,
  sheets,
  auto,
  strip,
}: {
  draft: EventDraft;
  sheets: readonly PrintSheet[];
  /** Open the browser's print sheet as soon as the copy is ready. */
  auto: boolean;
  /** The QR strip, drawn on the server, for the foot of the last sheet. */
  strip: ReactElement;
}): ReactElement {
  /* Sheets found too full for their words, each printed a section to a sheet. */
  const [crowded, setCrowded] = useState<readonly string[]>([]);
  const dealt = useRef<boolean>(false);
  const laid = useMemo(
    () =>
      sheets.flatMap((sheet) =>
        crowded.includes(sheet.id) ? apart(sheet) : [sheet],
      ),
    [sheets, crowded],
  );

  useEffect(() => {
    let live = true;
    const root = document.documentElement;
    const framed = window.parent !== window;

    const tell = (message: string): void => {
      if (framed) {
        window.parent.postMessage(message, window.location.origin);
      }
    };

    const done = (): void => tell(PRINT_MESSAGE_DONE);
    window.addEventListener("afterprint", done);

    void (async () => {
      const fonts = document.fonts;

      await Promise.race([
        fonts === undefined ? Promise.resolve() : fonts.ready.then(() => undefined),
        after(FONTS_WAIT_MS),
      ]);
      await picturesSettled();

      if (!live) {
        return;
      }

      fitSheets();
      /* And once more a frame later: a face that swapped in has moved the lines. */
      await after(60);
      const full = fitSheets();

      /* Once only: the sheets are laid again, a section to each, and this runs again on them. */
      if (full.length > 0 && !dealt.current) {
        dealt.current = true;
        setCrowded(full);
        return;
      }

      /* On a phone's screen the sheets are brought down to its width; paper ignores this. */
      const sheet = document.querySelector<HTMLElement>("[data-print-sheet]");
      if (sheet !== null && sheet.offsetWidth > 0) {
        root.style.setProperty(
          "--print-screen-zoom",
          String(Math.min(1, (window.innerWidth - 24) / sheet.offsetWidth)),
        );
      }

      root.dataset.printReady = "1";
      tell(PRINT_MESSAGE_READY);

      if (auto) {
        /* A frame for the sheet's own layout to settle in before the dialog freezes the page. */
        await after(80);

        if (live) {
          window.print();
        }
      }
    })();

    return () => {
      live = false;
      window.removeEventListener("afterprint", done);
    };
  }, [auto, crowded]);

  return (
    <div className="lifafa-print-sheets">
      {laid.map((sheet, index) => {
        const { config } = sheet;
        const last = index === laid.length - 1;
        const clearance = borderClearance(config.borderStyle);
        /* The garland hangs from the top edge only; nothing is drawn at the foot. */
        const foot = config.borderStyle === "hangingGarland" ? 0 : clearance.y;

        return (
          <div
            key={sheet.id}
            data-print-sheet={sheet.id}
            data-sections={config.blocks.length}
            data-first={sheet.first ? "" : undefined}
            /* The first sheet's opening keeps clear of what hangs over it by itself. */
            data-clear-top={sheet.first ? 0 : clearance.y}
            data-clear-bottom={foot + (last ? STRIP_HEIGHT : 0)}
            className="lifafa-print-sheet"
          >
            <CardStillContext value={true}>
              <CardCanvas
                draft={draft}
                theme={getTheme(config.themeId)}
                config={config}
                motifs={getMotifs(config.occasionId, config.traditionId)}
                sizing="frame"
                frameHeight={PRINT_PAGE_HEIGHT}
                audience="host-preview"
                invite={PREVIEW_INVITE}
                fillsPhone
              />
            </CardStillContext>

            {last ? (
              <div
                className="lifafa-print-strip"
                style={{ "--print-strip-foot": `${foot}px` } as CSSProperties}
              >
                {strip}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
