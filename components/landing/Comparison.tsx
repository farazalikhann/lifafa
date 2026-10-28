import type { ReactElement } from "react";
import {
  EYEBROW,
  SECTION_HEADING,
  SECTION_LEAD,
  SECTION_X,
  SECTION_Y,
} from "@/components/landing/styles";
import { BrushWash } from "@/components/landing/Brush";
import { LOWEST_PRICE_PAISE, formatPrice } from "@/lib/pricing";

interface Row {
  label: string;
  printed: string;
  file: string;
  lifafa: string;
}

/*
  Every Lifafa cell is something the product does today. "Animation and
  sound" rather than music: hosts cannot add a song at the moment, but every
  cover opens with its own animation and sound.
*/
const ROWS: readonly Row[] = [
  { label: "Cost", printed: "High", file: "Low", lifafa: `From ${formatPrice(LOWEST_PRICE_PAISE)}` },
  {
    label: "Change details after sharing",
    printed: "Not possible",
    file: "Send a new file",
    lifafa: "Instant, same link",
  },
  {
    label: "Know who is coming",
    printed: "No",
    file: "Count replies by hand",
    lifafa: "Live RSVP and headcount",
  },
  { label: "Guest check-in on the day", printed: "No", file: "No", lifafa: "QR check-in" },
  { label: "Hindi and English", printed: "Print twice", file: "Make twice", lifafa: "Built in translate" },
  { label: "Animation and sound", printed: "No", file: "No", lifafa: "Yes" },
];

/**
 * Lifafa beside a printed card and a WhatsApp image or PDF.
 *
 * From `md` a real table, with the Lifafa column highlighted. On a phone the
 * three columns do not fit beside the labels, and a scrolling table would
 * start with the Lifafa column out of view, so each row becomes a small card
 * instead: Lifafa's answer first and highlighted, the other two under it. The
 * page never scrolls sideways at any width. Only one of the two is displayed,
 * so a screen reader meets the comparison once.
 */
export default function Comparison(): ReactElement {
  const cell = "px-5 py-4 align-top text-base leading-[1.5] text-[var(--paper-muted)]";

  return (
    <section aria-labelledby="compare-heading" className={`${SECTION_X} ${SECTION_Y}`}>
      <div className="mx-auto max-w-[62rem]">
        <div className="text-center">
          <p className={EYEBROW}>Compare</p>
          <h2 id="compare-heading" className={`mt-3 ${SECTION_HEADING}`}>
            One link does what paper cannot
          </h2>
          <p className={`mx-auto mt-4 max-w-[34rem] ${SECTION_LEAD}`}>
            How a Lifafa invitation compares with a printed card and an image
            sent on WhatsApp.
          </p>
        </div>

        <ul role="list" className="mt-8 flex list-none flex-col gap-3 md:hidden">
          {ROWS.map((row) => (
            <li
              key={row.label}
              className="overflow-hidden rounded-2xl border border-[var(--paper-hairline)] bg-[var(--paper-card)]"
            >
              <h3 className="px-4 pt-4 pb-3 text-base font-bold text-[var(--paper-ink)]">
                {row.label}
              </h3>
              <dl className="text-[0.9375rem] leading-[1.5]">
                <div className="flex justify-between gap-4 bg-[var(--paper-blush)]/40 px-4 py-2.5">
                  <dt className="font-[family-name:var(--paper-display)] font-semibold text-[var(--paper-emerald)]">
                    Lifafa
                  </dt>
                  <dd className="text-right font-semibold text-[var(--paper-emerald)]">{row.lifafa}</dd>
                </div>
                <div className="flex justify-between gap-4 px-4 py-2.5">
                  <dt className="text-[var(--paper-muted)]">Printed card</dt>
                  <dd className="text-right text-[var(--paper-muted)]">{row.printed}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-[var(--paper-hairline)] px-4 py-2.5">
                  <dt className="text-[var(--paper-muted)]">WhatsApp image or PDF</dt>
                  <dd className="text-right text-[var(--paper-muted)]">{row.file}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>

        <div className="relative isolate mt-12 hidden overflow-hidden rounded-3xl border border-[var(--paper-hairline)] bg-[var(--paper-card)] md:block">
          {/* A faint blush wash under the Lifafa column. */}
          <BrushWash tone="blush" opacity={0.45} className="top-[8%] right-[-3%] bottom-[-4%] w-[30%]" />
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">
              Lifafa compared with a printed card and a WhatsApp image or PDF
            </caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="w-[13rem] px-5 py-4"
                >
                  <span className="sr-only">What you need</span>
                </th>
                <th scope="col" className="px-5 py-4 text-sm font-bold text-[var(--paper-ink)]">
                  Printed card
                </th>
                <th scope="col" className="px-5 py-4 text-sm font-bold text-[var(--paper-ink)]">
                  WhatsApp image or PDF
                </th>
                <th
                  scope="col"
                  className="bg-[var(--paper-emerald)] px-5 py-4 font-[family-name:var(--paper-display)] text-lg font-semibold text-[var(--paper-washi)]"
                >
                  Lifafa
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label} className="border-t border-[var(--paper-hairline)]">
                  <th
                    scope="row"
                    className="px-5 py-4 align-top text-base leading-[1.5] font-semibold text-[var(--paper-ink)]"
                  >
                    {row.label}
                  </th>
                  <td className={cell}>{row.printed}</td>
                  <td className={cell}>{row.file}</td>
                  <td className="bg-[var(--paper-blush)]/40 px-5 py-4 align-top text-base leading-[1.5] font-semibold text-[var(--paper-emerald)]">
                    {row.lifafa}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
