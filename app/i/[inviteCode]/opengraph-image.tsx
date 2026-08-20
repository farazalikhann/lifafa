import { ImageResponse } from "next/og";
import type { CSSProperties, ReactElement } from "react";
import { formatWhen, resolveCoverNames } from "@/lib/cardFormat";
import { getMockEvent } from "@/lib/mockEvent";
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
 */
export const alt = "Invitation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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

export default function Image({
  params,
}: {
  /* Already awaited by Next's metadata route handler — a plain object here. */
  params: { inviteCode: string };
}): Response {
  const event = getMockEvent(params.inviteCode);
  const palette = getPalette(event.style.paletteId);
  const accent = event.style.accentOverride ?? palette.accent;

  const { eventTitle, eventDate, eventTime } = event.draft;
  /* The same resolution the card runs, so the unfurl cannot disagree with it. */
  const names = resolveCoverNames(event.draft);
  const when = formatWhen(eventDate, eventTime);

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
