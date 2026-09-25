import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import type { CSSProperties, ReactElement } from "react";
import { formatWhen, resolveCoverNames } from "@/lib/cardFormat";
import { cardInLanguage, requestedLanguage } from "@/lib/cardTranslation";
import { readEventByInviteCode } from "@/lib/db/inviteEvent";
import { getPalette } from "@/lib/palettes";

/**
 * The share preview.
 *
 * When a host pastes the invite link into WhatsApp, this image is the entire
 * invitation as far as the guest is concerned — it is what they see before they
 * decide whether to tap. So it says the same four things the cover of the card
 * says, in the event's own colours, and nothing else.
 *
 * Deliberately not a screenshot of the card: Satori renders a small, strict
 * subset of CSS and knows nothing of svh units, sticky positioning, scroll
 * reveals or the decor layer. Rebuilding the cover in flexbox is what makes the
 * output predictable.
 *
 * A ROUTE HANDLER, NOT AN opengraph-image FILE, and the language is why. A card
 * can be shared in more than one language, and the link carries which as
 * `?lang=`; the file convention hands its image nothing but the route's params,
 * so it could only ever draw the card's own language. The invite page names
 * this route in its metadata with the same `?lang=` the link was opened with,
 * so an English link unfurls with the English names. File-based metadata
 * outranks the page's own, which is why the convention file is gone rather
 * than left beside this.
 */
const size = { width: 1200, height: 630 };

/* Per request: the answer changes the moment an invitation is paid for. */
export const dynamic = "force-dynamic";

/**
 * A system stack, resolved by Satori's bundled default face.
 *
 * The card's real fonts are Google faces loaded through next/font. Getting one
 * of those in here means fetching the .ttf at request time and handing Satori
 * the buffer — worth doing, but not before the image itself is right.
 */
const FONT_STACK =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** Inset of the accent frame from the image edge. */
const FRAME_INSET = 28;

/** The cover's hero size at share-image scale, and the joiner's share of it. */
const HERO_SIZE = 76;
const JOINER_RATIO = 0.45;

/**
 * One name at hero size. A function rather than a constant because the colour
 * comes from the event's own palette, and Satori needs the whole rule inline.
 */
function heroStyle(color: string): CSSProperties {
  return {
    display: "flex",
    fontSize: HERO_SIZE,
    lineHeight: 1.1,
    fontWeight: 600,
    letterSpacing: "-0.015em",
    color,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ inviteCode: string }> },
): Promise<Response> {
  const { inviteCode } = await params;
  const result = await readEventByInviteCode(inviteCode);

  /*
    An unknown code still gets an image: a scraper asks for this before anyone
    opens the link, and returning nothing leaves a broken thumbnail in the chat
    thread. A plain marigold-on-ink card says nothing about the event, which is
    the right amount to say about one that could not be found.

    AN UNPAID INVITATION GETS THE SAME PLAIN CARD. Its page does not open for
    guests, and an image of its names and date would be the card leaking out
    through the chat preview. Nobody is exempt, the host included: a scraper
    carries no session, so there is nobody to recognise.

    Never cached. ImageResponse otherwise marks every image immutable for a
    year, which would keep this blank card in front of the link long after the
    host had paid.
  */
  if (!result.ok || result.data === null || !result.data.isPaid) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#12100e",
            color: "#e8a33d",
            fontFamily: FONT_STACK,
            fontSize: 64,
            fontWeight: 600,
          }}
        >
          Lifafa
        </div>
      ),
      { ...size, headers: { "cache-control": "no-store, max-age=0" } },
    );
  }

  /*
    The card in the language its link asked for: the host's words in that
    language wherever they wrote them, and their own everywhere else — the same
    view the invite page draws, so the unfurl names the people the card does.
  */
  const language = requestedLanguage(
    request.nextUrl.searchParams.get("lang"),
    result.data.config.language,
  );
  const { draft, config } = cardInLanguage(
    result.data.draft,
    result.data.config,
    language,
  );
  const palette = getPalette(config.style.paletteId);
  const accent = config.style.accentOverride ?? palette.accent;

  const { eventTitle, eventDate, eventTime } = draft;
  /*
    The same resolution the card runs, so the unfurl cannot disagree with it —
    but in English whatever the card is written in, and not by oversight.

    Satori lays text out without OpenType shaping for Indic scripts. It fetches
    a Devanagari face happily and then sets it wrong: a vowel sign that is
    written before its consonant is left after it, so दिसंबर comes out as
    "दसिंबर", and a conjunct like श्री falls apart into a letter with a visible
    virama. Checked by rendering both through the ImageResponse this imports.
    The card itself is a browser and shapes Hindi properly; this image is the
    one place it cannot be, so the words Lifafa writes here — the date, and the
    placeholder on a card with no names — stay in the script Satori can set.
    What the host typed is theirs and is drawn as typed.
  */
  const names = resolveCoverNames(draft, config.occasionId, "en");
  const when = formatWhen(eventDate, eventTime, "en");

  const content: ReactElement = (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: palette.background,
        fontFamily: FONT_STACK,
      }}
    >
      {/* The accent reads as a frame, not a fill — one hairline, inset. */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: FRAME_INSET,
          right: FRAME_INSET,
          bottom: FRAME_INSET,
          left: FRAME_INSET,
          border: `2px solid ${accent}`,
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          /* Keeps long host names off the frame on both sides. */
          maxWidth: 900,
          padding: "0 80px",
          textAlign: "center",
        }}
      >
        {names.kind === "pair" ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div style={heroStyle(palette.textPrimary)}>{names.first}</div>
            <div
              style={{
                display: "flex",
                /* Tight against both names, the way the card sets it. */
                margin: "8px 0",
                fontSize: Math.round(HERO_SIZE * JOINER_RATIO),
                letterSpacing: "0.22em",
                textTransform: "lowercase",
                color: accent,
              }}
            >
              {names.joiner}
            </div>
            <div style={heroStyle(palette.textPrimary)}>{names.second}</div>
          </div>
        ) : (
          <div style={heroStyle(palette.textPrimary)}>{names.text}</div>
        )}

        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 24,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: palette.textMuted,
          }}
        >
          {eventTitle}
        </div>

        <div
          style={{
            display: "flex",
            width: 96,
            height: 2,
            marginTop: 36,
            backgroundColor: accent,
          }}
        />

        {when !== null ? (
          <div
            style={{
              display: "flex",
              marginTop: 36,
              fontSize: 30,
              color: palette.textPrimary,
            }}
          >
            {when}
          </div>
        ) : null}
      </div>
    </div>
  );

  return new ImageResponse(content, size);
}
