import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import { toString as qrToString } from "qrcode";
import PrintBar from "@/components/print/PrintBar";
import PrintDocument from "@/components/print/PrintDocument";
import { coverNameLine, resolveCoverNames } from "@/lib/cardFormat";
import { cardCopy } from "@/lib/cardLanguage";
import {
  cardInLanguage,
  inviteLinkIn,
  requestedLanguage,
} from "@/lib/cardTranslation";
import { getGuestEvent } from "@/lib/db/inviteEvent";
import { DEMO_NIKAH, DEMO_NIKAH_CODE, DEMO_NIKAH_PATH } from "@/lib/demoCards";
import { PRINT_AUTO_PARAM, pdfDownloadOn, pdfTitle } from "@/lib/pdfDownload";
import { printSheets } from "@/lib/printCard";
import { serverSiteOrigin } from "@/lib/serverSiteOrigin";
import { inviteUrl } from "@/lib/siteUrl";
import { cardPalette } from "@/lib/textColors";
import type { StoredEvent } from "@/types/database";

/**
 * The invitation as a printable copy: sheets of A5, for the browser's own
 * Save as PDF. See lib/pdfDownload.ts for why there is no service behind it,
 * and lib/printCard.ts for what goes on which sheet.
 *
 * WHO MAY OPEN IT. Whoever may open the card: a paid invitation's guests, its
 * host while it is unpaid, and anyone for the sample. A card whose host
 * switched the copy off has none, and neither does one that is not published
 * or does not exist: all three are a plain 404, with nothing of the card in it.
 *
 * `?lang=` picks the language, as it does on the card, and `?auto=1` is the
 * card's own button asking for the print sheet to be opened once the copy is
 * ready.
 *
 * Never indexed: it is the card again, and the card is the page to find.
 */

/* Per request, like the card: whether it opens changes the moment it is paid for. */
export const dynamic = "force-dynamic";

type PrintParams = {
  params: Promise<{ inviteCode: string }>;
  searchParams: Promise<{
    lang?: string | string[];
    [PRINT_AUTO_PARAM]?: string | string[];
  }>;
};

/** The event this copy is of, or null where there is none to print. */
async function printableEvent(inviteCode: string): Promise<StoredEvent | null> {
  /* The sample is not in the database; see lib/demoCards.ts. */
  if (inviteCode === DEMO_NIKAH_CODE) {
    return DEMO_NIKAH;
  }

  const guest = await getGuestEvent(inviteCode);

  if (guest.kind !== "active" && guest.kind !== "preview") {
    return null;
  }

  return guest.event;
}

/** The names as the card titles them, on one line, or null on a card that names nobody. */
function namesOf(event: StoredEvent, lang: string | string[] | undefined): {
  names: string | null;
  language: ReturnType<typeof requestedLanguage>;
} {
  const language = requestedLanguage(lang, event.config.language);
  const { draft, config } = cardInLanguage(event.draft, event.config, language);
  const resolved = resolveCoverNames(draft, config.occasionId, language);

  return {
    names:
      resolved.kind === "line" && resolved.isPlaceholder
        ? null
        : coverNameLine(resolved),
    language,
  };
}

export async function generateMetadata({
  params,
  searchParams,
}: PrintParams): Promise<Metadata> {
  const [{ inviteCode }, { lang }] = await Promise.all([params, searchParams]);
  const event = await printableEvent(inviteCode);
  const robots = { index: false, follow: false };

  if (event === null || !pdfDownloadOn(event.config.pdfDownload)) {
    return { robots };
  }

  const { names, language } = namesOf(event, lang);

  /* The browser names the saved file after this, so it is the whole of the title. */
  return {
    title: { absolute: pdfTitle(names, cardCopy(language).keepsake.fileFallback) },
    robots,
  };
}

export default async function PrintPage({
  params,
  searchParams,
}: PrintParams): Promise<ReactElement> {
  const [{ inviteCode }, query] = await Promise.all([params, searchParams]);
  const event = await printableEvent(inviteCode);

  if (event === null || !pdfDownloadOn(event.config.pdfDownload)) {
    notFound();
  }

  const language = requestedLanguage(query.lang, event.config.language);
  const { draft, config } = cardInLanguage(event.draft, event.config, language);
  const copy = cardCopy(language);
  const sheets = printSheets(draft, config);

  /* The live card, in the language this copy is in: what the QR code opens. */
  const origin = await serverSiteOrigin();
  const live = inviteLinkIn(
    inviteCode === DEMO_NIKAH_CODE
      ? `${origin}${DEMO_NIKAH_PATH}`
      : inviteUrl(event.inviteCode, origin),
    language,
  );

  /*
    Drawn here, as SVG, by the library the guest's pass already uses, so the
    copy carries no script for it and the code is sharp at any print size.
    Always dark on white, whatever the card's colours: it has to scan.
  */
  const qr = await qrToString(live, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#1C1410", light: "#FFFFFF" },
  });

  const palette = cardPalette(config.style);

  return (
    <div className="lifafa-print-doc" lang={copy.lang}>
      {/*
        A5, edge to edge: the card's border is the sheet's. And the page is
        the card's colour, so a sheet a printer's margins shrink has no white
        round it. The colour is from the fixed palette table, never text a
        host typed.
      */}
      <style>{`@page{size:A5 portrait;margin:0}@media print{html,body{background-color:${palette.background} !important}}`}</style>

      <PrintBar
        backHref={
          inviteCode === DEMO_NIKAH_CODE
            ? DEMO_NIKAH_PATH
            : `/i/${encodeURIComponent(event.inviteCode)}?lang=${language}`
        }
        backLabel={copy.keepsake.back}
        printLabel={copy.keepsake.print}
        hint={copy.keepsake.hint}
        hintIos={copy.keepsake.hintIos}
      />

      <PrintDocument
        draft={draft}
        sheets={sheets}
        auto={query[PRINT_AUTO_PARAM] === "1"}
        strip={
          <>
            <span
              className="lifafa-print-qr"
              aria-hidden="true"
              /* Markup the QR library wrote from a URL built here; nothing a host typed is in it. */
              dangerouslySetInnerHTML={{ __html: qr }}
            />
            <span
              className="lifafa-print-scan"
              style={{ color: palette.textPrimary }}
            >
              {copy.keepsake.scan}
            </span>
          </>
        }
      />
    </div>
  );
}
